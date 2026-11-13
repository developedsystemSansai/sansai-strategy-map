/* ตรวจว่ากราฟไม่มีส่วนใดทับกัน และการไฮไลต์เส้นทางถูกต้อง  รัน: node tests/graph-layout.js */
const {JSDOM} = require('jsdom'); const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dom = new JSDOM('<div id="h"></div>', {runScripts: 'outside-only', pretendToBeVisual: true});
const w = dom.window; w.eval(fs.readFileSync(root + '/graph.js', 'utf8'));
const kinds = ['S','W','O','T','ISSUE','IDEA','DATA'];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function data(nh, ne, nc, clusterShare = .7){
  const entries = []; const clusters = Array.from({length: nc}, (_, i) => ({id: 'c' + i, name: 'ประเด็นรวมลำดับที่ ' + (i + 1) + ' ทดสอบชื่อยาวมากๆ'}));
  for (let i = 0; i < ne; i++) entries.push({id: 'e' + i, wg: 'กลุ่มงานทดสอบ' + String(Math.floor(rnd() * nh)).padStart(2, '0'), kind: kinds[Math.floor(rnd() * 7)], body: 'รายการทดสอบที่ ' + i + ' ข้อความค่อนข้างยาวเพื่อดูการตัดคำ', detail: '', priority: 1 + Math.floor(rnd() * 3), cluster_id: nc && rnd() < clusterShare ? 'c' + Math.floor(rnd() * nc) : null});
  return {entries, clusters};
}
let fail = 0, pass = 0; const ok = (c, m) => { c ? pass++ : (fail++, console.log('FAIL ' + m)); if (c) pass; };
function check(name, d){
  const host = w.document.getElementById('h'); const r = w.SXG.mount(host, {...d, done: new Set(), own: ''}); const g = r.g;
  const hubs = g.hubs, ents = g.nodes.filter(n => n.type === 'entry'), cls = g.clusters;
  let podMin = 1e9, entMin = 1e9, outside = 0, hubEnt = 1e9;
  for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++) podMin = Math.min(podMin, Math.hypot(hubs[i].x - hubs[j].x, hubs[i].y - hubs[j].y) - hubs[i].R - hubs[j].R);
  for (let i = 0; i < ents.length; i++){ for (let j = i + 1; j < ents.length; j++) entMin = Math.min(entMin, Math.hypot(ents[i].x - ents[j].x, ents[i].y - ents[j].y) - ents[i].r - ents[j].r);
    const hb = ents[i].hub; hubEnt = Math.min(hubEnt, Math.hypot(ents[i].x - hb.x, ents[i].y - hb.y) - ents[i].r - hb.r); if (Math.hypot(ents[i].x - hb.x, ents[i].y - hb.y) + ents[i].r > hb.R - 6) outside++; }
  // รายการของกลุ่มอื่นต้องไม่ตกอยู่ในวงของกลุ่มงานนี้
  let foreign = 0; ents.forEach(e => hubs.forEach(hb => { if (hb !== e.hub && Math.hypot(e.x - hb.x, e.y - hb.y) < hb.R + e.r) foreign++; }));
  // กล่องป้ายชื่อกลุ่มงานต้องไม่ทับวงอื่น ป้ายอื่น และเพชร
  const box = hb => { const x = hb.x + hb.lx, w2 = hb.lw; return {x0: hb.la === 'start' ? x : hb.la === 'end' ? x - w2 : x - w2 / 2, x1: hb.la === 'start' ? x + w2 : hb.la === 'end' ? x : x + w2 / 2, y0: hb.y + hb.ly - 14, y1: hb.y + hb.ly + 4}; };
  const hit = (b, c) => b.x0 < c.x1 && c.x0 < b.x1 && b.y0 < c.y1 && c.y0 < b.y1;
  let lab = 0; hubs.forEach((a, i) => { const ba = box(a); hubs.forEach((b, j) => { if (i < j && hit(ba, box(b))) lab++; });
    hubs.forEach(b => { if (b !== a){ const cx = Math.max(ba.x0, Math.min(b.x, ba.x1)), cy = Math.max(ba.y0, Math.min(b.y, ba.y1)); if (Math.hypot(cx - b.x, cy - b.y) < b.R) lab++; } });
    cls.forEach(c => { if (hit(ba, {x0: c.x - 14, x1: c.x + 14, y0: c.y - 14, y1: c.y + 14})) lab++; }); });
  let clo = 1e9; for (let i = 0; i < cls.length; i++){ hubs.forEach(hb => clo = Math.min(clo, Math.hypot(cls[i].x - hb.x, cls[i].y - hb.y) - hb.R - 14)); for (let j = i + 1; j < cls.length; j++) clo = Math.min(clo, Math.hypot(cls[i].x - cls[j].x, cls[i].y - cls[j].y) - 28); }
  // ป้ายชื่อประเด็นรวม (ประมาณความกว้าง) ต้องไม่ทับวงกลุ่มงานและป้ายกันเอง
  const cbox = c => { const wv = c.label.length * 8.2, x = c.x + c.dx * 25, y = c.y + c.dy * 25; const a = c.dx > .3 ? 'start' : c.dx < -.3 ? 'end' : 'middle'; return {x0: a === 'start' ? x : a === 'end' ? x - wv : x - wv / 2, x1: a === 'start' ? x + wv : a === 'end' ? x : x + wv / 2, y0: y - 14, y1: y + 6}; };
  let clab = 0; cls.forEach((c, i) => { const bx = cbox(c); hubs.forEach(hb => { const cx = Math.max(bx.x0, Math.min(hb.x, bx.x1)), cy = Math.max(bx.y0, Math.min(hb.y, bx.y1)); if (Math.hypot(cx - hb.x, cy - hb.y) < hb.R) clab++; });
    cls.forEach((c2, j) => { if (i < j && hit(bx, cbox(c2))) clab++; }); });
  ok(clab === 0, name + ': ป้ายประเด็นรวมไม่ทับวงกลุ่มงานหรือป้ายอื่น (' + clab + ')');
  console.log(`${name}: hubs=${hubs.length} entries=${ents.length} clusters=${cls.length} | pod gap min=${podMin.toFixed(1)} entry gap min=${entMin.toFixed(1)} entries outside pod=${outside} foreign=${foreign} label hits=${lab} cluster clearance=${clo > 1e8 ? '-' : clo.toFixed(1)}`);
  ok(podMin >= 0, name + ': วงกลุ่มงานไม่ทับกัน'); ok(entMin >= 4, name + ': จุดรายการไม่ทับกัน'); ok(hubEnt >= 6, name + ': รายการไม่ทับโหนดกลุ่มงาน');
  ok(outside === 0, name + ': รายการอยู่ในวงของกลุ่มงานตัวเอง'); ok(foreign === 0, name + ': ไม่มีรายการล้ำเข้าวงของกลุ่มอื่น'); ok(lab === 0, name + ': ป้ายชื่อไม่ทับ'); ok(clo >= 0, name + ': เพชรประเด็นรวมไม่ทับอะไร');
  ok(g.nodes.every(n => isFinite(n.x) && isFinite(n.y)), name + ': ตำแหน่งเป็นตัวเลขปกติ');
  return r;
}
check('เล็ก 1 กลุ่ม', data(1, 6, 2)); check('2 กลุ่ม', data(2, 14, 1)); check('4 กลุ่มไม่มีประเด็น', data(4, 25, 0));
check('เดโม 16 กลุ่ม/70 รายการ/4 ประเด็น', data(16, 70, 4)); check('30 กลุ่ม/300 รายการ/8 ประเด็น', data(30, 300, 8)); check('40 กลุ่ม/120 รายการ/12 ประเด็น', data(40, 120, 12));
check('กลุ่มเดียวใหญ่ 60 รายการ', data(1, 60, 3));
// ไฮไลต์
const r = check('ไฮไลต์', data(16, 70, 4)), g = r.g, d = w.document;
const e = g.nodes.find(n => n.type === 'entry' && n.cl);
r.select(e.id);
const hlE = [...d.querySelectorAll('.gr-edge.hl')], relE = [...d.querySelectorAll('.gr-edge.rel')], dimN = d.querySelectorAll('.gn.dim');
ok(hlE.length === 2, 'เลือกรายการ: เส้นหลักมี 2 เส้น (กลุ่มงาน→รายการ, ประเด็น→รายการ) ได้ ' + hlE.length);
ok(relE.length === 2 * (e.cl.kids.length - 1), 'เลือกรายการ: เส้นรองของรายการร่วมประเด็นครบ ' + relE.length);
ok(dimN.length > 0 && d.querySelector('.gn.hub.hl') && d.querySelector('.gn.cluster.hl'), 'เลือกรายการ: โหนดที่ไม่เกี่ยวจางลง กลุ่มงานและประเด็นสว่าง');
ok(/เส้นทาง/.test(d.querySelector('.gr-detail').textContent) && d.querySelectorAll('.gr-path .gr-chip').length === 2, 'แสดงเส้นทางกลุ่มงาน → ประเภท → ประเด็น');
const hb = e.hub; r.select(hb.id);
ok(d.querySelectorAll('.gr-edge.hl').length === hb.kids.length + hb.kids.filter(k => k.cl).length, 'เลือกกลุ่มงาน: เส้นหลักครบทุกรายการและประเด็นที่เกี่ยวข้อง');
ok(d.querySelectorAll('.gr-list .gr-item').length === hb.kids.length, 'เลือกกลุ่มงาน: มีรายการให้คลิกต่อครบ');
d.querySelector('.gr-list .gr-item').click(); ok(d.querySelector('.gn.sel') && d.querySelector('.gn.sel').dataset.nid.startsWith('e:'), 'คลิกรายการในแผงรายละเอียดแล้วเลือกโหนดนั้น');
r.select(e.cl.id); ok(d.querySelectorAll('.gr-edge.hl').length === e.cl.kids.length && d.querySelectorAll('.gr-edge.rel').length === e.cl.kids.length, 'เลือกประเด็น: เส้นหลัก=เส้นของประเด็น เส้นรอง=เส้นไปกลุ่มงาน');
r.select(null); ok(!d.querySelector('.hl, .rel, .dim'), 'ยกเลิกเลือกแล้วทุกอย่างกลับปกติ');
console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
