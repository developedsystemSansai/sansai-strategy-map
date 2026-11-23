'use strict';
/* ตัวช่วยร่วมสำหรับทีมยุทธศาสตร์: ย้าย · แก้ไข · ลบ รายการของกลุ่มงาน (ใช้ทั้งหน้า "สำรวจ SWOT" และ "Strategic Board")
   · ลากโน้ต/รายการไปวางที่ช่อง S/W/O/T (เปลี่ยนประเภท) การ์ดหมวด 7S/PESTEL (เปลี่ยนหมวด) หรือแถบประเด็นรวมที่ปรากฏขณะลาก
   · ปุ่ม ⋮ ทำได้ทุกอย่างเหมือนการลาก (มือถือ/แป้นพิมพ์) และมี "แก้ไขข้อความ" กับ "ลบรายการ" (มีหน้ายืนยัน)
   · ทุกการเปลี่ยนแปลงเลิกทำได้จากแถบด้านล่าง (ลบแล้วเลิกทำ = กู้รายการกลับพร้อมข้อมูลเดิม)
   · หน้าจอจะอัปเดตทันที ถ้าบันทึกไม่สำเร็จจะย้อนกลับ · ไม่รีเฟรชหน้าขณะกำลังลาก
   ผู้เรียก: SXM.use(ctx) ทุกครั้งที่วาดหน้า · วางแอตทริบิวต์ data-sxm บนกรอบที่ครอบพื้นที่ลากวาง
   · ตัวลาก: องค์ประกอบ draggable="true" ที่มี data-oe · ตัวรับ: data-bdrop="frame:<k> | none:<in|ex> | kind:<S|W|O|T> | cl:<id> | cl: | clear"
   ctx = {all, clusters, tools:{toast, move, assign, edit, del, restore, render}} */
