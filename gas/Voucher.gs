/**
 * Hala Walla – Voucher Generator (Google Apps Script Web App)
 * ----------------------------------------------------------------
 * รับข้อมูลลูกค้า + รายการ (tour หรือ hotel) จากเว็บแอป แล้ว:
 *   1) ก็อปปี้ Slide template (กันไม่ให้ template ตัวจริงพัง)
 *   2) เติมข้อมูลลง placeholder {{...}} ในตาราง (เตรียมไว้ 4 แถว/สไลด์)
 *        - มีน้อยกว่า 4 แถว  → ลบแถวที่เหลือออก
 *        - มากกว่า 4 แถว     → ก็อปสไลด์เพิ่มจนครบ แล้วเติมต่อ
 *   3) ตั้งชื่อไฟล์ Tour_Voucher_<item_id> / Hotel_Voucher_<item_id>
 *      เก็บไว้ในโฟลเดอร์ Drive ที่กำหนด
 *   4) ส่งกลับ: ลิงก์ Google Slides (แก้ได้) + ไฟล์ PDF (base64) ให้เว็บดาวน์โหลด
 *
 * วิธี deploy ดูที่ VOUCHER_README.md  (ต้องเป็น "New version" ทุกครั้งที่แก้โค้ด)
 */

/* ====== CONFIG — แก้ id ตรงนี้ได้ถ้าเปลี่ยน template/โฟลเดอร์ ====== */
var TOUR_TEMPLATE_ID  = '1B9DZtK7JeaAX6bbHDcKsia1LuFwuASQ0TeS9rHS3Iz8';
var HOTEL_TEMPLATE_ID = '1Uv7Lc8xB_Ts2N-9JIQAIP1iXX0P0iZVVxpBGWP0uUzA';
var OUTPUT_FOLDER_ID  = '1EnNOPpbE-_jozxNSaG98ej9bE3Du_p48';
var ROWS_PER_SLIDE    = 4;   // ตาราง template เตรียมไว้ 4 แถวต่อสไลด์
/* ================================================================ */

