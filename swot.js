'use strict';
/* แท็บ "สำรวจ SWOT" สำหรับทีมยุทธศาสตร์ (ใช้ได้เฉพาะเมื่อเข้าด้วยรหัสทีมยุทธศาสตร์)
   · ตาราง SWOT 2×2: ภายใน (S/W) × ภายนอก (O/T) รวมรายการของทุกกลุ่มงาน กรองตามกลุ่มงาน/ประเด็น/คำค้นได้
   · ป้าย "ถ้อยคำใกล้เคียงกับอีก N กลุ่มงาน" บอกว่าเรื่องนี้หลายกลุ่มงานพูดตรงกัน (ประมาณจากตัวอักษร ใช้ SXD.sim ร่วมกับตัวช่วยจัดกลุ่ม)
   · มุมมอง TOWS ตามประเด็นรวม: ประเด็นที่ทีมจัดกลุ่มไว้แล้ว มี S/W/O/T ครบคู่ใด (SO/WO/ST/WT) และยังขาดด้านไหน
   · คลิกรายการ/กลุ่มงาน/ประเด็น เปิดแผงรายละเอียดเดิม (detail.js) ทีมจัดรายการเข้าประเด็นต่อได้ในแผงเดียวกัน
   SXS.html({all, clusters, groups, st}) · SXS.list(all, st) · SXS.csvRows(all, clusters, st)
   st = {mode:'matrix'|'tows', wg, cl, q, sort:'wg'|'sim', open:Set} */
