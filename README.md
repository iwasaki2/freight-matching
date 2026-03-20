# FreightMatch — 配車マッチングシステム

空車と荷物をリアルタイムにマッチングするプラットフォーム。
Next.js 16 (App Router) + Supabase + Tailwind CSS で構築。

---

## セットアップ

```bash
# 1. 依存インストール
npm install

# 2. 環境変数
cp .env.local.example .env.local
# .env.local を編集して Supabase / Twilio の値を設定

# 3. Supabase スキーマ適用
# Supabase ダッシュボード > SQL Editor で supabase/schema.sql を実行

# 4. 開発サーバー起動
npm run dev
```

開発サーバーは http://localhost:3000 で起動します。

---

## ER図

```mermaid
erDiagram
    users {
        uuid id PK
        text name
        text phone
        text email
        user_role role
    }
    vehicles {
        uuid id PK
        uuid user_id FK
        text plate_number
        text vehicle_type
        numeric max_load_kg
        vehicle_status status
    }
    cargo_types {
        int id PK
        text name
        text icon
    }
    shippers {
        uuid id PK
        uuid user_id FK
        text company
        text phone
        text email
    }
    available_slots {
        uuid id PK
        uuid vehicle_id FK
        uuid driver_id FK
        text prefecture
        timestamptz available_from
        timestamptz available_until
        numeric available_load_kg
        slot_status status
    }
    slot_cargo_types {
        uuid slot_id FK
        int cargo_type_id FK
    }
    shipments {
        uuid id PK
        uuid shipper_id FK
        int cargo_type_id FK
        text prefecture
        timestamptz pickup_time
        numeric weight_kg
        text destination
        shipment_status status
    }
    matches {
        uuid id PK
        uuid slot_id FK
        uuid shipment_id FK
        numeric score
        match_status status
        timestamptz confirmed_at
        timestamptz completed_at
    }
    operations {
        uuid id PK
        uuid match_id FK
        uuid operator_id FK
        text action
    }
    notifications {
        uuid id PK
        uuid user_id FK
        uuid match_id FK
        notification_channel channel
        text template
        notification_status status
    }

    users ||--o{ vehicles : owns
    users ||--o{ available_slots : drives
    vehicles ||--o{ available_slots : assigned_to
    shippers ||--o{ shipments : places
    cargo_types ||--o{ shipments : categorizes
    available_slots ||--o{ slot_cargo_types : accepts
    cargo_types ||--o{ slot_cargo_types : included_in
    available_slots ||--o{ matches : matched_to
    shipments ||--o{ matches : matched_to
    matches ||--o{ operations : logged_in
    matches ||--o{ notifications : triggers
    users ||--o{ notifications : receives
```

---

## マッチングステータス遷移図

```mermaid
stateDiagram-v2
    [*] --> pending : マッチング候補生成
    pending --> confirmed : オペレーター確定
    pending --> cancelled : 却下 / 別マッチ確定
    pending --> expired : 有効期限切れ
    confirmed --> in_progress : 集荷開始
    confirmed --> cancelled : キャンセル
    in_progress --> completed : 配送完了
    in_progress --> cancelled : 緊急キャンセル
    completed --> [*]
    cancelled --> [*]
    expired --> [*]
```

---

## アーキテクチャ概要

| レイヤー | 技術 | 役割 |
|---|---|---|
| フロントエンド | Next.js 16 App Router | UI、Server Components |
| DB / Auth | Supabase (PostgreSQL) | データ永続化、RLS |
| マッチングロジック | `src/lib/matching.ts` | スコアリング・状態管理 |
| 通知 | Twilio SMS | ドライバー・荷主への通知 |

### スコアリング基準
- **時刻近似（50点）**: 集荷時刻と空車開始時刻の差（±30分以内）
- **積載余裕（30点）**: `(available_load_kg - weight_kg) / weight_kg`
- **荷物種別一致（20点）**: スロットが該当荷物種別を許可している場合
