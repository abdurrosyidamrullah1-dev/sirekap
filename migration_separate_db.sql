-- ============================================================
-- MIGRATION: Pisah Database Admin & Designer
-- Jalankan ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom `order_role` di tabel `orders`
-- Nilai default adalah 'designer' untuk backward compatibility
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_role TEXT NOT NULL DEFAULT 'designer'
  CHECK (order_role IN ('admin', 'designer'));

-- 2. Update existing data
-- Opsional: Jika mau mereset data lama yang invoice ke admin, 
-- UPDATE orders SET order_role = 'admin' WHERE invoice_number IS NOT NULL;

-- 3. Buat Index biar query lebih cepat saat difilter berdasarkan role
CREATE INDEX IF NOT EXISTS idx_orders_role ON orders(order_role);

-- ============================================================
-- Cara menjalankan:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project kamu
-- 3. Klik "SQL Editor" di sidebar kiri
-- 4. Paste query di atas, lalu klik "Run"
-- ============================================================
