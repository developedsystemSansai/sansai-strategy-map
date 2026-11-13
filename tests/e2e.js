const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs'), path = require('path');
const root = require('path').resolve(__dirname, '..');
let html = fs.readFileSync(root + '/index.html', 'utf8').replace(/<link[^>]*>/g, '');
const errs = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => /getContext/.test((e.detail&&e.detail.message)||e.message) || errs.push('jsdomError: ' + (e.detail && e.detail.message || e.message))); vc.on('error', e => errs.push('console.error: ' + e));
const dom = new JSDOM(html, {url: 'file://' + root + '/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc});
const w = dom.window, d = w.document;
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
(async () => {
  await sleep(1800);
  // ================= ผู้กรอก =================
  ev("startDemo('group')"); await sleep(1800);
  const tabs = $$('.tabs [data-tab]').map(t => t.textContent.replace(/\s+/g, ' ').trim());
  console.log('tabs:', tabs.join(' | '));
  ok(/กรอกข้อมูล/.test(tabs[0]), 'แท็บแรกของผู้กรอกคือ "กรอกข้อมูลกลุ่มงาน"');
  ok($('.tabs [data-tab].on, .tabs [data-tab][aria-selected="true"], .tabs .on') && /กรอกข้อมูล/.test(($('.tabs [data-tab].on, .tabs [data-tab][aria-selected="true"]') || $('.tabs .on')).textContent), 'เปิดมาที่หน้ากรอกข้อมูลเป็นค่าเริ่มต้น');
  const secs = $$('.section h2').map(h => h.textContent);
  ok(/^SWOT/.test(secs[0]) && /ประเด็นสำคัญ/.test(secs[1]) && /ตัวชี้วัด/.test(secs[2]), 'ลำดับหัวข้อ: SWOT → ประเด็น/ข้อเสนอ → ข้อมูล  [' + secs.join(' / ') + ']');
  const heads = $$('.block-h .pill').map(p => p.textContent.trim());
  console.log('block heads:', heads.join(', '));
  ok(heads.some(h => h.includes('อุปสรรค')) && !heads.some(h => h.includes('ภัยคุกคาม')), 'หัวข้อ T ใช้คำว่า "อุปสรรค" ไม่มี "ภัยคุกคาม"');
  ok(!/ภัยคุกคาม/.test($('#app').textContent), 'หน้ากรอกไม่เหลือคำว่า "ภัยคุกคาม"');
  const bc = $$('.block').map(b => b.className.replace('block', '').trim());
  ok(new Set(bc).size === bc.length && bc.length === 7, 'ทั้ง 7 การ์ดมี class สีต่างกัน: ' + bc.join(','));
  const css = fs.readFileSync(root + '/style.css', 'utf8');
  const bg = {}; ['S','W','O','T','ISSUE','IDEA','DATA'].forEach(k => { const m = css.match(new RegExp('\\.block\\.' + k + '\\{background:(#[0-9a-f]+)')); bg[k] = m && m[1]; });
  ok(new Set(Object.values(bg)).size === 7, 'สีพื้นหลัง 7 สีไม่ซ้ำ: ' + JSON.stringify(bg));
  ok($('.blocks.swot') && $$('.blocks.swot .block').length === 4, 'SWOT จัดเป็นกริด 4 การ์ด');

  // บันทึกรายการใหม่ (อุปสรรค)
  const before = ev("G.entries.length");
  click($('[data-add="T"]')); await sleep(100);
  const ta = $$('.block.T .item .f-body').pop(); ta.value = 'ทดสอบ: งบประมาณถูกปรับลด'; ta.dispatchEvent(new w.Event('input', {bubbles: true}));
  await sleep(2500);
  const newE = ev("G.entries.find(e => e.body === 'ทดสอบ: งบประมาณถูกปรับลด')");
  ok(newE && newE.id && newE._st === 'ok', 'ผู้ใช้เพิ่มรายการ "อุปสรรค" และบันทึกสำเร็จ (id=' + (newE && newE.id) + ')');
  const srv = await ev("rpc('sx_my_entries', {p_pass: session.pass, p_wg: session.wg})");
  ok(srv.entries.some(e => e.body === 'ทดสอบ: งบประมาณถูกปรับลด' && e.kind === 'T'), 'ข้อมูลอยู่ในฐานข้อมูล (kind=T) เมื่อดึงกลับมา');
  // แก้ไข
  const ta2 = $$('.block.T .item .f-body').pop(); ta2.value = 'ทดสอบ: งบประมาณถูกปรับลด (แก้ไขแล้ว)'; ta2.dispatchEvent(new w.Event('input', {bubbles: true}));
  await sleep(2500);
  const srv2 = await ev("rpc('sx_my_entries', {p_pass: session.pass, p_wg: session.wg})");
  ok(srv2.entries.some(e => e.body.endsWith('(แก้ไขแล้ว)')) && srv2.entries.length === srv.entries.length, 'แก้ไขข้อความแล้วบันทึกทับรายการเดิม ไม่เกิดรายการซ้ำ');
  // ส่งให้ทีมยุทธศาสตร์
  const doneBtn = $('[data-act="done"]'); ok(!!doneBtn, 'มีปุ่มส่งให้ทีมยุทธศาสตร์'); click(doneBtn); await sleep(500);
  ok(ev("G.done") === true, 'ส่งข้อมูลให้ทีมยุทธศาสตร์สำเร็จ');
  // ลบ
  const delBtn = $$('.block.T .item [data-del]').pop(); click(delBtn); await sleep(50); click($$('.block.T .item [data-del]').pop()); await sleep(600);
  const srv3 = await ev("rpc('sx_my_entries', {p_pass: session.pass, p_wg: session.wg})");
  ok(!srv3.entries.some(e => e.body.includes('ทดสอบ: งบประมาณ')), 'ลบรายการสำเร็จ (ต้องกดยืนยัน 2 ครั้ง)');

  // ===== มุมมองกลุ่มงานอื่น = กราฟ =====
  click($('[data-tab="peer"]')); await sleep(900);
  ok(!!$('#gHost .gr-svg'), 'หน้า "มุมมองกลุ่มงานอื่น" เป็นกราฟเป็นค่าเริ่มต้น');
  const nodes = $$('.gn'); const hubs = $$('.gn.hub'), ents = $$('.gn.entry'), cls = $$('.gn.cluster');
  console.log(`nodes=${nodes.length} hubs=${hubs.length} entries=${ents.length} clusters=${cls.length} edges=${$$('.gr-edge').length}`);
  ok(hubs.length >= 10 && ents.length >= 30, 'กราฟมีโหนดกลุ่มงานและรายการครบ');
  ok($$('.gn.hub.own').length === 1, 'ไฮไลต์กลุ่มงานของผู้ใช้เอง 1 โหนด');
  ok($$('.gr-edge').length >= ents.length, 'มีเส้นเชื่อมจากกลุ่มงานไปยังทุกรายการ');
  ok($$('.gn[transform]').every(n => /translate\(-?[\d.]+,-?[\d.]+\)/.test(n.getAttribute('transform')) && !/NaN/.test(n.getAttribute('transform'))), 'ตำแหน่งโหนดทุกอันเป็นตัวเลขปกติ (ไม่มี NaN)');
  click(ents[0]); await sleep(50);
  ok($('.gr-detail .pill') && $$('.gn.dim').length > 0 && $('.gn.sel'), 'คลิกโหนดแล้วแสดงรายละเอียดและไฮไลต์เพื่อนบ้าน');
  click($('[data-gk="T"]')); await sleep(50);
  ok($$('.gn.entry.k-T:not(.off)').length === 0 && $$('.gn.entry.k-T.off').length > 0, 'กดคำอธิบายสี "อุปสรรค" เพื่อซ่อนประเภทนั้นได้');
  click($('[data-gk="T"]'));
  const before2 = $('.gr-svg > g').getAttribute('transform'); click($('[data-g="in"]')); ok($('.gr-svg > g').getAttribute('transform') !== before2, 'ปุ่มขยายทำงาน');
  click($('[data-pview="list"]')); await sleep(100);
  ok(!$('#gHost') && $$('.card.T, .card.S').length >= 2 && $('.card.T .pill').textContent.trim() === 'อุปสรรค', 'สลับเป็นมุมมองรายการได้ และการ์ด "อุปสรรค" มีสีของตัวเอง');
  click($('[data-pview="graph"]')); await sleep(100);
  ok(!!$('#gHost .gr-svg'), 'สลับกลับเป็นกราฟได้');
  ok($('.tabs [data-tab="vote"]'), 'แท็บลงคะแนนยังอยู่');

  // ================= แอดมิน =================
  ev("logout()"); await sleep(300);
  ev("startDemo('admin')"); await sleep(1800);
  console.log('admin tabs:', $$('.tabs [data-atab]').map(t => t.textContent.trim()).join(' | '));
  click($('[data-atab="all"]')); await sleep(300);
  ok(!!$('#gHost .gr-svg') && $$('.gn.hub').length >= 10, 'แอดมิน: หน้า "ข้อมูลทั้งหมด" แสดงกราฟ');
  ok($$('.gn.cluster').length >= 1 && $$('.gr-edge.soft').length >= 1, 'กราฟของแอดมินแสดงประเด็นรวม (โหนดเพชร + เส้นประ)');
  const cEl = $('.gn.cluster'); click(cEl); await sleep(50);
  ok(/รายการ จาก/.test($('.gr-detail').textContent), 'คลิกประเด็นรวมแล้วเห็นจำนวนรายการ/กลุ่มงาน');
  // กรองด้วยกลุ่มงาน
  const sel = $('select[data-f="wg"]'); sel.value = 'เภสัชกรรม'; sel.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(200);
  ok($$('.gn.hub').length === 1, 'ตัวกรองกลุ่มงานทำให้กราฟเหลือ 1 กลุ่มงาน');
  click($('[data-aview="list"]')); await sleep(100);
  ok(!$('#gHost') && $$('.li').length > 0, 'แอดมินสลับเป็นรายการได้');
  sel.value; const s2 = $('select[data-f="wg"]'); s2.value = ''; s2.dispatchEvent(new w.Event('change', {bubbles: true})); await sleep(100);

  // จัดกลุ่มประเด็น: สร้าง ย้าย ปลด ลบ
  click($('[data-atab="group"]')); await sleep(200);
  const nBefore = ev("A.d.clusters.length");
  const free = ev("A.d.entries.filter(e => !e.cluster_id && ['ISSUE','IDEA'].includes(e.kind)).slice(0,2).map(e => e.id)");
  ok(free.length === 2, 'มีรายการที่ยังไม่จัดกลุ่มให้ทดสอบ');
  // ผ่าน UI: ติ๊ก → ตั้งชื่อ → สร้างประเด็นใหม่และย้าย
  const chk = $$('[data-sel]'); ok(chk.length > 0, 'มีช่องเลือกรายการในหน้าจัดกลุ่ม');
  chk.slice(0, 2).forEach(c => { c.checked = true; c.dispatchEvent(new w.Event('change', {bubbles: true})); });
  const nm = $('[data-newname]'); nm.value = 'ประเด็นทดสอบแอดมิน';
  console.log('DBG sel=', ev('A.sel.size'), 'newcl disabled=', $('[data-newcl]') && $('[data-newcl]').disabled, 'toast=', $('#toast').textContent);
  click($('[data-newcl]')); await sleep(3000);
  console.log('DBG after: clusters=', ev('A.d.clusters.map(c=>c.name).join(",")'), 'toast=', $('#toast').textContent);
  const created = ev("A.d.clusters.find(c => c.name === 'ประเด็นทดสอบแอดมิน')");
  ok(!!created && ev("A.d.clusters.length") === nBefore + 1, 'แอดมินสร้างประเด็นใหม่ได้');
  ok(ev("A.d.entries.filter(e => e.cluster_id === '" + (created && created.id) + "').length") >= 1, 'ย้ายรายการเข้าประเด็นใหม่ได้');
  // ปลดรายการ
  const un = $('[data-unassign]'); const had = ev("A.d.entries.filter(e => e.cluster_id === '" + created.id + "').length");
  if (un){ const target = un.dataset.unassign; click(un); await sleep(2000); ok(ev("A.d.entries.find(e => e.id === '" + target + "').cluster_id") == null, 'ปลดรายการออกจากประเด็นได้'); } else ok(false, 'ไม่พบปุ่มปลดรายการ');
  // แก้ชื่อประเด็น (rpc)
  await ev("rpc('sx_admin_save_cluster', {p_pass: session.pass, p_cluster: {id: '" + created.id + "', name: 'ประเด็นทดสอบ (แก้ชื่อ)', note: 'x'}})");
  await ev("loadAdmin(true)"); ok(ev("A.d.clusters.find(c => c.id === '" + created.id + "').name") === 'ประเด็นทดสอบ (แก้ชื่อ)', 'แก้ชื่อประเด็นได้');
  // เปิด/ปิดโหวต
  click($('[data-atab="vote"]')); await sleep(200);
  const vo = $('[data-vopen="1"]'); if (vo){ click(vo); await sleep(2000); ok(ev("A.d.settings.voting_open") === '1', 'แอดมินเปิดโหวตได้'); }
  // ลบประเด็น
  click($('[data-atab="group"]')); await sleep(200);
  const cd = $(`.cl[data-cid="${created.id}"] [data-cdel]`); if (cd){ click(cd); await sleep(50); click($(`.cl[data-cid="${created.id}"] [data-cdel]`)); await sleep(2500); ok(!ev("A.d.clusters.find(c => c.id === '" + created.id + "')"), 'แอดมินลบประเด็นได้'); } else ok(false, 'ไม่พบปุ่มลบประเด็น');
  // ส่งออก / พิมพ์ / ภาพรวม
  click($('[data-atab="over"]')); await sleep(200); ok($$('.sum').length > 0 || $$('.rrow').length > 0 || $('#pane').textContent.length > 50, 'หน้าภาพรวมการส่งแสดงได้');
  click($('[data-atab="exp"]')); await sleep(200); ok($$('[data-exp]').length >= 2, 'หน้าส่งออกมีปุ่ม CSV/พิมพ์');
  click($('[data-atab="map"]')); await sleep(600); ok(!!$('#smbHost'), 'แท็บแผนที่ยุทธศาสตร์ของแอดมินยังเปิดได้');
  console.log(`\n== ${pass} passed, ${fail} failed ==`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no runtime errors');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e, errs); process.exit(2); });
