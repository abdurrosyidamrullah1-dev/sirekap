-- ============================================================
-- MIGRATION: Tambah kolom untuk fitur Invoice Admin
-- Jalankan ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom di tabel ORDERS
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- 2. Tambah kolom di tabel ORDER_ITEMS
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_price integer DEFAULT 0;

-- ============================================================
-- Cara menjalankan:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project kamu
-- 3. Klik "SQL Editor" di sidebar kiri
-- 4. Paste query di atas, lalu klik "Run"
-- ============================================================
