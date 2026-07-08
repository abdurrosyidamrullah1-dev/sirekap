-- ══════════════════════════════════════════════════════════════════════
-- DesignHub — Supabase Schema Setup (Updated v2)
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query → Run All
-- ══════════════════════════════════════════════════════════════════════

-- ─── Drop old tables if re-running ────────────────────────────────────
DROP TABLE IF EXISTS order_files CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS order_timeline CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- ─── 1. orders ────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name    TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','review','revision','approved','done','cancelled')),
  deadline         DATE,
  notes            TEXT,
  drive_folder_id  TEXT,
  drive_folder_url TEXT,
  order_role       TEXT NOT NULL DEFAULT 'designer' CHECK (order_role IN ('admin', 'designer')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. order_items ───────────────────────────────────────────────────
CREATE TABLE order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name  TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','in_progress','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. order_files ───────────────────────────────────────────────────
CREATE TABLE order_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  drive_file_id   TEXT,
  drive_file_url  TEXT,
  mime_type       TEXT,
  file_size       BIGINT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. order_timeline (status history) ───────────────────────────────
CREATE TABLE order_timeline (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. Auto-update timestamp trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. Row Level Security ─────────────────────────────────────────────
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all orders"    ON orders         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all items"     ON order_items    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all files"     ON order_files    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all timeline"  ON order_timeline FOR ALL USING (true) WITH CHECK (true);

-- ─── 7. Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_role        ON orders(order_role);
CREATE INDEX IF NOT EXISTS idx_orders_created     ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_order_id     ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_files_order_id     ON order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_timeline_order_id  ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created   ON order_timeline(created_at);

-- ─── 8. Migrations / Updates ───────────────────────────────────────────
-- Menambahkan kolom tracking produksi pada tabel order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS production_type TEXT CHECK (production_type IN ('in_house', 'outsourced')),
ADD COLUMN IF NOT EXISTS production_location TEXT;

-- Drop production_cost if it exists
ALTER TABLE order_items DROP COLUMN IF EXISTS production_cost;
