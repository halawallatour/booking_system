/**
 * Hala Walla – Google Sheet Backup (Google Apps Script Web App)
 * --------------------------------------------------------------
 * รับข้อมูลลูกค้า 1 ราย (พร้อม tour/hotel) จากเว็บแอป แล้วเขียนลง Google Sheet
 * เป็นการสำรองข้อมูล (backup) อัตโนมัติทุกครั้งหลังกดบันทึก
 *
 * วิธี deploy ดูที่ README.md ในโฟลเดอร์เดียวกัน
 *
 * โครงสร้างชีต (สร้างให้อัตโนมัติถ้ายังไม่มี):
 *   - Customers : 1 แถวต่อ 1 ลูกค้า  (key = item_id)
 *   - Tours     : 1 แถวต่อ 1 tour    (key = tour_id, ผูกกับ item_id)
 *   - Hotels    : 1 แถวต่อ 1 hotel    (key = hotel_id, ผูกกับ item_id)
 */

var CUSTOMER_COLS = ['item_id', 'guest_name', 'nationality', 'customer_type', 'customer_detail', 'sale_person', 'created_at', 'updated_at'];
var TOUR_COLS = ['tour_id', 'item_id', 'tour_date', 'tour_name', 'tour_detail', 'company_name', 'adult', 'child', 'pickup_time', 'hotel_name', 'room_number', 'operator_contact', 'sale_amount', 'net_amount', 'note'];
var HOTEL_COLS = ['hotel_id', 'item_id', 'check_in', 'check_out', 'total_night', 'hotel_name', 'room_name', 'total_room', 'confirmation_number', 'booking_type', 'breakfast', 'sale_amount', 'net_amount', 'note'];

function doPost(e) {
  // กันการเขียนชนกันเมื่อมีหลาย request พร้อมกัน
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return jsonOut({ ok: false, error: 'busy' });
  }
  try {
    var data = JSON.parse(e.postData.contents);
    var customer = data.customer || {};
    var itemId = customer.item_id;
    if (!itemId) return jsonOut({ ok: false, error: 'missing item_id' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1) upsert ลูกค้า (1 แถว)
    upsertRows(ss, 'Customers', CUSTOMER_COLS, 'item_id', [customer]);

    // 2) tours / hotels: ลบของ item_id นี้ออกก่อนแล้วเขียนชุดล่าสุดทับ
    //    (เพราะเว็บส่งเฉพาะ tour/hotel ที่ active มา ทำให้ชีตตรงกับ DB เสมอ)
    var tours = (data.tours || []).map(function (t) { t.item_id = itemId; return t; });
    var hotels = (data.hotels || []).map(function (h) { h.item_id = itemId; return h; });
    replaceByKey(ss, 'Tours', TOUR_COLS, 'item_id', itemId, tours);
    replaceByKey(ss, 'Hotels', HOTEL_COLS, 'item_id', itemId, hotels);

    return jsonOut({ ok: true, item_id: itemId, tours: tours.length, hotels: hotels.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return jsonOut({ ok: true, service: 'hala-walla-backup' });
}

/* ---------- helpers ---------- */

function getSheet(ss, name, cols) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function rowFrom(obj, cols) {
  return cols.map(function (c) {
    var v = obj[c];
    return (v === undefined || v === null) ? '' : v;
  });
}

// อัปเดตแถวที่ key ตรงกัน ถ้าไม่มีให้เพิ่มใหม่ (ใช้กับ Customers)
function upsertRows(ss, name, cols, keyCol, items) {
  var sheet = getSheet(ss, name, cols);
  var keyIdx = cols.indexOf(keyCol);
  var lastRow = sheet.getLastRow();
  var keys = lastRow > 1 ? sheet.getRange(2, keyIdx + 1, lastRow - 1, 1).getValues() : [];

  items.forEach(function (obj) {
    var row = rowFrom(obj, cols);
    var foundRow = -1;
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(obj[keyCol])) { foundRow = i + 2; break; }
    }
    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, cols.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
}

// ลบทุกแถวที่ keyCol == keyVal แล้วเขียน items ชุดใหม่ลงไป (ใช้กับ Tours/Hotels)
function replaceByKey(ss, name, cols, keyCol, keyVal, items) {
  var sheet = getSheet(ss, name, cols);
  var keyIdx = cols.indexOf(keyCol);
  var lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, cols.length).getValues();
    // ลบจากล่างขึ้นบนเพื่อไม่ให้ index เลื่อน
    for (var i = values.length - 1; i >= 0; i--) {
      if (String(values[i][keyIdx]) === String(keyVal)) {
        sheet.deleteRow(i + 2);
      }
    }
  }
  if (items.length) {
    var rows = items.map(function (o) { return rowFrom(o, cols); });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, cols.length).setValues(rows);
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
