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

/* ตรวจการลากวาง/เมนูย้ายบน Strategic Board (โหมดตัวอย่าง ไม่ต่อฐานข้อมูลจริง)  รัน: node tests/board-dnd.js */
w.print = () => {};
const fire = (el, type, extra) => { const e = new w.Event(type, {bubbles: true, cancelable: true}); Object.defineProperty(e, 'dataTransfer', {value: {setData(){}, getData(){ return ''; }, effectAllowed: '', dropEffect: ''}}); if (extra) Object.assign(e, extra); el.dispatchEvent(e); return e; };
const idle = async () => { for (let i = 0; i < 100; i++){ if (ev('pend') === 0) break; await sleep(50); } await sleep(120); };   // รอจนไม่มีคำขอค้าง แล้วรอให้หน้าจอวาดเสร็จ
const note = id => $('.board-wrap .snote[data-oe="' + id + '"]');
const entry = id => JSON.parse(ev("JSON.stringify(A.d.entries.find(e => String(e.id) === '" + id + "'))"));
const server = async id => (await ev("rpc('sx_admin_all', {p_pass: ''})")).entries.find(e => String(e.id) === id);
async function dragDrop(id, zoneSel){ const n = note(id), z = $(zoneSel); if (!n || !z) throw new Error('missing ' + (n ? zoneSel : 'note ' + id)); fire(n, 'dragstart'); fire(z, 'dragover'); fire(z, 'drop'); fire(n, 'dragend'); await idle(); }
const snackTxt = () => ($('#bsnack.show') || {textContent: ''}).textContent;
(async () => {
  await sleep(1800);
  ev("startDemo('admin')"); await sleep(1800);
  click($('[data-atab="board"]')); await idle(); click($('[data-bexp="all"]')); await sleep(150);   // ขยายทุกการ์ดเพื่อให้เห็นทุกโน้ต
  ok($$('.board-wrap .snote').length > 10 && $$('.board-wrap .snote').every(n => n.getAttribute('draggable') === 'true'), 'โน้ตทุกใบลากได้ (draggable)');
  ok($$('.board-wrap .snote .sn-mv').length === $$('.board-wrap .snote').length, 'ทุกโน้ตมีปุ่ม ⋮ สำหรับย้ายโดยไม่ต้องลาก (มือถือ/แป้นพิมพ์)');
  const A1 = JSON.parse(ev("JSON.stringify(A.d.entries.find(e => e.kind === 'S' && e.frame === 'systems'))")); const id = String(A1.id);
  // ---- ไฮไลต์โซนวางตอนเริ่มลาก ----
  fire(note(id), 'dragstart');
  ok($('.board-wrap').classList.contains('dnd') && note(id).classList.contains('dragging') && ev('SXB.isDragging()') === true, 'เริ่มลาก: เข้าโหมดลาก ไม่รีเฟรชหน้า (isDragging = true)');
  ok($('[data-bdrop="frame:staff"]').classList.contains('z-ok') && $('[data-bdrop="frame:political"]').classList.contains('z-x'), 'โซนฝั่งเดียวกัน (7S) ขึ้นกรอบเขียว โซนข้ามฝั่ง (PESTEL) ขึ้นกรอบเทา');
  ok($$('.bdock .bdz').length === ev('A.d.clusters.length') + 2 && $$('.bdock .bdz').every(z => z.classList.contains('z-ok')), 'แถบด้านล่างมีประเด็นรวมทุกประเด็น + เอาออกจากประเด็น + ล้างหมวด');
  fire($('[data-bdrop="frame:staff"]'), 'dragover'); ok($('[data-bdrop="frame:staff"]').classList.contains('over'), 'ลากผ่านโซน: ไฮไลต์โซนที่จะวาง');
  fire(note(id), 'dragend'); ok(!$('.board-wrap').classList.contains('dnd') && !$('.z-ok') && ev('SXB.isDragging()') === false, 'ปล่อยนอกโซน: ยกเลิกการลาก กลับเป็นปกติและไม่ย้ายอะไร');
  ok(entry(id).frame === 'systems', 'รายการยังอยู่หมวดเดิม');
  // ---- ย้ายหมวดฝั่งเดียวกัน + เลิกทำ ----
  await dragDrop(id, '[data-bdrop="frame:staff"]');
  ok(entry(id).frame === 'staff' && entry(id).kind === 'S' && !!note(id) && !!note(id).closest('[data-bcardkey="staff"]'), 'ลากไปการ์ดอัตรากำลัง: หมวดเปลี่ยนเป็น staff และโน้ตไปอยู่ในการ์ดนั้น');
  ok((await server(id)).frame === 'staff', 'บันทึกลงฐานข้อมูลแล้ว (อ่านซ้ำจากเซิร์ฟเวอร์)');
  ok(/เลิกทำ/.test(snackTxt()) && /อัตรากำลัง/.test(snackTxt()), 'มีแถบแจ้ง "เลิกทำ" พร้อมชื่อหมวดปลายทาง');
  click($('#bsnack button')); await idle(); ok(entry(id).frame === 'systems' && (await server(id)).frame === 'systems' && !!note(id).closest('[data-bcardkey="systems"]'), 'เลิกทำ: กลับหมวดเดิมทั้งหน้าจอและฐานข้อมูล');
  // ---- วางที่เดิม ----
  await dragDrop(id, '[data-bdrop="frame:systems"]'); ok(/ตำแหน่งนี้แล้ว/.test($('#toast').textContent) && entry(id).frame === 'systems', 'วางที่เดิม: แจ้งว่าอยู่ตำแหน่งนี้แล้ว ไม่เปลี่ยนอะไร');
  // ---- ข้ามฝั่ง: ต้องเลือกประเภท ----
  await dragDrop(id, '[data-bdrop="frame:political"]');
  ok(!!$('#bmodal') && $$('#bmodal .bm-it').length === 2 && /O · /.test($('#bmodal').textContent) && /T · /.test($('#bmodal').textContent) && entry(id).kind === 'S', 'วางข้ามฝั่ง: ถามประเภทใหม่ (O/T) ก่อน ยังไม่เปลี่ยนจนกว่าจะเลือก');
  fire(w.document, 'keydown', {key: 'Escape'}); await sleep(80); ok(!$('#bmodal') && entry(id).kind === 'S' && entry(id).frame === 'systems', 'กด Esc ยกเลิก: รายการไม่เปลี่ยน');
  await dragDrop(id, '[data-bdrop="frame:political"]'); click($$('#bmodal .bm-it').find(b => /^O · /.test(b.textContent))); await idle();
  ok(entry(id).kind === 'O' && entry(id).frame === 'political' && !!note(id).closest('.board.ex'), 'เลือก O: รายการย้ายไปกระดาน B หมวดนโยบาย เปลี่ยนเป็นโอกาส');
  const sv = await server(id); ok(sv.kind === 'O' && sv.frame === 'political', 'ฐานข้อมูลเปลี่ยนตาม (kind=O, frame=political)');
  click($('#bsnack button')); await idle(); ok(entry(id).kind === 'S' && entry(id).frame === 'systems' && !!note(id).closest('.board.in'), 'เลิกทำการย้ายข้ามฝั่ง: กลับเป็น S หมวดเดิม');
  // ---- จัดเข้าประเด็นรวม ----
  const B1 = JSON.parse(ev("JSON.stringify(A.d.entries.find(e => 'SWOT'.includes(e.kind) && !e.cluster_id))")); const bid = String(B1.id), cid = ev('A.d.clusters[0].id');
  await dragDrop(bid, '[data-bdrop="cl:' + cid + '"]');
  ok(entry(bid).cluster_id === cid && (await server(bid)).cluster_id === cid && /จัดเข้าประเด็น/.test(snackTxt()), 'ลากไปแถบประเด็นรวม: จัดเข้าประเด็นและบันทึกแล้ว');
  click($('#bsnack button')); await idle(); ok(!entry(bid).cluster_id, 'เลิกทำ: เอาออกจากประเด็น');
  await dragDrop(bid, '[data-bdrop="cl:' + cid + '"]'); await dragDrop(bid, '[data-bdrop="cl:"]');
  ok(!entry(bid).cluster_id && /เอาออกจากประเด็น/.test(snackTxt()), 'ลากไป "เอาออกจากประเด็น": ถอดออกได้');
  // ---- ล้างหมวด ----
  await dragDrop(id, '[data-bdrop="clear"]'); ok(entry(id).frame === null && !!note(id).closest('[data-bcardkey="in:_none"]'), 'ลากไป "ล้างหมวด": ย้ายเข้าการ์ดยังไม่ระบุหมวด');
  click($('#bsnack button')); await idle(); ok(entry(id).frame === 'systems', 'เลิกทำการล้างหมวด');
  // ---- ย้ายไปหมวดที่ยังว่าง (ชิปแถบหมวดว่าง) ----
  const emptyChip = $('.board.in .chip.be[data-bdrop]'); const ek = emptyChip.dataset.bdrop.slice(6);
  await dragDrop(id, '.board.in .chip.be[data-bdrop="frame:' + ek + '"]'); ok(entry(id).frame === ek && !!note(id).closest('[data-bcardkey="' + ek + '"]'), 'วางลงชิปของหมวดที่ยังว่าง: เกิดการ์ดใหม่และโน้ตไปอยู่ในนั้น (' + ek + ')');
  click($('#bsnack button')); await idle();
  // ---- เมนู ⋮ ----
  click(note(id).querySelector('[data-bmove]')); await sleep(120);
  ok(!!$('#bmodal') && $$('#bmodal .bm-sec').length === 3 && !!$('#bmodal [aria-current]') && (!$('#sxDrawer') || $('#sxDrawer').hidden), 'กด ⋮: เปิดเมนูย้าย 3 ส่วน (หมวด/ประเภท/ประเด็นรวม) และไม่เปิดแผงรายละเอียด');
  click($$('#bmodal .bm-it').find(b => /อัตรากำลัง/.test(b.textContent))); await idle(); ok(entry(id).frame === 'staff' && !$('#bmodal'), 'เมนู ⋮: เลือกหมวดอัตรากำลัง ย้ายสำเร็จและเมนูปิด');
  click(note(id).querySelector('[data-bmove]')); await sleep(100); click($$('#bmodal .bm-it').find(b => /เป็น W/.test(b.textContent))); await idle();
  ok(entry(id).kind === 'W' && entry(id).frame === 'staff', 'เมนู ⋮: เปลี่ยนประเภท S → W คงหมวดเดิม');
  click(note(id).querySelector('[data-bmove]')); await sleep(100); click($$('#bmodal .bm-it').find(b => /เป็น T/.test(b.textContent))); await idle();
  ok(entry(id).kind === 'T' && entry(id).frame === null && !!note(id).closest('.board.ex'), 'เมนู ⋮: เปลี่ยนเป็น T ข้ามฝั่ง ล้างหมวดเดิม ไปกระดาน B');
  // ---- ตรวจกฎฝั่งเซิร์ฟเวอร์ ----
  const bad = await ev("rpc('sx_admin_move_entry', {p_pass: '', p_id: '" + id + "', p_kind: 'O', p_frame: 'systems'}).then(() => 'ok', e => e.message)"); ok(/หมวดไม่ตรงกับประเภท/.test(bad), 'ฐานข้อมูลปฏิเสธหมวดที่ไม่ตรงฝั่ง: ' + bad);
  const bad2 = await ev("rpc('sx_admin_move_entry', {p_pass: '', p_id: '" + id + "', p_kind: 'ISSUE', p_frame: null}).then(() => 'ok', e => e.message)"); ok(/S\/W\/O\/T/.test(bad2), 'ฐานข้อมูลปฏิเสธประเภทที่ไม่ใช่ S/W/O/T');
  // ---- บันทึกไม่สำเร็จ: ย้อนกลับ ----
  const before = entry(id); ev("var __r = rpc; rpc = (fn, b) => fn === 'sx_admin_move_entry' ? Promise.reject(new Error('เชื่อมต่อไม่ได้ (ทดสอบ)')) : __r(fn, b);");
  const t = $$('.board-wrap .snote').find(n => n.dataset.oe !== id && JSON.parse(ev("JSON.stringify(A.d.entries.find(e => String(e.id) === '" + n.dataset.oe + "'))")).kind === 'T'); const tid = t.dataset.oe, tb = entry(tid);
  await dragDrop(tid, '[data-bdrop="frame:legal"]'); await sleep(200); ev('rpc = __r');
  ok(entry(tid).frame === tb.frame && /ทดสอบ/.test($('#toast').textContent), 'บันทึกไม่สำเร็จ: ย้อนกลับตำแหน่งเดิมและแจ้งข้อผิดพลาด');
  ok(/SXB\.isDragging\(\)/.test(require('fs').readFileSync(root + '/app.js', 'utf8')), 'การรีเฟรชอัตโนมัติถูกพักขณะลาก');
  click($('[data-atab="swot"]')); await idle(); ok($$('.swx .card').length === 4, 'หน้าสำรวจ SWOT เดิมยังทำงานปกติ');
  ok(errs.length === 0, 'ไม่มี runtime error ' + errs.join(' | '));
  console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
})();
