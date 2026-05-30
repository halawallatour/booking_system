# Tour Booking System

Next.js + Supabase Tour & Hotel Booking Management System

## Setup

### 1. Supabase
1. สร้าง project ใหม่ที่ supabase.com
2. ไปที่ SQL Editor → รัน `supabase-schema.sql` ทั้งไฟล์
3. Copy Project URL และ anon public key จาก Settings → API

### 2. Environment Variables
Copy `.env.local.example` เป็น `.env.local` แล้วใส่ค่า

### 3. Install & Run
```
npm install
npm run dev
```
เปิด http://localhost:3000

### 4. Import ข้อมูลเดิม
ไปที่ /sql-editor → กดปุ่ม "โหลด SQL ลูกค้า" → กด Run

### 5. Deploy to Vercel
Push โค้ดขึ้น GitHub → Import ที่ vercel.com → ใส่ Environment Variables → Deploy

## Pages
- `/` — Voucher Management (หน้าหลัก)
- `/dashboard` — Executive Dashboard
- `/database` — จัดการ Dropdown
- `/sql-editor` — SQL Editor สำหรับ import ข้อมูล
- `/customers/new` — สร้างการจองใหม่
- `/customers/[id]` — แก้ไขลูกค้า
