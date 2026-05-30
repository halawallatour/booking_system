import { supabase } from './supabase';

// URL ของ Google Apps Script Web App (ดูวิธี deploy ที่ gas/README.md)
const GAS_URL = process.env.NEXT_PUBLIC_GAS_BACKUP_URL;

// สำรองข้อมูลลูกค้า 1 ราย (พร้อม tour/hotel ที่ active) ขึ้น Google Sheet
// แบบ fire-and-forget: ไม่ await, ไม่บล็อก UI, ไม่ขึ้นโหลด — ล้มเหลวก็เงียบ
// เรียกหลังบันทึกสำเร็จเท่านั้น
export async function backupCustomerById(itemId) {
  if (!GAS_URL || !itemId) return;
  try {
    const { data: customer } = await supabase.from('customers').select('*').eq('item_id', itemId).single();
    if (!customer) return;
    const [{ data: tours }, { data: hotels }] = await Promise.all([
      supabase.from('tours').select('*').eq('customer_id', customer.id).eq('status', 'active'),
      supabase.from('hotels').select('*').eq('customer_id', customer.id).eq('status', 'active'),
    ]);
    const payload = { customer, tours: tours || [], hotels: hotels || [] };
    // ส่งเป็น text/plain เพื่อเลี่ยง CORS preflight (GAS ไม่ส่ง CORS header กลับ)
    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {
    // เงียบไว้ — backup ล้มเหลวไม่ควรกระทบการบันทึกข้อมูลหลัก
  }
}
