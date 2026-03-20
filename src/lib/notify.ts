import { createServiceRoleClient } from './supabase/server';
import { NotificationChannel } from '@/types';

// ============================================================
// Notification templates
// ============================================================
export type TemplateName = 'matchPending' | 'matchConfirmed' | 'matchCancelled' | 'reminder';

export const TEMPLATES: Record<TemplateName, (vars: Record<string, string>) => string> = {
  matchPending: (v) =>
    `【配車マッチング】新しいマッチング候補があります。\n荷物ID: ${v.shipmentId}\n集荷予定: ${v.pickupTime}\nご確認をお願いします。`,

  matchConfirmed: (v) =>
    `【配車マッチング】マッチングが確定しました。\n便ID: ${v.matchId}\n集荷予定: ${v.pickupTime}\nよろしくお願いします。`,

  matchCancelled: (v) =>
    `【配車マッチング】マッチングがキャンセルされました。\n便ID: ${v.matchId}\n再マッチングを行います。`,

  reminder: (v) =>
    `【配車マッチング】本日の集荷リマインダーです。\n集荷先: ${v.prefecture} ${v.destination}\n集荷時刻: ${v.pickupTime}`,
};

// ============================================================
// Twilio SMS sender
// ============================================================
async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio environment variables are not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
}

// ============================================================
// Main notify function — persists to DB then dispatches
// ============================================================
export async function sendNotification({
  userId,
  matchId,
  channel,
  template,
  vars,
}: {
  userId: string;
  matchId?: string;
  channel: NotificationChannel;
  template: TemplateName;
  vars: Record<string, string>;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const body = TEMPLATES[template](vars);

  // Insert notification record (pending)
  const { data: record, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      match_id: matchId ?? null,
      channel,
      template,
      body,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);

  try {
    if (channel === 'sms') {
      // Fetch user phone
      const { data: user } = await supabase
        .from('users')
        .select('phone')
        .eq('id', userId)
        .single();

      if (!user?.phone) throw new Error('User has no phone number');
      await sendSms(user.phone, body);
    }
    // LINE / email channels can be implemented here

    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', record.id);
  } catch (err) {
    await supabase
      .from('notifications')
      .update({ status: 'failed' })
      .eq('id', record.id);
    throw err;
  }
}