function doGet() {
  return jsonOut({ ok: true, service: 'hala-walla-voucher' });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = (data.type || '').toLowerCase();        // 'tour' | 'hotel'
    var customer = data.customer || {};
    var items = data.items || [];

    if (type !== 'tour' && type !== 'hotel') return jsonOut({ ok: false, error: 'type ต้องเป็น tour หรือ hotel' });
    if (!customer.item_id) return jsonOut({ ok: false, error: 'ไม่มี item_id' });
    if (!items.length) return jsonOut({ ok: false, error: 'ไม่มีรายการ ' + type });

    var templateId = type === 'tour' ? TOUR_TEMPLATE_ID : HOTEL_TEMPLATE_ID;
    var name = (type === 'tour' ? 'Tour_Voucher_' : 'Hotel_Voucher_') + customer.item_id;

    // 1) ก็อปปี้ template ลงโฟลเดอร์
    var folder = DriveApp.getFolderById(OUTPUT_FOLDER_ID);
    var copy = DriveApp.getFileById(templateId).makeCopy(name, folder);
    var copyId = copy.getId();

    // 2) เติมข้อมูล
    var pres = SlidesApp.openById(copyId);
    fillVoucher(pres, type, customer, items);
    pres.saveAndClose();

    // 3) export PDF (base64)
    var pdfBlob = DriveApp.getFileById(copyId).getAs('application/pdf');
    var pdfBase64 = Utilities.base64Encode(pdfBlob.getBytes());

    return jsonOut({
      ok: true,
      type: type,
      name: name,
      slidesId: copyId,
      slidesUrl: 'https://docs.google.com/presentation/d/' + copyId + '/edit',
      pdfBase64: pdfBase64,
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

/* ---------- เติมข้อมูลลงทั้ง presentation ---------- */
function fillVoucher(pres, type, customer, items) {
  var slides = pres.getSlides();
  var template = slides[0];                 // สไลด์แรก = template ที่มีตาราง 4 แถว
  var needed = Math.max(1, Math.ceil(items.length / ROWS_PER_SLIDE));

  // ก็อปสไลด์เพิ่มให้ครบจำนวนที่ต้องใช้ (ดันต่อท้ายเรียงกัน)
  var slideObjs = [template];
  var last = template;
  for (var i = 1; i < needed; i++) { last = last.duplicate(); slideObjs.push(last); }

  // เติมตารางทีละสไลด์ (สไลด์ละ 4 แถว)
  for (var s = 0; s < needed; s++) {
    var batch = items.slice(s * ROWS_PER_SLIDE, s * ROWS_PER_SLIDE + ROWS_PER_SLIDE);
    fillSlideTable(slideObjs[s], type, batch);
  }

  // ข้อมูลส่วนหัว/ลูกค้า เหมือนกันทุกสไลด์ → แทนที่ทั้ง presentation
  pres.replaceAllText('{{issue_date}}', safe(customer.issue_date));
  pres.replaceAllText('{{item_id}}', safe(customer.item_id));
  pres.replaceAllText('{{name}}', safe(customer.guest_name));
  pres.replaceAllText('{{nationality}}', safe(customer.nationality));
  pres.replaceAllText('{{customer_detail}}', safe(customer.customer_detail));
}

/* ---------- เติม/ลบแถวในตารางของสไลด์เดียว ---------- */
function fillSlideTable(slide, type, batch) {
  var table = findDataTable(slide, type);
  if (!table) return;

  var dataRows = table.getNumRows() - 1;    // แถวแรกเป็น header
  if (dataRows < 1) return;

  // เติมข้อมูลแถว 1..batch.length
  for (var r = 0; r < batch.length && r < dataRows; r++) {
    var tokens = type === 'tour' ? tourRowTokens(batch[r]) : hotelRowTokens(batch[r]);
    fillRow(table, r + 1, tokens);
  }
  // ลบแถวที่เหลือ (ไล่จากล่างขึ้นบน เพื่อไม่ให้ index เลื่อน)
  for (var rowIndex = dataRows; rowIndex >= batch.length + 1; rowIndex--) {
    table.getRow(rowIndex).remove();
  }
}

function fillRow(table, rowIndex, tokens) {
  var row = table.getRow(rowIndex);
  var nCells = row.getNumCells();
  for (var c = 0; c < nCells; c++) {
    var txt = row.getCell(c).getText();
    for (var k in tokens) { txt.replaceAllText('{{' + k + '}}', safe(tokens[k])); }
  }
}

// หาตารางข้อมูล: ตารางที่มี token ประจำชนิดนั้น (กันไปโดนตารางอื่นในสไลด์)
function findDataTable(slide, type) {
  var tables = slide.getTables();
  if (!tables.length) return null;
  var token = type === 'tour' ? '{{tour_date}}' : '{{stay_range}}';
  for (var i = 0; i < tables.length; i++) {
    if (tableContains(tables[i], token)) return tables[i];
  }
  // เผื่อไว้: เลือกตารางที่มีแถวเยอะสุด
  var best = tables[0];
  for (var j = 1; j < tables.length; j++) { if (tables[j].getNumRows() > best.getNumRows()) best = tables[j]; }
  return best;
}

function tableContains(table, needle) {
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      if (row.getCell(c).getText().asString().indexOf(needle) >= 0) return true;
    }
  }
  return false;
}

/* ---------- map ข้อมูล → token ของแต่ละแถว ---------- */
function tourRowTokens(t) {
  return {
    tour_date:   dmy(t.tour_date),
    tour_detail: t.tour_detail || t.tour_name || '',
    adult_child: adultChild(t.adult, t.child),
    company:     t.company_name || '',
    hotel:       t.hotel_name || '',
    room_no:     t.room_number || '',
    pickup_time: t.pickup_time || '',
    note:        t.note || '',
  };
}

function hotelRowTokens(h) {
  return {
    stay_range:          dmy(h.check_in) + ' - ' + dmy(h.check_out),
    night:               (parseInt(h.total_night) || 0) + ' Night(s)',
    hotel_name:          h.hotel_name || '',
    room_type:           h.room_name || '',
    room:                (parseInt(h.total_room) || 1) + '',
    breakfast:           h.breakfast || '',
    confirmation_number: h.confirmation_number || '',
    note:                h.note || '',
  };
}

/* ---------- helpers ---------- */
function dmy(ymd) {
  if (!ymd) return '';
  var p = String(ymd).split('-');
  if (p.length < 3) return String(ymd);
  return p[2].slice(0, 2) + '/' + p[1] + '/' + p[0];   // YYYY-MM-DD → DD/MM/YYYY
}

function adultChild(a, c) {
  a = parseInt(a) || 0; c = parseInt(c) || 0;
  var parts = [];
  if (a) parts.push(a + ' Adult');
  if (c) parts.push(c + ' Child');
  return parts.join(' / ') || '-';
}

function safe(v) { return (v === undefined || v === null) ? '' : String(v); }

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
