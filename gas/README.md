# Google Sheet Backup (Google Apps Script)

สำรองข้อมูล **ลูกค้า / Tour Booking / Hotel Booking** ขึ้น Google Sheet อัตโนมัติ
ทุกครั้งที่กดบันทึกในเว็บ — ทำงานเบื้องหลังแบบ fire-and-forget (ไม่ขึ้นโหลดบนเว็บ
และถ้า backup ล้มเหลวก็ไม่กระทบการบันทึกข้อมูลหลักใน Supabase)

## ทำงานยังไง

หลังกด "บันทึก" สำเร็จ เว็บจะดึงข้อมูลลูกค้ารายนั้น (พร้อม tour/hotel ที่ active)
แล้วยิง `POST` ไปที่ Web App ของ Apps Script → สคริปต์เขียนลง 3 ชีต:

| ชีต | คีย์ | หมายเหตุ |
|------|------|----------|
| `Customers` | `item_id` | upsert (มีอยู่แล้ว = อัปเดต, ไม่มี = เพิ่ม) |
| `Tours` | `tour_id` (ผูก `item_id`) | ลบของลูกค้ารายนั้นแล้วเขียนชุดล่าสุดทับ |
| `Hotels` | `hotel_id` (ผูก `item_id`) | ลบของลูกค้ารายนั้นแล้วเขียนชุดล่าสุดทับ |

> ชีตทั้ง 3 จะถูกสร้างให้อัตโนมัติในครั้งแรกที่มีข้อมูลส่งเข้ามา ไม่ต้องสร้างเอง

## วิธี deploy (ทำครั้งเดียว)

1. เปิด Google Sheet ใหม่ (อันที่จะใช้เก็บ backup)
2. เมนู **Extensions → Apps Script**
3. ลบโค้ดเดิมทิ้ง แล้ววางเนื้อหาจากไฟล์ `Backup.gs` ลงไป → กด 💾 Save
4. กด **Deploy → New deployment**
   - Select type (เฟือง ⚙️) → **Web app**
   - Description: `Hala Walla Backup`
   - Execute as: **Me**
   - Who has access: **Anyone**  ← สำคัญ (เว็บยิงแบบไม่ login)
   - กด **Deploy** → อนุญาตสิทธิ์ (Authorize) ครั้งแรก
5. คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

## ตั้งค่าฝั่งเว็บ

ใส่ URL ที่ได้ลงในไฟล์ `.env.local` ของโปรเจกต์:

```
NEXT_PUBLIC_GAS_BACKUP_URL=https://script.google.com/macros/s/XXXXXXXX/exec
```

แล้ว restart `npm run dev` (หรือ redeploy เว็บ)
ถ้าเว้นค่านี้ว่างไว้ ระบบ backup จะถูกปิดอัตโนมัติ — เว็บยังทำงานปกติทุกอย่าง

## ทดสอบ

- เปิด Web app URL ตรงๆ บน browser ควรเห็น `{"ok":true,"service":"hala-walla-backup"}`
- ลองสร้าง/แก้ไขการจอง 1 รายการในเว็บ แล้วกลับมาดูใน Google Sheet — ควรมีข้อมูลโผล่ใน 3 ชีต

## หมายเหตุ

- ทุกครั้งที่แก้โค้ดใน Apps Script ต้อง **Deploy → Manage deployments → ✏️ → Version: New version**
  ไม่งั้น URL เดิมจะยังรันโค้ดเวอร์ชันเก่า
- ระบบนี้ sync เฉพาะตอน "บันทึก" การลบลูกค้าออกจากเว็บ **ยังไม่** ลบออกจากชีต
  (ตั้งใจให้เป็น backup/ประวัติ) — ถ้าต้องการให้ลบตามด้วย แจ้งได้
