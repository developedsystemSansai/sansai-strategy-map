/* ตรวจว่ากราฟไม่มีส่วนใดทับกัน และการไฮไลต์เส้นทางถูกต้อง  รัน: node tests/graph-layout.js */
const {JSDOM} = require('jsdom'); const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dom = new JSDOM('<div id="h"></div>', {runScripts: 'outside-only', pretendToBeVisual: true});
const w = dom.window; w.eval(fs.readFileSync(root + '/detail.js', 'utf8')); w.eval(fs.readFileSync(root + '/graph.js', 'utf8'));
const kinds = ['S','W','O','T','ISSUE','IDEA','DATA'];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function data(nh, ne, nc, clusterShare = .7){
  const entries = []; const clusters = Array.from({length: nc}, (_, i) => ({id: 'c' + i, name: 'ประเด็นรวมลำดับที่ ' + (i + 1) + ' ทดสอบชื่อยาวมากๆ'}));
  for (let i = 0; i < ne; i++) entries.push({id: 'e' + i, wg: 'กลุ่มงานทดสอบ' + String(Math.floor(rnd() * nh)).padStart(2, '0'), kind: kinds[Math.floor(rnd() * 7)], body: 'รายการทดสอบที่ ' + i + ' ข้อความค่อนข้างยาวเพื่อดูการตัดคำ', detail: 'รายละเอียดเพิ่มเติมของรายการ ' + i, author: 'คุณทดสอบ', priority: 1 + Math.floor(rnd() * 3), cluster_id: nc && rnd() < clusterShare ? 'c' + Math.floor(rnd() * nc) : null});
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
    cls.forEach(c => { if (hit(ba, {x0: c.x - c.r, x1: c.x + c.r, y0: c.y - c.r, y1: c.y + c.r})) lab++; }); });
  let clo = 1e9; for (let i = 0; i < cls.length; i++){ hubs.forEach(hb => clo = Math.min(clo, Math.hypot(cls[i].x - hb.x, cls[i].y - hb.y) - hb.R - cls[i].r)); for (let j = i + 1; j < cls.length; j++) clo = Math.min(clo, Math.hypot(cls[i].x - cls[j].x, cls[i].y - cls[j].y) - cls[i].r - cls[j].r - 24); }
  // ป้ายชื่อประเด็นรวม (ประมาณความกว้าง) ต้องไม่ทับวงกลุ่มงานและป้ายกันเอง
  const cbox = c => { const wv = c.label.length * 9.6, x = c.x + c.dx * (c.r + 12), y = c.y + c.dy * (c.r + 12); const a = c.dx > .3 ? 'start' : c.dx < -.3 ? 'end' : 'middle'; return {x0: a === 'start' ? x : a === 'end' ? x - wv : x - wv / 2, x1: a === 'start' ? x + wv : a === 'end' ? x : x + wv / 2, y0: y - 14, y1: y + 6}; };
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
check('กลุ่มเดียวใหญ่ 60 รายการ', data(1, 60, 3)); check('60 กลุ่มงาน/360 รายการ/10 ประเด็น', data(60, 360, 10)); check('60 กลุ่มงาน/200 รายการ/12 ประเด็นใหญ่', data(60, 200, 12, .9));
// ไฮไลต์
const r = check('ไฮไลต์', data(16, 70, 4)), g = r.g, d = w.document;
const e = g.nodes.find(n => n.type === 'entry' && n.cl);
r.select(e.id);
const hlE = [...d.querySelectorAll('.gr-edge.hl')], relE = [...d.querySelectorAll('.gr-edge.rel')], dimN = d.querySelectorAll('.gn.dim');
ok(hlE.length === 2, 'เลือกรายการ: เส้นหลักมี 2 เส้น ได้ ' + hlE.length);
ok(relE.length === 2 * (e.cl.kids.length - 1), 'เลือกรายการ: เส้นรองของรายการร่วมประเด็นครบ ' + relE.length);
ok(dimN.length > 0 && d.querySelector('.gn.hub.hl') && d.querySelector('.gn.cluster.hl'), 'เลือกรายการ: โหนดที่ไม่เกี่ยวจางลง กลุ่มงานและประเด็นสว่าง');
ok(d.querySelector('.pod.hl'), 'กลุ่มงานของรายการที่เลือกถูกไฮไลต์วงใหญ่');
ok(d.querySelector('.gr-stage .gr-detail') && !d.querySelector('.gr-detail').hidden && d.querySelector('.gr-d-body').textContent === e.e.body, 'การ์ดรายละเอียดลอยบนกราฟ แสดงข้อความเต็ม');
ok(/ผู้กรอก คุณทดสอบ/.test(d.querySelector('.gr-detail').textContent) && /รายละเอียดเพิ่มเติม/.test(d.querySelector('.gr-detail').textContent), 'การ์ดแสดงผู้กรอกและรายละเอียด');
ok(d.querySelectorAll('.gr-path .gr-chip').length === 2, 'แสดงเส้นทางกลุ่มงาน → ประเภท → ประเด็น');
ok(d.querySelectorAll('.gr-peers + .gr-list .gr-item').length === e.cl.kids.length - 1, 'รายการร่วมประเด็นคลิกต่อได้ครบ');
const hb = e.hub; r.select(hb.id);
ok(d.querySelectorAll('.gr-edge.hl').length === hb.kids.length + hb.kids.filter(k => k.cl).length, 'เลือกกลุ่มงาน: เส้นหลักครบ');
ok(d.querySelectorAll('.gr-list .gr-item').length === hb.kids.length, 'เลือกกลุ่มงาน: มีรายการให้คลิกต่อครบ');
d.querySelector('.gr-list .gr-item').click(); ok(d.querySelector('.gn.sel') && d.querySelector('.gn.sel').dataset.nid.startsWith('e:'), 'คลิกรายการในการ์ดแล้วเลือกโหนดนั้น');
r.select(e.cl.id); ok(d.querySelectorAll('.gr-edge.hl').length === e.cl.kids.length && d.querySelectorAll('.gr-edge.rel').length === e.cl.kids.length, 'เลือกประเด็น: เส้นหลัก/รอง ถูกต้อง');
const ct = d.querySelector('.gr-detail').textContent;
ok(d.querySelectorAll('.gr-detail [data-og]').length === new Set(e.cl.kids.map(k => k.e.wg)).size, 'การ์ดประเด็น: แสดงกลุ่มงานที่ประกอบด้วยครบ');
ok(/ประกอบด้วยการวิเคราะห์/.test(ct) && d.querySelectorAll('.gr-detail .gr-d-row .pill').length > 0, 'การ์ดประเด็น: แสดงชนิดการวิเคราะห์ (SWOT ฯลฯ)');
ok(e.cl.r >= 17 && e.cl.r > 13, 'ประเด็นรวมใหญ่กว่าเดิม r=' + e.cl.r);
d.querySelector('.gr-detail [data-og]').click(); ok(d.querySelector('.gn.hub.sel'), 'คลิกกลุ่มงานในการ์ดประเด็นแล้วไปดูกลุ่มงานนั้น');
d.querySelector('.gr-close').click(); ok(d.querySelector('.gr-detail').hidden && !d.querySelector('.hl, .rel, .dim'), 'กดปุ่มปิดแล้วการ์ดหายและทุกอย่างกลับปกติ');
r.select(e.id); d.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); ok(d.querySelector('.gr-detail').hidden, 'กด Esc ปิดการ์ด');
// เมนูไปที่กลุ่มงาน
const jp = d.querySelector('.gr-jump'); jp.value = g.hubs[2].id; jp.dispatchEvent(new w.Event('change', {bubbles: true})); ok(d.querySelector('.gn.hub.sel') && d.querySelector('.gn.hub.sel').dataset.nid === g.hubs[2].id, 'เมนูไปที่กลุ่มงานเลือกกลุ่มนั้น');
r.select(null);

