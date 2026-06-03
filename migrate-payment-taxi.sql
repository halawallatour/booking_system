-- ============================================================
-- Migration: Payment Due tracking + Taxi Booking module
-- รันไฟล์นี้ใน Supabase SQL Editor (หรือผ่านหน้า /sql-editor ในแอป)
-- ปลอดภัยต่อการรันซ้ำ (idempotent): ใช้ IF NOT EXISTS / ON CONFLICT
-- ============================================================

-- ---------- 1) Payment Due: เพิ่มคอลัมน์สถานะจ่ายเงินใน tours & hotels ----------
-- supplier = การจ่ายเงินซัพพลายเออร์ (เราจ่ายออก)
-- customer = การรับเงินจากลูกค้า (เรารับเข้า)
alter table tours  add column if not exists supplier_paid      boolean default false;
alter table tours  add column if not exists supplier_paid_date date;
alter table tours  add column if not exists customer_paid      boolean default false;
alter table tours  add column if not exists customer_paid_date date;

alter table hotels add column if not exists supplier_paid      boolean default false;
alter table hotels add column if not exists supplier_paid_date date;
alter table hotels add column if not exists customer_paid      boolean default false;
alter table hotels add column if not exists customer_paid_date date;

-- ---------- 2) Taxi Booking: ตารางใหม่ ----------
create table if not exists taxi_bookings (
  id              bigint generated always as identity primary key,
  job_date        date,                       -- วันที่จอง
  pickup_time     text default '',            -- เวลารับ (HH:mm, 24h)
  customer_name   text default '',            -- ชื่อลูกค้า
  pax             int  default 1,             -- จำนวนคน
  job_type        text default '',            -- ประเภทงาน (dropdown: taxi_job_type)
  vehicle_type    text default '',            -- ประเภทรถ (dropdown: taxi_vehicle_type)
  trip_scope      text default '',            -- 'domestic' | 'international' (ดอม/อินเตอร์)
  pickup_location text default '',            -- สถานที่รับ (dropdown: taxi_location)
  pickup_detail   text default '',            -- ห้อง / เที่ยวบิน
  dropoff_location text default '',           -- สถานที่ส่ง (dropdown: taxi_location)
  note            text default '',            -- เงื่อนไขเพิ่มเติม / ป้ายชื่อ
  price           numeric default 0,          -- ค่างาน (บาท)
  status          text default 'pending',     -- 'pending' (รอจัดรถ) | 'cleared' (เคลียร์แล้ว)
  created_at      timestamptz default now()
);

create index if not exists taxi_bookings_status_idx on taxi_bookings (status, job_date);

alter table taxi_bookings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'taxi_bookings' and policyname = 'Allow all on taxi_bookings') then
    create policy "Allow all on taxi_bookings" on taxi_bookings for all using (true) with check (true);
  end if;
end $$;

-- ---------- 3) Dropdown หมวดใหม่สำหรับ Taxi (ค่าเริ่มต้น แก้ไข/เพิ่มได้ในหน้า "ตั้งค่า Dropdown") ----------
-- ใช้ NOT EXISTS เพื่อให้รันซ้ำได้โดยไม่เกิดค่าซ้ำ (ตาราง dropdowns ไม่มี unique constraint)
insert into dropdowns (category, value, sort_order)
select v.category, v.value, v.sort_order
from (values
  ('taxi_job_type', 'รับเข้าสนามบิน (Airport Pickup)', 1),
  ('taxi_job_type', 'ส่งออกสนามบิน (Airport Dropoff)', 2),
  ('taxi_job_type', 'รับส่งในเมือง', 3),
  ('taxi_job_type', 'เช่าเหมา (Charter)', 4),
  ('taxi_vehicle_type', 'รถตู้ (Van)', 1),
  ('taxi_vehicle_type', 'ตู้วีไอพี (VIP Van)', 2),
  ('taxi_vehicle_type', 'รถเก๋ง (Sedan)', 3),
  ('taxi_vehicle_type', 'รถ SUV', 4),
  ('taxi_location', 'สนามบินภูเก็ต (HKT)', 1),
  ('taxi_location', 'สนามบินสุวรรณภูมิ (BKK)', 2),
  ('taxi_location', 'สนามบินดอนเมือง (DMK)', 3),
  ('taxi_location', 'ป่าตอง (Patong)', 4)
) as v(category, value, sort_order)
where not exists (
  select 1 from dropdowns d where d.category = v.category and d.value = v.value
);
