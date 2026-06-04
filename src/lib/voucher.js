// สร้าง Voucher จาก Google Slides template ผ่าน Google Apps Script Web App
// (ดูวิธี deploy ที่ gas/VOUCHER_README.md)
const VOUCHER_URL = process.env.NEXT_PUBLIC_GAS_VOUCHER_URL;

export function voucherEnabled() {
  return !!VOUCHER_URL;
}

function fmtToday() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// type: 'tour' | 'hotel' ; customer: {item_id, guest_name, nationality, customer_detail}
// items: แถว tours หรือ hotels (ใช้ field snake_case ตรงจาก Supabase ได้เลย)
export async function generateVoucher({ type, customer, items }) {
  if (!VOUCHER_URL) throw new Error('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_GAS_VOUCHER_URL');
  const payload = {
    type,
    items,
    customer: {
      item_id: customer.item_id,
      guest_name: customer.guest_name,
      nationality: customer.nationality,
      customer_detail: customer.customer_detail,
      issue_date: fmtToday(),
    },
  };
  // text/plain เพื่อเลี่ยง CORS preflight (GAS web app ไม่ส่ง preflight header)
  const res = await fetch(VOUCHER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'สร้าง voucher ไม่สำเร็จ');
  return data; // { name, slidesId, slidesUrl, pdfBase64 }
}

// แปลง base64 → ดาวน์โหลดไฟล์ PDF ในเบราว์เซอร์
export function downloadPdfBase64(base64, filename) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
