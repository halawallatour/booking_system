# Voucher Generator (Google Apps Script + Google Slides)

สร้างใบ Voucher (Tour / Hotel) จากเทมเพลต Google Slides โดย **ก็อปปี้สไลด์ก่อน** (กัน template
ตัวจริงพัง) แล้วเติมข้อมูลลูกค้า/รายการลงในช่อง `{{...}}` → ได้ทั้ง **ลิงก์ Google Slides** (แก้ได้)
และไฟล์ **PDF** ให้ดาวน์โหลด ไฟล์ทั้งหมดถูกเก็บไว้ในโฟลเดอร์ Drive ที่กำหนด

## ทำงานยังไง

กดปุ่ม 🖨️ ในหน้าแรก → เลือกชนิด (Tour / Hotel / ทั้งคู่) → เว็บยิงข้อมูลไปที่ Web App ของ
Apps Script → สคริปต์:

1. ก็อปปี้ template (Tour หรือ Hotel) ลงโฟลเดอร์ Drive ตั้งชื่อ `Tour_Voucher_<VC-xxxxx>` / `Hotel_Voucher_<VC-xxxxx>`
2. เติมข้อมูลส่วนหัว/ลูกค้า และเติมตาราง **4 แถวต่อสไลด์**
   - รายการ **น้อยกว่า 4** → ลบแถวที่เหลือออก
   - รายการ **มากกว่า 4** → ก็อปสไลด์เพิ่มจนครบ แล้วเติมต่อ
3. ส่งกลับลิงก์ Slides + ไฟล์ PDF (เว็บดาวน์โหลด PDF ให้อัตโนมัติ)

## ค่า id ที่ตั้งไว้ในสคริปต์ (`Voucher.gs` หัวไฟล์)

| ตัวแปร | ค่า | หมายเหตุ |
|--------|------|----------|
| `TOUR_TEMPLATE_ID`  | `1B9DZtK7JeaAX6bbHDcKsia1LuFwuASQ0TeS9rHS3Iz8` | template Tour |
| `HOTEL_TEMPLATE_ID` | `1Uv7Lc8xB_Ts2N-9JIQAIP1iXX0P0iZVVxpBGWP0uUzA` | template Hotel |
| `OUTPUT_FOLDER_ID`  | `1EnNOPpbE-_jozxNSaG98ej9bE3Du_p48` | โฟลเดอร์เก็บไฟล์ที่สร้าง |
| `ROWS_PER_SLIDE`    | `4` | จำนวนแถวในตาราง template |

ถ้าเปลี่ยน template/โฟลเดอร์ ให้แก้ id ตรงนี้แล้ว deploy เวอร์ชันใหม่

## ⚠️ ข้อกำหนดของ template (สำคัญ)

ตาราง 4 แถวต้องเป็น **ตาราง (Table) ของ Google Slides จริง ๆ** (header 1 แถว + ข้อมูล 4 แถว)
ไม่ใช่กล่องข้อความวางซ้อนกัน — เพราะสคริปต์ใช้การ "ลบแถว/ก็อปสไลด์" ของตาราง

ช่อง `{{...}}` ที่สคริปต์จะแทนค่า (ต้องสะกดให้ตรงเป๊ะ):

**ส่วนหัว/ลูกค้า (ทั้ง 2 template):**
`{{issue_date}}` `{{item_id}}` `{{name}}` `{{nationality}}` `{{customer_detail}}`

**Tour Voucher — แต่ละแถวในตาราง:**
`{{tour_date}}` `{{tour_detail}}` `{{adult_child}}` `{{company}}` `{{hotel}}` `{{room_no}}` `{{pickup_time}}` `{{note}}`

**Hotel Voucher — แต่ละแถวในตาราง:**
`{{stay_range}}` `{{night}}` `{{hotel_name}}` `{{room_type}}` `{{room}}` `{{breakfast}}` `{{confirmation_number}}` `{{note}}`

> token เดียวกันใส่ซ้ำได้ทั้ง 4 แถว — สคริปต์เติมแยกทีละแถวให้เอง

## วิธี deploy (ทำครั้งเดียว)

1. ไปที่ [script.google.com](https://script.google.com) → **New project**
   (จะแยกจาก project ของ Backup ก็ได้ หรือเพิ่มไฟล์ `Voucher.gs` เข้า project เดิมก็ได้
   แต่ต้อง **deploy เป็น Web app คนละตัว** เพราะ `doPost` ชนกัน → แนะนำแยก project)
2. วางเนื้อหาจาก `Voucher.gs` → 💾 Save
3. **Deploy → New deployment** → ⚙️ เลือก **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**  ← สำคัญ
   - **Deploy** → Authorize (ครั้งแรกต้องอนุญาตสิทธิ์ Slides + Drive)
4. คัดลอก **Web app URL** (ลงท้าย `/exec`)

## ตั้งค่าฝั่งเว็บ

ใส่ใน `.env.local`:

```
NEXT_PUBLIC_GAS_VOUCHER_URL=https://script.google.com/macros/s/XXXXXXXX/exec
```

แล้ว restart `npm run dev` (หรือ redeploy เว็บ) — ถ้าเว้นว่าง ปุ่มปริ้นจะแจ้งว่ายังไม่ตั้งค่า

## ทดสอบ

- เปิด Web app URL ตรง ๆ ควรเห็น `{"ok":true,"service":"hala-walla-voucher"}`
- ในเว็บ กด 🖨️ ที่ลูกค้าที่มี Tour/Hotel → ควรได้ PDF ดาวน์โหลด + ลิงก์ Slides และมีไฟล์โผล่ในโฟลเดอร์ Drive

## หมายเหตุa

- แก้โค้ดทุกครั้งต้อง **Deploy → Manage deployments → ✏️ → Version: New version** ไม่งั้น URL เดิมรันโค้ดเก่า
- ถ้า PDF ออกมามีคำว่า `{{xxx}}` ค้างอยู่ = สะกด token ใน template ไม่ตรงกับรายการข้างบน
- วันที่บน voucher เป็นรูปแบบ `DD/MM/YYYY` (ค.ศ.) — ถ้าต้องการ พ.ศ./รูปแบบอื่น แก้ฟังก์ชัน `dmy()` ใน `Voucher.gs`
