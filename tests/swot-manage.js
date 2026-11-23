const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs'), path = require('path');
const root = require('path').resolve(__dirname, '..');
let html = fs.readFileSync(root + '/index.html', 'utf8').replace(/<link[^>]*>/g, '');
const errs = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => /getContext/.test((e.detail&&e.detail.message)||e.message) || errs.push('jsdomError: ' + (e.detail && e.detail.message || e.message))); vc.on('error', e => errs.push('console.error: ' + e));
const dom = new JSDOM(html, {url: 'file://' + root + '/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc});
const w = dom.window, d = w.document;
w.HTMLCanvasElement.prototype.getContext = () => ({font: '', measureText: t => ({width: String(t).length * 8}), fillText(){}, fillRect(){}, clearRect(){}, beginPath(){}, stroke(){}, fill(){}, save(){}, restore(){}});  // jsdom ไม่มี canvas จริง
w.matchMedia = w.matchMedia || (() => ({matches: false, addEventListener(){}, removeListener(){}}));
w.HTMLElement.prototype.scrollIntoView = function(){};
w.SVGElement.prototype.getBoundingClientRect = w.HTMLElement.prototype.getBoundingClientRect;
w.Element.prototype.setPointerCapture = function(){};
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true}));
const ev = (code) => w.eval(code);