// ความคล้ายของถ้อยคำ
const S = w.SXD;
const A1 = {id: 'a', wg: 'ER', kind: 'ISSUE', body: 'รอคิวนานที่ห้องฉุกเฉินในช่วงเย็น'}, A2 = {id: 'b', wg: 'ICU', kind: 'ISSUE', body: 'ผู้ป่วยรอคิวนานช่วงเย็นที่ห้องฉุกเฉิน'}, A3 = {id: 'c', wg: 'การเงิน', kind: 'ISSUE', body: 'งบประมาณจัดซื้อเครื่องมือแพทย์ไม่เพียงพอ'}, A4 = {id: 'd', wg: 'IT', kind: 'S', body: 'รอคิวนานที่ห้องฉุกเฉินในช่วงเย็น'};
ok(S.sim(A1, A2) > S.sim(A1, A3) + .25, 'ถ้อยคำต่างกันแต่ความหมายใกล้กันได้คะแนนสูงกว่าเรื่องอื่น (' + S.sim(A1, A2).toFixed(2) + ' vs ' + S.sim(A1, A3).toFixed(2) + ')');
const sm = S.similar(A1, [A1, A2, A3, A4]); ok(sm.length === 1 && sm[0].e === A2, 'แนะนำรายการคล้ายเฉพาะชนิดเดียวกัน และไม่รวมตัวเอง');

