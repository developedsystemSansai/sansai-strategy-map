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

/* ตรวจตัวช่วยคิด 7S / PESTEL (ไม่บังคับ) ทั้งฝั่งกลุ่มงานและทีมยุทธศาสตร์ ในโหมดตัวอย่าง (ไม่ต่อฐานข้อมูลจริง)  รัน: node tests/frames.js */
(async () => {
  await sleep(1800);
  // ---------- กลุ่มงาน ----------
  ev("startDemo('group')"); await sleep(1800);
  const aid = $('details.aid'); ok(!!aid, 'หน้ากรอก SWOT มีตัวช่วยคิด 7S/PESTEL');
  ok(aid && !aid.hasAttribute('open') && /ไม่บังคับ/.test(aid.textContent), 'ตัวช่วยพับอยู่ในตอนแรก และระบุว่าไม่บังคับ');
  ok($$('[required]').length === 0 || !$$('[required]').some(x => x.closest('.section')), 'ช่องกรอก SWOT ไม่มีช่องบังคับกรอก');
  click($('[data-aidsum]')); await sleep(30); ok(ev('G.aid.open') === true, 'กดหัวข้อแล้วสถานะเปิดถูกจำไว้');
  const countS = () => $$('[data-block="S"] .item').length;
  const s0 = countS();
  click($('[data-aidadd="S"][data-fr="systems"]')); await sleep(80);
  ok(countS() === s0 + 1, 'กด "+ จุดแข็ง" ที่การ์ดระบบงาน เพิ่มช่องใหม่ในกล่อง S');
  ok($('details.aid').hasAttribute('open'), 'หลังเพิ่ม ตัวช่วยยังเปิดอยู่ ไม่เด้งปิด');
  let item = $$('[data-block="S"] .item').pop();
  ok(item.querySelector('.f-frame').value === 'systems', 'ช่องใหม่ติดหมวด "ระบบงานและเครื่องมือ" ให้อัตโนมัติ');
  ok(item.querySelectorAll('.f-frame option').length === 8, 'รายการ S/W เลือกหมวดได้ 7 หมวด 7S + ไม่ระบุ');
  const ta = item.querySelector('.f-body'); ta.value = 'ทดสอบ: ระบบรายงานซ้ำซ้อน'; ta.dispatchEvent(new w.Event('input', {bubbles: true})); await sleep(1500);
  const mine = async () => (await ev("rpc('sx_my_entries', {p_pass: '', p_wg: session.wg})")).entries;
  let me = (await mine()).find(e => e.body === 'ทดสอบ: ระบบรายงานซ้ำซ้อน');
  ok(me && me.frame === 'systems', 'บันทึกแล้ว: ส่งหมวดไปพร้อมข้อความ  [' + (me && me.frame) + ']');
  item = $$('[data-block="S"] .item').pop(); const fs = item.querySelector('.f-frame'); fs.value = 'staff'; fs.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(600);
  me = (await mine()).find(e => e.body === 'ทดสอบ: ระบบรายงานซ้ำซ้อน'); ok(me && me.frame === 'staff', 'เปลี่ยนหมวดทีหลังได้ และบันทึกตาม');
  fs.value = ''; $$('[data-block="S"] .item').pop().querySelector('.f-frame').dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(600);
  me = (await mine()).find(e => e.body === 'ทดสอบ: ระบบรายงานซ้ำซ้อน'); ok(me && (me.frame === null || me.frame === undefined), 'ตั้งกลับเป็น "ไม่ระบุ" ได้');
  // เขียนตามปกติโดยไม่ใช้ตัวช่วย
  click($('[data-add="W"]')); await sleep(60); const wItem = $$('[data-block="W"] .item').pop();
  ok(wItem.querySelector('.f-frame').value === '', 'ปุ่มเพิ่มปกติ: ไม่ติดหมวดใด ๆ');
  const wt = wItem.querySelector('.f-body'); wt.value = 'ทดสอบ: เขียนเองโดยไม่ใช้กรอบ'; wt.dispatchEvent(new w.Event('input', {bubbles: true})); await sleep(1500);
  const w1 = (await mine()).find(e => e.body === 'ทดสอบ: เขียนเองโดยไม่ใช้กรอบ'); ok(!!w1 && !w1.frame, 'ไม่ใช้ตัวช่วย ก็บันทึกได้ตามปกติ (ไม่บังคับ)');
  // PESTEL
  click($('[data-aidset="ex"]')); await sleep(60);
  ok($$('.aid-card').length === 6 && /Political/.test($('.aid').textContent) && /Legal/.test($('.aid').textContent), 'สลับไปมุมมองภายนอก: การ์ด PESTEL 6 ใบ');
  ok($$('.aid-card [data-aidadd="O"]').length === 6 && $$('.aid-card [data-aidadd="T"]').length === 6 && !$('.aid-card [data-aidadd="S"]'), 'การ์ดภายนอกมีปุ่ม โอกาส/อุปสรรค เท่านั้น');
  click($('[data-aidadd="T"][data-fr="environmental"]')); await sleep(60);
  const tItem = $$('[data-block="T"] .item').pop(); ok(tItem.querySelector('.f-frame').value === 'environmental' && tItem.querySelectorAll('.f-frame option').length === 7, 'ช่อง T ติดหมวดสิ่งแวดล้อม และเลือกได้ 6 หมวด PESTEL + ไม่ระบุ');
  ok(!$('[data-block="ISSUE"] .f-frame') && !$('[data-block="DATA"] .f-frame'), 'ประเด็น/ข้อเสนอ/ข้อมูล ไม่มีช่องหมวด');

  // ---------- ทีมยุทธศาสตร์ ----------
  ev("startDemo('admin')"); await sleep(1800);
  click($('[data-atab="swot"]')); await sleep(300);
  ok(!!$('.frbar') && !!$('select[data-sf="fr"]'), 'หน้าสำรวจ SWOT มีแถบสรุปหมวดและตัวกรองหมวด');
  const all = $$('.swx .li').length; ok(all > 5, 'มีรายการให้กรอง (' + all + ')');
  const chips = $$('.chip.fr').filter(c => !/S 0 · W 0|O 0 · T 0/.test(c.textContent));
  const firstChip = chips[0]; const key = firstChip.dataset.ffr; click(firstChip); await sleep(200);
  const filtered = $$('.swx .li'); ok(filtered.length > 0 && filtered.length < all, 'กดหมวดแล้วกรองรายการ (' + all + ' → ' + filtered.length + ')');
  const lbl = ev("FR.label('" + key + "')"); ok(filtered.every(li => [...li.querySelectorAll('.chip.frame')].some(c => c.textContent === lbl)), 'ทุกรายการที่แสดงเป็นหมวด "' + lbl + '"');
  click($('.chip.fr.on')); await sleep(200); ok($$('.swx .li').length === all, 'กดหมวดซ้ำเพื่อยกเลิกตัวกรอง');
  const sel = $('select[data-sf="fr"]'); sel.value = '_none'; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(200);
  const noFr = $$('.swx .li'); ok(noFr.length > 0 && noFr.length < all && noFr.every(li => !li.querySelector('.chip.frame')), 'ตัวกรอง "ยังไม่ระบุหมวด" แสดงเฉพาะรายการที่ไม่มีหมวด (' + noFr.length + ')');
  const hdr = ev("SXS.csvRows(A.d.entries, A.d.clusters, A.sw)[0]"); ok(/หมวดแนวคิด/.test(hdr[hdr.length - 1]), 'CSV มีคอลัมน์หมวดแนวคิด');
  ok(errs.length === 0, 'ไม่มี runtime error ' + errs.join(' | '));
  console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
})();
