'use strict';
/* รายละเอียดของรายการ / กลุ่มงาน / ประเด็นรวม ใช้ร่วมกันทั้งผังกราฟ (การ์ดลอย) และมุมมองรายการ (แผงด้านข้าง)
   · SXD.render(box, {t:'e'|'g'|'c', id}, ctx)  วาดรายละเอียดลงกล่อง
   · SXD.open / close / highlight             แผงด้านข้างสำหรับมุมมองรายการ พร้อมไฮไลต์รายการในหน้า
   · ทีมยุทธศาสตร์ (ctx.admin) จัดกลุ่มได้ในการ์ดเดียวกัน พร้อมแนะนำรายการที่ถ้อยคำคล้ายกันและประเด็นที่ใกล้เคียง
   ctx = {entries, clusters, done:Set, own, admin:{assign(ids,cid|null), create(name,ids)}|null, hidden:Set?, go(sel), close()} */
(function(){
const KL = {S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค', ISSUE:'ประเด็นสำคัญ', IDEA:'ข้อเสนอ', DATA:'ข้อมูล'};
const KC = {S:'#059669', W:'#e11d48', O:'#2563eb', T:'#d97706', ISSUE:'#7c3aed', IDEA:'#0d9488', DATA:'#64748b'};
const KO = ['S','W','O','T','ISSUE','IDEA','DATA'];
const PRI = {3:'สำคัญมาก', 2:'สำคัญ', 1:'พิจารณา'};
const CC = ['#7c3aed','#db2777','#0891b2','#65a30d','#ea580c','#4f46e5','#0d9488','#b45309','#be123c','#1d4ed8'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || String(g || '');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const eid = e => e.id != null ? String(e.id) : e.wg + '|' + e.body;
const when = e => { const v = e.updated_at || e.created_at, d = v ? new Date(v) : null; return d && !isNaN(d) ? d.toLocaleString('th-TH', {dateStyle: 'short', timeStyle: 'short'}) : ''; };

/* ---------- ความคล้ายของถ้อยคำ (Dice บนคู่ตัวอักษร ใช้ได้กับภาษาไทยที่ไม่มีเว้นวรรค) ---------- */
const GR = new WeakMap();
const norm = s => String(s || '').toLowerCase().replace(/[\s\d.,;:!?()\[\]{}"'“”‘’\-–—\/\\|+*=_%#&@]/g, '');
function grams(e){
  let s = GR.get(e); if (s) return s;
  const t = norm((e.body || '') + (e.detail || '')); s = new Set(); for (let i = 0; i < t.length - 1; i++) s.add(t.slice(i, i + 2));
  GR.set(e, s); return s;
}
function sim(a, b){
  const A = grams(a), B = grams(b); if (!A.size || !B.size) return 0;
  let n = 0; A.forEach(x => { if (B.has(x)) n++; }); return 2 * n / (A.size + B.size);
}
const fam = k => (k === 'ISSUE' || k === 'IDEA') ? 'ISSUE' : k;
function similar(e, pool, n = 8, min = .2){
  return pool.filter(x => x !== e && eid(x) !== eid(e) && fam(x.kind) === fam(e.kind)).map(x => ({e: x, s: sim(e, x)})).filter(r => r.s >= min).sort((a, b) => b.s - a.s).slice(0, n);
}
function nearClusters(e, m, ctx){
  const out = [];
  ctx.clusters.forEach(c => { const mem = m.byCl.get(c.id) || []; let s = 0; mem.forEach(x => { if (x !== e) s = Math.max(s, sim(e, x)); });
    const nm = sim(e, {body: c.name + ' ' + (c.note || '')}); s = Math.max(s, nm * .9); if (s >= .15) out.push({c, s}); });
  return out.sort((a, b) => b.s - a.s).slice(0, 3);
}

/* ---------- ข้อมูลอ้างอิงจาก ctx ---------- */
function model(ctx){
  if (ctx._m && ctx._m.n === ctx.entries.length && ctx._m.c === ctx.clusters.length) return ctx._m;
  const byE = new Map(), byWg = new Map(), byCl = new Map(), cl = new Map();
  ctx.clusters.forEach((c, i) => cl.set(c.id, Object.assign({}, c, {color: CC[i % CC.length]})));
  ctx.entries.forEach(e => { byE.set(eid(e), e);
    if (!byWg.has(e.wg)) byWg.set(e.wg, []); byWg.get(e.wg).push(e);
    if (e.cluster_id && cl.has(e.cluster_id)){ if (!byCl.has(e.cluster_id)) byCl.set(e.cluster_id, []); byCl.get(e.cluster_id).push(e); } });
  return ctx._m = {byE, byWg, byCl, cl, n: ctx.entries.length, c: ctx.clusters.length};
}
const vis = (ctx, es) => ctx.hidden ? es.filter(e => !ctx.hidden.has(e.kind)) : es;

/* ---------- ชิ้นส่วน HTML ---------- */
const chipG = (wg, n, own) => `<button type="button" class="chip gr-chip${own ? ' own' : ''}" data-og="${esc(wg)}">${esc(short(wg))}${n != null ? ' (' + n + ')' : ''}</button>`;
const chipC = (c, n) => `<button type="button" class="chip gr-chip cl" data-oc="${esc(c.id)}" style="border-color:${c.color};color:${c.color}">${esc(clip(c.name, 30))}${n != null ? ' (' + n + ')' : ''}</button>`;
const pill = k => `<span class="pill ${k}">${KL[k]}</span>`;
const kinds = es => `<div class="gr-d-row">${KO.map(k => { const c = es.filter(e => e.kind === k).length; return c ? `<span class="pill ${k}">${KL[k]} ${c}</span>` : ''; }).join('')}</div>`;
const item = (e, wg) => `<button type="button" class="gr-item" data-oe="${esc(eid(e))}"><i class="dot" style="background:${KC[e.kind]}"></i><span>${wg ? `<b>${esc(short(e.wg))}</b> · ` : ''}${esc(clip(e.body, 90))}</span></button>`;
const byKindList = (es, wg) => KO.map(k => { const xs = es.filter(e => e.kind === k); return xs.length ? `<div class="gr-sub">${KL[k]} <span class="muted small">${xs.length}</span></div><div class="gr-list">${xs.map(e => item(e, wg)).join('')}</div>` : ''; }).join('');
const uniq = a => [...new Set(a)];

function entryHtml(e, ctx, m){
  const c = e.cluster_id && m.cl.get(e.cluster_id), peers = c ? vis(ctx, (m.byCl.get(c.id) || []).filter(x => x !== e)) : [];
  const meta = [e.author ? 'ผู้กรอก ' + e.author : '', fam(e.kind) === 'ISSUE' ? 'ความสำคัญ: ' + (PRI[e.priority] || '') : '', when(e)].filter(Boolean).join(' · ');
  return `<div class="gr-d-top">${pill(e.kind)}${chipG(e.wg, null, e.wg === ctx.own)}</div>
    ${meta ? `<p class="muted small">${esc(meta)}</p>` : ''}
    <p class="gr-d-body">${esc(e.body)}</p>
    ${e.detail ? `<div class="gr-sub">รายละเอียด</div><p class="gr-d-more">${esc(e.detail)}</p>` : ''}
    <div class="gr-path"><span class="muted small">เส้นทาง:</span>${chipG(e.wg)}<span class="arr">→</span><b class="gr-here">${KL[e.kind]}</b>${c ? `<span class="arr">→</span>${chipC(c)}` : '<span class="muted small">(ยังไม่ถูกจัดเข้าประเด็นรวม)</span>'}</div>
    ${peers.length ? `<p class="muted small gr-peers">อยู่ประเด็นเดียวกันอีก ${peers.length} รายการ จาก ${uniq(peers.map(x => x.wg)).length} กลุ่มงาน</p><div class="gr-list">${peers.map(x => item(x, true)).join('')}</div>` : ''}
    ${ctx.admin ? adminHtml(e, ctx, m) : ''}`;
}
function adminHtml(e, ctx, m){
  const sg = nearClusters(e, m, ctx).filter(x => x.c.id !== e.cluster_id), sm = similar(e, vis(ctx, ctx.entries));
  const cur = e.cluster_id;
  return `<div class="gr-admin"><div class="gr-sub">จัดกลุ่มประเด็น (ทีมยุทธศาสตร์)</div>
    ${sg.length ? `<div class="gr-path"><span class="muted small">ประเด็นที่ใกล้เคียง:</span>${sg.map(x => `<button type="button" class="chip gr-chip" data-suggest="${esc(x.c.id)}" title="ความคล้าย ${Math.round(x.s * 100)}%">${esc(clip(x.c.name, 26))} · ${Math.round(x.s * 100)}%</button>`).join('')}</div>` : ''}
    <p class="muted small">รายการที่จะย้าย (ติ๊กเพิ่มรายการที่ถ้อยคำคล้ายกัน แม้ใช้คำต่างกัน):</p>
    <div class="gr-picks"><label class="gr-pick"><input type="checkbox" data-pick="${esc(eid(e))}" checked><span><b>${esc(short(e.wg))}</b> · ${esc(clip(e.body, 70))}</span></label>
    ${sm.map(r => `<label class="gr-pick"><input type="checkbox" data-pick="${esc(eid(r.e))}"><span><b>${esc(short(r.e.wg))}</b> · ${esc(clip(r.e.body, 70))} <span class="muted small">${Math.round(r.s * 100)}%${r.e.cluster_id && m.cl.get(r.e.cluster_id) ? ' · ' + esc(clip(m.cl.get(r.e.cluster_id).name, 20)) : ''}</span></span></label>`).join('')}</div>
    ${sm.length ? '' : '<p class="muted small">ยังไม่พบรายการที่ถ้อยคำใกล้เคียง</p>'}
    <div class="gr-row"><select class="select" data-target aria-label="ย้ายไปประเด็น"><option value="">ย้ายไปประเด็น…</option>${ctx.clusters.map(c => `<option value="${esc(c.id)}"${c.id === cur ? ' disabled' : ''}>${esc(clip(c.name, 40))}${c.id === cur ? ' (ปัจจุบัน)' : ''}</option>`).join('')}</select><button type="button" class="btn sm pri" data-act="assign">ย้าย</button></div>
    <div class="gr-row"><input class="input" data-newname maxlength="200" placeholder="หรือตั้งชื่อประเด็นใหม่" aria-label="ชื่อประเด็นใหม่"><button type="button" class="btn sm pri" data-act="create">สร้างและย้าย</button></div>
    ${cur ? '<div class="gr-row"><button type="button" class="btn sm" data-act="unassign">เอารายการที่ติ๊กออกจากประเด็น</button></div>' : ''}
    <p class="gr-msg small" role="alert" hidden></p></div>`;
}
function groupHtml(wg, ctx, m){
  const all = m.byWg.get(wg) || [], es = vis(ctx, all), au = uniq(all.map(e => e.author).filter(Boolean));
  const cs = uniq(all.map(e => e.cluster_id).filter(id => id && m.cl.has(id)));
  return `<div class="gr-d-top"><b>${esc(wg)}</b><span class="muted small">${all.length} รายการ · ${ctx.done && ctx.done.has(wg) ? 'ส่งข้อมูลแล้ว' : 'ยังไม่ส่ง / กำลังกรอก'}${wg === ctx.own ? ' · กลุ่มของท่าน' : ''}</span></div>
    ${au.length ? `<p class="muted small">ผู้กรอก: ${esc(au.join(', '))}</p>` : ''}
    ${kinds(all)}
    ${cs.length ? `<div class="gr-path"><span class="muted small">ประเด็นรวมที่เกี่ยวข้อง:</span>${cs.map(id => chipC(m.cl.get(id), all.filter(e => e.cluster_id === id).length)).join('')}</div>` : ''}
    ${byKindList(es, false)}`;
}
function clusterHtml(id, ctx, m){
  const c = m.cl.get(id); if (!c) return '<p class="muted">ไม่พบประเด็นนี้</p>';
  const all = m.byCl.get(id) || [], es = vis(ctx, all), gs = uniq(all.map(e => e.wg)).sort((a, b) => a.localeCompare(b, 'th'));
  return `<div class="gr-d-top"><b style="color:${c.color}">${esc(c.name)}</b><span class="muted small">${all.length} รายการ จาก ${gs.length} กลุ่มงาน</span></div>
    ${c.note ? `<p class="gr-d-more">${esc(c.note)}</p>` : ''}
    <div class="gr-sub">ประกอบด้วยการวิเคราะห์</div>${kinds(all)}
    <div class="gr-path"><span class="muted small">กลุ่มงาน:</span>${gs.map(g => chipG(g, all.filter(e => e.wg === g).length, g === ctx.own)).join('')}</div>
    ${byKindList(es, true)}`;
}

/* ---------- วาดลงกล่อง ---------- */
function render(box, sel, ctx){
  box._ctx = ctx; box._sel = sel; box.classList.add('sxd'); const m = model(ctx);
  box.innerHTML = sel.t === 'e' ? (m.byE.get(String(sel.id)) ? entryHtml(m.byE.get(String(sel.id)), ctx, m) : '<p class="muted">ไม่พบรายการนี้ (อาจถูกกรองออก)</p>') : sel.t === 'g' ? groupHtml(sel.id, ctx, m) : clusterHtml(sel.id, ctx, m);
  box.scrollTop = 0; wire(box);
}
function say(box, t){ const p = box.querySelector('.gr-msg'); if (p){ p.textContent = t; p.hidden = !t; } }
function wire(box){
  if (box._w) return; box._w = 1;
  box.addEventListener('click', ev => {
    const c = box._ctx, t = ev.target; if (!c || !(t instanceof Element)) return;
    const nav = t.closest('[data-oe],[data-og],[data-oc]');
    if (nav && box.contains(nav)){ const d = nav.dataset.oe != null ? {t: 'e', id: nav.dataset.oe} : nav.dataset.og != null ? {t: 'g', id: nav.dataset.og} : {t: 'c', id: nav.dataset.oc}; if (c.go) c.go(d); return; }
    const sg = t.closest('[data-suggest]'); if (sg){ const s = box.querySelector('[data-target]'); if (s) s.value = sg.dataset.suggest; return; }
    const act = t.closest('[data-act]'); if (!act || !c.admin) return;
    const m = model(c), ids = [...box.querySelectorAll('[data-pick]:checked')].map(i => m.byE.get(i.dataset.pick)).filter(Boolean).map(e => e.id).filter(x => x != null);
    if (!ids.length) return say(box, 'ติ๊กเลือกรายการที่จะย้ายอย่างน้อย 1 รายการ');
    let p;
    if (act.dataset.act === 'assign'){ const to = box.querySelector('[data-target]').value; if (!to) return say(box, 'เลือกประเด็นปลายทางก่อน'); p = c.admin.assign(ids, to); }
    else if (act.dataset.act === 'create'){ const name = box.querySelector('[data-newname]').value.trim(); if (!name) return say(box, 'ตั้งชื่อประเด็นใหม่ก่อน'); p = c.admin.create(name, ids); }
    else if (act.dataset.act === 'unassign') p = c.admin.assign(ids, null);
    else return;
    say(box, ''); box.classList.add('busy'); box.querySelectorAll('button').forEach(b => b.disabled = true);
    Promise.resolve(p).then(() => {}, () => {}).then(() => { box.classList.remove('busy'); box.querySelectorAll('button').forEach(b => b.disabled = false); });
  });
}

/* ---------- แผงด้านข้างสำหรับมุมมองรายการ ---------- */
let provider = null, cur = null, drawer = null, body = null, lastFocus = null;
const ttl = {e: 'รายละเอียดรายการ', g: 'กลุ่มงาน', c: 'ประเด็นรวม'};
function ensure(){
  if (drawer && drawer.isConnected) return;
  drawer = document.createElement('aside'); drawer.className = 'drawer'; drawer.id = 'sxDrawer'; drawer.hidden = true; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-label', 'รายละเอียด');
  drawer.innerHTML = '<div class="dr-h"><b class="dr-t"></b><button type="button" class="gr-close" data-dclose aria-label="ปิดรายละเอียด">×</button></div><div class="dr-b"></div>';
  document.body.appendChild(drawer); body = drawer.querySelector('.dr-b');
  drawer.querySelector('[data-dclose]').addEventListener('click', close);
}
function ctxNow(){ const c = provider && provider(); if (!c) return null; c.go = open; c.close = close; return c; }
function open(sel){
  const c = ctxNow(); if (!c) return; ensure(); cur = sel;
  if (drawer.hidden){ lastFocus = document.activeElement; drawer.hidden = false; drawer.classList.remove('in'); void drawer.offsetWidth; drawer.classList.add('in'); }
  drawer.querySelector('.dr-t').textContent = ttl[sel.t]; render(body, sel, c); highlight(sel, true);
}
function close(){ if (!drawer || drawer.hidden) return; drawer.hidden = true; drawer.classList.remove('in'); cur = null; highlight(null); if (lastFocus && lastFocus.isConnected) try { lastFocus.focus(); } catch(e){} }
function highlight(sel, scroll){
  const pane = document.getElementById('pane'); if (!pane) return;
  pane.classList.toggle('hl-on', !!sel); let first = null;
  pane.querySelectorAll('.li[data-oe]').forEach(li => {
    const on = !!sel && (sel.t === 'e' ? li.dataset.oe === String(sel.id) : sel.t === 'g' ? li.dataset.wg === sel.id : li.dataset.cid === sel.id);
    li.classList.toggle('hl', on); if (on && !first) first = li;
  });
  if (scroll && first && first.scrollIntoView) first.scrollIntoView({block: 'nearest', behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
}
function refresh(){                                  // เรียกหลังหน้าถูกวาดใหม่ (ข้อมูลอัปเดต / เปลี่ยนแท็บ)
  if (!drawer || drawer.hidden) return;
  const c = ctxNow(); if (!c){ close(); return; }
  render(body, cur, c); highlight(cur);
}
document.addEventListener('click', ev => {
  const t = ev.target; if (!(t instanceof Element) || !provider) return;
  const n = t.closest('[data-oe],[data-og],[data-oc]'); if (!n || n.closest('.sxd') || !n.closest('#pane')) return;
  open(n.dataset.oe != null ? {t: 'e', id: n.dataset.oe} : n.dataset.og != null ? {t: 'g', id: n.dataset.og} : {t: 'c', id: n.dataset.oc});
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && drawer && !drawer.hidden){ close(); return; }
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target instanceof Element && ev.target.matches('.li[data-oe]')){ ev.preventDefault(); open({t: 'e', id: ev.target.dataset.oe}); }
});

window.SXD = {render, open, close, refresh, highlight, sim, similar, eid, setProvider: f => { provider = f; }};
})();
