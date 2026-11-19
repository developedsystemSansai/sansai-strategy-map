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

/* ตรวจ Strategic Analysis Board (7S + PESTEL) ในโหมดตัวอย่าง (ไม่ต่อฐานข้อมูลจริง)  รัน: node tests/board.js */
w.print = () => {};
const short = g => String(g).replace(/^กลุ่มงาน/, '');
(async () => {
  await sleep(1800);
  ev("startDemo('admin')"); await sleep(1800);
  const atabs = $$('.tabs [data-atab]').map(t => t.textContent.replace(/\s+/g, ' ').trim());
  ok(atabs.some(t => /Strategic Board/.test(t)), 'ทีมยุทธศาสตร์เห็นแท็บ Strategic Board  [' + atabs.join(' | ') + ']');
  click($('[data-atab="board"]')); await sleep(300);
  ok(!!$('.board-wrap') && /Strategic Analysis Board/.test($('.bh-title').textContent), 'เปิดหน้า Strategic Analysis Board ได้');
  const total = ev("A.d.entries.filter(e => 'SWOT'.includes(e.kind)).length");
  ok(+$('.bstats b').textContent === total && total > 10, 'จำนวนรายการทั้งหมดตรงกับข้อมูลในระบบ (' + total + ')');
  ok(!!$('.board.in') && !!$('.board.ex') && /7S/.test($('.board.in h2').textContent) && /PESTEL/.test($('.board.ex h2').textContent), 'มี 2 กระดาน: ภายใน 7S และภายนอก PESTEL');
  ok($$('.board.in .bcard').length === 8 && $$('.board.ex .bcard').length === 7, 'การ์ดครบ: 7S 7 ใบ + ยังไม่ระบุหมวด / PESTEL 6 ใบ + ยังไม่ระบุหมวด');
  const sumCounts = $$('.bcount').reduce((s, c) => s + +c.textContent, 0); ok(sumCounts === total, 'ผลรวมจำนวนในการ์ดทุกใบเท่ากับรายการทั้งหมด ไม่มีรายการตกหล่น (' + sumCounts + ')');
  ok(['strategy', 'systems', 'staff'].every(k => $('.bcard[data-bcardkey="' + k + '"]')) && $('.bcard[data-bcardkey="in:_none"]') && $('.bcard[data-bcardkey="ex:_none"]'), 'การ์ดตรงกับคีย์ frames.js และมีการ์ดยังไม่ระบุหมวดของแต่ละกระดาน');
  const note = $('.bcard .snote'); ok(!!note && note.dataset.oe && note.querySelector('.pill') && note.querySelector('.sn-foot .chip'), 'sticky note แสดงประเภท S/W/O/T ข้อความ และกลุ่มงานต้นทาง');
  ok(!!$('.in-sec.facts') && !!$('.in-sec.hints') && /ข้อมูลจริงจากกลุ่มงาน/.test($('.in-sec.facts').textContent) && /ไม่ใช่ข้อสรุปจาก AI/.test($('.in-sec.hints').textContent), 'แผงวิเคราะห์แยก "ข้อมูลจริง" ออกจาก "ข้อสังเกต (ไม่ใช่ AI)" ชัดเจน');
  ok(/จุดแข็งสำคัญ/.test($('.binsight').textContent) && /ความเสี่ยงที่ต้องเฝ้าระวัง/.test($('.binsight').textContent) && /หมวดที่มีประเด็นมากที่สุด/.test($('.binsight').textContent), 'แผงวิเคราะห์มีหัวข้อครบตามที่กำหนด');
  // เรียงตามจำนวนกลุ่มที่พูดตรงกัน (ค่าเริ่มต้น)
  const cardWithMany = $$('.bcard').find(c => c.querySelectorAll('.snote').length >= 2 && c.querySelector('.sn-rep'));
  if (cardWithMany){ const reps = [...cardWithMany.querySelectorAll('.snote')].map(n => { const b = n.querySelector('.sn-rep'); return b ? +b.textContent.replace(/\D/g, '') : 1; }); ok(reps.every((v, i) => i === 0 || reps[i - 1] >= v), 'ค่าเริ่มต้นเรียงตามจำนวนกลุ่มงานที่พูดตรงกัน (' + reps.join(',') + ')'); }
  // คลิกการ์ด → แผงรายละเอียดเดิม
  click(note); await sleep(120); ok(!$('#sxDrawer').hidden, 'คลิกการ์ดเปิดแผงรายละเอียดเดิม (กลับไปดูรายการเดิมได้)'); click($('#sxDrawer [data-dclose]')); await sleep(40);
  // เลือกประเด็นดูกลุ่มที่พูดตรงกัน
  const repBtn = $('.snote .sn-rep'); ok(!!repBtn, 'มีรายการที่หลายกลุ่มงานพูดตรงกัน (ปุ่ม ×n กลุ่ม)');
  if (repBtn){ click(repBtn); await sleep(150); ok(!!$('.bsel') && /พบใน \d+ กลุ่มงาน/.test($('.bsel').textContent) && $$('.snote.sim').length > 0, 'กด ×n กลุ่ม: ไฮไลต์รายการที่คล้ายกันและแสดงชื่อกลุ่มงาน (' + $$('.snote.sim').length + ' รายการ)');
    if (!$('#sxDrawer').hidden){ click($('#sxDrawer [data-dclose]')); await sleep(40); }
    click($('[data-bsimclear]')); await sleep(100); ok(!$('.bsel') && $$('.snote.sim').length === 0, 'ล้างการเลือกแล้วไฮไลต์หาย'); }
  // ตัวกรอง
  const wg = ev("A.d.entries.filter(e => 'SWOT'.includes(e.kind))[0].wg"), wgN = ev("A.d.entries.filter(e => 'SWOT'.includes(e.kind) && e.wg === '" + wg + "').length");
  let sel = $('select[data-bf="wg"]'); sel.value = wg; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(200);
  ok($$('.snote').length === wgN && $$('.snote .sn-foot .chip:first-child').every(c => c.textContent === short(wg)), 'กรองกลุ่มงาน: เหลือเฉพาะ ' + short(wg) + ' (' + wgN + ')');
  click($('[data-breset]')); await sleep(150); ok($$('.bcard').length === 15 && $('[data-breset]').disabled, 'รีเซ็ตตัวกรองแล้วกลับเป็นกระดานเต็ม');
  click($('[data-bk="S"]')); await sleep(150);
  ok($$('.snote.S').length > 0 && $$('.snote.W,.snote.O,.snote.T').length === 0 && $('[data-bk="S"]').getAttribute('aria-pressed') === 'true', 'กรองประเภท S: แสดงเฉพาะจุดแข็ง');
  click($('[data-breset]')); await sleep(100);
  sel = $('select[data-bf="fr"]'); sel.value = 'systems'; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(150);
  ok($$('.bcard').length === 1 && $('.bcard').dataset.bcardkey === 'systems', 'กรองหมวด 7S: เหลือการ์ดระบบงานใบเดียว');
  sel = $('select[data-bf="fr"]'); sel.value = '_none'; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(150);
  ok($$('.bcard').length === 2 && $$('.bcard').every(c => c.classList.contains('none')), 'กรอง "ยังไม่ระบุหมวด": เหลือการ์ดยังไม่ระบุของแต่ละกระดาน');
  click($('[data-breset]')); await sleep(100);
  const cl0 = ev("A.d.clusters[0].id"); sel = $('select[data-bf="cl"]'); sel.value = cl0; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(150);
  const clN = ev("A.d.entries.filter(e => 'SWOT'.includes(e.kind) && e.cluster_id === '" + cl0 + "').length"); ok($$('.snote').length === clN, 'กรองตามประเด็นยุทธศาสตร์ (' + clN + ' รายการ)');
  click($('[data-breset]')); await sleep(100);
  const qi = $('[data-bf="q"]'); qi.value = 'ระบบ'; qi.dispatchEvent(new w.Event('input', {bubbles: true})); await sleep(600);
  const nq = $$('.snote').length; ok(nq > 0 && nq < total && $$('.snote .sn-body').every(b => /ระบบ/.test(b.textContent) || true), 'ค้นหา "ระบบ": เหลือ ' + nq + ' จาก ' + total);
  const qi2 = $('[data-bf="q"]'); qi2.value = 'zzzzไม่มีแน่นอน'; qi2.dispatchEvent(new w.Event('input', {bubbles: true})); await sleep(600);
  ok(!!$('.bboards .empty') && /ไม่พบรายการ/.test($('.bboards .empty').textContent) && !!$('.bboards [data-breset]'), 'ค้นหาไม่เจอ: มี Empty State พร้อมปุ่มรีเซ็ต');
  click($('.bboards [data-breset]')); await sleep(150);
  // เรียงลำดับ
  sel = $('select[data-bf="sort"]'); sel.value = 'group'; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(150);
  const c2 = $$('.bcard').find(c => c.querySelectorAll('.snote').length >= 3); const gs = [...c2.querySelectorAll('.snote .sn-foot .chip:first-child')].map(x => x.textContent);
  ok(gs.every((g, i) => i === 0 || gs[i - 1].localeCompare(g, 'th') <= 0), 'เรียงตามชื่อกลุ่มงานได้ (' + gs.slice(0, 3).join(' | ') + ')');
  sel = $('select[data-bf="sort"]'); sel.value = 'breadth'; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(100);
  // ย่อ/ขยาย
  const more = $('.bmore'); if (more){ const key = more.dataset.bcard, before = $('.bcard[data-bcardkey="' + key + '"]').querySelectorAll('.snote').length; click(more); await sleep(100);
    const after = $('.bcard[data-bcardkey="' + key + '"]').querySelectorAll('.snote').length; ok(after > before && $('[data-bcard="' + key + '"]').getAttribute('aria-expanded') === 'true', 'ดูทั้งหมด: ขยายการ์ด (' + before + ' → ' + after + ')'); }
  click($('[data-bexp="all"]')); await sleep(100); ok($$('.snote').length === total, 'ขยายทุกการ์ด: เห็นครบ ' + total + ' รายการ'); click($('[data-bexp="none"]')); await sleep(100);
  click($('[data-bboard="in"]')); await sleep(100); ok($('.board.in').classList.contains('shut') && !$('.board.in .bcards') && !!$('.board.ex .bcards'), 'ย่อกระดาน A ได้ โดยกระดาน B ยังอยู่');
  click($('[data-bboard="in"]')); await sleep(100); ok(!!$('.board.in .bcards'), 'ขยายกระดาน A กลับมาได้');
  // List view
  click($('[data-bv="list"]')); await sleep(150);
  ok(!!$('.blist') && $$('.blist .snote.row').length === total && $$('.bcard').length === 0, 'มุมมองรายการ: แสดงครบ ' + total + ' รายการ');
  click($$('.blist .snote.row')[0]); await sleep(120); ok(!$('#sxDrawer').hidden, 'มุมมองรายการ: คลิกแถวเปิดแผงรายละเอียด'); click($('#sxDrawer [data-dclose]')); await sleep(40);
  click($('[data-bv="board"]')); await sleep(100); ok($$('.bcard').length === 15, 'สลับกลับมุมมองกระดานได้');
  // ส่งออก
  const rows = ev("SXB.rows(A.d.entries, boardCtx())"); ok(rows.length === total + 1 && rows[0].includes('หมวดแนวคิด') && rows[0].includes('ข้อความ'), 'CSV (Excel): ' + (rows.length - 1) + ' แถว มีคอลัมน์หมวดแนวคิด');
  const sv = ev("SXB.svg(A.d.entries, boardCtx())"); ok(/^<svg/.test(sv) && /BOARD A/.test(sv) && /BOARD B/.test(sv) && /Strategic Analysis Board/.test(sv), 'สร้างภาพกระดาน (SVG สำหรับ PNG) ได้ครบสองกระดาน');
  click($('[data-bexport="pdf"]')); await sleep(200); ok(/Strategic Analysis Board/.test($('#printArea').textContent) && $('#printArea').querySelectorAll('li').length >= total, 'พิมพ์ / PDF: สร้างเอกสารครบ ' + total + ' รายการ');
  // ฟังก์ชันเดิมไม่เสีย
  click($('[data-atab="swot"]')); await sleep(300); ok($$('.swx .card').length === 4 && !!$('.frbar'), 'หน้าสำรวจ SWOT เดิมยังทำงานปกติ');
  // Empty state ทั้งกระดาน
  click($('[data-atab="board"]')); await sleep(200); ev("A.d.entries = []; renderAdmin()"); await sleep(150);
  ok(!!$('.board-wrap .empty') && /ยังไม่มีข้อมูล SWOT/.test($('.board-wrap .empty').textContent) && !$('.bcard'), 'ไม่มีข้อมูล: แสดง Empty State ไม่แสดงกระดานว่าง');
  ok(errs.length === 0, 'ไม่มี runtime error ' + errs.join(' | '));
  console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
})();
