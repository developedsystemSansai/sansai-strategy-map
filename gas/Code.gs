/**
 * Strategy Map Builder – โรงพยาบาลสันทราย
 * Backend: Google Apps Script Web App (เก็บข้อมูลใน Google Sheet)
 *
 * Script Properties ที่ใช้ (Project Settings → Script properties):
 *   PASSCODE  = รหัสผ่านเข้าใช้งาน (แนะนำให้ตั้งเสมอ)
 *   SHEET_ID  = (ไม่บังคับ) ID ของ Google Sheet ที่มีอยู่แล้ว ถ้าไม่ตั้ง ระบบจะสร้างไฟล์ใหม่ให้เอง
 */
var DB_NAME = 'StrategyMap_DB_รพ.สันทราย';
var MAPS_SHEET = 'Maps';
var CHUNK = 40000; // ขีดจำกัดเซลล์ Google Sheet = 50,000 ตัวอักษร จึงแบ่งเก็บเป็นก้อน
var HEADER = ['id', 'org', 'year', 'updatedAt', 'json (แบ่งเป็นหลายคอลัมน์)'];

function props_() { return PropertiesService.getScriptProperties(); }

function doGet() {
  return out_({ ok: true, data: 'Strategy Map API ทำงานปกติ' });
}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var pass = props_().getProperty('PASSCODE');
    if (pass && String(req.pass) !== String(pass)) {
      return out_({ ok: false, code: 'AUTH', error: 'รหัสผ่านไม่ถูกต้อง' });
    }
    var api = { listMaps: listMaps, getMap: getMap, saveMap: saveMap, deleteMap: deleteMap, exportBSC: exportBSC };
    var fn = api[req.fn];
    if (!fn) throw new Error('ไม่รู้จักคำสั่ง: ' + req.fn);
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return out_({ ok: true, data: fn.apply(null, req.args || []) });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ss_() {
  var id = props_().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create(DB_NAME);
  props_().setProperty('SHEET_ID', ss.getId());
  return ss;
}

function mapsSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(MAPS_SHEET);
  if (!sh) {
    var first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0 && first.getName() !== MAPS_SHEET) {
      sh = first; sh.setName(MAPS_SHEET);
    } else {
      sh = ss.insertSheet(MAPS_SHEET);
    }
    sh.getRange('A:D').setNumberFormat('@');
    sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, id) {
  var n = sh.getLastRow();
  if (n < 2) return -1;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function listMaps() {
  var sh = mapsSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 4).getValues().map(function (r) {
    return { id: String(r[0]), org: String(r[1]), year: String(r[2]), updatedAt: String(r[3]) };
  }).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
}

function getMap(id) {
  var sh = mapsSheet_(), row = findRow_(sh, id);
  if (row < 0) throw new Error('ไม่พบข้อมูล');
  var vals = sh.getRange(row, 5, 1, Math.max(1, sh.getLastColumn() - 4)).getValues()[0];
  return vals.map(String).join('');
}

function saveMap(json) {
  var m = JSON.parse(json);
  if (!m.id) m.id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  m._u = new Date().toISOString();
  var text = JSON.stringify(m), chunks = [];
  for (var i = 0; i < text.length; i += CHUNK) chunks.push(text.substr(i, CHUNK));
  var sh = mapsSheet_(), row = findRow_(sh, m.id);
  var need = 4 + chunks.length;
  if (sh.getMaxColumns() < need) sh.insertColumnsAfter(sh.getMaxColumns(), need - sh.getMaxColumns());
  if (row < 0) row = sh.getLastRow() + 1;
  else sh.getRange(row, 5, 1, sh.getMaxColumns() - 4).clearContent();
  sh.getRange(row, 1, 1, 4).setNumberFormat('@').setValues([[m.id, m.org || '', m.year || '', m._u]]);
  sh.getRange(row, 5, 1, chunks.length).setNumberFormat('@').setValues([chunks]);
  return { id: m.id, updatedAt: m._u };
}

function deleteMap(id) {
  var sh = mapsSheet_(), row = findRow_(sh, id);
  if (row > 0) sh.deleteRow(row);
  return true;
}

/** สร้างแท็บใหม่ใน Google Sheet จากตาราง BSC (rows = อาร์เรย์ 2 มิติ แถวแรกคือหัวตาราง) */
function exportBSC(name, rows) {
  if (!rows || !rows.length) throw new Error('ไม่มีข้อมูลให้ส่งออก');
  var ss = ss_();
  var title = String(name || 'BSC').replace(/[\[\]\*\?\:\/\\]/g, ' ').trim().slice(0, 90) || 'BSC';
  if (ss.getSheetByName(title)) title = title.slice(0, 70) + ' ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyMMdd-HHmm');
  var w = 0;
  rows.forEach(function (r) { if (r.length > w) w = r.length; });
  var data = rows.map(function (r) {
    var o = [];
    for (var i = 0; i < w; i++) {
      var v = r[i] == null ? '' : String(r[i]);
      o.push(/^[=+\-@]/.test(v) ? "'" + v : v); // กันถูกตีความเป็นสูตร
    }
    return o;
  });
  var sh = ss.insertSheet(title);
  sh.getRange(1, 1, data.length, w).setValues(data).setVerticalAlignment('top').setWrap(true);
  sh.getRange(1, 1, 1, w).setBackground('#0f766e').setFontColor('#ffffff').setFontWeight('bold');
  sh.setFrozenRows(1);
  for (var c = 1; c <= w; c++) sh.setColumnWidth(c, 140);
  return { sheet: title, url: ss.getUrl() + '#gid=' + sh.getSheetId() };
}

/** (ไม่บังคับ) รันครั้งเดียวเพื่อสร้างไฟล์ฐานข้อมูลและขออนุญาตสิทธิ์ล่วงหน้า */
function setup() {
  mapsSheet_();
  Logger.log('Sheet URL: ' + ss_().getUrl());
}