// ทีมยุทธศาสตร์จัดกลุ่มจากการ์ด
const calls = [];
const adm = {assign: (ids, cid) => { calls.push(['assign', ids, cid]); return Promise.resolve(); }, create: (n, ids) => { calls.push(['create', n, ids]); return Promise.resolve(); }};
const dd = data(6, 40, 3, .5); dd.entries.push({id: 'sx1', wg: 'กลุ่มงานทดสอบ00', kind: 'ISSUE', body: 'ผู้ป่วยรอคิวนานช่วงเย็นที่ห้องฉุกเฉิน', detail: '', priority: 3, cluster_id: null}, {id: 'sx2', wg: 'กลุ่มงานทดสอบ01', kind: 'ISSUE', body: 'รอคิวนานที่ห้องฉุกเฉินในช่วงเย็น', detail: '', priority: 2, cluster_id: null});
const ra = w.SXG.mount(d.getElementById('h'), {...dd, done: new Set(), own: '', admin: adm});
ra.select('e:sx1');
ok(d.querySelector('.gr-admin'), 'ทีมยุทธศาสตร์: การ์ดรายการมีส่วนจัดกลุ่ม');
const cand = [...d.querySelectorAll('.gr-pick input')].map(i => i.dataset.pick); ok(cand[0] === 'sx1' && cand.includes('sx2'), 'แนะนำรายการที่ถ้อยคำคล้ายกัน (sx2) ให้ติ๊กเพิ่ม');
d.querySelector('[data-pick="sx2"]').checked = true;
d.querySelector('[data-target]').value = 'c1'; d.querySelector('[data-act="assign"]').click();
ok(calls.length === 1 && calls[0][0] === 'assign' && calls[0][2] === 'c1' && calls[0][1].includes('sx1') && calls[0][1].includes('sx2'), 'กดย้าย: เรียก assign พร้อมรายการที่ติ๊กทั้งสอง');
ra.select('e:sx1'); d.querySelector('[data-newname]').value = 'รอคิวนาน ER'; d.querySelector('[data-act="create"]').click();
ok(calls[1] && calls[1][0] === 'create' && calls[1][1] === 'รอคิวนาน ER', 'สร้างประเด็นใหม่และย้าย');
const rn = w.SXG.mount(d.getElementById('h'), {...dd, done: new Set(), own: ''}); rn.select('e:sx1'); ok(!d.querySelector('.gr-admin'), 'ผู้กรอกทั่วไปไม่เห็นส่วนจัดกลุ่ม');
console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
