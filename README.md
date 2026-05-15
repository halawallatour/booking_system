# Tour Booking System

Next.js + Supabase Tour & Hotel Booking Management System

## Setup

### 1. Supabase

1. สร้าง project ใหม่ที่ [supabase.com](https://supabase.com)
2. ไปที่ SQL Editor → รัน `supabase-schema.sql` ทั้งไฟล์
3. Copy **Project URL** และ **anon public key** จาก Settings → API

### 2. Environment Variables

Copy `.env.local.example` เป็น `.env.local` แล้วใส่ค่า:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. Install & Run

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

### 4. Deploy to Vercel

1. Push โค้ดขึ้น GitHub
2. ไปที่ [vercel.com](https://vercel.com) → Import repo
3. ใส่ Environment Variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Deploy

## Features

- **Dashboard** — ภาพรวมจำนวน Customer, Tour, Hotel
- **Customer CRUD** — เพิ่ม/แก้ไข/ลบลูกค้า
- **Tour Booking** — เพิ่ม/แก้ไข/ลบทัวร์ในแต่ละลูกค้า
- **Hotel Booking** — เพิ่ม/แก้ไข/ลบโรงแรมในแต่ละลูกค้า
- **Search** — ค้นหาด้วยชื่อลูกค้า
- **Pagination** — แบ่งหน้าแสดงข้อมูล
- **Tab View** — สลับดู Tour / Hotel

## Database Tables

- `customers` — ข้อมูลลูกค้า
- `tours` — รายการทัวร์ (FK → customers)
- `hotels` — รายการโรงแรม (FK → customers)
- `dropdowns` — ค่า dropdown (nationality, tour_name, hotel_name, etc.)
- `id_counters` — ตัวนับ ID อัตโนมัติ (VC-000001, TOUR-000001, HTL-000001)