/* ตรวจการย้าย/แก้ไข/ลบ รายการในหน้า "สำรวจ SWOT" (โหมดตัวอย่าง ไม่ต่อฐานข้อมูลจริง)  รัน: node tests/swot-manage.js */
w.print = () => {};
const fire = (el, type, extra) => { const e = new w.Event(type, {bubbles: true, cancelable: true}); Object.defineProperty(e, 'dataTransfer', {value: {setData(){}, getData(){ return ''; }, effectAllowed: '', dropEffect: ''}}); if (extra) Object.assign(e, extra); el.dispatchEvent(e); return e; };
const idle = async () => { for (let i = 0; i < 100; i++){ if (ev('pend') === 0) break; await sleep(50); } await sleep(120); };
const row = id => $('.swx .li[data-oe="' + id + '"]');
const entry = id => { const t = ev("JSON.stringify(A.d.entries.find(e => String(e.id) === '" + id + "') || null)"); return JSON.parse(t); };
const server = async id => (await ev("rpc('sx_admin_all', {p_pass: ''})")).entries.find(e => String(e.id) === id);
const nEntries = () => ev('A.d.entries.length');
async function dragDrop(id, zoneSel){ const n = row(id), z = $(zoneSel); if (!n || !z) throw new Error('missing ' + (n ? zoneSel : 'row ' + id)); fire(n, 'dragstart'); fire(z, 'dragover'); fire(z, 'drop'); fire(n, 'dragend'); await idle(); }
const snackTxt = () => ($('#bsnack.show') || {textContent: ''}).textContent;
const openMenu = async id => { click(row(id).querySelector('[data-bmove]')); await sleep(100); };
const pickItem = async re => { click($$('#bmodal .bm-it').find(b => re.test(b.textContent))); await idle(); };
(async () => {
  await sleep(1800);
  ev("startDemo('admin')"); await sleep(1800);
  click($('[data-atab="swot"]')); await sleep(400);
  ok(!!$('.swx') && $('.swx').closest('[data-sxm]') && $$('.swx .card[data-bdrop^="kind:"]').length === 4, 'หน้าสำรวจ SWOT: ทั้ง 4 ช่อง S/W/O/T เป็นโซนวาง');
  ok($$('.swx .li').length > 10 && $$('.swx .li').every(l => l.getAttribute('draggable') === 'true' && l.querySelector('.sn-mv')), 'ทุกรายการลากได้และมีปุ่ม ⋮');
  const E = JSON.parse(ev("JSON.stringify(A.d.entries.find(e => e.kind === 'S' && e.frame === 'systems'))")); const id = String(E.id), total0 = nEntries();
  // ---- ลากข้ามช่องในฝั่งเดียวกัน (S → W) ----
  fire(row(id), 'dragstart'); ok($('[data-sxm]').classList.contains('dnd') && $('.swx .card.W').classList.contains('z-ok') && $('.swx .card.O').classList.contains('z-ok') && $$('.bdz').length >= 2, 'เริ่มลาก: ทุกช่อง SWOT และแถบประเด็นรวมกลายเป็นโซนวาง'); fire(row(id), 'dragend');
  await dragDrop(id, '.swx .card.W');
  ok(entry(id).kind === 'W' && entry(id).frame === 'systems' && !!row(id).closest('.card.W'), 'ลาก S → W: เปลี่ยนเป็นจุดอ่อน คงหมวด 7S เดิม และรายการไปอยู่ช่อง W');
  ok((await server(id)).kind === 'W' && /จุดอ่อน/.test(snackTxt()), 'บันทึกลงฐานข้อมูลแล้ว และมีแถบเลิกทำ');
  click($('#bsnack button')); await idle(); ok(entry(id).kind === 'S' && !!row(id).closest('.card.S') && (await server(id)).kind === 'S', 'เลิกทำ: กลับเป็น S');
  // ---- ลากข้ามฝั่ง (S → O): ล้างหมวด ----
  await dragDrop(id, '.swx .card.O');
  ok(entry(id).kind === 'O' && entry(id).frame === null && !!row(id).closest('.card.O') && /ล้างหมวดเดิม/.test(snackTxt()), 'ลาก S → O: เปลี่ยนเป็นโอกาส ล้างหมวด 7S เดิม (ไม่ให้ค้างหมวดผิดฝั่ง) และแจ้งในแถบ');
  ok((await server(id)).frame === null && (await server(id)).kind === 'O', 'ฐานข้อมูลตรงกัน');
  click($('#bsnack button')); await idle(); ok(entry(id).kind === 'S' && entry(id).frame === 'systems', 'เลิกทำ: กลับเป็น S และหมวดเดิม (systems)');
  await dragDrop(id, '.swx .card.S'); ok(/ตำแหน่งนี้แล้ว/.test($('#toast').textContent), 'วางที่ช่องเดิม: แจ้งว่าอยู่ตำแหน่งนี้แล้ว');
  // ---- จัดเข้าประเด็นรวมจากหน้านี้ ----
  const cid = ev('A.d.clusters[0].id'); await dragDrop(id, '[data-bdrop="cl:' + cid + '"]');
  ok(entry(id).cluster_id === cid && (await server(id)).cluster_id === cid, 'ลากไปแถบประเด็นรวม: จัดเข้าประเด็นได้จากหน้าสำรวจ SWOT'); click($('#bsnack button')); await idle();
  // ---- เมนู ⋮ ----
  await openMenu(id);
  const items = $$('#bmodal .bm-it').map(b => b.textContent);
  ok($$('#bmodal .bm-sec').length === 4 && items.some(t => /แก้ไขข้อความ/.test(t)) && items.some(t => /ลบรายการ/.test(t)) && $$('#bmodal .bm-it.danger').length === 1 && (!$('#sxDrawer') || $('#sxDrawer').hidden), 'กด ⋮: เมนูมี ย้ายหมวด/เปลี่ยนประเภท/ประเด็น/แก้ไข/ลบ โดยไม่เปิดแผงรายละเอียด');
  await pickItem(/เป็น W/); ok(entry(id).kind === 'W' && entry(id).frame === 'systems', 'เมนู ⋮ เปลี่ยนประเภท S → W'); click($('#bsnack button')); await idle();
  // ---- แก้ไขข้อความ ----
  const orig = entry(id);
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /แก้ไขข้อความ/.test(b.textContent))); await sleep(100);
  const f = $('#bmodal form'); ok(!!f && f.elements.body.value === orig.body && !f.elements.detail, 'แก้ไขข้อความ: ฟอร์มมีข้อความเดิม (ไม่มีช่องรายละเอียดสำหรับ SWOT)');
  f.elements.body.value = '   '; f.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await sleep(80);
  ok(!!$('#bmodal') && !$('#bmodal .err').hidden && entry(id).body === orig.body, 'ข้อความว่าง: ไม่บันทึก และขึ้นข้อความเตือน');
  f.elements.body.value = 'แก้ไขแล้ว: ระบบรายงานซ้ำซ้อนลดลง'; f.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await idle();
  const ed = entry(id);
  ok(ed.body === 'แก้ไขแล้ว: ระบบรายงานซ้ำซ้อนลดลง' && ed.wg === orig.wg && ed.author === orig.author && ed.kind === orig.kind && ed.frame === orig.frame && !$('#bmodal'), 'บันทึกการแก้ไข: เปลี่ยนเฉพาะข้อความ กลุ่มงาน/ผู้กรอก/ประเภท/หมวดคงเดิม');
  ok((await server(id)).body === ed.body && /\u0e41\u0e01\u0e49\u0e44\u0e02\u0e41\u0e25\u0e49\u0e27/.test(row(id).textContent) && /แก้ไขข้อความแล้ว/.test(snackTxt()), 'ฐานข้อมูลและหน้าจอแสดงข้อความใหม่ พร้อมแถบเลิกทำ');
  click($('#bsnack button')); await idle(); ok(entry(id).body === orig.body && (await server(id)).body === orig.body, 'เลิกทำการแก้ไข: ข้อความกลับเป็นเดิมทั้งสองที่');
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /แก้ไขข้อความ/.test(b.textContent))); await sleep(80); $('#bmodal form').elements.body.value = 'ลองพิมพ์แล้วยกเลิก'; fire(w.document, 'keydown', {key: 'Escape'}); await sleep(80);
  ok(!$('#bmodal') && entry(id).body === orig.body, 'กด Esc ยกเลิกการแก้ไข: ข้อความไม่เปลี่ยน');
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /แก้ไขข้อความ/.test(b.textContent))); await sleep(80); $('#bmodal form').dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await sleep(80);
  ok(/ไม่มีการเปลี่ยนแปลง/.test($('#toast').textContent), 'กดบันทึกโดยไม่แก้อะไร: แจ้งว่าไม่มีการเปลี่ยนแปลง');
  // ---- ลบ ----
  const before = entry(id);
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /ลบรายการ/.test(b.textContent))); await sleep(100);
  ok(/ลบรายการนี้\?/.test($('#bmodal').textContent) && $$('#bmodal .bm-it').length === 2 && nEntries() === total0 && !!row(id), 'ลบ: ต้องยืนยันก่อน ยังไม่ลบจนกว่าจะกดยืนยัน');
  click($$('#bmodal .bm-it').find(b => /ยกเลิก/.test(b.textContent))); await idle(); ok(nEntries() === total0 && !!row(id) && !$('#bmodal'), 'ยกเลิกในหน้ายืนยัน: ไม่ลบอะไร');
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /ลบรายการ/.test(b.textContent))); await sleep(80); click($$('#bmodal .bm-it.danger')[0]); await idle();
  ok(nEntries() === total0 - 1 && !row(id) && !entry(id) && !(await server(id)) && /ลบรายการแล้ว/.test(snackTxt()), 'ยืนยันลบ: รายการหายจากหน้าจอและฐานข้อมูล พร้อมแถบเลิกทำ');
  click($('#bsnack button')); await idle();
  const back = entry(id); const sb = await server(id);
  ok(nEntries() === total0 && !!row(id) && back.body === before.body && back.wg === before.wg && back.author === before.author && back.kind === before.kind && back.frame === before.frame && back.created_at === before.created_at && !!sb && sb.body === before.body, 'เลิกทำการลบ: กู้รายการกลับครบ (ข้อความ/กลุ่มงาน/ผู้กรอก/ประเภท/หมวด/เวลาสร้าง) ทั้งหน้าจอและฐานข้อมูล');
  // ---- ล้มเหลวแล้วย้อนกลับ ----
  ev("var __r = rpc; rpc = (fn, b) => /sx_admin_(delete|edit|move)_entry/.test(fn) ? Promise.reject(new Error('เชื่อมต่อไม่ได้ (ทดสอบ)')) : __r(fn, b);");
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /ลบรายการ/.test(b.textContent))); await sleep(80); click($$('#bmodal .bm-it.danger')[0]); await idle();
  ok(nEntries() === total0 && !!row(id) && /ทดสอบ/.test($('#toast').textContent), 'ลบไม่สำเร็จ: รายการกลับมาที่เดิมและแจ้งข้อผิดพลาด');
  await openMenu(id); click($$('#bmodal .bm-it').find(b => /แก้ไขข้อความ/.test(b.textContent))); await sleep(80); const f2 = $('#bmodal form'); f2.elements.body.value = 'ควรถูกย้อนกลับ'; f2.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await idle();
  ok(entry(id).body === before.body && row(id).textContent.indexOf('ควรถูกย้อนกลับ') < 0, 'แก้ไขไม่สำเร็จ: ข้อความย้อนกลับเป็นเดิม');
  await dragDrop(id, '.swx .card.O'); ok(entry(id).kind === before.kind && entry(id).frame === before.frame && !!row(id).closest('.card.' + before.kind), 'ย้ายไม่สำเร็จ: รายการอยู่ช่องเดิม');
  ev('rpc = __r');
  // ---- กฎฝั่งเซิร์ฟเวอร์ (โหมดตัวอย่างเลียนแบบฟังก์ชันจริง) ----
  const e1 = await ev("rpc('sx_admin_edit_entry', {p_pass: '', p_id: '" + id + "', p_body: '  ', p_detail: ''}).then(() => 'ok', e => e.message)"); ok(/ข้อความว่าง/.test(e1), 'ฐานข้อมูลปฏิเสธข้อความว่าง: ' + e1);
  const e2 = await ev("rpc('sx_admin_delete_entry', {p_pass: '', p_id: '__nope'}).then(() => 'ok', e => e.message)"); ok(/ไม่พบรายการ/.test(e2), 'ลบรายการที่ไม่มี: ถูกปฏิเสธ');
  // ---- หน้า Strategic Board ใช้ตัวช่วยเดียวกัน ----
  click($('[data-atab="board"]')); await sleep(300); click($('[data-bexp="all"]')); await sleep(120);
  click($('.board-wrap .snote .sn-mv')); await sleep(100); ok($$('#bmodal .bm-it').some(b => /ลบรายการ/.test(b.textContent)) && $$('#bmodal .bm-it').some(b => /แก้ไขข้อความ/.test(b.textContent)), 'Strategic Board: เมนู ⋮ มี แก้ไข/ลบ เหมือนกัน'); fire(w.document, 'keydown', {key: 'Escape'}); await sleep(60);
  click($('[data-atab="swot"]')); await sleep(300); ok($$('.swx .card').length === 4 && !!$('.frbar'), 'หน้าสำรวจ SWOT ยังทำงานปกติหลังเพิ่มฟังก์ชัน');
  ok(errs.length === 0, 'ไม่มี runtime error ' + errs.join(' | '));
  console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
})();
