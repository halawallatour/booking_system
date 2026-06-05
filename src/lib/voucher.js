// สร้าง Voucher จาก Google Slides template ผ่าน Google Apps Script Web App
// (ดูวิธี deploy ที่ gas/VOUCHER_README.md)
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const VOUCHER_URL = process.env.NEXT_PUBLIC_GAS_VOUCHER_URL;

export function voucherEnabled() {
  return !!VOUCHER_URL;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtToday() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${MON[d.getMonth()]}-${d.getFullYear()}`; // 05-Jan-2026
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

// เปิดหน้าต่างเลือกพิมพ์ Voucher (Tour/Hotel/ทั้งคู่) → สร้าง PDF + Slides
// cust = { item_id, guest_name, nationality, customer_detail, tours:[active], hotels:[active] }
export async function printVoucherDialog(cust) {
  if (!voucherEnabled()) { toast.error('ยังไม่ได้ตั้งค่า Google Slides (NEXT_PUBLIC_GAS_VOUCHER_URL) — ดู gas/VOUCHER_README.md'); return; }
  const tours = (cust.tours || []).filter((t) => (t.status ? t.status === 'active' : true));
  const hotels = (cust.hotels || []).filter((h) => (h.status ? h.status === 'active' : true));
  if (!tours.length && !hotels.length) { toast('ลูกค้านี้ยังไม่มีรายการ Tour/Hotel ให้ปริ้น', { icon: 'ℹ️' }); return; }

  const card = (v, icon, title, sub) => `
    <button type="button" data-v="${v}" class="vc-btn">
      <span class="vc-ic">${icon}</span>
      <span class="vc-tx"><span class="vc-ti">${title}</span>${sub ? `<span class="vc-sub">${sub}</span>` : ''}</span>
      <span class="vc-ar">→</span>
    </button>`;
  const choice = await new Promise((resolve) => {
    Swal.fire({
      title: `พิมพ์ Voucher — ${cust.item_id}`,
      html: `
        <style>
          .vc-list{display:flex;flex-direction:column;gap:12px;margin-top:8px}
          .vc-btn{display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;border:2px solid #e5e7eb;border-radius:14px;background:#fff;cursor:pointer;transition:all .15s;text-align:left}
          .vc-btn:hover{border-color:#2563eb;background:#eff6ff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.12)}
          .vc-ic{font-size:26px;line-height:1}
          .vc-tx{display:flex;flex-direction:column;flex:1}
          .vc-ti{font-size:15px;font-weight:700;color:#1f2937}
          .vc-sub{font-size:13px;color:#6b7280;margin-top:2px}
          .vc-ar{color:#9ca3af;font-size:18px;font-weight:700}
          .vc-btn:hover .vc-ar{color:#2563eb}
        </style>
        <div class="vc-list">
          ${tours.length ? card('tour', '🗺️', 'Tour Voucher', `${tours.length} รายการ`) : ''}
          ${hotels.length ? card('hotel', '🏨', 'Hotel Voucher', `${hotels.length} รายการ`) : ''}
          ${tours.length && hotels.length ? card('both', '📑', 'ทั้ง Tour และ Hotel', 'สร้างทั้งสองใบ') : ''}
        </div>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'ปิด',
      didOpen: () => {
        document.querySelectorAll('.vc-btn').forEach((b) =>
          b.addEventListener('click', () => { resolve(b.dataset.v); Swal.close(); }));
      },
      willClose: () => resolve(null),
    });
  });
  if (!choice) return;

  const types = choice === 'both' ? ['tour', 'hotel'] : [choice];
  Swal.fire({ title: 'กำลังสร้าง Voucher...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  const results = [];
  try {
    for (const type of types) {
      const items = type === 'tour' ? tours : hotels;
      const data = await generateVoucher({ type, customer: cust, items });
      downloadPdfBase64(data.pdfBase64, data.name);
      results.push(data);
    }
  } catch (err) {
    await Swal.fire({ title: 'สร้างไม่สำเร็จ', text: err.message, icon: 'error' });
    return;
  }

  await Swal.fire({
    title: 'สร้าง Voucher เรียบร้อย ✓',
    icon: 'success',
    html: `<div style="text-align:left">ดาวน์โหลด PDF ให้อัตโนมัติแล้ว และเก็บไฟล์ Slides ไว้ใน Drive:<br/><br/>${results.map((r) => `📄 <b>${r.name}</b><br/><a href="${r.slidesUrl}" target="_blank" rel="noopener" style="color:#2563eb">เปิดใน Google Slides ↗</a>`).join('<br/><br/>')}</div>`,
    confirmButtonText: 'เรียบร้อย',
  });
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