(function(){
const KL = {S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค'};
const K4 = ['S', 'W', 'O', 'T'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || String(g || '');
const eid = e => e.id != null ? String(e.id) : e.wg + '|' + e.body;
const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const frLabel = k => (window.FR && FR.label(k)) || '';
const clip = (s, n) => s.length > n ? s.slice(0, n) + '…' : s;
let D = null, over = null, deferred = false, snackT = null, cur = null;
const sideOfKind = k => (k === 'S' || k === 'W') ? 'in' : 'ex';
const sideOfFrame = k => (window.FR && FR.IN.some(f => f.k === k)) ? 'in' : 'ex';
const findE = (ctx, id) => ctx.all.find(e => eid(e) === id);
const use = ctx => { cur = ctx; };
const mvBtn = id => `<button type="button" class="sn-mv" data-bmove="${esc(id)}" aria-label="ย้าย แก้ไข หรือลบรายการนี้" title="ย้าย แก้ไข หรือลบ"><svg class="ic" aria-hidden="true"><use href="#i-more"/></svg></button>`;
const isDragging = () => { if (D){ deferred = true; return true; } return false; };
/* แถบวางด้านล่าง (โผล่เฉพาะขณะลาก) */
function dock(ctx, pool){
  return `<div class="bdock" aria-hidden="true"><div class="bdock-in"><span class="bdock-t">ปล่อยเพื่อ</span>${ctx.clusters.map(c => `<span class="bdz" data-bdrop="cl:${esc(c.id)}">จัดเข้า “${esc(c.name)}” <small>${pool.filter(e => e.cluster_id === c.id).length}</small></span>`).join('')}<span class="bdz" data-bdrop="cl:">เอาออกจากประเด็น</span><span class="bdz" data-bdrop="clear">ล้างหมวด 7S/PESTEL</span></div></div>`;
}

/* ---------- หน้าต่างและแถบแจ้ง ---------- */
function closeModal(){ const m = document.getElementById('bmodal'); if (m) m.remove(); document.removeEventListener('keydown', escKey, true); }
function escKey(ev){ if (ev.key === 'Escape') closeModal(); }
function shell(title, inner){
  closeModal();
  const m = document.createElement('div'); m.id = 'bmodal'; m.className = 'bmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title);
  m.innerHTML = `<div class="bm-box"><div class="bm-h"><b>${esc(title)}</b><button type="button" class="icon-btn" data-bmclose aria-label="ปิด">${ic('x')}</button></div>${inner}</div>`;
  document.body.appendChild(m); document.addEventListener('keydown', escKey, true); return m;
}
function modal(title, sub, sections){
  const m = shell(title, `${sub ? `<p class="muted small bm-sub">${esc(sub)}</p>` : '<span></span>'}<div class="bm-body">${sections.map((s, i) => `<div class="bm-sec"><h4>${esc(s.h)}</h4><div class="bm-list">${s.items.map((it, j) => `<button type="button" class="bm-it${it.cur ? ' cur' : ''}${it.danger ? ' danger' : ''}" data-i="${i}.${j}"${it.cur ? ' aria-current="true"' : ''}>${esc(it.t)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`).join('')}</div></div>`).join('')}</div>`);
  m.addEventListener('click', ev => { if (ev.target === m || ev.target.closest('[data-bmclose]')) return closeModal(); const b = ev.target.closest('[data-i]'); if (!b) return; const [i, j] = b.dataset.i.split('.').map(Number); closeModal(); sections[i].items[j].run(); });
  const f = m.querySelector('.bm-it:not(.cur):not(.danger)') || m.querySelector('button'); if (f) f.focus();
}
function snack(msg, undo){
  let s = document.getElementById('bsnack');
  if (!s){ s = document.createElement('div'); s.id = 'bsnack'; s.className = 'bsnack'; s.setAttribute('role', 'status'); document.body.appendChild(s); }
  s.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" class="btn sm">เลิกทำ</button>' : ''}`; s.classList.add('show');
  const b = s.querySelector('button'); if (b) b.onclick = () => { s.classList.remove('show'); undo(); };
  clearTimeout(snackT); snackT = setTimeout(() => s.classList.remove('show'), 10000);
}

/* ---------- การกระทำ ---------- */
function moveTo(ctx, e, kind, frame, how){
  const id = eid(e), f = frame || null;
  if (kind === e.kind && (e.frame || null) === f){ ctx.tools.toast('รายการอยู่ในตำแหน่งนี้แล้ว'); return Promise.resolve(); }
  const label = f ? frLabel(f) : (sideOfKind(kind) === 'in' ? 'ยังไม่ระบุหมวด 7S' : 'ยังไม่ระบุหมวด PESTEL');
  const cleared = !f && e.frame && sideOfKind(kind) !== sideOfKind(e.kind) ? ' (ล้างหมวดเดิม)' : '';
  return ctx.tools.move(id, kind, f).then(prev => { if (prev) snack((how === 'kind' ? 'เปลี่ยนเป็น ' + KL[kind] + cleared : 'ย้ายไป “' + label + '”' + (kind !== prev.kind ? ' และเปลี่ยนเป็น ' + KL[kind] : '')) + ' แล้ว', () => ctx.tools.move(id, prev.kind, prev.frame)); });
}
function pickKind(ctx, e, side, frame){
  const kinds = side === 'in' ? ['S', 'W'] : ['O', 'T'];
  modal('ย้ายข้ามฝั่ง เลือกประเภทใหม่', `“${clip(e.body, 60)}” เป็น ${e.kind} ${KL[e.kind]} (ปัจจัย${side === 'in' ? 'ภายนอก' : 'ภายใน'}) ถ้าย้ายไปปัจจัย${side === 'in' ? 'ภายใน' : 'ภายนอก'} ต้องเลือกประเภทให้ตรงกับความหมาย`,
    [{h: 'ประเภทใหม่', items: kinds.map(k => ({t: k + ' · ' + KL[k], hint: side === 'in' ? 'ปัจจัยภายใน (7S)' : 'ปัจจัยภายนอก (PESTEL)', run: () => moveTo(ctx, e, k, frame)}))}]);
}
function act(ctx, id, target){
  const e = findE(ctx, id); if (!e) return Promise.resolve();
  const i = target.indexOf(':'), type = i < 0 ? target : target.slice(0, i), val = i < 0 ? '' : target.slice(i + 1);
  if (type === 'cl'){
    const prev = e.cluster_id || null; if ((prev || '') === val){ ctx.tools.toast('รายการอยู่ในประเด็นนี้แล้ว'); return Promise.resolve(); }
    const cname = val ? (ctx.clusters.find(c => c.id === val) || {}).name : '';
    return ctx.tools.assign(id, val || null).then(ok => { if (ok) snack(val ? 'จัดเข้าประเด็น “' + cname + '” แล้ว' : 'เอาออกจากประเด็นแล้ว', () => ctx.tools.assign(id, prev)); });
  }
  if (K4.indexOf(e.kind) < 0){ ctx.tools.toast('ย้ายหมวดหรือประเภทได้เฉพาะรายการ S/W/O/T'); return Promise.resolve(); }
  if (type === 'kind') return moveTo(ctx, e, val, sideOfKind(val) === sideOfKind(e.kind) ? (e.frame || null) : null, 'kind');   // ช่อง SWOT: ย้ายในฝั่งเดียวกันคงหมวด ข้ามฝั่งล้างหมวด
  if (type === 'clear') return moveTo(ctx, e, e.kind, null);
  const side = type === 'frame' ? sideOfFrame(val) : val, frame = type === 'frame' ? val : null;
  if (side === sideOfKind(e.kind)) return moveTo(ctx, e, e.kind, frame);
  pickKind(ctx, e, side, frame); return Promise.resolve();
}
function confirmDelete(ctx, e){
  const id = eid(e);
  modal('ลบรายการนี้?', `${e.kind in KL ? e.kind + ' · ' + KL[e.kind] + ' · ' : ''}${short(e.wg)}: ${clip(e.body, 90)}`, [{h: 'ยืนยันการลบ', items: [
    {t: 'ลบรายการนี้', hint: 'ลบออกจากฐานข้อมูล กลุ่มงานเจ้าของจะไม่เห็นรายการนี้อีก · เลิกทำได้ทันทีหลังลบ', danger: true, run: () => ctx.tools.del(id).then(row => { if (row) snack('ลบรายการแล้ว', () => ctx.tools.restore(row)); })},
    {t: 'ยกเลิก', run: () => {}}]}]);
}
function editModal(ctx, e){
  const id = eid(e), hasDetail = !!e.detail || ['ISSUE', 'IDEA', 'DATA'].indexOf(e.kind) >= 0;
  const m = shell('แก้ไขข้อความ', `<p class="muted small bm-sub">${e.kind in KL ? esc(e.kind + ' · ' + KL[e.kind]) + ' · ' : ''}จาก ${esc(short(e.wg))} · ใช้แก้คำผิดหรือเกลาถ้อยคำเท่านั้น กลุ่มงานเจ้าของจะเห็นข้อความที่แก้เมื่อโหลดหน้าครั้งถัดไป เลิกทำได้</p>
    <form class="bm-body bm-form" novalidate><label>ข้อความ<textarea class="input" name="body" rows="4" maxlength="1000" required>${esc(e.body)}</textarea></label>
    ${hasDetail ? `<label>รายละเอียด (ไม่บังคับ)<textarea class="input" name="detail" rows="3" maxlength="2000">${esc(e.detail || '')}</textarea></label>` : ''}
    <p class="err" role="alert" hidden>ข้อความต้องไม่ว่าง</p>
    <div class="bm-act"><button type="button" class="btn" data-bmclose>ยกเลิก</button><button type="submit" class="btn pri">บันทึกการแก้ไข</button></div></form>`);
  const f = m.querySelector('form'), fb = f.elements.body, fd = f.elements.detail; fb.focus();
  m.addEventListener('click', ev => { if (ev.target === m || ev.target.closest('[data-bmclose]')) closeModal(); });
  f.addEventListener('submit', ev => {
    ev.preventDefault(); const body = fb.value.trim(), detail = fd ? fd.value.trim() : (e.detail || '');
    if (!body){ m.querySelector('.err').hidden = false; fb.focus(); return; }
    closeModal(); if (body === e.body && detail === (e.detail || '')){ ctx.tools.toast('ไม่มีการเปลี่ยนแปลง'); return; }
    ctx.tools.edit(id, body, detail).then(prev => { if (prev) snack('แก้ไขข้อความแล้ว', () => ctx.tools.edit(id, prev.body, prev.detail)); });
  });
}
function openMenu(ctx, id){
  const e = findE(ctx, id); if (!e) return;
  const k4 = K4.indexOf(e.kind) >= 0, side = sideOfKind(e.kind), secs = [];
  if (k4 && window.FR){
    const fl = side === 'in' ? FR.IN : FR.EX;
    secs.push({h: 'ย้ายไปหมวด ' + (side === 'in' ? '7S' : 'PESTEL'), items: [...fl.map(f => ({t: f.t, hint: f.en, cur: e.frame === f.k, run: () => moveTo(ctx, e, e.kind, f.k)})), {t: 'ยังไม่ระบุหมวด', cur: !e.frame, run: () => moveTo(ctx, e, e.kind, null)}]});
    secs.push({h: 'เปลี่ยนประเภท', items: K4.filter(k => k !== e.kind).map(k => ({t: 'เป็น ' + k + ' · ' + KL[k], hint: sideOfKind(k) === side ? 'ฝั่งเดียวกัน คงหมวดเดิม' : 'อีกฝั่ง ล้างหมวดเดิม', run: () => act(ctx, id, 'kind:' + k)}))});
  }
  secs.push({h: 'ประเด็นรวม', items: [...ctx.clusters.map(c => ({t: c.name, cur: e.cluster_id === c.id, run: () => act(ctx, id, 'cl:' + c.id)})), {t: 'ยังไม่จัดเข้าประเด็น', cur: !e.cluster_id, run: () => act(ctx, id, 'cl:')}]});
  secs.push({h: 'จัดการรายการ', items: [{t: 'แก้ไขข้อความ…', hint: 'แก้คำผิดหรือเกลาถ้อยคำ', run: () => editModal(ctx, e)}, {t: 'ลบรายการ…', hint: 'ต้องยืนยันก่อน และเลิกทำได้', danger: true, run: () => confirmDelete(ctx, e)}]});
  modal('จัดการรายการ', (e.kind in KL ? e.kind + ' · ' + KL[e.kind] + ' · ' : '') + short(e.wg) + ': ' + clip(e.body, 70), secs);
}
function click(t, ctx){
  const x = t.closest && t.closest('[data-bmove]'); if (!x) return false;
  openMenu(ctx, x.dataset.bmove); return true;
}

/* ---------- ลากวาง ---------- */
const rootOf = el => el && el.closest ? el.closest('[data-sxm]') : null;
const zoneSide = z => { const t = z.dataset.bdrop; return t.indexOf('frame:') === 0 ? sideOfFrame(t.slice(6)) : t.indexOf('none:') === 0 ? t.slice(5) : 'any'; };
function endDrag(){
  const root = D && D.root; D = null; over = null;
  const rs = root ? [root] : [...document.querySelectorAll('[data-sxm]')];
  rs.forEach(r => { r.classList.remove('dnd'); r.querySelectorAll('.dragging,.over,.z-ok,.z-x').forEach(n => n.classList.remove('dragging', 'over', 'z-ok', 'z-x')); });
  if (deferred){ deferred = false; if (cur && cur.tools.render) cur.tools.render(); }
}
document.addEventListener('dragstart', ev => {
  const n = ev.target.closest && ev.target.closest('[data-oe][draggable="true"]'); const root = rootOf(n); if (!n || !root || !cur) return;
  const e = findE(cur, n.dataset.oe); if (!e) return;
  D = {id: n.dataset.oe, side: sideOfKind(e.kind), root, k4: K4.indexOf(e.kind) >= 0};
  try { ev.dataTransfer.setData('text/plain', 'sx:' + D.id); ev.dataTransfer.effectAllowed = 'move'; } catch(_) {}
  root.classList.add('dnd'); n.classList.add('dragging');
  root.querySelectorAll('[data-bdrop]').forEach(z => { const s = zoneSide(z), t = z.dataset.bdrop, usable = D.k4 || t.indexOf('cl:') === 0; if (!usable) return; z.classList.add(s === 'any' || s === D.side ? 'z-ok' : 'z-x'); });
});
document.addEventListener('dragover', ev => {
  if (!D) return; const z = ev.target.closest && ev.target.closest('[data-bdrop]'); if (!z || !(z.classList.contains('z-ok') || z.classList.contains('z-x'))) return;
  ev.preventDefault(); try { ev.dataTransfer.dropEffect = 'move'; } catch(_) {}
  if (over !== z){ if (over) over.classList.remove('over'); over = z; z.classList.add('over'); }
});
document.addEventListener('dragleave', ev => {
  if (!D || !over) return; const z = ev.target.closest && ev.target.closest('[data-bdrop]');
  if (z === over && !(ev.relatedTarget && over.contains(ev.relatedTarget))){ over.classList.remove('over'); over = null; }
});
document.addEventListener('drop', ev => {
  if (!D) return; const z = ev.target.closest && ev.target.closest('[data-bdrop]'); if (!z || !(z.classList.contains('z-ok') || z.classList.contains('z-x'))) return;
  ev.preventDefault(); const id = D.id, target = z.dataset.bdrop, ctx = cur; endDrag(); act(ctx, id, target);
});
document.addEventListener('dragend', endDrag);

window.SXM = {use, mvBtn, dock, isDragging, click, act, openMenu, confirmDelete, editModal};
})();
