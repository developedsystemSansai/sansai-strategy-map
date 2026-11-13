'use strict';
/* กราฟเครือข่ายของมุมมองกลุ่มงาน (ไม่พึ่งไลบรารีภายนอก)
   วางตำแหน่งแบบคำนวณตายตัว (ไม่ใช้แรงผลัก) เพื่อให้ไม่มีโหนดทับกัน:
   · วงกลมใหญ่ = กลุ่มงาน ล้อมด้วยจุดสีของรายการ (อยู่ในวงของกลุ่มงานตัวเอง)
   · เพชรสี = ประเด็นรวมที่ทีมยุทธศาสตร์จัดกลุ่ม อยู่กลางผัง เส้นเชื่อมใช้สีเดียวกับเพชร
   · คลิกโหนดใดก็ได้: เส้นทางการเชื่อมสว่างและมีลายเส้นเคลื่อนไหว ส่วนที่ไม่เกี่ยวข้องจางลง
   SXG.mount(host, {entries, clusters, done:Set, own}) */
(function(){
const NS = 'http://www.w3.org/2000/svg';
const KC = {S:'#059669', W:'#e11d48', O:'#2563eb', T:'#d97706', ISSUE:'#7c3aed', IDEA:'#0d9488', DATA:'#64748b'};
const KL = {S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค', ISSUE:'ประเด็นสำคัญ', IDEA:'ข้อเสนอ', DATA:'ข้อมูล'};
const KO = ['S','W','O','T','ISSUE','IDEA','DATA'];
const PRI = {3:'สำคัญมาก', 2:'สำคัญ', 1:'พิจารณา'};
const CC = ['#7c3aed','#db2777','#0891b2','#65a30d','#ea580c','#4f46e5','#0d9488','#b45309','#be123c','#1d4ed8'];
const GAP = 26, ASP = 1.45;
let POS = {}, LAST = '';                           // ตำแหน่งกลุ่มงานที่ผู้ใช้ลากไว้ (ล้างเมื่อชุดข้อมูลเปลี่ยน)
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || String(g || '');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const thSort = (a, b) => a.localeCompare(b, 'th');
function el(tag, attrs, parent, text){
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function h(tag, cls, text, parent){
  const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e); return e;
}

/* ---------- สร้างโหนดและเส้น ---------- */
function build(o){
  const nodes = [], links = [], byId = {};
  const add = n => { while (byId[n.id]) n.id += '#'; nodes.push(n); byId[n.id] = n; return n; };
  const cl = new Map((o.clusters || []).map(c => [c.id, c]));
  const color = new Map((o.clusters || []).map((c, i) => [c.id, CC[i % CC.length]]));
  const wgs = [...new Set(o.entries.map(e => e.wg))].sort(thSort);
  const hubs = wgs.map(g => add({id: 'g:' + g, type: 'hub', label: short(g), wg: g, r: 21, kids: [], own: g === o.own, done: !!(o.done && o.done.has(g))}));
  const usedCl = [...new Set(o.entries.map(e => e.cluster_id).filter(id => id && cl.has(id)))];
  const clusters = usedCl.map(id => add({id: 'c:' + id, type: 'cluster', cid: id, name: cl.get(id).name, label: clip(cl.get(id).name, 24), r: 13, color: color.get(id), kids: []}));
  const rank = e => KO.indexOf(e.kind) * 10 - (+e.priority || 0);
  o.entries.map((e, i) => ({e, i})).sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i).forEach(({e, i}) => {
    const hub = byId['g:' + e.wg], big = +e.priority >= 3 && (e.kind === 'ISSUE' || e.kind === 'IDEA');
    const n = add({id: 'e:' + (e.id != null ? e.id : 'i' + i), type: 'entry', kind: e.kind, label: clip(e.body, 34), e, r: big ? 9 : 6.5, hub, cl: null});
    hub.kids.push(n); links.push({s: hub, t: n, kind: 'hub'});
    const c = e.cluster_id && byId['c:' + e.cluster_id];
    if (c){ n.cl = c; c.kids.push(n); links.push({s: c, t: n, kind: 'cl', color: c.color}); }
  });
  return {nodes, links, byId, hubs, clusters};
}

/* ---------- จัดวางแบบไม่ทับกัน ---------- */
function ellipsePts(a, b, N){
  const pts = [{x: a, y: 0, s: 0}]; let s = 0;
  for (let i = 1; i <= N; i++){ const t = i / N * 2 * Math.PI, p = {x: a * Math.cos(t), y: b * Math.sin(t)}, q = pts[i - 1]; s += Math.hypot(p.x - q.x, p.y - q.y); p.s = s; pts.push(p); }
  return pts;
}
function at(pts, s){
  const L = pts[pts.length - 1].s; s = ((s % L) + L) % L; let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1){ const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
  const p = pts[lo], q = pts[hi], f = (s - p.s) / ((q.s - p.s) || 1);
  return {x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f};
}
function overlapOf(hubs){
  let m = 0; for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++){
    const a = hubs[i], b = hubs[j]; m = Math.max(m, a.R + b.R + 8 - Math.hypot(a.x - b.x, a.y - b.y)); }
  return m;
}
function separate(hubs){
  for (let it = 0; it < 80; it++){
    let moved = false;
    for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++){
      const a = hubs[i], b = hubs[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01;
      const need = a.R + b.R + 12; if (d >= need) continue;
      const f = (need - d) / 2 / d; a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f; moved = true;
    }
    if (!moved) break;
  }
}
function layout(g){
  const hubs = g.hubs, cls = g.clusters;
  hubs.forEach(hn => {                                     // วงของแต่ละกลุ่มงาน: รายการเรียงเป็นวงแหวนซ้อนกัน เว้นระยะแน่นอน
    const es = hn.kids; let left = es.length, k = 0, idx = 0; const rings = [];
    while (left > 0){ const rr = 46 + k * 30, cap = Math.max(6, Math.floor(2 * Math.PI * rr / 28)), take = Math.min(cap, left); rings.push({rr, take}); left -= take; k++; }
    rings.forEach((rg, i) => { const a0 = -Math.PI / 2 + i * .5; for (let j = 0; j < rg.take; j++){ const a = a0 + j / rg.take * 2 * Math.PI, n = es[idx++]; n.ox = Math.cos(a) * rg.rr; n.oy = Math.sin(a) * rg.rr; } });
    hn.R = (rings.length ? rings[rings.length - 1].rr : 24) + 9 + 18;
  });
  const kc = cls.length, Rmax = Math.max(40, ...hubs.map(x => x.R));
  let cr = kc <= 1 ? 0 : Math.max(75, 54 / Math.sin(Math.PI / kc));
  if (hubs.length === 1){ hubs[0].x = 0; hubs[0].y = 0; if (kc) cr = hubs[0].R + 130; }
  else {
    const need = hubs.reduce((s, x) => s + 2 * x.R + GAP, 0);
    let b = Math.max(230, need / 7.4, kc ? cr + 175 + Rmax + 30 : 0), tries = 0;
    do {
      const a = ASP * b, pts = ellipsePts(a, b, 720), L = pts[pts.length - 1].s, extra = Math.max(0, (L - need) / hubs.length);
      let acc = 0; hubs.forEach(hn => { const p = at(pts, acc + hn.R + extra / 2 + L * .75); hn.x = p.x; hn.y = p.y; acc += 2 * hn.R + GAP + extra; });
      separate(hubs); b *= 1.06; tries++;
    } while (overlapOf(hubs) > .5 && tries < 16);
  }
  hubs.forEach(hn => { const p = POS[hn.id]; if (p){ hn.x = p.x; hn.y = p.y; } });
  // ประเด็นรวม: เรียงรอบศูนย์กลางตามทิศของกลุ่มงานที่เกี่ยวข้อง
  const dir = c => { let sx = 0, sy = 0; c.kids.forEach(k => { const d = Math.hypot(k.hub.x, k.hub.y) || 1; sx += k.hub.x / d; sy += k.hub.y / d; }); return Math.atan2(sy, sx); };
  const ordered = cls.slice().sort((a, b) => dir(a) - dir(b)), base = ordered.length ? dir(ordered[0]) : 0;
  ordered.forEach((c, i) => {
    const a = kc === 1 ? 0 : base + i * 2 * Math.PI / kc;
    c.x = Math.cos(a) * cr; c.y = Math.sin(a) * cr; c.dx = kc === 1 ? 0 : Math.cos(a); c.dy = kc === 1 ? 1 : Math.sin(a);
  });
  // ป้ายชื่อกลุ่มงานวางด้านนอกวง
  hubs.forEach(hn => {
    const d = Math.hypot(hn.x, hn.y) || 1, dx = hubs.length === 1 ? 0 : hn.x / d, dy = hubs.length === 1 ? 1 : hn.y / d;
    hn.lx = dx * (hn.R + 8); hn.ly = dy * (hn.R + 8) + (Math.abs(dx) < .3 ? (dy > 0 ? 14 : -4) : 5);
    hn.la = dx > .3 ? 'start' : dx < -.3 ? 'end' : 'middle'; hn.lw = clip(hn.label, 18).length * 8.6;
  });
  g.nodes.forEach(n => { if (n.type === 'entry'){ n.x = n.hub.x + n.ox; n.y = n.hub.y + n.oy; } });
}
function bounds(g){
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const box = (a, b, c, d) => { x0 = Math.min(x0, a); x1 = Math.max(x1, b); y0 = Math.min(y0, c); y1 = Math.max(y1, d); };
  g.hubs.forEach(hn => { box(hn.x - hn.R, hn.x + hn.R, hn.y - hn.R, hn.y + hn.R);
    const lx = hn.x + hn.lx, w = hn.lw; box(hn.la === 'start' ? lx : hn.la === 'end' ? lx - w : lx - w / 2, hn.la === 'start' ? lx + w : hn.la === 'end' ? lx : lx + w / 2, hn.y + hn.ly - 16, hn.y + hn.ly + 6); });
  g.clusters.forEach(c => box(c.x - 200, c.x + 200, c.y - 30, c.y + 40));
  return {x0: x0 - 24, y0: y0 - 24, w: x1 - x0 + 48, h: y1 - y0 + 48};
}

/* ---------- วาดและโต้ตอบ ---------- */
function mount(host, o){
  const entries = (o.entries || []).filter(e => e && e.wg && KC[e.kind]);
  host.textContent = '';
  const root = h('div', 'gr', null, host);
  if (!entries.length){ h('div', 'empty', 'ไม่มีรายการให้แสดงในกราฟ', root); return {nodes: 0}; }
  const g = build({entries, clusters: o.clusters, done: o.done, own: o.own});
  const sig = g.hubs.map(x => x.id + x.kids.length).join('|'); if (sig !== LAST){ POS = {}; LAST = sig; }
  layout(g);
  const nodes = g.nodes, links = g.links, hubs = g.hubs;
  const bb = bounds(g), VW = Math.round(bb.w), VH = Math.round(bb.h);

  const bar = h('div', 'gr-tools', null, root);
  const mk = (txt, act, icon) => { const b = h('button', 'btn sm', null, bar); b.type = 'button'; b.dataset.g = act; b.setAttribute('aria-label', txt);
    b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-' + icon + '"/></svg>'; b.append(txt); return b; };
  mk('ขยาย', 'in', 'plus'); mk('ย่อ', 'out', 'minus'); mk('พอดีจอ', 'fit', 'refresh'); mk('รีเซ็ตตำแหน่ง', 'relayout', 'refresh');
  h('span', 'muted small gr-hint', 'คลิกโหนดเพื่อดูเส้นทางการเชื่อม · ลากวงกลุ่มงานเพื่อย้าย · ลากพื้นหลังเพื่อเลื่อน · ล้อเมาส์เพื่อซูม', bar);
  const svg = el('svg', {class: 'gr-svg', viewBox: bb.x0.toFixed(0) + ' ' + bb.y0.toFixed(0) + ' ' + VW + ' ' + VH, role: 'group', 'aria-label': 'กราฟเครือข่ายมุมมองกลุ่มงาน'});
  svg.style.aspectRatio = VW + ' / ' + Math.min(VH, VW * .95);
  root.appendChild(svg);
  const legend = h('div', 'gr-legend', null, root);
  const detail = h('div', 'gr-detail', 'คลิกที่โหนดเพื่อดูรายละเอียดและเส้นทางการเชื่อม', root); detail.setAttribute('aria-live', 'polite');

  const vp = el('g', {}, svg), gp = el('g', {}, vp), gl = el('g', {}, vp), gn = el('g', {}, vp);
  hubs.forEach(hn => { hn.podEl = el('circle', {class: 'pod' + (hn.own ? ' own' : ''), r: hn.R - 6}, gp); });
  links.slice().sort((a, b) => (a.kind === 'cl') - (b.kind === 'cl')).forEach(l => {
    l.el = el('line', {class: 'gr-edge ' + l.kind}, gl); if (l.color) l.el.style.stroke = l.color; });
  nodes.forEach(n => {
    const grp = el('g', {class: 'gn ' + n.type + (n.kind ? ' k-' + n.kind : '') + (n.own ? ' own' : '') + (n.done ? ' done' : ''), 'data-nid': n.id, tabindex: 0, role: 'button'}, gn);
    n.el = grp;
    if (n.type === 'hub'){
      el('circle', {r: n.r, class: 'body'}, grp);
      el('text', {class: 'cnt', 'text-anchor': 'middle', dy: '.35em'}, grp, n.kids.length);
      el('text', {class: 'lab hublab', 'text-anchor': n.la, x: n.lx, y: n.ly}, grp, clip(n.label, 18));
      grp.setAttribute('aria-label', 'กลุ่มงาน ' + n.wg + ' ' + n.kids.length + ' รายการ');
    } else if (n.type === 'cluster'){
      const d = el('rect', {x: -n.r * .75, y: -n.r * .75, width: n.r * 1.5, height: n.r * 1.5, transform: 'rotate(45)', class: 'body'}, grp); d.style.stroke = n.color;
      const t = el('text', {class: 'cnt cc', 'text-anchor': 'middle', dy: '.35em'}, grp, n.kids.length); t.style.fill = n.color;
      const lx = n.dx * (n.r + 12), ly = n.dy * (n.r + 12) + (Math.abs(n.dx) < .3 ? (n.dy > 0 ? 10 : -4) : 5);
      el('text', {class: 'lab cllab', 'text-anchor': n.dx > .3 ? 'start' : n.dx < -.3 ? 'end' : 'middle', x: lx, y: ly}, grp, n.label);
      grp.setAttribute('aria-label', 'ประเด็นรวม ' + n.name);
    } else {
      el('circle', {r: n.r, class: 'body', fill: KC[n.kind]}, grp);
      el('text', {class: 'lab elab', x: n.r + 5, dy: '.35em'}, grp, n.label);
      grp.setAttribute('aria-label', KL[n.kind] + ': ' + n.e.body);
    }
    el('title', {}, grp, n.type === 'entry' ? KL[n.kind] + ' · ' + short(n.e.wg) + ': ' + n.e.body : (n.type === 'hub' ? n.wg : n.name));
  });

  const hidden = new Set();
  let sel = null, view = {x: 0, y: 0, k: 1}, moved = false;
  function place(){
    hubs.forEach(hn => hn.kids.forEach(k => { k.x = hn.x + k.ox; k.y = hn.y + k.oy; }));
    nodes.forEach(n => n.el.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ')'));
    hubs.forEach(hn => hn.podEl.setAttribute('transform', 'translate(' + hn.x.toFixed(1) + ',' + hn.y.toFixed(1) + ')'));
    links.forEach(l => { l.el.setAttribute('x1', l.s.x.toFixed(1)); l.el.setAttribute('y1', l.s.y.toFixed(1)); l.el.setAttribute('x2', l.t.x.toFixed(1)); l.el.setAttribute('y2', l.t.y.toFixed(1)); });
  }
  const applyView = () => vp.setAttribute('transform', 'translate(' + view.x.toFixed(1) + ',' + view.y.toFixed(1) + ') scale(' + view.k.toFixed(3) + ')');
  const fit = () => { view = {x: 0, y: 0, k: 1}; applyView(); };
  function vis(){
    nodes.forEach(n => { if (n.type === 'entry') n.el.classList.toggle('off', hidden.has(n.kind)); });
    links.forEach(l => l.el.classList.toggle('off', l.t.el.classList.contains('off')));
    hubs.forEach(hn => hn.podEl.classList.toggle('faint', hn.kids.every(k => hidden.has(k.kind))));
    g.clusters.forEach(c => c.el.classList.toggle('faint', c.kids.every(k => hidden.has(k.kind))));
  }
  const shown = n => !n.el.classList.contains('off');

  /* เลือกโหนด: ไฮไลต์เส้นทาง (hl = เส้นทางหลัก, rel = ส่วนที่เกี่ยวข้องรอง) */
  function select(id){
    sel = id && g.byId[id] ? g.byId[id] : null;
    const hlN = new Set(), relN = new Set(), hlE = new Set(), relE = new Set();
    const edge = (a, b) => links.find(l => (l.s === a && l.t === b));
    if (sel){
      if (sel.type === 'entry'){
        hlN.add(sel); hlN.add(sel.hub); links.forEach(l => { if (l.t === sel) hlE.add(l); });
        if (sel.cl){ hlN.add(sel.cl);
          sel.cl.kids.forEach(k => { if (k !== sel){ relN.add(k); relN.add(k.hub); relE.add(edge(sel.cl, k)); relE.add(edge(k.hub, k)); } }); }
      } else if (sel.type === 'hub'){
        hlN.add(sel); sel.kids.forEach(k => { hlN.add(k); hlE.add(edge(sel, k)); if (k.cl){ hlN.add(k.cl); hlE.add(edge(k.cl, k)); } });
      } else {
        hlN.add(sel); sel.kids.forEach(k => { hlN.add(k); hlE.add(edge(sel, k)); relN.add(k.hub); relE.add(edge(k.hub, k)); });
      }
    }
    nodes.forEach(n => { const on = hlN.has(n), re = !on && relN.has(n);
      n.el.classList.toggle('hl', on); n.el.classList.toggle('rel', re); n.el.classList.toggle('dim', !!sel && !on && !re); n.el.classList.toggle('sel', n === sel); });
    hubs.forEach(hn => hn.podEl.classList.toggle('dim', !!sel && !hlN.has(hn) && !relN.has(hn)));
    links.forEach(l => { const on = hlE.has(l), re = !on && relE.has(l);
      l.el.classList.toggle('hl', on); l.el.classList.toggle('rel', re); l.el.classList.toggle('dim', !!sel && !on && !re); });
    drawDetail();
  }
  function drawDetail(){
    detail.textContent = '';
    if (!sel){ detail.textContent = 'คลิกที่โหนดเพื่อดูรายละเอียดและเส้นทางการเชื่อม'; return; }
    const chip = (txt, node, cls) => { const b = h('button', 'chip gr-chip ' + (cls || ''), txt, null); b.type = 'button'; b.dataset.sid = node.id; return b; };
    if (sel.type === 'entry'){
      const e = sel.e, top = h('div', 'gr-d-top', null, detail);
      h('span', 'pill ' + e.kind, KL[e.kind], top); h('b', null, short(e.wg), top);
      if (e.kind === 'ISSUE' || e.kind === 'IDEA') h('span', 'muted small', PRI[e.priority] || '', top);
      h('p', 'gr-d-body', e.body, detail); if (e.detail) h('p', 'muted small', e.detail, detail);
      const path = h('div', 'gr-path', null, detail); h('span', 'muted small', 'เส้นทาง:', path);
      path.appendChild(chip(short(e.wg), sel.hub)); h('span', 'arr', '→', path); h('b', 'gr-here', KL[e.kind], path);
      if (sel.cl){ h('span', 'arr', '→', path); const c = chip(sel.cl.name, sel.cl, 'cl'); c.style.borderColor = sel.cl.color; c.style.color = sel.cl.color; path.appendChild(c);
        const peers = sel.cl.kids.filter(k => k !== sel); if (peers.length){ h('p', 'muted small', 'อยู่ประเด็นเดียวกัน ' + peers.length + ' รายการจาก ' + new Set(peers.map(k => k.e.wg)).size + ' กลุ่มงาน (เส้นบางสว่างในกราฟ)', detail); } }
      else h('span', 'muted small', ' (ยังไม่ถูกจัดเข้าประเด็นรวม)', path);
    } else {
      const top = h('div', 'gr-d-top', null, detail);
      if (sel.type === 'hub'){ h('b', null, sel.wg, top); h('span', 'muted small', sel.kids.length + ' รายการ · ' + (sel.done ? 'ส่งข้อมูลแล้ว' : 'ยังไม่ส่ง / กำลังกรอก'), top); }
      else { const b = h('b', null, sel.name, top); b.style.color = sel.color; h('span', 'muted small', sel.kids.length + ' รายการ จาก ' + new Set(sel.kids.map(k => k.e.wg)).size + ' กลุ่มงาน', top); }
      const list = h('div', 'gr-list', null, detail);
      sel.kids.filter(shown).forEach(k => { const b = h('button', 'gr-item', null, list); b.type = 'button'; b.dataset.sid = k.id;
        const d = h('i', 'dot', null, b); d.style.background = KC[k.kind]; b.append((sel.type === 'cluster' ? short(k.e.wg) + ' · ' : '') + clip(k.e.body, 80)); });
    }
  }
  // คำอธิบายสี
  KO.filter(k => entries.some(e => e.kind === k)).forEach(k => {
    const b = h('button', 'lg', null, legend); b.type = 'button'; b.dataset.gk = k; b.setAttribute('aria-pressed', 'true');
    const dot = h('i', 'dot', null, b); dot.style.background = KC[k]; b.append(KL[k]);
  });
  const hk = h('span', 'lg static', null, legend); hk.innerHTML = '<i class="dot big"></i>กลุ่มงาน (วงกลมใหญ่)';
  g.clusters.forEach(c => { const b = h('button', 'lg cl', null, legend); b.type = 'button'; b.dataset.sid = c.id; b.title = c.name;
    const d = h('i', 'dia', null, b); d.style.borderColor = c.color; b.append(clip(c.name, 22)); });

  const toSvg = ev => { const r = svg.getBoundingClientRect(); return {x: bb.x0 + (ev.clientX - r.left) * VW / (r.width || VW), y: bb.y0 + (ev.clientY - r.top) * VH / (r.height || VH)}; };
  const zoom = (f, at0) => {
    const k2 = Math.max(.4, Math.min(5, view.k * f)), p = at0 || {x: bb.x0 + VW / 2, y: bb.y0 + VH / 2};
    view.x = p.x - (p.x - view.x) * (k2 / view.k); view.y = p.y - (p.y - view.y) * (k2 / view.k); view.k = k2; applyView();
  };
  svg.addEventListener('wheel', ev => { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.15 : 1 / 1.15, toSvg(ev)); }, {passive: false});
  let drag = null;
  svg.addEventListener('pointerdown', ev => {
    const t = ev.target.closest && ev.target.closest('[data-nid]'), n = t && g.byId[t.dataset.nid]; moved = false; const p = toSvg(ev);
    drag = n && n.type === 'hub' ? {hub: n, sx: p.x, sy: p.y, hx: n.x, hy: n.y} : n ? null : {pan: true, sx: p.x, sy: p.y, vx: view.x, vy: view.y};
    try { svg.setPointerCapture(ev.pointerId); } catch(e){}
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag) return; const p = toSvg(ev);
    if (Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) > 4) moved = true; if (!moved) return;
    if (drag.pan){ view.x = drag.vx + p.x - drag.sx; view.y = drag.vy + p.y - drag.sy; applyView(); return; }
    drag.hub.x = drag.hx + (p.x - drag.sx) / view.k; drag.hub.y = drag.hy + (p.y - drag.sy) / view.k; place();
  });
  const end = () => { if (drag && drag.hub && moved) POS[drag.hub.id] = {x: drag.hub.x, y: drag.hub.y}; drag = null; };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('click', ev => {
    if (moved){ moved = false; return; }
    const t = ev.target.closest && ev.target.closest('[data-nid]'); select(t ? (t.dataset.nid === (sel && sel.id) ? null : t.dataset.nid) : null);
  });
  svg.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ const t = ev.target.closest && ev.target.closest('[data-nid]'); if (t){ ev.preventDefault(); select(t.dataset.nid); } } });
  const byDetail = ev => { const b = ev.target.closest('[data-sid]'); if (b) select(b.dataset.sid); };
  detail.addEventListener('click', byDetail);
  bar.addEventListener('click', ev => {
    const b = ev.target.closest('[data-g]'); if (!b) return; const a = b.dataset.g;
    if (a === 'in') zoom(1.3); else if (a === 'out') zoom(1 / 1.3); else if (a === 'fit') fit();
    else if (a === 'relayout'){ POS = {}; mount(host, o); }
  });
  legend.addEventListener('click', ev => {
    const c = ev.target.closest('[data-sid]'); if (c){ select(c.dataset.sid); return; }
    const b = ev.target.closest('[data-gk]'); if (!b) return; const k = b.dataset.gk;
    if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
    b.setAttribute('aria-pressed', hidden.has(k) ? 'false' : 'true'); b.classList.toggle('off', hidden.has(k));
    vis(); if (sel && sel.type === 'entry' && !shown(sel)) select(null); else if (sel) drawDetail();
  });
  place(); vis(); applyView();
  return {nodes: nodes.length, select, g};
}
window.SXG = {mount};
})();
