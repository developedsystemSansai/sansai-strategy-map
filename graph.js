'use strict';
/* กราฟเครือข่ายของมุมมองกลุ่มงาน (ไม่พึ่งไลบรารีภายนอก)
   โหนดใหญ่ = กลุ่มงาน · จุดสี = รายการตามประเภท · เพชรม่วง = ประเด็นรวมที่ทีมยุทธศาสตร์จัดกลุ่ม
   ใช้ร่วมกันทั้งหน้ามุมมองกลุ่มงานอื่น (ผู้กรอก) และหน้าข้อมูลทั้งหมด (ผู้ดูแล)
   SXG.mount(host, {entries, clusters, done:Set, own}) */
(function(){
const NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 640;
const KC = {S:'#059669', W:'#e11d48', O:'#2563eb', T:'#d97706', ISSUE:'#7c3aed', IDEA:'#0d9488', DATA:'#64748b'};
const KL = {S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค', ISSUE:'ประเด็นสำคัญ', IDEA:'ข้อเสนอ', DATA:'ข้อมูล'};
const KO = ['S','W','O','T','ISSUE','IDEA','DATA'];
const PRI = {3:'สำคัญมาก', 2:'สำคัญ', 1:'พิจารณา'};
const POS = {};                                   // จำตำแหน่งโหนดไว้ เมื่อวาดใหม่แล้วผังไม่สลับ
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || String(g || '');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
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

function build(o){
  const nodes = [], links = [], byId = {};
  const add = n => { while (byId[n.id]) n.id += '#'; nodes.push(n); byId[n.id] = n; return n; };
  const cl = new Map((o.clusters || []).map(c => [c.id, c]));
  const wgs = [...new Set(o.entries.map(e => e.wg))].sort(thSort);
  wgs.forEach(g => add({id: 'g:' + g, type: 'hub', label: short(g), wg: g, r: 21, n: 0, own: g === o.own, done: !!(o.done && o.done.has(g))}));
  [...new Set(o.entries.map(e => e.cluster_id).filter(id => id && cl.has(id)))]
    .forEach(id => add({id: 'c:' + id, type: 'cluster', label: clip(cl.get(id).name, 26), name: cl.get(id).name, r: 13, n: 0}));
  o.entries.forEach((e, i) => {
    const hub = byId['g:' + e.wg]; hub.n++;
    const big = +e.priority >= 3 && (e.kind === 'ISSUE' || e.kind === 'IDEA');
    const n = add({id: 'e:' + (e.id != null ? e.id : 'i' + i), type: 'entry', kind: e.kind, label: clip(e.body, 22), e, r: big ? 9 : 6.5});
    links.push({s: hub, t: n, d: 62, k: .09});
    const c = e.cluster_id && byId['c:' + e.cluster_id];
    if (c){ c.n++; links.push({s: c, t: n, d: 130, k: .025, soft: true}); }
  });
  // ตำแหน่งเริ่มต้น
  const hubs = nodes.filter(n => n.type === 'hub');
  hubs.forEach((n, i) => {
    const a = i / hubs.length * Math.PI * 2 - Math.PI / 2, R = hubs.length > 1 ? 250 : 0;
    n.x = W / 2 + Math.cos(a) * R * 1.35; n.y = H / 2 + Math.sin(a) * R * .9;
  });
  nodes.forEach((n, i) => {
    const p = POS[n.id]; if (p){ n.x = p.x; n.y = p.y; n.known = true; return; }
    if (n.type === 'entry'){
      const hub = byId['g:' + n.e.wg], a = rnd(i) * Math.PI * 2, d = 50 + rnd(i + 9) * 40;
      n.x = hub.x + Math.cos(a) * d; n.y = hub.y + Math.sin(a) * d;
    } else if (n.type === 'cluster'){ n.x = W / 2 + (rnd(i) - .5) * 120; n.y = H / 2 + (rnd(i + 5) - .5) * 90; }
  });
  nodes.forEach(n => { n.vx = 0; n.vy = 0; });
  return {nodes, links, byId};
}

function tick(nodes, links, alpha, pinned){
  const N = nodes.length;
  for (let i = 0; i < N; i++){
    const a = nodes[i];
    for (let j = i + 1; j < N; j++){
      const b = nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 > 90000) continue;
      if (d2 < 1){ dx = rnd(i + j) - .5; dy = rnd(i * 7 + j) - .5; d2 = dx * dx + dy * dy + .01; }
      const d = Math.sqrt(d2), minD = a.r + b.r + 14;
      let f = ((a.type === 'hub' || b.type === 'hub') ? 2800 : 1500) / d2;
      if (d < minD) f += (minD - d) * .06;
      const fx = dx / d * f * alpha, fy = dy / d * f * alpha;
      a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
    }
  }
  links.forEach(l => {
    const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - l.d) * l.k * alpha;
    const fx = dx / d * f, fy = dy / d * f;
    l.s.vx += fx; l.s.vy += fy; l.t.vx -= fx; l.t.vy -= fy;
  });
  nodes.forEach(n => {
    n.vx += (W / 2 - n.x) * .004 * alpha; n.vy += (H / 2 - n.y) * .006 * alpha;
    if (n === pinned){ n.vx = n.vy = 0; return; }
    n.vx *= .6; n.vy *= .6; n.x += n.vx; n.y += n.vy;
  });
}

function mount(host, o){
  const entries = (o.entries || []).filter(e => e && e.wg && KC[e.kind]);
  host.textContent = '';
  const root = h('div', 'gr', null, host);
  if (!entries.length){ h('div', 'empty', 'ไม่มีรายการให้แสดงในกราฟ', root); return {nodes: 0}; }
  const g = build({entries, clusters: o.clusters, done: o.done, own: o.own});
  const nodes = g.nodes, links = g.links;
  const unknown = nodes.filter(n => !n.known).length;
  if (unknown){ for (let i = 0; i < 280; i++) tick(nodes, links, Math.max(.02, 1 - i / 240)); }
  nodes.forEach(n => { POS[n.id] = {x: n.x, y: n.y}; });

  // โครงหน้า
  const bar = h('div', 'gr-tools', null, root);
  const mk = (txt, act, icon) => { const b = h('button', 'btn sm', null, bar); b.type = 'button'; b.dataset.g = act; b.setAttribute('aria-label', txt);
    b.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-' + icon + '"/></svg>'; b.append(txt); return b; };
  mk('ขยาย', 'in', 'plus'); mk('ย่อ', 'out', 'minus'); mk('พอดีจอ', 'fit', 'refresh'); mk('จัดวางใหม่', 'relayout', 'refresh');
  h('span', 'muted small gr-hint', 'เลื่อนล้อเมาส์เพื่อซูม · ลากพื้นหลังเพื่อเลื่อน · ลากโหนดเพื่อจัดวาง · คลิกโหนดเพื่อดูรายละเอียด', bar);
  const svg = el('svg', {class: 'gr-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'กราฟเครือข่ายมุมมองกลุ่มงาน'});
  root.appendChild(svg);
  const legend = h('div', 'gr-legend', null, root);
  const detail = h('div', 'gr-detail', 'คลิกที่โหนดเพื่อดูรายละเอียด', root);
  detail.setAttribute('aria-live', 'polite');

  const vp = el('g', {}, svg), gl = el('g', {}, vp), gn = el('g', {}, vp);
  nodes.forEach(n => { n.sel = null; });
  links.forEach(l => { l.el = el('line', {class: 'gr-edge' + (l.soft ? ' soft' : '')}, gl); });
  nodes.forEach(n => {
    const grp = el('g', {class: 'gn ' + n.type + (n.kind ? ' k-' + n.kind : '') + (n.own ? ' own' : '') + (n.done ? ' done' : ''), 'data-nid': n.id, tabindex: 0, role: 'button'}, gn);
    n.el = grp;
    if (n.type === 'hub'){
      el('circle', {r: n.r + 5, class: 'ring'}, grp); el('circle', {r: n.r, class: 'body'}, grp);
      el('text', {class: 'cnt', 'text-anchor': 'middle', dy: '.35em'}, grp, n.n);
      el('text', {class: 'lab hublab', 'text-anchor': 'middle', y: n.r + 18}, grp, clip(n.label, 20));
      grp.setAttribute('aria-label', 'กลุ่มงาน ' + n.label + ' ' + n.n + ' รายการ');
    } else if (n.type === 'cluster'){
      el('rect', {x: -n.r * .75, y: -n.r * .75, width: n.r * 1.5, height: n.r * 1.5, transform: 'rotate(45)', class: 'body'}, grp);
      el('text', {class: 'cnt cc', 'text-anchor': 'middle', dy: '.35em'}, grp, n.n);
      el('text', {class: 'lab', 'text-anchor': 'middle', y: n.r + 16}, grp, n.label);
      grp.setAttribute('aria-label', 'ประเด็นรวม ' + n.name);
    } else {
      el('circle', {r: n.r, class: 'body', fill: KC[n.kind]}, grp);
      el('text', {class: 'lab elab', x: n.r + 4, dy: '.35em'}, grp, n.label);
      grp.setAttribute('aria-label', KL[n.kind] + ': ' + n.e.body);
    }
    el('title', {}, grp, n.type === 'entry' ? KL[n.kind] + ' · ' + short(n.e.wg) + ': ' + n.e.body : (n.type === 'hub' ? n.wg : n.name));
  });

  const hidden = new Set();
  let sel = null, view = {x: 0, y: 0, k: 1}, moved = false;
  const showLabels = () => svg.classList.toggle('labs', entries.length <= 70 || view.k >= 1.5);
  function place(){
    nodes.forEach(n => n.el.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ')'));
    links.forEach(l => { l.el.setAttribute('x1', l.s.x.toFixed(1)); l.el.setAttribute('y1', l.s.y.toFixed(1)); l.el.setAttribute('x2', l.t.x.toFixed(1)); l.el.setAttribute('y2', l.t.y.toFixed(1)); });
  }
  function applyView(){ vp.setAttribute('transform', 'translate(' + view.x.toFixed(1) + ',' + view.y.toFixed(1) + ') scale(' + view.k.toFixed(3) + ')'); showLabels(); }
  function fit(){
    const vis = nodes.filter(n => !n.el.classList.contains('off')); if (!vis.length) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    vis.forEach(n => { x0 = Math.min(x0, n.x - n.r - 30); x1 = Math.max(x1, n.x + n.r + 90); y0 = Math.min(y0, n.y - n.r - 20); y1 = Math.max(y1, n.y + n.r + 34); });
    const k = Math.min(W / (x1 - x0), H / (y1 - y0), 1.6);
    view = {k, x: (W - (x1 - x0) * k) / 2 - x0 * k, y: (H - (y1 - y0) * k) / 2 - y0 * k}; applyView();
  }
  function vis(){
    nodes.forEach(n => {
      const off = n.type === 'entry' ? hidden.has(n.kind) : false;
      n.el.classList.toggle('off', off);
    });
    nodes.forEach(n => { if (n.type !== 'entry'){ const any = links.some(l => (l.s === n) && !l.t.el.classList.contains('off')); n.el.classList.toggle('off', !any); } });
    links.forEach(l => l.el.classList.toggle('off', l.s.el.classList.contains('off') || l.t.el.classList.contains('off')));
  }
  function select(id){
    sel = id && g.byId[id] ? g.byId[id] : null;
    const near = new Set(); if (sel){ near.add(sel); links.forEach(l => { if (l.s === sel) near.add(l.t); if (l.t === sel) near.add(l.s); });
}
    nodes.forEach(n => { n.el.classList.toggle('dim', !!sel && !near.has(n)); n.el.classList.toggle('sel', n === sel); });
    links.forEach(l => l.el.classList.toggle('dim', !!sel && l.s !== sel && l.t !== sel));
    detail.textContent = '';
    if (!sel){ detail.textContent = 'คลิกที่โหนดเพื่อดูรายละเอียด'; return; }
    if (sel.type === 'entry'){
      const e = sel.e, top = h('div', 'gr-d-top', null, detail);
      const pill = h('span', 'pill ' + e.kind, KL[e.kind], top);
      h('b', null, short(e.wg), top);
      if (e.kind === 'ISSUE' || e.kind === 'IDEA') h('span', 'muted small', PRI[e.priority] || '', top);
      h('p', 'gr-d-body', e.body, detail);
      if (e.detail) h('p', 'muted small', e.detail, detail);
      const c = e.cluster_id && g.byId['c:' + e.cluster_id]; if (c) h('span', 'chip', c.name, detail);
    } else if (sel.type === 'hub'){
      const mine = entries.filter(e => e.wg === sel.wg), top = h('div', 'gr-d-top', null, detail);
      h('b', null, sel.wg, top); h('span', 'muted small', sel.done ? 'ส่งข้อมูลแล้ว' : 'ยังไม่ส่ง / กำลังกรอก', top);
      const row = h('div', 'gr-d-row', null, detail);
      KO.forEach(k => { const c = mine.filter(e => e.kind === k).length; if (c){ const s = h('span', 'pill ' + k, KL[k] + ' ' + c, row); } });
    } else {
      const mine = entries.filter(e => 'c:' + e.cluster_id === sel.id), top = h('div', 'gr-d-top', null, detail);
      h('b', null, sel.name, top); h('span', 'muted small', mine.length + ' รายการ จาก ' + new Set(mine.map(e => e.wg)).size + ' กลุ่มงาน', top);
    }
  }
  // คำอธิบายสี (กดเพื่อซ่อน/แสดงประเภท)
  const present = KO.filter(k => entries.some(e => e.kind === k));
  present.forEach(k => {
    const b = h('button', 'lg', null, legend); b.type = 'button'; b.dataset.gk = k; b.setAttribute('aria-pressed', 'true');
    const dot = h('i', 'dot', null, b); dot.style.background = KC[k]; b.append(KL[k]);
  });
  const hubKey = h('span', 'lg static', null, legend); hubKey.innerHTML = '<i class="dot big"></i>กลุ่มงาน';
  if (nodes.some(n => n.type === 'cluster')){ const c = h('span', 'lg static', null, legend); c.innerHTML = '<i class="dia"></i>ประเด็นรวม (เส้นประ)'; }

  // การโต้ตอบ
  const toSvg = ev => { const r = svg.getBoundingClientRect(); return {x: (ev.clientX - r.left) * W / (r.width || W), y: (ev.clientY - r.top) * H / (r.height || H)}; };
  const zoom = (f, at) => {
    const k2 = Math.max(.3, Math.min(4, view.k * f)), p = at || {x: W / 2, y: H / 2};
    view.x = p.x - (p.x - view.x) * (k2 / view.k); view.y = p.y - (p.y - view.y) * (k2 / view.k); view.k = k2; applyView();
  };
  svg.addEventListener('wheel', ev => { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.15 : 1 / 1.15, toSvg(ev)); }, {passive: false});
  let drag = null;
  svg.addEventListener('pointerdown', ev => {
    const t = ev.target.closest && ev.target.closest('[data-nid]'); moved = false;
    const p = toSvg(ev);
    drag = t ? {node: g.byId[t.dataset.nid], sx: p.x, sy: p.y} : {pan: true, sx: p.x, sy: p.y, vx: view.x, vy: view.y};
    try { svg.setPointerCapture(ev.pointerId); } catch(e){}
  });
  svg.addEventListener('pointermove', ev => {
    if (!drag) return; const p = toSvg(ev);
    if (Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) > 4) moved = true; if (!moved) return;
    if (drag.pan){ view.x = drag.vx + p.x - drag.sx; view.y = drag.vy + p.y - drag.sy; applyView(); return; }
    drag.node.x = (p.x - view.x) / view.k; drag.node.y = (p.y - view.y) / view.k;
    for (let i = 0; i < 4; i++) tick(nodes, links, .25, drag.node); place();
  });
  const end = () => { if (drag && drag.node && moved) nodes.forEach(n => { POS[n.id] = {x: n.x, y: n.y}; }); drag = null; };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('click', ev => {
    if (moved){ moved = false; return; }
    const t = ev.target.closest && ev.target.closest('[data-nid]'); select(t ? (t.dataset.nid === (sel && sel.id) ? null : t.dataset.nid) : null);
  });
  svg.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' '){ const t = ev.target.closest && ev.target.closest('[data-nid]'); if (t){ ev.preventDefault(); select(t.dataset.nid); } } });
  bar.addEventListener('click', ev => {
    const b = ev.target.closest('[data-g]'); if (!b) return; const a = b.dataset.g;
    if (a === 'in') zoom(1.3); else if (a === 'out') zoom(1 / 1.3); else if (a === 'fit') fit();
    else if (a === 'relayout'){ nodes.forEach(n => { delete POS[n.id]; }); mount(host, o); }
  });
  legend.addEventListener('click', ev => {
    const b = ev.target.closest('[data-gk]'); if (!b) return; const k = b.dataset.gk;
    if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
    b.setAttribute('aria-pressed', hidden.has(k) ? 'false' : 'true'); b.classList.toggle('off', hidden.has(k));
    vis(); if (sel && sel.el.classList.contains('off')) select(null);
  });
  place(); vis(); fit();
  return {nodes: nodes.length, select, zoom};
}
window.SXG = {mount};
})();
