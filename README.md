# Si Rekap — Order Manager

Aplikasi manajemen orderan desain dengan Google Drive integration.

## Struktur Proyek

```
web kerjaan/
├── frontend/          ← React + Vite (UI)
├── backend/           ← Express.js API Server
├── supabase_setup.sql
├── migration_invoice.sql
└── migration_separate_db.sql
```

## Cara Menjalankan

### 1. Setup Backend

```bash
cd backend

# Copy .env.example dan isi SUPABASE_SERVICE_KEY dari Supabase Dashboard
cp .env.example .env

# Install dependencies (sudah dilakukan)
npm install

# Jalankan backend (development)
npm run dev
# → Server berjalan di http://localhost:3001
```

### 2. Setup Frontend

```bash
cd frontend

# Copy .env.example
cp .env.example .env

# Install dependencies (sudah dilakukan)
npm install

# Jalankan frontend (development)
npm run dev
# → App berjalan di http://localhost:5173
```

> **Note:** Jalankan backend DULU, baru frontend. Frontend menggunakan proxy Vite ke `localhost:3001`.

---

## Arsitektur

```
Browser (React/Vite :5173)
    │  fetch /api/*  (proxy via Vite dev server)
    ▼
Express Backend (:3001)
    │  @supabase/supabase-js
    ▼
Supabase (PostgreSQL)

Browser juga langsung akses Google Drive API (OAuth di browser)
```

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/orders` | List orders (filter: status, search, role) |
| GET | `/api/orders/:id` | Detail order |
| POST | `/api/orders` | Buat order baru |
| PUT | `/api/orders/:id` | Update order |
| PUT | `/api/orders/:id/status` | Update status + timeline |
| DELETE | `/api/orders/:id` | Hapus order |
| POST | `/api/order-items` | Tambah item |
| PUT | `/api/order-items/:id` | Update item |
| DELETE | `/api/order-items/:id` | Hapus item |
| POST | `/api/order-files` | Tambah file reference |
| DELETE | `/api/order-files/:id` | Hapus file reference |
| GET | `/api/timeline/:orderId` | Riwayat status |
| POST | `/api/timeline` | Tambah timeline entry |
| GET | `/api/reports/stats` | Statistik orders |

## Variabel Lingkungan

### Backend (`backend/.env`)
| Variabel | Keterangan |
|----------|------------|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (dari Supabase Dashboard → Settings → API) |
| `PORT` | Port backend (default: 3001) |
| `FRONTEND_URL` | URL frontend untuk CORS (default: http://localhost:5173) |

### Frontend (`frontend/.env`)
| Variabel | Keterangan |
|----------|------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `VITE_API_URL` | URL backend (kosongkan untuk dev — pakai proxy Vite) |