(function(){
const KL = {S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค'};
const K4 = ['S','W','O','T'];
const TW = [
  {id:'SO', a:'S', b:'O', t:'ใช้จุดแข็ง ฉวยโอกาส'},
  {id:'WO', a:'W', b:'O', t:'แก้จุดอ่อน ด้วยโอกาส'},
  {id:'ST', a:'S', b:'T', t:'ใช้จุดแข็ง รับมืออุปสรรค'},
  {id:'WT', a:'W', b:'T', t:'ลดจุดอ่อน เลี่ยงอุปสรรค'}
];
const SIM_MIN = .3;                                           // Dice บนคู่ตัวอักษร ≥ ค่านี้ นับว่าถ้อยคำใกล้เคียง
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || String(g || '');
const eid = e => e.id != null ? String(e.id) : e.wg + '|' + e.body;
const thSort = (a, b) => String(a).localeCompare(String(b), 'th');
const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const only4 = es => es.filter(e => K4.indexOf(e.kind) >= 0);

/* ---------- กรอง ---------- */
function list(all, st){
  const q = (st.q || '').trim().toLowerCase();
  const cl = st.mode === 'tows' ? '' : st.cl;                 // มุมมอง TOWS แยกตามประเด็นอยู่แล้ว
  return only4(all).filter(e => (!st.wg || e.wg === st.wg) && (!cl || (cl === '_none' ? !e.cluster_id : e.cluster_id === cl)) &&
    (!q || ((e.body || '') + ' ' + (e.detail || '')).toLowerCase().includes(q)));
}

/* ---------- เรื่องเดียวกันหลายกลุ่มงานพูดตรงกัน ---------- */
let cc = {key: '', m: new Map()};
function consensus(all){
  const xs4 = only4(all), key = xs4.length + '|' + xs4.reduce((s, e) => s + (e.body || '').length + (e.wg || '').length, 0);
  if (cc.key === key) return cc.m;
  const sim = window.SXD && window.SXD.sim, m = new Map();
  if (sim) K4.forEach(k => {
    const xs = xs4.filter(e => e.kind === k);
    xs.forEach(a => { const gs = new Set(); xs.forEach(b => { if (b.wg !== a.wg && !gs.has(b.wg) && sim(a, b) >= SIM_MIN) gs.add(b.wg); }); m.set(eid(a), gs.size); });
  });
  cc = {key, m}; return m;
}

/* ---------- ชิ้นส่วน ---------- */
function liHtml(e, m, cn){
  const n = m.get(eid(e)) || 0, c = e.cluster_id && cn(e.cluster_id);
  return `<div class="li" data-oe="${esc(eid(e))}" data-wg="${esc(e.wg)}" data-cid="${esc(e.cluster_id || '')}" tabindex="0" role="button" aria-label="ดูรายละเอียด"><p>${esc(e.body)}</p>
    <div class="meta"><button type="button" class="chip" data-og="${esc(e.wg)}">${esc(short(e.wg))}</button>${c ? `<button type="button" class="chip" data-oc="${esc(e.cluster_id)}">${esc(c)}</button>` : ''}${n ? `<span class="chip sim" title="ประมาณจากถ้อยคำที่คล้ายกัน ควรเปิดอ่านประกอบ">ถ้อยคำใกล้เคียงกับอีก ${n} กลุ่มงาน</span>` : ''}</div></div>`;
}
function cellHtml(k, xs, m, cn){
  return `<div class="card ${k}" role="group" aria-label="${KL[k]}"><h3><span class="pill ${k}">${KL[k]}</span><span class="count muted small">${xs.length}</span></h3>
    <div class="swx-list">${xs.map(e => liHtml(e, m, cn)).join('') || '<p class="muted small">ไม่มีรายการตามตัวกรอง</p>'}</div></div>`;
}
function sorter(st, m){
  return st.sort === 'sim'
    ? (a, b) => (m.get(eid(b)) || 0) - (m.get(eid(a)) || 0) || thSort(a.wg, b.wg) || thSort(a.body, b.body)
    : (a, b) => thSort(a.wg, b.wg) || thSort(a.body, b.body);
}
function toolbar(ctx, st, n){
  const groups = [...(ctx.groups || [])].sort(thSort), tows = st.mode === 'tows';
  const seg = `<span class="seg" role="group" aria-label="มุมมอง">${[['matrix', 'ตาราง SWOT'], ['tows', 'TOWS ตามประเด็น']].map(([v, t]) => `<button type="button" class="${st.mode === v ? 'on' : ''}" data-smode="${v}" aria-pressed="${st.mode === v}">${t}</button>`).join('')}</span>`;
  return `<div class="filters">
    <select class="select" data-sf="wg" aria-label="กรองตามกลุ่มงาน"><option value="">ทุกกลุ่มงาน</option>${groups.map(g => `<option value="${esc(g)}"${st.wg === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>
    ${tows ? '' : `<select class="select" data-sf="cl" aria-label="กรองตามประเด็น"><option value="">ทุกประเด็น</option><option value="_none"${st.cl === '_none' ? ' selected' : ''}>ยังไม่จัดกลุ่ม</option>${ctx.clusters.map(c => `<option value="${esc(c.id)}"${st.cl === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <select class="select" data-sf="sort" aria-label="เรียงลำดับ"><option value="wg"${st.sort !== 'sim' ? ' selected' : ''}>เรียงตามกลุ่มงาน</option><option value="sim"${st.sort === 'sim' ? ' selected' : ''}>เรียงตามที่หลายกลุ่มงานพูดตรงกัน</option></select>`}
    <input class="input" data-sf="q" type="search" placeholder="ค้นหาคำ" value="${esc(st.q)}" aria-label="ค้นหา">
    <span class="muted small">${n} รายการ</span>${seg}<button type="button" class="btn sm" data-swcsv>${ic('download')}ดาวน์โหลด CSV</button></div>`;
}

/* ---------- ตาราง SWOT ---------- */
function matrixHtml(es, ctx, st){
  const m = consensus(ctx.all), cn = id => (ctx.clusters.find(c => c.id === id) || {}).name || '';
  const by = k => es.filter(e => e.kind === k).sort(sorter(st, m));
  const inn = by('S').length + by('W').length, out = by('O').length + by('T').length, gs = new Set(es.map(e => e.wg)).size;
  return `<p class="muted small swx-note">ภายใน ${inn} รายการ · ภายนอก ${out} รายการ · จาก ${gs} กลุ่มงาน · คลิกรายการเพื่อดูรายละเอียดและจัดเข้าประเด็นรวม</p>
  <div class="swx">
    <span class="swx-c" aria-hidden="true"></span><span class="swx-h">ส่งเสริมเป้าหมาย</span><span class="swx-h">ขัดขวางเป้าหมาย</span>
    <span class="swx-r">ภายในองค์กร<small>กลุ่มงานจัดการเองได้</small></span>${cellHtml('S', by('S'), m, cn)}${cellHtml('W', by('W'), m, cn)}
    <span class="swx-r">ภายนอกองค์กร<small>ควบคุมไม่ได้ ต้องปรับตัว</small></span>${cellHtml('O', by('O'), m, cn)}${cellHtml('T', by('T'), m, cn)}
  </div>`;
}

/* ---------- TOWS ตามประเด็นรวม ---------- */
const count = es => { const c = {S: 0, W: 0, O: 0, T: 0}; es.forEach(e => c[e.kind]++); return c; };
function towsHtml(es, ctx, st){
  const m = consensus(ctx.all), cn = id => (ctx.clusters.find(c => c.id === id) || {}).name || '';
  const rows = ctx.clusters.map(c => ({id: c.id, name: c.name, note: c.note, es: es.filter(e => e.cluster_id === c.id)})).map(r => ({...r, c: count(r.es)}))
    .map(r => ({...r, ready: TW.filter(t => r.c[t.a] && r.c[t.b]).length}));
  const shown = rows.filter(r => r.es.length).sort((a, b) => b.ready - a.ready || b.es.length - a.es.length || thSort(a.name, b.name));
  const none = es.filter(e => !e.cluster_id), empty = rows.length - shown.length;
  if (!shown.length) return `<div class="empty">ยังไม่มีรายการ S/W/O/T ที่ถูกจัดเข้าประเด็นรวม<p class="small" style="margin-top:.4rem">ไปที่มุมมอง “ตาราง SWOT” คลิกรายการ แล้วใช้ส่วน “จัดกลุ่มประเด็น” ในแผงรายละเอียดเพื่อย้ายเข้าประเด็นเดียวกับข้อเสนอที่เกี่ยวข้อง หน้านี้จะบอกว่าประเด็นนั้นจับคู่ SO / WO / ST / WT ได้ครบหรือยัง</p></div>`;
  const stg = (r, t) => { if (r.id === '_none') return '<span class="stg">ยังไม่จับคู่</span>';
    const miss = [t.a, t.b].filter(k => !r.c[k]);
    return miss.length ? `<span class="stg">ขาด ${miss.join(' และ ')}</span>` : `<span class="stg on" title="${esc(t.id + ' · ' + t.t)}">${t.a} ${r.c[t.a]} · ${t.b} ${r.c[t.b]}</span>`; };
  const row = r => {
    const open = st.open.has(r.id), sorted = k => r.es.filter(e => e.kind === k).sort(sorter(st, m));
    return `<tr><td><button type="button" class="swx-tg" data-swx="${esc(r.id)}" aria-expanded="${open}">${ic(open ? 'minus' : 'plus')}<span>${esc(r.name)}</span></button></td>
      ${K4.map(k => `<td class="n ${r.c[k] ? '' : 'zero'}">${r.c[k]}</td>`).join('')}${TW.map(t => `<td>${stg(r, t)}</td>`).join('')}</tr>
      ${open ? `<tr class="swx-open"><td colspan="9"><div class="swx-x">${r.id !== '_none' ? `<p class="small muted">${r.note ? esc(r.note) + ' · ' : ''}<button type="button" class="chip" data-oc="${esc(r.id)}">เปิดสรุปประเด็นในแผงรายละเอียด</button></p>` : '<p class="small muted">รายการเหล่านี้ยังไม่ถูกจัดเข้าประเด็น คลิกรายการแล้วจัดกลุ่มได้ในแผงรายละเอียด</p>'}
        <div class="quad">${K4.map(k => cellHtml(k, sorted(k), m, cn)).join('')}</div></div></td></tr>` : ''}`;
  };
  const noneRow = none.length ? row({id: '_none', name: 'ยังไม่จัดเข้าประเด็นรวม', note: '', es: none, c: count(none)}) : '';
  return `<p class="muted small swx-note">ช่อง SO / WO / ST / WT ที่ขึ้นป้ายจำนวน (เช่น S 3 · O 4) คือประเด็นที่มีทั้งสองด้านแล้ว พร้อมให้ทีมคิดกลยุทธ์ · “ขาด” บอกด้านที่ยังไม่มีรายการ${empty ? ` · อีก ${empty} ประเด็นยังไม่มีรายการ S/W/O/T` : ''}</p>
  <div class="tw swx-t"><table><thead><tr><th>ประเด็นรวม</th>${K4.map(k => `<th class="n">${KL[k]}</th>`).join('')}${TW.map(t => `<th title="${esc(t.t)}">${t.id}<small>${esc(t.t)}</small></th>`).join('')}</tr></thead>
  <tbody>${shown.map(row).join('')}${noneRow}</tbody></table></div>`;
}

/* ---------- ทั้งหน้า ---------- */
function html(ctx){
  const st = ctx.st, es = list(ctx.all, st), has = only4(ctx.all).length;
  if (!has) return '<div class="empty">ยังไม่มีกลุ่มงานใดกรอก SWOT เมื่อมีคนกรอก จะแสดงที่นี่</div>';
  return toolbar(ctx, st, es.length) + (st.mode === 'tows' ? towsHtml(es, ctx, st) : matrixHtml(es, ctx, st));
}
function csvRows(all, clusters, st){
  const m = consensus(all), cn = id => (clusters.find(c => c.id === id) || {}).name || '';
  const rows = [['ปัจจัย', 'ประเภท', 'กลุ่มงาน', 'ผู้กรอก', 'ข้อความ', 'ประเด็นรวม', 'กลุ่มงานอื่นที่ถ้อยคำใกล้เคียง']];
  list(all, st).sort((a, b) => K4.indexOf(a.kind) - K4.indexOf(b.kind) || thSort(a.wg, b.wg))
    .forEach(e => rows.push([e.kind === 'S' || e.kind === 'W' ? 'ภายใน' : 'ภายนอก', KL[e.kind], e.wg, e.author, e.body, cn(e.cluster_id), m.get(eid(e)) || 0]));
  return rows;
}

window.SXS = {html, list, csvRows, consensus, TOWS: TW};
})();
