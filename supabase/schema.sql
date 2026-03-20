-- ============================================================
-- ENUMs
-- ============================================================
CREATE TYPE user_role AS ENUM ('driver', 'staff', 'shipper', 'admin');
CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE slot_status AS ENUM ('open', 'matched', 'expired', 'closed');
CREATE TYPE shipment_status AS ENUM ('waiting', 'matched', 'completed', 'cancelled');
CREATE TYPE match_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired');
CREATE TYPE notification_channel AS ENUM ('line', 'sms', 'email');
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'pending');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT UNIQUE,
  role        user_role NOT NULL DEFAULT 'driver',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number    TEXT NOT NULL UNIQUE,
  vehicle_type    TEXT NOT NULL,
  max_load_kg     NUMERIC(10,2) NOT NULL,
  status          vehicle_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cargo_types (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  icon  TEXT
);

CREATE TABLE shippers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  company     TEXT NOT NULL,
  contact     TEXT,
  phone       TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE available_slots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id         UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prefecture         TEXT NOT NULL,
  available_from     TIMESTAMPTZ NOT NULL,
  available_until    TIMESTAMPTZ NOT NULL,
  available_load_kg  NUMERIC(10,2) NOT NULL,
  status             slot_status NOT NULL DEFAULT 'open',
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE slot_cargo_types (
  slot_id        UUID NOT NULL REFERENCES available_slots(id) ON DELETE CASCADE,
  cargo_type_id  INT  NOT NULL REFERENCES cargo_types(id) ON DELETE CASCADE,
  PRIMARY KEY (slot_id, cargo_type_id)
);

CREATE TABLE shipments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id       UUID NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
  cargo_type_id    INT  NOT NULL REFERENCES cargo_types(id),
  prefecture       TEXT NOT NULL,
  pickup_time      TIMESTAMPTZ NOT NULL,
  weight_kg        NUMERIC(10,2) NOT NULL,
  destination      TEXT NOT NULL,
  status           shipment_status NOT NULL DEFAULT 'waiting',
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id      UUID NOT NULL REFERENCES available_slots(id) ON DELETE CASCADE,
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  score        NUMERIC(6,2),
  status       match_status NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  operator_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id   UUID REFERENCES matches(id) ON DELETE SET NULL,
  channel    notification_channel NOT NULL,
  template   TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     notification_status NOT NULL DEFAULT 'pending',
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_vehicles_user_id         ON vehicles(user_id);
CREATE INDEX idx_slots_driver_id          ON available_slots(driver_id);
CREATE INDEX idx_slots_status             ON available_slots(status);
CREATE INDEX idx_slots_prefecture         ON available_slots(prefecture);
CREATE INDEX idx_slots_available_from     ON available_slots(available_from);
CREATE INDEX idx_shipments_shipper_id     ON shipments(shipper_id);
CREATE INDEX idx_shipments_status         ON shipments(status);
CREATE INDEX idx_shipments_prefecture     ON shipments(prefecture);
CREATE INDEX idx_shipments_pickup_time    ON shipments(pickup_time);
CREATE INDEX idx_matches_slot_id          ON matches(slot_id);
CREATE INDEX idx_matches_shipment_id      ON matches(shipment_id);
CREATE INDEX idx_matches_status           ON matches(status);
CREATE INDEX idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX idx_notifications_status     ON notifications(status);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON shippers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON available_slots
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- matches state transition guard
-- ============================================================
CREATE OR REPLACE FUNCTION guard_match_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  -- Define valid transitions
  IF OLD.status = 'pending'     AND NEW.status IN ('confirmed', 'cancelled', 'expired') THEN allowed := TRUE; END IF;
  IF OLD.status = 'confirmed'   AND NEW.status IN ('in_progress', 'cancelled')          THEN allowed := TRUE; END IF;
  IF OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled')             THEN allowed := TRUE; END IF;
  -- Allow same-status update (no-op guard pass)
  IF OLD.status = NEW.status THEN allowed := TRUE; END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid match status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_match_transition BEFORE UPDATE OF status ON matches
  FOR EACH ROW EXECUTE FUNCTION guard_match_status_transition();

-- ============================================================
-- Row Level Security (development: allow all)
-- ============================================================
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shippers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_cargo_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

CREATE POLICY dev_allow_all ON users             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON vehicles          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON cargo_types       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON shippers          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON available_slots   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON slot_cargo_types  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON shipments         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON matches           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON operations        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dev_allow_all ON notifications     FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: cargo_types
-- ============================================================
INSERT INTO cargo_types (name, icon) VALUES
  ('一般貨物',   '📦'),
  ('冷蔵・冷凍', '❄️'),
  ('危険物',     '⚠️'),
  ('精密機器',   '🖥️'),
  ('農産物',     '🌾');
