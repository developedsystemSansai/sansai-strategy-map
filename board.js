'use strict';
/* Strategic Analysis Board — กระดานรวม 7S (ภายใน) และ PESTEL (ภายนอก) สำหรับทีมยุทธศาสตร์
   · อ่านข้อมูลจริงจาก sx_entries ที่ app.js ส่งมา (ชนิด S/W/O/T และช่อง frame ตาม frames.js) ไม่มีข้อมูลตัวอย่างในโมดูลนี้
   · ความ "ใกล้เคียงกัน" ใช้ตรรกะเดียวกับหน้าสำรวจ SWOT (SXS.consensus) และเกณฑ์เดียวกัน
   · หน้ารายละเอียดใช้แผงเดิม (detail.js) ผ่านแอตทริบิวต์ data-oe ของแต่ละการ์ด
   API: SXB.initState() · SXB.html({all, clusters, groups, done, st, mas}) · SXB.click(t, st, ctx) · SXB.rows(...) · SXB.svg(...) */
(function(){
const KL = {S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค'};
const K4 = ['S', 'W', 'O', 'T'];
const SIM_MIN = .3, PREVIEW = 5;
const BOARDS = [
  {id:'in', title:'BOARD A · ปัจจัยภายใน (7S)', sub:'จุดแข็งและจุดอ่อนที่องค์กรจัดการเองได้', kinds:['S', 'W'], frames: () => FR.IN, none:'ยังไม่ระบุหมวด 7S', c:['#1e3a8a', '#f4f8ff', '#e1ecff', '#b6cdf4']},
  {id:'ex', title:'BOARD B · ปัจจัยภายนอก (PESTEL)', sub:'โอกาสและอุปสรรคที่ควบคุมไม่ได้ ต้องปรับตัว', kinds:['O', 'T'], frames: () => FR.EX, none:'ยังไม่ระบุหมวด PESTEL', c:['#b45309', '#fff9ec', '#ffefc2', '#f1d27c']}
];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || String(g || '');
const eid = e => e.id != null ? String(e.id) : e.wg + '|' + e.body;
const thSort = (a, b) => String(a).localeCompare(String(b), 'th');
const only4 = es => es.filter(e => K4.indexOf(e.kind) >= 0);
const ts = e => Date.parse(e.updated_at || e.created_at || '') || 0;
const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const frLabel = k => (window.FR && FR.label(k)) || '';

function initState(){ return {view: 'board', wg: '', cl: '', fr: '', kinds: new Set(), q: '', sort: 'breadth', open: new Set(), openAll: false, closed: new Set(), sim: ''}; }

/* ---------- กรองและจัดเรียง ---------- */
function filterList(all, st, skipFrame){
  const q = (st.q || '').trim().toLowerCase();
  return only4(all).filter(e => (!st.wg || e.wg === st.wg) && (!st.cl || (st.cl === '_none' ? !e.cluster_id : e.cluster_id === st.cl)) &&
    (!st.kinds.size || st.kinds.has(e.kind)) &&
    (skipFrame || !st.fr || (st.fr === '_none' ? !e.frame : e.frame === st.fr)) &&
    (!q || ((e.body || '') + ' ' + (e.detail || '') + ' ' + e.wg + ' ' + frLabel(e.frame)).toLowerCase().includes(q)));
}
const cons = all => (window.SXS && SXS.consensus) ? SXS.consensus(all) : new Map();
const breadthOf = (m, e) => m.get(eid(e)) || 0;
function sorter(st, m){
  return st.sort === 'recent' ? (a, b) => ts(b) - ts(a)
    : st.sort === 'group' ? (a, b) => thSort(short(a.wg), short(b.wg)) || thSort(a.body, b.body)
    : (a, b) => (breadthOf(m, b) - breadthOf(m, a)) || (ts(b) - ts(a)) || thSort(a.wg, b.wg);
}
/* กลุ่มงานที่พูดใกล้เคียงกับรายการนี้ (ชนิดเดียวกัน กลุ่มงานอื่น) */
function simMates(e, pool){
  const sim = window.SXD && SXD.sim; if (!sim) return [];
  return pool.filter(x => x !== e && x.kind === e.kind && x.wg !== e.wg && sim(e, x) >= SIM_MIN);
}
const groupsOf = (e, pool) => [e.wg, ...new Set(simMates(e, pool).map(x => x.wg))].filter((g, i, a) => a.indexOf(g) === i);

/* ---------- การ์ดหมวด ---------- */
function buildCards(fe, st){
  return BOARDS.map(b => {
    const mine = fe.filter(e => b.kinds.indexOf(e.kind) >= 0);
    let cs = b.frames().map(f => ({key: f.k, f, es: mine.filter(e => e.frame === f.k)}));
    cs.push({key: b.id + ':_none', f: null, es: mine.filter(e => !e.frame || !b.frames().some(f => f.k === e.frame))});
    if (st.fr) cs = cs.filter(c => st.fr === '_none' ? c.f === null : c.key === st.fr);
    return {b, cs, n: mine.length, gs: new Set(mine.map(e => e.wg)).size};
  }).filter(x => x.cs.length);
}
function noteHtml(e, m, cn, st, hot){
  const n = breadthOf(m, e), c = e.cluster_id ? cn(e.cluster_id) : '', id = eid(e);
  const cls = ['snote', e.kind, hot.has(id) ? 'sim' : '', st.sim === id ? 'sel' : ''].filter(Boolean).join(' ');
  return `<article class="${cls}" data-oe="${esc(id)}" data-wg="${esc(e.wg)}" data-cid="${esc(e.cluster_id || '')}" tabindex="0" role="button" aria-label="ดูรายละเอียด ${esc(KL[e.kind])} จาก ${esc(short(e.wg))}">
    <div class="sn-top"><span class="pill ${e.kind}">${e.kind} · ${KL[e.kind]}</span>${n ? `<button type="button" class="sn-rep${st.sim === id ? ' on' : ''}" data-bsim="${esc(id)}" aria-pressed="${st.sim === id}" title="กดเพื่อไฮไลต์กลุ่มงานที่พูดใกล้เคียงกัน">×${n + 1} กลุ่ม</button>` : ''}</div>
    <p class="sn-body">${esc(e.body)}</p>
    <div class="sn-foot"><span class="chip" title="แหล่งที่มา: ${esc(e.wg)}">${esc(short(e.wg))}</span>${c ? `<span class="chip cl" title="ประเด็นรวม">${esc(c)}</span>` : ''}</div></article>`;
}
function cardHtml(c, b, m, cn, st, hot){
  const es = c.es.slice().sort(sorter(st, m)), n = es.length, open = st.openAll || st.open.has(c.key);
  const cnt = k => es.filter(e => e.kind === k).length, gs = new Set(es.map(e => e.wg)).size, rep = es.filter(e => breadthOf(m, e) > 0).length;
  const shown = open ? es : es.slice(0, PREVIEW), title = c.f ? c.f.t : b.none;
  return `<section class="bcard ${b.id}${c.f ? '' : ' none'}" data-bcardkey="${esc(c.key)}">
    <header title="${c.f ? esc(c.f.q) : 'รายการที่ผู้กรอกไม่ได้เลือกหมวด (ไม่บังคับ)'}"><div><h3>${esc(title)}${c.f ? ` <small>${esc(c.f.en)}</small>` : ''}</h3></div><span class="bcount" aria-label="${n} รายการ">${n}</span></header>
    <div class="bmeta">${b.kinds.map(k => `<span class="bk ${k}">${k} ${cnt(k)}</span>`).join('')}<span>จาก ${gs} กลุ่มงาน</span>${rep ? `<span class="bk rep">พบซ้ำ ${rep}</span>` : ''}</div>
    <div class="bnotes">${shown.map(e => noteHtml(e, m, cn, st, hot)).join('') || '<p class="muted small bempty">ยังไม่มีรายการในหมวดนี้</p>'}</div>
    ${n > PREVIEW ? `<button type="button" class="btn sm bmore" data-bcard="${esc(c.key)}" aria-expanded="${open}">${open ? 'ย่อรายการ' : 'ดูทั้งหมด (' + n + ')'}</button>` : ''}</section>`;
}
function listHtml(fe, m, cn, st, hot){
  const es = fe.slice().sort(sorter(st, m));
  return `<div class="blist" role="list"><div class="bl-h"><span>ประเภท</span><span>ข้อความ</span><span>หมวด</span><span>แหล่งที่มา</span><span>กลุ่มที่พูดตรงกัน</span></div>
    ${es.map(e => { const n = breadthOf(m, e), id = eid(e), fl = frLabel(e.frame);
      return `<article class="snote row ${e.kind}${hot.has(id) ? ' sim' : ''}${st.sim === id ? ' sel' : ''}" role="listitem" data-oe="${esc(id)}" data-wg="${esc(e.wg)}" data-cid="${esc(e.cluster_id || '')}" tabindex="0" aria-label="ดูรายละเอียด">
      <span><span class="pill ${e.kind}">${e.kind} · ${KL[e.kind]}</span></span><span class="sn-body">${esc(e.body)}</span><span class="${fl ? '' : 'muted'}">${esc(fl || 'ยังไม่ระบุ')}</span>
      <span><span class="chip" title="${esc(e.wg)}">${esc(short(e.wg))}</span>${e.cluster_id ? `<span class="chip cl">${esc(cn(e.cluster_id))}</span>` : ''}</span>
      <span>${n ? `<button type="button" class="sn-rep${st.sim === id ? ' on' : ''}" data-bsim="${esc(id)}">×${n + 1} กลุ่ม</button>` : '<span class="muted">–</span>'}</span></article>`; }).join('')}</div>`;
}

/* ---------- แผงวิเคราะห์: แยก "ข้อมูลจริง" ออกจาก "ข้อสังเกต" ---------- */
function insights(fe, m){
  const framed = fe.filter(e => e.frame), byF = new Map();
  framed.forEach(e => { const r = byF.get(e.frame) || {es: []}; r.es.push(e); byF.set(e.frame, r); });
  const topFrames = [...byF.entries()].map(([k, r]) => ({k, n: r.es.length, gs: new Set(r.es.map(e => e.wg)).size})).sort((a, b) => b.n - a.n || b.gs - a.gs).slice(0, 3);
  const rep = fe.filter(e => breadthOf(m, e) > 0).sort((a, b) => breadthOf(m, b) - breadthOf(m, a) || ts(b) - ts(a));
  const top = k => ({n: fe.filter(e => e.kind === k).length, xs: rep.filter(e => e.kind === k).slice(0, 3)});
  const hints = [], cnt = (f, k) => framed.filter(e => e.frame === f && e.kind === k).length, gcount = (f, ks) => new Set(framed.filter(e => e.frame === f && ks.indexOf(e.kind) >= 0).map(e => e.wg)).size;
  (window.FR ? FR.IN : []).forEach(f => { const s = cnt(f.k, 'S'), w = cnt(f.k, 'W'), g = gcount(f.k, ['S', 'W']);
    if (w >= 3 && w >= 2 * s && g >= 2) hints.push(`หมวด “${f.t}”: จุดอ่อน ${w} รายการ มากกว่าจุดแข็ง ${s} รายการ พบจาก ${g} กลุ่มงาน ควรพิจารณาเป็นประเด็นที่ต้องเร่งพัฒนา`);
    if (s >= 3 && s >= 2 * w && g >= 2) hints.push(`หมวด “${f.t}”: จุดแข็ง ${s} รายการ มากกว่าจุดอ่อน ${w} รายการ พบจาก ${g} กลุ่มงาน อาจเป็นจุดแข็งที่องค์กรนำไปต่อยอดได้`); });
  (window.FR ? FR.EX : []).forEach(f => { const o = cnt(f.k, 'O'), t = cnt(f.k, 'T'), g = gcount(f.k, ['O', 'T']);
    if (t >= 3 && t >= 2 * o && g >= 2) hints.push(`หมวด “${f.t}”: อุปสรรค ${t} รายการ มากกว่าโอกาส ${o} รายการ พบจาก ${g} กลุ่มงาน ควรเฝ้าระวังและเตรียมแผนรับมือ`);
    if (o >= 3 && o >= 2 * t && g >= 2) hints.push(`หมวด “${f.t}”: โอกาส ${o} รายการ มากกว่าอุปสรรค ${t} รายการ พบจาก ${g} กลุ่มงาน ควรพิจารณานำโอกาสนี้มาใช้`); });
  const un = fe.length - framed.length;
  return {framedN: framed.length, un, topFrames, rep, S: top('S'), W: top('W'), O: top('O'), T: top('T'), hints: hints.slice(0, 5)};
}
function insightHtml(fe, m, pool, cn){
  const I = insights(fe, m);
  const lst = (k, label) => `<div class="in-blk"><h4><span class="pill ${k}">${k}</span> ${label}</h4>${I[k].xs.length ? `<ul>${I[k].xs.map(e => `<li class="in-li" data-oe="${esc(eid(e))}" data-wg="${esc(e.wg)}" data-cid="${esc(e.cluster_id || '')}" tabindex="0" role="button">${esc(e.body)}<small>${groupsOf(e, pool).length} กลุ่มงาน: ${esc(groupsOf(e, pool).map(short).join(', '))}</small></li>`).join('')}</ul>` : `<p class="muted small">${I[k].n ? 'ยังไม่พบเรื่องที่หลายกลุ่มงานพูดตรงกัน (จาก ' + I[k].n + ' รายการ)' : 'ไม่มีรายการ'}</p>`}</div>`;
  return `<aside class="binsight" aria-label="แผงวิเคราะห์">
    <div class="in-sec facts"><h3>ข้อมูลจริงจากกลุ่มงาน <span class="tag fact">นับจากข้อมูลที่กรองอยู่</span></h3>
      <div class="in-blk"><h4>หมวดที่มีประเด็นมากที่สุด</h4>${I.topFrames.length ? `<ol>${I.topFrames.map(t => `<li>${esc(frLabel(t.k))}<small>${t.n} รายการ จาก ${t.gs} กลุ่มงาน</small></li>`).join('')}</ol>` : '<p class="muted small">ยังไม่มีรายการที่ระบุหมวด 7S/PESTEL (ไม่บังคับ)</p>'}</div>
      <div class="in-blk"><h4>ประเด็นที่พบซ้ำหลายกลุ่มงาน</h4>${I.rep.length ? `<ul>${I.rep.slice(0, 5).map(e => `<li class="in-li" data-oe="${esc(eid(e))}" data-wg="${esc(e.wg)}" data-cid="${esc(e.cluster_id || '')}" tabindex="0" role="button"><span class="pill ${e.kind}">${e.kind}</span> ${esc(e.body)}<small>${groupsOf(e, pool).length} กลุ่มงาน: ${esc(groupsOf(e, pool).map(short).join(', '))}</small></li>`).join('')}</ul>` : '<p class="muted small">ยังไม่พบเรื่องที่ถ้อยคำใกล้เคียงกันจากหลายกลุ่มงาน</p>'}</div>
      ${lst('S', 'จุดแข็งสำคัญขององค์กร')}${lst('W', 'จุดอ่อนที่ควรเร่งพัฒนา')}${lst('O', 'โอกาสภายนอกที่ควรนำมาใช้')}${lst('T', 'ความเสี่ยงที่ต้องเฝ้าระวัง')}
      <p class="muted small">“สำคัญ” ในที่นี้หมายถึงมีหลายกลุ่มงานพูดตรงกัน ไม่ใช่การให้คะแนนโดยระบบ</p></div>
    <div class="in-sec hints"><h3>ข้อสังเกตจากกฎคำนวณ <span class="tag hint">ไม่ใช่ข้อสรุปจาก AI</span></h3>
      ${I.hints.length ? `<ul class="in-hints">${I.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : '<p class="muted small">ข้อมูลยังไม่พอ (ต้องมีอย่างน้อย 3 รายการในหมวดเดียวกัน จากอย่างน้อย 2 กลุ่มงาน)</p>'}
      ${I.un ? `<p class="muted small">มี ${I.un} จาก ${fe.length} รายการที่ยังไม่ระบุหมวด จึงไม่ถูกนับในข้อสังเกตข้างต้น</p>` : ''}
      <p class="muted small">เป็นเพียงกฎนับจำนวนอย่างง่าย ใช้ประกอบการพิจารณาของทีมเท่านั้น</p></div></aside>`;
}

/* ---------- หน้าหลัก ---------- */
function html(ctx){
  const st = ctx.st, all = ctx.all, m = cons(all), cn = id => (ctx.clusters.find(c => c.id === id) || {}).name || '';
  const pool = only4(all), fe = filterList(all, st), total = pool.length;
  const hot = new Set(), selE = st.sim && pool.find(e => eid(e) === st.sim);
  if (selE) simMates(selE, pool).forEach(x => hot.add(eid(x)));
  const gs = new Set(pool.map(e => e.wg)), rep = fe.filter(e => breadthOf(m, e) > 0).length, un = fe.filter(e => !e.frame).length;
  if (!total) return `<div class="board-wrap"><h2 class="bh-title">Strategic Analysis Board</h2><div class="empty">${ctx.mas ? ctx.mas('think') : ''}ยังไม่มีข้อมูล SWOT จากกลุ่มงาน กระดานจะแสดงเมื่อมีกลุ่มงานกรอกจุดแข็ง จุดอ่อน โอกาส หรืออุปสรรค<p class="small" style="margin-top:.4rem">ไม่จำเป็นต้องระบุหมวด 7S/PESTEL รายการที่ไม่ระบุจะอยู่ในการ์ด “ยังไม่ระบุหมวด”</p></div></div>`;
  const groups = ctx.groups || [], fl = st.fr || st.wg || st.cl || st.q || st.kinds.size;
  const opt = (v, t, cur) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(t)}</option>`;
  const frOpts = window.FR ? `<select class="select" data-bf="fr" aria-label="กรองตามหมวด 7S / PESTEL">${opt('', 'ทุกหมวด 7S / PESTEL', st.fr)}${opt('_none', 'ยังไม่ระบุหมวด', st.fr)}<optgroup label="ภายใน (7S)">${FR.IN.map(f => opt(f.k, f.t, st.fr)).join('')}</optgroup><optgroup label="ภายนอก (PESTEL)">${FR.EX.map(f => opt(f.k, f.t, st.fr)).join('')}</optgroup></select>` : '';
  const head = `<div class="bhead">
    <div class="bh-top"><div><h2 class="bh-title">Strategic Analysis Board</h2><p class="muted small">รวมปัจจัยภายใน (7S) และภายนอก (PESTEL) จากข้อมูลจริงของทุกกลุ่มงาน แสดงเฉพาะรายการ S/W/O/T · คลิกการ์ดเพื่อดูรายละเอียดและจัดเข้าประเด็นรวม</p></div>
      <div class="bh-exp"><button type="button" class="btn sm" data-bexport="pdf">${ic('print')}พิมพ์ / PDF</button><button type="button" class="btn sm" data-bexport="png">${ic('download')}รูปภาพ PNG</button><button type="button" class="btn sm" data-bexport="csv">${ic('download')}Excel (CSV)</button></div></div>
    <div class="bstats"><div><b>${total}</b><span>รายการทั้งหมด${fe.length !== total ? ' · แสดง ' + fe.length : ''}</span></div><div><b>${gs.size}</b><span>กลุ่มงานที่ส่งข้อมูล${groups.length ? ' จาก ' + groups.length : ''}</span></div><div><b>${ctx.done ? ctx.done.size : 0}</b><span>กดส่งแล้ว</span></div><div><b>${rep}</b><span>รายการที่พบซ้ำหลายกลุ่ม</span></div><div><b>${un}</b><span>ยังไม่ระบุหมวด</span></div></div>
    <div class="bfilters">
      <select class="select" data-bf="wg" aria-label="กรองตามกลุ่มงาน">${opt('', 'ทุกกลุ่มงาน', st.wg)}${groups.slice().sort(thSort).map(g => opt(g, short(g), st.wg)).join('')}</select>
      <select class="select" data-bf="cl" aria-label="กรองตามประเด็นยุทธศาสตร์">${opt('', 'ทุกประเด็นยุทธศาสตร์', st.cl)}${opt('_none', 'ยังไม่จัดเข้าประเด็น', st.cl)}${ctx.clusters.map(c => opt(c.id, c.name, st.cl)).join('')}</select>
      ${frOpts}
      <span class="seg" role="group" aria-label="กรองตามประเภท">${K4.map(k => `<button type="button" class="${st.kinds.has(k) ? 'on' : ''}" data-bk="${k}" aria-pressed="${st.kinds.has(k)}">${k} ${KL[k]}</button>`).join('')}</span>
      <input class="input" type="search" data-bf="q" value="${esc(st.q)}" placeholder="ค้นหาข้อความ กลุ่มงาน หมวด" aria-label="ค้นหารายการ">
      <select class="select" data-bf="sort" aria-label="จัดเรียง">${opt('breadth', 'เรียงตามจำนวนกลุ่มงานที่พูดตรงกัน', st.sort)}${opt('recent', 'เรียงตามล่าสุด', st.sort)}${opt('group', 'เรียงตามชื่อกลุ่มงาน', st.sort)}</select>
      <span class="seg" role="group" aria-label="รูปแบบการแสดงผล">${[['board', 'กระดาน'], ['list', 'รายการ']].map(([v, t]) => `<button type="button" class="${st.view === v ? 'on' : ''}" data-bv="${v}" aria-pressed="${st.view === v}">${t}</button>`).join('')}</span>
      ${st.view === 'board' ? `<button type="button" class="btn sm" data-bexp="${st.openAll ? 'none' : 'all'}">${st.openAll ? 'ย่อทุกการ์ด' : 'ขยายทุกการ์ด'}</button>` : ''}
      <button type="button" class="btn sm" data-breset ${fl ? '' : 'disabled'}>รีเซ็ตตัวกรอง</button></div></div>`;
  let strip = '';
  if (selE){ const gl = groupsOf(selE, pool); strip = `<div class="bsel" role="status"><span class="pill ${selE.kind}">${selE.kind}</span> <b>${esc(selE.body)}</b><span>พบใน ${gl.length} กลุ่มงาน: ${esc(gl.map(short).join(', '))}</span><button type="button" class="btn sm" data-bsimclear>ล้างการเลือก</button></div>`; }
  let body;
  if (!fe.length) body = `<div class="empty">${ctx.mas ? ctx.mas('think') : ''}ไม่พบรายการตามตัวกรองที่เลือก<p><button type="button" class="btn" data-breset style="margin-top:.8rem">รีเซ็ตตัวกรอง</button></p></div>`;
  else if (st.view === 'list') body = listHtml(fe, m, cn, st, hot);
  else body = buildCards(fe, st).map(({b, cs, n, gs: g}) => { const shut = st.closed.has(b.id);
    return `<section class="board ${b.id}${shut ? ' shut' : ''}"><header class="board-h"><div><h2>${b.title}</h2><p>${b.sub}</p></div><div class="board-stat">${n} รายการ · ${g} กลุ่มงาน</div><button type="button" class="btn sm" data-bboard="${b.id}" aria-expanded="${!shut}">${shut ? 'ขยายกระดาน' : 'ย่อกระดาน'}</button></header>
      ${shut ? '' : `<div class="bcards">${cs.map(c => cardHtml(c, b, m, cn, st, hot)).join('')}</div>`}</section>`; }).join('');
  return `<div class="board-wrap">${head}${strip}<div class="bmain"><div class="bboards">${body}</div>${insightHtml(fe, m, pool, cn)}</div></div>`;
}

/* ---------- ส่งออก ---------- */
function rows(all, ctx){
  const st = ctx.st, m = cons(all), cn = id => (ctx.clusters.find(c => c.id === id) || {}).name || '';
  const es = filterList(all, st).sort(sorter(st, m));
  return [['กลุ่มงาน', 'ประเภท', 'ฝั่ง', 'หมวดแนวคิด', 'หมวด (EN)', 'ข้อความ', 'รายละเอียด', 'ประเด็นรวม', 'จำนวนกลุ่มงานที่พูดใกล้เคียง (รวมตัวเอง)'],
    ...es.map(e => { const f = window.FR && FR.get(e.frame); return [e.wg, e.kind + ' ' + KL[e.kind], e.kind === 'S' || e.kind === 'W' ? 'ภายใน' : 'ภายนอก', f ? f.t : '', f ? f.en : '', e.body, e.detail || '', e.cluster_id ? cn(e.cluster_id) : '', breadthOf(m, e) + 1]; })];
}
function svg(all, ctx){
  const st = ctx.st, m = cons(all), fe = filterList(all, st), cn = id => (ctx.clusters.find(c => c.id === id) || {}).name || '';
  const FONT = "Sarabun, 'Noto Sans Thai', Tahoma, sans-serif", W = 1800, pad = 32, gap = 18, cols = 4, cw = (W - pad * 2 - gap * (cols - 1)) / cols;
  let cx = null; try { cx = document.createElement('canvas').getContext('2d'); } catch(e){}
  const tw = (s, sz, wt) => { if (cx){ cx.font = `${wt} ${sz}px ${FONT}`; return cx.measureText(s).width; } return String(s).length * sz * .55; };
  const wrap = (s, max, sz, wt, lines) => { const out = []; let cur = '', cut = false; for (const ch of [...String(s)]){ if (cur && tw(cur + ch, sz, wt) > max){ if (out.length === lines - 1){ cut = true; break; } out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cut ? cur.replace(/.$/, '') + '…' : cur); return out; };
  let y = pad; const parts = [];
  parts.push(`<text x="${pad}" y="${y + 28}" font-size="30" font-weight="700" fill="#14302b">Strategic Analysis Board · โรงพยาบาลสันทราย</text>`);
  parts.push(`<text x="${pad}" y="${y + 56}" font-size="16" fill="#5b6f6a">${esc(fe.length)} รายการ จาก ${new Set(fe.map(e => e.wg)).size} กลุ่มงาน · สร้างเมื่อ ${esc(new Date().toLocaleString('th-TH'))} · ข้อมูลจริงจากกลุ่มงาน (S/W/O/T)</text>`);
  y += 84;
  buildCards(fe, Object.assign({}, st, {fr: ''})).forEach(({b, cs, n}) => {
    parts.push(`<rect x="${pad}" y="${y}" width="${W - pad * 2}" height="50" rx="10" fill="${b.c[0]}"/><text x="${pad + 18}" y="${y + 32}" font-size="22" font-weight="700" fill="#fff">${esc(b.title)}</text><text x="${W - pad - 18}" y="${y + 32}" font-size="16" fill="#fff" text-anchor="end">${n} รายการ · ${esc(b.sub)}</text>`);
    y += 50 + gap;
    for (let i = 0; i < cs.length; i += cols){
      const row = cs.slice(i, i + cols).map((c, j) => {
        const es = c.es.slice().sort(sorter(st, m)), shown = es.slice(0, 5), x = pad + j * (cw + gap), ps = []; let h = 62;
        shown.forEach(e => { const ls = wrap(e.body, cw - 50, 15, 400, 3), nh = 14 + 20 + ls.length * 20 + 24; const nn = breadthOf(m, e);
          ps.push(`<rect x="${x + 12}" y="__Y${h}" width="${cw - 24}" height="${nh}" rx="8" fill="${b.c[2]}" stroke="${b.c[3]}"/><text x="${x + 24}" y="__Y${h + 22}" font-size="13" font-weight="700" fill="${b.c[0]}">${e.kind} · ${KL[e.kind]}${nn ? '  ×' + (nn + 1) + ' กลุ่ม' : ''}</text>${ls.map((l, k) => `<text x="${x + 24}" y="__Y${h + 42 + k * 20}" font-size="15" fill="#14302b">${esc(l)}</text>`).join('')}<text x="${x + 24}" y="__Y${h + nh - 10}" font-size="12" fill="#5b6f6a">${esc(short(e.wg))}${e.cluster_id ? ' · ' + esc(cn(e.cluster_id)) : ''}</text>`); h += nh + 8; });
        if (!shown.length){ ps.push(`<text x="${x + 20}" y="__Y${h + 20}" font-size="14" fill="#74817e">ยังไม่มีรายการ</text>`); h += 34; }
        if (es.length > shown.length){ ps.push(`<text x="${x + 20}" y="__Y${h + 18}" font-size="14" fill="#5b6f6a">+ อีก ${es.length - shown.length} รายการ</text>`); h += 30; }
        return {x, h: h + 8, ps, c, n: es.length};
      });
      const rh = Math.max(...row.map(r => r.h));
      row.forEach(r => { const title = r.c.f ? r.c.f.t : b.none;
        parts.push(`<rect x="${r.x}" y="${y}" width="${cw}" height="${rh}" rx="12" fill="${b.c[1]}" stroke="${b.c[3]}"/><text x="${r.x + 16}" y="${y + 28}" font-size="18" font-weight="700" fill="${b.c[0]}">${esc(title)}</text>${r.c.f ? `<text x="${r.x + 16}" y="${y + 48}" font-size="12" fill="#5b6f6a">${esc(r.c.f.en)}</text>` : ''}<circle cx="${r.x + cw - 28}" cy="${y + 28}" r="15" fill="${b.c[0]}"/><text x="${r.x + cw - 28}" y="${y + 33}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">${r.n}</text>`);
        r.ps.forEach(p => parts.push(p.replace(/__Y(\d+(?:\.\d+)?)/g, (_, d) => String(y + Number(d))))); });
      y += rh + gap;
    }
    y += 10;
  });
  const H = y + pad - 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}"><rect width="100%" height="100%" fill="#f3f6f5"/>${parts.join('')}</svg>`;
}
function printHtml(all, ctx){
  const st = ctx.st, m = cons(all), cn = id => (ctx.clusters.find(c => c.id === id) || {}).name || '', fe = filterList(all, st);
  const sec = ({b, cs, n}) => `<h2>${esc(b.title)} · ${n} รายการ</h2>` + cs.map(c => { const es = c.es.slice().sort(sorter(st, m)); return `<h3>${esc(c.f ? c.f.t + ' (' + c.f.en + ')' : b.none)} · ${es.length} รายการ</h3>${es.length ? `<ul>${es.map(e => `<li><b>${e.kind}</b> ${esc(e.body)} <small>(${esc(short(e.wg))}${breadthOf(m, e) ? ' · ×' + (breadthOf(m, e) + 1) + ' กลุ่ม' : ''}${e.cluster_id ? ' · ประเด็น: ' + esc(cn(e.cluster_id)) : ''})</small></li>`).join('')}</ul>` : '<p><small>ยังไม่มีรายการ</small></p>'}`; }).join('');
  return `<img src="assets/logo.png" alt="" style="height:64px;margin-bottom:8px"><h1>Strategic Analysis Board · โรงพยาบาลสันทราย</h1><p>พิมพ์เมื่อ ${esc(new Date().toLocaleString('th-TH'))} · ${fe.length} รายการ S/W/O/T จาก ${new Set(fe.map(e => e.wg)).size} กลุ่มงาน · ข้อมูลจริงจากกลุ่มงาน</p>${buildCards(fe, Object.assign({}, st, {fr: ''})).map(sec).join('')}`;
}
function png(all, ctx){
  const s = svg(all, ctx), img = new Image(), t = ctx.tools;
  img.onload = () => { const sc = 1.5, c = document.createElement('canvas'); c.width = img.width * sc; c.height = img.height * sc; const x = c.getContext('2d'); x.fillStyle = '#f3f6f5'; x.fillRect(0, 0, c.width, c.height); x.scale(sc, sc); x.drawImage(img, 0, 0);
    c.toBlob(b => b ? t.download(`sx-board-${new Date().toISOString().slice(0, 10)}.png`, b, 'image/png') : t.toast('สร้างรูปภาพไม่สำเร็จ'), 'image/png'); };
  img.onerror = () => t.toast('สร้างรูปภาพไม่สำเร็จ ลองใช้ปุ่มพิมพ์ / PDF แทน');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}

/* ---------- ตัวจัดการเหตุการณ์ (app.js เรียกต่อจากการคลิก) ---------- */
function click(t, st, ctx){
  const g = a => t.closest('[' + a + ']');
  let x;
  if ((x = g('data-bsim'))){ const id = x.dataset.bsim; st.sim = st.sim === id ? '' : id; return 'render'; }
  if (g('data-bsimclear')){ st.sim = ''; return 'render'; }
  if ((x = g('data-bv'))){ st.view = x.dataset.bv; return 'render'; }
  if ((x = g('data-bk'))){ const k = x.dataset.bk; st.kinds.has(k) ? st.kinds.delete(k) : st.kinds.add(k); return 'render'; }
  if ((x = g('data-bcard'))){ const k = x.dataset.bcard; if (st.openAll){ st.openAll = false; BOARDS.forEach(b => { (window.FR ? b.frames() : []).forEach(f => st.open.add(f.k)); st.open.add(b.id + ':_none'); }); } st.open.has(k) ? st.open.delete(k) : st.open.add(k); return 'render'; }
  if ((x = g('data-bboard'))){ const k = x.dataset.bboard; st.closed.has(k) ? st.closed.delete(k) : st.closed.add(k); return 'render'; }
  if ((x = g('data-bexp'))){ st.openAll = x.dataset.bexp === 'all'; st.open.clear(); return 'render'; }
  if (g('data-breset')){ Object.assign(st, {wg: '', cl: '', fr: '', q: '', sim: ''}); st.kinds.clear(); return 'render'; }
  if ((x = g('data-bexport'))){ const k = x.dataset.bexport, all = ctx.all, c2 = Object.assign({}, ctx, {st});
    if (k === 'csv') ctx.tools.download(`sx-board-${new Date().toISOString().slice(0, 10)}.csv`, ctx.tools.toCSV(rows(all, c2)), 'text/csv;charset=utf-8');
    else if (k === 'png') png(all, c2); else ctx.tools.print(printHtml(all, c2));
    return true; }
  return false;
}
window.SXB = {initState, html, click, rows, svg, printHtml, filterList, insights, buildCards};
})();
