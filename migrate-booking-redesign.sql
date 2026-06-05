-- ============================================================
-- Migration: Booking form redesign (pic1/pic2/pic3) — เพิ่มฟิลด์ใหม่
-- รันบน Supabase Dashboard → SQL Editor (idempotent รันซ้ำได้)
-- ============================================================

-- ลูกค้า: เพิ่มเบอร์โทรศัพท์ (pic1)
alter table customers add column if not exists phone text default '';

-- ทัวร์: ทารก, เก็บเงินหน้างาน, ประเภทรถ, ประเภทการรับ (Tour Pickup/Airport), ช่องทางการจอง (pic3)
alter table tours add column if not exists infant int default 0;
alter table tours add column if not exists cash_on_tour numeric(12,2) default 0;
alter table tours add column if not exists vehicle_type text default '';
alter table tours add column if not exists pickup_type text default '';
alter table tours add column if not exists booking_type text default '';

-- ทัวร์ (Airport Transfer / pic4): ประเภทเที่ยว, ต้นทาง, ปลายทาง, เที่ยวบิน
alter table tours add column if not exists transfer_type text default '';
alter table tours add column if not exists origin text default '';
alter table tours add column if not exists dropoff text default '';
alter table tours add column if not exists flight_no text default '';

-- โรงแรม: ผู้ใหญ่/เด็ก, Detail (คอลัมน์ DETAIL บน Voucher แยกจาก Note) (pic2)
alter table hotels add column if not exists adult int default 0;
alter table hotels add column if not exists child int default 0;
alter table hotels add column if not exists detail text default '';
