'use strict';
const CFG = window.APP_CONFIG || {};
const KIND = {DATA:'ข้อมูล', S:'จุดแข็ง', W:'จุดอ่อน', O:'โอกาส', T:'อุปสรรค', ISSUE:'ประเด็นสำคัญ', IDEA:'ข้อเสนอ'};
const KORDER = ['S','W','O','T','ISSUE','IDEA','DATA'];
const PRI = {3:'สำคัญมาก', 2:'สำคัญ', 1:'พิจารณา'};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const short = g => String(g || '').replace(/^กลุ่มงาน/, '') || g;
const fmt = iso => iso ? new Date(iso).toLocaleString('th-TH', {dateStyle: 'short', timeStyle: 'short'}) : '–';
const store = {
  get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } },
  set(k, v){ try { sessionStorage.setItem(k, v); } catch(e){} },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){} }
};
let session = null;
try { session = JSON.parse(store.get('sx_session') || 'null'); } catch(e){}
let G = null, A = null, kseq = 0, loginErr = '', loginMode = 'group', draft = {wg: '', au: ''};
const viewSw = (cur, attr) => `<span class="seg" role="group" aria-label="รูปแบบการแสดงผล">${[['graph','แผนผังกราฟ'],['list','รายการ']].map(([v, t]) => `<button type="button" class="${cur === v ? 'on' : ''}" ${attr}="${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</span>`;
const thSort = (a, b) => a.localeCompare(b, 'th');
const eidOf = e => e.id != null ? String(e.id) : e.wg + '|' + e.body;
const liAttr = e => `data-oe="${esc(eidOf(e))}" data-wg="${esc(e.wg)}" data-cid="${esc(e.cluster_id || '')}" tabindex="0" role="button" aria-label="ดูรายละเอียด"`;

let pend = 0;
function barState(){ const b = $('#topbar'); if (b) b.classList.toggle('on', pend > 0); }
async function rpc(fn, body){
  pend++; barState();
  try { return await rpc0(fn, body); } finally { pend--; barState(); }
}
async function rpc0(fn, body){
  if (session && session.demo && window.DEMO) return DEMO.rpc(fn, body);      // โหมดตัวอย่าง: ไม่แตะฐานข้อมูลจริง
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_KEY ใน config.js');
  let r;
  try {
    r = await fetch(CFG.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: {'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY}, body: JSON.stringify(body)});
  } catch(e){ throw new Error('เชื่อมต่ออินเทอร์เน็ตไม่ได้'); }
  let j = null; try { j = await r.json(); } catch(e){}
  if (!r.ok){
    if (j && (j.message === 'AUTH' || j.code === '28000')){ const e = new Error('รหัสผ่านไม่ถูกต้อง'); e.auth = true; throw e; }
    throw new Error((j && j.message) || ('เชื่อมต่อไม่ได้ (' + r.status + ')'));
  }
  return j;
}
let toastT;
function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function download(name, data, type){
  const b = new Blob([data], {type: type || 'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
const csvCell = v => { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
const toCSV = rows => '\ufeff' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
const hue = i => `hsl(${(i * 47 + 12) % 360} 48% 40%)`;
const sumVals = o => Object.values(o).reduce((a, b) => a + b, 0);

function shell(who){
  const demo = session && session.demo ? `<div class="demobar" role="note"><span class="demo-tag">โหมดตัวอย่าง</span><span>ข้อมูลสมมติทั้งหมด ลองกรอก แก้ไข หรือโหวตได้เต็มที่ — <b>ไม่บันทึกลงฐานข้อมูลจริง</b></span><span class="sp"></span><button class="btn sm" data-act="demoreset">${ico('refresh')}รีเซ็ตตัวอย่าง</button><button class="btn sm" data-act="logout">ออกจากโหมดตัวอย่าง</button></div>` : '';
  $('#app').innerHTML = `<div class="sticky"><header class="top">
    <div class="brand"><span class="brand-logo"><img src="assets/emblem.png" alt="" width="32" height="32"></span><div>แผนยุทธศาสตร์ โรงพยาบาลสันทราย<small>รวบรวมมุมมองจากกลุ่มงาน · อ.สันทราย จ.เชียงใหม่</small></div></div>${who || ''}</header>${demo}
    <nav class="tabs" id="tabs" role="tablist" hidden></nav></div><main id="view"></main>`;
}
function setTabs(list, cur, attr, extra){
  const el = $('#tabs'); if (!el) return; el.hidden = false;
  el.innerHTML = list.map(([k, t], i) => `<button class="tab${cur === k ? ' on' : ''}" role="tab" aria-selected="${cur === k}" ${attr}="${k}"><span class="n">${i + 1}</span>${t}${extra && extra[k] ? extra[k] : ''}</button>`).join('');
}
function navBtns(list, cur, attr){
  const i = list.findIndex(x => x[0] === cur), p = list[i - 1], n = list[i + 1];
  return `<div class="navbtns">${p ? `<button class="btn" ${attr}="${p[0]}">← ${p[1]}</button>` : '<span></span>'}${n ? `<button class="btn pri" ${attr}="${n[0]}">${n[1]} →</button>` : ''}</div>`;
}
let animNext = true;
const loading = m => `<div class="loadmsg"><span class="spin" aria-hidden="true"></span><p>${m}</p></div>`;
const view = h => {
  $('#view').innerHTML = h;
  if (animNext && h.indexOf('class="loadmsg"') < 0){ animNext = false; enhance($('#view')); }
};
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el){
  const m = /^(\d+)(.*)$/.exec(el.textContent.trim()); if (!m || REDUCED) return;
  const to = +m[1], tail = m[2], t0 = performance.now(), dur = 700;
  if (to === 0) return;
  (function step(t){ const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(to * e) + tail; if (k < 1) requestAnimationFrame(step); })(t0);
}
function enhance(root){
  if (!root) return;
  const w = root.firstElementChild; if (w && w.classList.contains('wrap')) w.classList.add('rise');
  root.querySelectorAll('.logo-card, .steps li, .sum > div, .hint, .filters, .ctl, .live-row, .section, .card, .vcard, .rrow, .cl, .tw, .empty, .panel')
    .forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 14)); el.classList.add('rise'); });
  root.querySelectorAll('.sum b').forEach(countUp);
}
function logout(msg){
  if (G) clearInterval(G.poll); if (A) clearInterval(A.poll);
  session = null; G = null; A = null; loginMode = 'group'; loginErr = msg || '';
  if (window.SMB && SMB.reset) SMB.reset();
  store.del('sx_session'); boot();
}
function saveSession(){ if (session && session.demo) return; store.set('sx_session', JSON.stringify(session)); }
function startDemo(role){
  if (!window.DEMO) return toast('ไม่พบข้อมูลตัวอย่าง');
  if (window.SMB && SMB.reset) SMB.reset();
  DEMO.reset(role);
  session = role === 'admin' ? {demo: true, pass: 'demo', role: 'admin'} : {demo: true, pass: 'demo', role: 'group', wg: DEMO.user.wg, author: DEMO.user.author};
  boot();
}
function whoHtml(){
  const t = session.role === 'admin' ? `<span class="t"><b>ทีมยุทธศาสตร์</b></span>` : `<span class="t"><b>${esc(short(session.wg))}</b> · ${esc(session.author)}</span>`;
  return `<span class="who">${t}</span><button class="btn sm" data-act="logout">${ico('out')}ออก</button>`;
}

/* ---------- เข้าสู่ระบบ: เลือกกลุ่มงานก่อนเสมอ ---------- */
function loginView(){
  shell('');
  const groups = [...(CFG.WORK_GROUPS || [])].sort(thSort), isG = loginMode === 'group';
  const known = draft.wg === '' || groups.includes(draft.wg);
  const form = isG ? `
    <form id="f1" autocomplete="off">
      <div class="field"><label for="wg">1. เลือกกลุ่มงานของท่าน</label>
        <select class="select input" id="wg" required><option value="">เลือกกลุ่มงาน (${groups.length} รายการ)</option>${groups.map(g => `<option${draft.wg === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}<option value="__other"${!known ? ' selected' : ''}>ไม่มีในรายการ (พิมพ์ชื่อเอง)</option></select></div>
      <div class="field" id="wgo" ${known ? 'hidden' : ''}><label for="wgt">ชื่อกลุ่มงาน</label><input class="input" id="wgt" maxlength="120" value="${known ? '' : esc(draft.wg)}"></div>
      <div class="field"><label for="au">2. ชื่อผู้กรอก</label><input class="input" id="au" maxlength="80" required value="${esc(draft.au)}" placeholder="ชื่อ-สกุล หรือชื่อเล่นที่ทีมรู้จัก"></div>
      ${loginErr ? `<p class="err" role="alert">${esc(loginErr)}</p>` : ''}
      <button class="btn pri" style="width:100%">เริ่มกรอกข้อมูล</button>
    </form>` : `
    <form id="f1" autocomplete="off">
      <div class="field"><label for="pw">รหัสผ่านทีมยุทธศาสตร์</label><input class="input" id="pw" type="password" autocomplete="current-password" required autofocus></div>
      ${loginErr ? `<p class="err" role="alert">${esc(loginErr)}</p>` : ''}
      <button class="btn pri" style="width:100%">เข้าสู่ระบบ</button>
    </form>`;
  view(`<div class="login">
    <div>
      <div class="logo-card"><img src="assets/logo.png" alt="โรงพยาบาลสันทราย กลุ่มงานยุทธศาสตร์และแผนงานโครงการ" width="900" height="475"></div>
      <h1>เขียนมุมมองของกลุ่มงาน เพื่อเลือกยุทธศาสตร์ของโรงพยาบาลร่วมกัน</h1>
      <p class="lead muted">ทุกกลุ่มงานกรอกข้อมูลในมุมของตัวเอง แล้วทีมยุทธศาสตร์จะนำมารวมกันดูภาพรวมในการประชุมเชิงปฏิบัติการ</p>
      <ol class="steps">
        <li><span class="n">1</span><div><b>กรอกสถานการณ์ของกลุ่มงาน</b><p class="muted small">ข้อมูลและตัวชี้วัดที่ติดตามอยู่ พร้อม SWOT จากหน้างานจริง</p></div></li>
        <li><span class="n">2</span><div><b>เสนอประเด็นและข้อเสนอ</b><p class="muted small">เรื่องที่ควรแก้หรือเร่งทำ พร้อมระบุระดับความสำคัญ</p></div></li>
        <li><span class="n">3</span><div><b>ดูว่ากลุ่มงานอื่นคิดอย่างไร</b><p class="muted small">เปิดอ่านมุมมองของกลุ่มงานอื่นได้ตลอด เพื่อเห็นภาพรวมก่อนประชุม</p></div></li>
        <li><span class="n">4</span><div><b>ส่งให้ทีมยุทธศาสตร์</b><p class="muted small">ระบบบันทึกให้ทุกครั้งที่พิมพ์ และแก้ไขได้จนกว่าจะประชุม</p></div></li>
      </ol>
    </div>
    <div class="side"><div class="panel"><h2 style="margin-bottom:1rem">${isG ? 'เข้าใช้งานกลุ่มงาน' : 'เข้าสู่ระบบทีมยุทธศาสตร์'}</h2>${form}
      <p class="small" style="margin-top:1rem"><button class="linkbtn" data-lmode="${isG ? 'admin' : 'group'}">${isG ? 'สำหรับทีมยุทธศาสตร์ เข้าที่นี่' : '← กลับไปเลือกกลุ่มงาน'}</button></p></div>
      <div class="panel demo-card"><h3>ลองดูตัวอย่างก่อน</h3><p class="muted small">ใช้ข้อมูลสมมติ ไม่ต้องเข้าสู่ระบบ และไม่บันทึกลงฐานข้อมูลจริง</p>
        <div class="demo-btns">
          <button type="button" class="btn" data-demo="group">${ico('check')}<span><b>ตัวอย่างผู้กรอก</b><small>ดูหน้ากรอกข้อมูล มุมมองกลุ่มงานอื่น และการลงคะแนน</small></span></button>
          <button type="button" class="btn" data-demo="admin">${ico('refresh')}<span><b>ตัวอย่างทีมยุทธศาสตร์</b><small>ดูภาพรวมเมื่อทุกกลุ่มงานกรอกเสร็จ จัดกลุ่มประเด็น และผลโหวต</small></span></button>
        </div></div></div>
  </div>`);
}
function readDraft(){ const w = $('#wg'); if (!w) return; draft.wg = w.value === '__other' ? ($('#wgt').value || '').trim() : w.value; draft.au = $('#au').value; }
async function onLogin1(e){
  e.preventDefault();
  if (loginMode === 'group'){
    readDraft(); const wg = draft.wg.replace(/\s+/g, ' ').trim(), au = draft.au.replace(/\s+/g, ' ').trim();
    if (!wg){ loginErr = 'กรุณาเลือกกลุ่มงานก่อน'; loginView(); return; }
    if (!au){ loginErr = 'กรุณาระบุชื่อผู้กรอก'; loginView(); return; }
    loginErr = ''; session = {pass: '', role: 'group', wg, author: au}; saveSession(); boot(); return;
  }
  const pw = $('#pw').value.trim(); if (!pw) return;
  $('#f1 button').disabled = true; $('#f1 button').classList.add('busy');
  try { await rpc('sx_login', {p_pass: pw}); loginErr = ''; session = {pass: pw, role: 'admin'}; saveSession(); boot(); }
  catch(err){ loginErr = err.auth ? 'รหัสผ่านทีมยุทธศาสตร์ไม่ถูกต้อง' : err.message; loginView(); }
}

/* ---------- กลุ่มงาน: กรอกข้อมูล ---------- */
const PANELS = [
  {id:'p-swot', title:'SWOT จากมุมมองกลุ่มงาน', hint:'เขียนข้อละหนึ่งเรื่อง สั้นและเจาะจงที่หน้างาน ไม่ต้องรอให้ครบทุกช่อง',
   blocks:[
    {k:'S', q:'กลุ่มงานทำอะไรได้ดี หรือมีอะไรที่เป็นแต้มต่อ', ph:'จุดแข็ง'},
    {k:'W', q:'อะไรทำให้งานติดขัด ซ้ำซ้อน หรือเสี่ยง', ph:'จุดอ่อน'},
    {k:'O', q:'นโยบาย ภาคีเครือข่าย เทคโนโลยี หรือความต้องการของประชาชนที่ใช้ประโยชน์ได้', ph:'โอกาส'},
    {k:'T', q:'อุปสรรคหรือแรงกดดันจากภายนอกที่กลุ่มงานควบคุมเองไม่ได้', ph:'อุปสรรค'}]},
  {id:'p-issue', title:'ประเด็นสำคัญและข้อเสนอ', hint:'ใช้ระดับความสำคัญเพื่อบอกทีมยุทธศาสตร์ว่าเรื่องไหนควรดูก่อน',
   blocks:[
    {k:'ISSUE', q:'เรื่องที่ควรแก้หรือเร่งทำมากที่สุดในมุมของกลุ่มงาน', ph:'ประเด็นสำคัญ', ph2:'ส่งผลต่อประชาชนหรือบริการอย่างไร', detail:true, pri:true},
    {k:'IDEA', q:'ถ้าเลือกทำได้เพียงไม่กี่เรื่อง กลุ่มงานเสนอให้ทำอะไร', ph:'ข้อเสนอ', ph2:'ทำอย่างไร ใครเกี่ยวข้อง', detail:true, pri:true}]},
  {id:'p-data', title:'สถานการณ์และตัวชี้วัดของกลุ่มงาน', hint:'ตัวเลขหรือข้อเท็จจริงที่กลุ่มงานติดตามอยู่ และช่วยให้เห็นภาพ เช่น ภาระงาน เวลารอคอย อัตรากำลัง ผลลัพธ์ที่เคยวัดไว้',
   blocks:[{k:'DATA', ph:'ข้อมูลหรือตัวชี้วัด เช่น ผู้ป่วยนอกเฉลี่ยต่อวัน', ph2:'ค่าปัจจุบัน แนวโน้ม และแหล่งข้อมูล', detail:true}]}
];
const BLOCK = {}; PANELS.forEach(p => p.blocks.forEach(b => BLOCK[b.k] = b));

async function enterGroup(){
  G = {entries: [], done: false, at: null, tab: 'fill', peer: {loaded: false, view: 'graph', entries: [], clusters: [], done: [], at: null, f: {wg: '', kind: '', q: ''}}, vote: {open: false, dots: 5, clusters: [], mine: {}, dirty: false}};
  shell(whoHtml()); view(loading('กำลังโหลดข้อมูลของกลุ่มงาน…'));
  try {
    const r = await rpc('sx_my_entries', {p_pass: session.pass, p_wg: session.wg});
    G.entries = (r.entries || []).map(e => ({...e, _k: ++kseq, _st: 'ok'}));
    G.done = !!(r.submission && r.submission.done); G.at = r.submission && r.submission.submitted_at;
    await loadVote(true);
  } catch(e){ if (e.auth) return logout('เชื่อมต่อไม่สำเร็จ กรุณาเข้าใหม่อีกครั้ง'); view(`<div class="wrap"><div class="empty">${esc(e.message)}<p><button class="btn" data-act="reload" style="margin-top:1rem">ลองใหม่</button></p></div></div>`); return; }
  renderGroup();
  G.poll = setInterval(async () => { const was = G.vote.open; await loadVote(false); if (G.tab === 'map'){ if (was !== G.vote.open) setTabs(GTABS, G.tab, 'data-tab', {vote: G.vote.open ? '<span class="live">เปิดอยู่</span>' : ''}); } else if (G.tab === 'vote' ? !G.vote.dirty : was !== G.vote.open) renderGroup(true); }, 20000);
}
async function loadVote(reset){
  try {
    const v = await rpc('sx_vote_state', {p_pass: session.pass, p_voter: voter()});
    G.vote.open = !!v.open; G.vote.dots = v.dots; G.vote.clusters = v.clusters || [];
    if (reset || !G.vote.dirty){ G.vote.mine = {}; G.vote.clusters.forEach(c => { if (c.mine > 0) G.vote.mine[c.id] = c.mine; }); }
  } catch(e){ if (e.auth) logout('เชื่อมต่อไม่สำเร็จ กรุณาเข้าใหม่อีกครั้ง'); }
}
const voter = () => (session.author + ' (' + short(session.wg) + ')').slice(0, 80);

function itemHtml(e){
  const b = BLOCK[e.kind];
  const st = e._st === 'saving' ? '<span class="st muted">กำลังบันทึก…</span>' : e._st === 'err' ? '<span class="st err2" data-retry>บันทึกไม่สำเร็จ แตะเพื่อลองใหม่</span>' : e._st === 'dirty' ? '<span class="st muted">รอบันทึก…</span>' : e.id ? '<span class="st muted">บันทึกแล้ว</span>' : '<span class="st muted">พิมพ์เพื่อบันทึก</span>';
  return `<div class="item" data-k="${e._k}">
    <textarea class="ta f-body" rows="1" maxlength="1000" aria-label="${esc(b.ph)}" placeholder="${esc(b.ph)}">${esc(e.body)}</textarea>
    ${b.detail ? `<textarea class="ta f-detail" rows="1" maxlength="2000" aria-label="${esc(b.ph2)}" placeholder="${esc(b.ph2)}">${esc(e.detail)}</textarea>` : ''}
    <div class="item-foot">
      ${b.pri ? `<label>ความสำคัญ <select class="f-pri" aria-label="ระดับความสำคัญ">${[3,2,1].map(p => `<option value="${p}"${+e.priority === p ? ' selected' : ''}>${PRI[p]}</option>`).join('')}</select></label>` : ''}
      <span class="sp"></span><span data-st>${st}</span>
      <button class="icon-btn" data-del title="ลบรายการนี้" aria-label="ลบรายการนี้">${ico('trash')}</button>
    </div></div>`;
}
function blockHtml(b){
  const list = G.entries.filter(e => e.kind === b.k);
  return `<div class="block ${b.k}" data-block="${b.k}">
    <div class="block-h"><span class="pill big ${b.k}">${b.k.length === 1 ? `<b class="ltr">${b.k}</b>` : ''}${KIND[b.k]}</span><span class="count">${list.filter(e => e.body.trim()).length} รายการ</span></div>
    ${b.q ? `<p class="block-q">${esc(b.q)}</p>` : ''}
    <div class="items">${list.map(itemHtml).join('')}</div>
    <button class="btn sm" data-add="${b.k}">${ico('plus')}เพิ่ม${KIND[b.k]}</button></div>`;
}
function fillHtml(){
  return `<div class="hint"><b>ยังไม่ต้องเขียนวิสัยทัศน์ พันธกิจ หรือผลลัพธ์สุขภาพ</b> ทีมยุทธศาสตร์จะทบทวนเรื่องเหล่านั้นใหม่หลังรวบรวมข้อมูลจากทุกกลุ่มงาน</div>` + PANELS.map(p => `<section class="section" id="${p.id}"><h2>${p.title}</h2><p class="sub">${esc(p.hint)}</p>
    <div class="blocks ${p.blocks.length >= 2 ? 'two' : ''} ${p.id === 'p-swot' ? 'swot' : ''}">${p.blocks.map(blockHtml).join('')}</div></section>`).join('');
}
function barHtml(){
  const n = G.entries.filter(e => e.body.trim()).length, pend = G.entries.filter(e => e._st === 'dirty' || e._st === 'saving' || e._st === 'err').length;
  const msg = G.done
    ? `<span class="badge-done">${ico('check')}ส่งให้ทีมยุทธศาสตร์แล้ว</span> <span class="muted small">เมื่อ ${fmt(G.at)} · ยังแก้ไขได้ ทีมจะเห็นข้อมูลล่าสุดทันที</span>`
    : `<b>${n}</b> รายการ <span class="muted small">${pend ? '· กำลังบันทึก…' : '· บันทึกอัตโนมัติ'} · กดส่งเมื่อกรอกเสร็จเพื่อบอกทีมว่าพร้อมแล้ว</span>`;
  return `<div class="savebar"><div class="savebar-in"><div class="msg" id="barmsg">${msg}</div>
    ${G.done ? `<button class="btn" data-act="undone">ยกเลิกสถานะส่ง</button>` : `<button class="btn pri" data-act="done" ${n ? '' : 'disabled'}>${ico('check')}ส่งให้ทีมยุทธศาสตร์</button>`}</div></div>`;
}
function voteHtml(){
  const V = G.vote, used = sumVals(V.mine), left = V.dots - used;
  if (!V.clusters.length) return `<div class="empty">ทีมยุทธศาสตร์ยังไม่ได้จัดกลุ่มประเด็นสำหรับการลงคะแนน<p class="small" style="margin-top:.4rem">เมื่อเริ่มลงคะแนน หน้านี้จะแสดงประเด็นให้เลือกโดยอัตโนมัติ</p></div>`;
  return `${V.open ? '' : `<div class="hint warn">ยังไม่เปิดให้ลงคะแนน คะแนนที่เคยให้ไว้แสดงด้านล่าง</div>`}
  <div class="vote-head"><p>แจกจุดคะแนนให้ประเด็นที่ท่านเห็นว่าควรเป็นยุทธศาสตร์ของโรงพยาบาล ให้ประเด็นเดียวกันหลายจุดได้</p><span class="vote-left">เหลือ ${left} จาก ${V.dots} จุด</span></div>
  <div class="vlist">${V.clusters.map(c => { const m = V.mine[c.id] || 0; return `<div class="vcard" data-c="${esc(c.id)}">
    <div><h3>${esc(c.name)}</h3>${c.note ? `<p class="muted small">${esc(c.note)}</p>` : ''}
    <p class="muted small">${c.items} รายการจาก ${c.groups} กลุ่มงาน</p>
    <div class="toks">${Array.from({length: V.dots}, (_, i) => `<span class="tok${i < m ? ' on' : ''}"></span>`).join('')}</div></div>
    <div class="vctl"><button class="icon-btn neutral" data-vm aria-label="ลดคะแนน" ${m < 1 || !V.open ? 'disabled' : ''}>${ico('minus')}</button><span class="num">${m}</span><button class="icon-btn neutral" data-vp aria-label="เพิ่มคะแนน" ${left < 1 || !V.open ? 'disabled' : ''}>${ico('plus')}</button></div></div>`; }).join('')}</div>
  <div style="margin-top:1.25rem"><button class="btn pri" data-act="vsubmit" ${V.open ? '' : 'disabled'}>${ico('check')}ส่งคะแนน</button>${V.dirty ? ' <span class="muted small">ยังไม่ได้ส่งคะแนน</span>' : ''}</div>`;
}
const GTABS = [['fill','กรอกข้อมูลกลุ่มงาน'],['map','แผนที่ยุทธศาสตร์'],['peer','มุมมองกลุ่มงานอื่น'],['vote','ลงคะแนนประเด็น']];
function mountMap(){
  const h = $('#smbHost'); if (!h || !window.SMB) return;
  SMB.mount(h, {rpc, pass: () => (session && session.pass) || '', canEdit: !!session && session.role === 'admin'});
}
/* ทีมยุทธศาสตร์จัดกลุ่มประเด็นจากการ์ดรายละเอียด (ผังและรายการใช้ร่วมกัน) */
const adminApi = () => ({
  assign: (ids, cid) => aCall('sx_admin_assign', {p_ids: ids, p_cluster: cid}, cid ? 'ย้ายแล้ว ' + ids.length + ' รายการ' : 'เอาออกจากประเด็นแล้ว'),
  create: (name, ids) => rpc('sx_admin_save_cluster', {p_pass: session.pass, p_cluster: {name}}).then(r => aCall('sx_admin_assign', {p_ids: ids, p_cluster: r.id}, 'สร้างประเด็นและย้ายแล้ว ' + ids.length + ' รายการ')).catch(e => toast(e.message))
});
/* บอกแผงรายละเอียดว่าตอนนี้หน้ารายการแสดงข้อมูลชุดไหนอยู่ (ถ้าไม่ได้อยู่หน้ารายการ จะไม่เปิดแผง) */
if (window.SXD) SXD.setProvider(() => {
  if (!session) return null;
  if (session.role === 'admin' && A && A.d && A.tab === 'all' && A.view === 'list') return {entries: filteredEntries(), clusters: A.d.clusters, done: new Set(A.d.submissions.filter(x => x.done).map(x => x.wg)), own: '', admin: adminApi()};
  if (session.role === 'group' && G && G.tab === 'peer' && G.peer.loaded && G.peer.view === 'list') return {entries: peerList(), clusters: G.peer.clusters, done: new Set(G.peer.done.map(x => x.wg)), own: session.wg, admin: null};
  return null;
});
function mountGraph(who){
  const host = $('#gHost'); if (!host) return;
  if (!window.SXG){ host.innerHTML = '<div class="empty">โหลดโมดูลกราฟไม่สำเร็จ ลองสลับไปมุมมองรายการ</div>'; return; }
  try {
    if (who === 'peer') SXG.mount(host, {entries: peerList(), clusters: G.peer.clusters, done: new Set(G.peer.done.map(x => x.wg)), own: session.wg});
    else SXG.mount(host, {entries: filteredEntries(), clusters: A.d.clusters, done: new Set(A.d.submissions.filter(x => x.done).map(x => x.wg)), own: '', admin: adminApi()});
  } catch(e){ host.innerHTML = '<div class="empty">แสดงกราฟไม่ได้: ' + esc(e.message) + '</div>'; }
}
function renderGroup(keepFocus){
  if (keepFocus && document.activeElement && /TEXTAREA|SELECT|INPUT/.test(document.activeElement.tagName) && G.tab === 'fill') return;
  setTabs(GTABS, G.tab, 'data-tab', {vote: G.vote.open ? '<span class="live">เปิดอยู่</span>' : ''});
  view(`<div class="wrap">
    <h2>${esc(session.wg)}</h2>
    <p class="sub">ผู้กรอก: ${esc(session.author)}</p>
    <div id="pane">${G.tab === 'map' ? '<div id="smbHost"></div>' : G.tab === 'fill' ? fillHtml() : G.tab === 'peer' ? peerView() : voteHtml()}</div>${G.tab === 'map' ? '' : navBtns(GTABS, G.tab, 'data-tab')}</div>${G.tab === 'fill' ? barHtml() : ''}`);
  if (G.tab === 'map') mountMap();
  if (G.tab === 'peer' && G.peer.loaded && G.peer.view !== 'list') mountGraph('peer');
  if (window.SXD) SXD.refresh();
  grow();
}
function grow(){ $$('textarea.ta').forEach(t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }); }
const ent = k => G.entries.find(e => e._k === +k);
function refreshBar(){ const b = $('.savebar'); if (b){ const tmp = document.createElement('div'); tmp.innerHTML = barHtml(); b.replaceWith(tmp.firstChild); } }
function setSt(e){ const el = $(`.item[data-k="${e._k}"] [data-st]`); if (el){ const d = document.createElement('div'); d.innerHTML = itemHtml(e); el.innerHTML = $('[data-st]', d).innerHTML; } refreshBar(); }
function sched(e, now){
  if (!e.body.trim()) return;
  e._st = 'dirty'; setSt(e); clearTimeout(e._t);
  e._t = setTimeout(() => saveEntry(e), now ? 0 : 700);
}
async function saveEntry(e){
  if (e._saving){ e._again = true; return; }
  if (!e.body.trim()) return;
  e._saving = true; e._st = 'saving'; setSt(e);
  try {
    const r = await rpc('sx_save_entry', {p_pass: session.pass, p_entry: {id: e.id || null, wg: session.wg, author: session.author, kind: e.kind, body: e.body, detail: e.detail || '', priority: +e.priority || 2}});
    e.id = r.id; e._st = 'ok';
  } catch(err){ if (err.auth) return logout('เชื่อมต่อไม่สำเร็จ กรุณาเข้าใหม่อีกครั้ง'); e._st = 'err'; toast(err.message); }
  e._saving = false;
  if (e._again){ e._again = false; e._st = 'dirty'; return saveEntry(e); }
  setSt(e);
  const blk = $(`[data-block="${e.kind}"] .count`); if (blk) blk.textContent = G.entries.filter(x => x.kind === e.kind && x.body.trim()).length + ' รายการ';
}
async function delEntry(e){
  clearTimeout(e._t);
  if (!e.id){ G.entries = G.entries.filter(x => x !== e); return renderGroup(); }
  try { await rpc('sx_delete_entry', {p_pass: session.pass, p_id: e.id, p_wg: session.wg}); G.entries = G.entries.filter(x => x !== e); renderGroup(); toast('ลบแล้ว'); }
  catch(err){ toast(err.message); }
}
async function setDone(v){
  try { await rpc('sx_set_done', {p_pass: session.pass, p_wg: session.wg, p_by: session.author, p_done: v}); G.done = v; G.at = new Date().toISOString(); renderGroup(); toast(v ? 'ส่งให้ทีมยุทธศาสตร์แล้ว' : 'ยกเลิกสถานะส่งแล้ว'); }
  catch(err){ toast(err.message); }
}
function groupClick(t){
  const tab = t.closest('[data-tab]'); if (tab){ G.tab = tab.dataset.tab; if (G.tab === 'vote') loadVote(false).then(() => renderGroup()); else if (G.tab === 'peer'){ renderGroup(); loadPeer(); } else renderGroup(); return; }
  if (t.closest('[data-prefresh]')){ loadPeer(true); return; }
  const pv = t.closest('[data-pview]'); if (pv){ G.peer.view = pv.dataset.pview; renderGroup(); return; }
  const add = t.closest('[data-add]');
  if (add){ const e = {_k: ++kseq, kind: add.dataset.add, body: '', detail: '', priority: 2, _st: 'new'}; G.entries.push(e); renderGroup(); const el = $(`.item[data-k="${e._k}"] .f-body`); if (el) el.focus(); return; }
  const del = t.closest('[data-del]');
  if (del){ const e = ent(del.closest('.item').dataset.k); if (!e.body.trim() && !e.id) return delEntry(e);
    if (del.dataset.arm){ delEntry(e); return; }
    del.dataset.arm = 1; del.textContent = 'ยืนยันลบ'; del.style.padding = '0 .6rem'; del.style.color = 'var(--red)';
    setTimeout(() => { if (del.isConnected){ del.dataset.arm = ''; del.innerHTML = ico('trash'); del.style.padding = ''; del.style.color = ''; } }, 3000); return; }
  if (t.closest('[data-retry]')){ const e = ent(t.closest('.item').dataset.k); e._st = 'dirty'; saveEntry(e); return; }
  const vp = t.closest('[data-vp]'), vm = t.closest('[data-vm]');
  if (vp || vm){ const id = t.closest('.vcard').dataset.c, V = G.vote;
    if (vp && sumVals(V.mine) < V.dots) V.mine[id] = (V.mine[id] || 0) + 1;
    if (vm && V.mine[id] > 0) V.mine[id]--;
    V.dirty = true; renderGroup(); return; }
  const act = t.closest('[data-act]'); if (!act) return;
  const a = act.dataset.act;
  if (a === 'done' || a === 'undone' || a === 'vsubmit') act.classList.add('busy');
  if (a === 'done') setDone(true); else if (a === 'undone') setDone(false);
  else if (a === 'vsubmit'){
    const mine = {}; Object.entries(G.vote.mine).forEach(([k, v]) => { if (v > 0) mine[k] = v; });
    rpc('sx_vote_cast', {p_pass: session.pass, p_voter: voter(), p_votes: mine})
      .then(() => { G.vote.dirty = false; toast('ส่งคะแนนเรียบร้อย'); return loadVote(true); }).then(() => renderGroup()).catch(e => toast(e.message)); }
}
function groupInput(t){
  const it = t.closest('.item'); if (!it) return; const e = ent(it.dataset.k);
  if (t.classList.contains('f-body')) e.body = t.value; else if (t.classList.contains('f-detail')) e.detail = t.value; else if (t.classList.contains('f-pri')) e.priority = +t.value;
  if (t.tagName === 'TEXTAREA'){ t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }
  sched(e, t.tagName === 'SELECT');
}

/* ---------- กลุ่มงาน: ดูมุมมองของกลุ่มงานอื่น ---------- */
async function loadPeer(manual){
  try {
    const r = await rpc('sx_peer_view', {p_pass: session.pass});
    Object.assign(G.peer, {entries: r.entries || [], clusters: r.clusters || [], done: r.done || [], loaded: true, at: new Date()});
    if (G.tab === 'peer') renderGroup(); if (manual) toast('อัปเดตแล้ว');
  } catch(e){ if (e.auth) return logout('เชื่อมต่อไม่สำเร็จ กรุณาเข้าใหม่อีกครั้ง'); toast(e.message); }
}
function peerList(){
  const P = G.peer, f = P.f, q = f.q.trim().toLowerCase();
  return P.entries.filter(e => (!f.wg || e.wg === f.wg) && (!f.kind || e.kind === f.kind) && (!q || ((e.body || '') + ' ' + (e.detail || '')).toLowerCase().includes(q)));
}
function peerView(){
  const P = G.peer; if (!P.loaded) return loading('กำลังโหลดมุมมองของกลุ่มงานอื่น…');
  const f = P.f, q = f.q.trim().toLowerCase(), doneSet = new Set(P.done.map(x => x.wg));
  const cn = id => (P.clusters.find(c => c.id === id) || {}).name || '';
  const byWg = {}; P.entries.forEach(e => (byWg[e.wg] = byWg[e.wg] || []).push(e));
  const wgs = Object.keys(byWg).sort(thSort);
  const list = peerList();
  const li = e => `<div class="li" ${liAttr(e)}><p>${esc(e.body)}</p>${e.detail ? `<p class="muted small">${esc(e.detail)}</p>` : ''}<div class="meta"><button type="button" class="chip" data-og="${esc(e.wg)}">${esc(short(e.wg))}</button>${['ISSUE','IDEA'].includes(e.kind) ? `<span>· ${PRI[e.priority]}</span>` : ''}${e.wg === session.wg ? '<span class="chip own">กลุ่มของท่าน</span>' : ''}${e.cluster_id && cn(e.cluster_id) ? `<button type="button" class="chip" data-oc="${esc(e.cluster_id)}">${esc(cn(e.cluster_id))}</button>` : ''}</div></div>`;
  const of = k => list.filter(e => e.kind === k).sort((a, b) => b.priority - a.priority);
  const card = k => `<div class="card ${k}"><h3><span class="pill ${k}">${KIND[k]}</span><span class="count">${of(k).length}</span></h3>${of(k).map(li).join('') || '<p class="muted small">ไม่มีรายการ</p>'}</div>`;
  return `<div class="sum"><div><b>${wgs.length}</b><span>กลุ่มงานที่เริ่มกรอกแล้ว</span></div><div><b>${P.done.length}</b><span>กลุ่มงานที่ส่งแล้ว</span></div><div><b>${P.entries.length}</b><span>รายการทั้งหมด</span></div></div>
  <div class="filters">
    <select class="select" data-pf="wg" aria-label="กรองตามกลุ่มงาน"><option value="">ทุกกลุ่มงาน</option>${wgs.map(g => `<option value="${esc(g)}"${f.wg === g ? ' selected' : ''}>${esc(g)} (${byWg[g].length}${doneSet.has(g) ? ' · ส่งแล้ว' : ''})</option>`).join('')}</select>
    <select class="select" data-pf="kind" aria-label="กรองตามประเภท"><option value="">ทุกประเภท</option>${KORDER.map(k => `<option value="${k}"${f.kind === k ? ' selected' : ''}>${KIND[k]}</option>`).join('')}</select>
    <input class="input" data-pf="q" type="search" placeholder="ค้นหาคำ" value="${esc(f.q)}" aria-label="ค้นหา">
    <span class="muted small">${list.length} รายการ</span>${viewSw(P.view, 'data-pview')}<button class="btn sm" data-prefresh>${ico('refresh')}อัปเดต</button></div>
  ${!P.entries.length ? '<div class="empty">ยังไม่มีกลุ่มงานใดกรอกข้อมูล เมื่อมีคนกรอก จะแสดงที่นี่</div>' :
    P.view !== 'list' ? '<div id="gHost" class="ghost"></div>' :
    f.kind ? `<div class="card ${f.kind}">${of(f.kind).map(li).join('') || '<p class="muted small">ไม่มีรายการ</p>'}</div>` :
    `<div class="quad">${['S','W','O','T'].map(card).join('')}</div><div class="quad">${['ISSUE','IDEA'].map(card).join('')}</div><div class="card DATA" style="margin-bottom:1.5rem"><h3><span class="pill DATA">${KIND.DATA}</span><span class="count">${of('DATA').length}</span></h3>${of('DATA').map(li).join('') || '<p class="muted small">ไม่มีรายการ</p>'}</div>`}`;
}

/* ---------- ทีมยุทธศาสตร์ ---------- */
const ATABS = [['map','แผนที่ยุทธศาสตร์'],['over','ภาพรวมการส่ง'],['all','ข้อมูลทั้งหมด'],['group','จัดกลุ่มประเด็น'],['vote','โหวตและจัดลำดับ'],['exp','ส่งออกและพิมพ์']];
async function enterAdmin(){
  A = {d: null, tab: 'map', view: 'graph', f: {wg: '', kind: '', q: '', cl: ''}, sel: new Set(), pk: new Set(['ISSUE','IDEA']), onlyFree: true, newName: '', at: null};
  shell(whoHtml()); view(loading('กำลังโหลดข้อมูลภาพรวม…'));
  if (!await loadAdmin()) return;
  renderAdmin();
  A.poll = setInterval(async () => {
    const act = document.activeElement;
    if (act && /TEXTAREA|SELECT|INPUT/.test(act.tagName)) return;
    if (await loadAdmin(true)){ if (A.tab === 'map') setTabs(ATABS, A.tab, 'data-atab', {vote: A.d.settings.voting_open === '1' ? '<span class="live">เปิดอยู่</span>' : ''}); else renderAdmin(); }
  }, 15000);
}
async function loadAdmin(quiet){
  try { A.d = await rpc('sx_admin_all', {p_pass: session.pass}); A.at = new Date(); return true; }
  catch(e){
    if (e.auth){ logout('รหัสผ่านทีมยุทธศาสตร์ไม่ถูกต้องหรือถูกเปลี่ยนแล้ว'); return false; }
    if (quiet){ toast(e.message); return false; }
    view(`<div class="wrap"><div class="empty">${esc(e.message)}<p><button class="btn" data-act="reload" style="margin-top:1rem">ลองใหม่</button></p></div></div>`); return false;
  }
}
const clName = id => { const c = A.d.clusters.find(x => x.id === id); return c ? c.name : ''; };
function allGroups(){
  if (session && session.demo && window.DEMO) return DEMO.groups();
  const s = new Set([...(CFG.WORK_GROUPS || []), ...A.d.entries.map(e => e.wg), ...A.d.submissions.map(x => x.wg)]);
  return [...s];
}
function clStats(){
  const m = {}; A.d.clusters.forEach(c => m[c.id] = {items: 0, groups: new Set(), total: 0, voters: 0, pri: 0});
  A.d.entries.forEach(e => { const s = m[e.cluster_id]; if (s){ s.items++; s.groups.add(e.wg); s.pri += e.priority; } });
  A.d.votes.forEach(v => { const s = m[v.cluster_id]; if (s){ s.total = v.total; s.voters = v.voters; } });
  return m;
}
function rankList(){
  const st = clStats();
  return A.d.clusters.map(c => ({c, s: st[c.id]})).sort((a, b) => b.s.total - a.s.total || b.s.groups.size - a.s.groups.size || a.c.name.localeCompare(b.c.name, 'th'));
}
function dotsHtml(n, color, cap = 40){
  const k = Math.min(n, cap);
  return Array.from({length: k}, () => `<span class="dot" style="background:${color || 'var(--amber)'}"></span>`).join('') + (n > cap ? `<span class="muted small">+${n - cap}</span>` : '');
}
function entryLi(e, showCl = true){
  return `<div class="li" ${liAttr(e)}><p>${esc(e.body)}</p>${e.detail ? `<p class="muted small">${esc(e.detail)}</p>` : ''}
    <div class="meta"><button type="button" class="chip" data-og="${esc(e.wg)}">${esc(short(e.wg))}</button>${['ISSUE','IDEA'].includes(e.kind) ? `<span>· ${PRI[e.priority]}</span>` : ''}
    ${showCl && e.cluster_id ? `<button type="button" class="chip" data-oc="${esc(e.cluster_id)}">${esc(clName(e.cluster_id))}</button>` : ''}</div></div>`;
}

function overView(){
  const d = A.d, subs = Object.fromEntries(d.submissions.map(s => [s.wg, s]));
  const groups = allGroups();
  const rows = groups.map(g => {
    const es = d.entries.filter(e => e.wg === g), c = {}; KORDER.forEach(k => c[k] = es.filter(e => e.kind === k).length);
    const sub = subs[g], status = sub && sub.done ? 'done' : es.length ? 'prog' : 'none';
    return {g, c, n: es.length, status, at: sub && sub.done ? sub.submitted_at : null, by: sub && sub.submitted_by};
  }).sort((a, b) => ({done: 0, prog: 1, none: 2}[a.status] - {done: 0, prog: 1, none: 2}[b.status]) || a.g.localeCompare(b.g, 'th'));
  const nDone = rows.filter(r => r.status === 'done').length, free = d.entries.filter(e => !e.cluster_id).length;
  const tot = {}; KORDER.forEach(k => tot[k] = d.entries.filter(e => e.kind === k).length);
  const label = {done: 'ส่งแล้ว', prog: 'กำลังกรอก', none: 'ยังไม่เริ่ม'};
  return `<div class="sum"><div><b>${nDone}/${groups.length}</b><span>กลุ่มงานที่ส่งแล้ว</span></div><div><b>${d.entries.length}</b><span>รายการทั้งหมด</span></div><div><b>${free}</b><span>ยังไม่จัดเข้าประเด็น</span></div><div><b>${d.clusters.length}</b><span>ประเด็นรวม</span></div></div>
  <div class="tw"><table><thead><tr><th>กลุ่มงาน</th>${KORDER.map(k => `<th class="n">${KIND[k]}</th>`).join('')}<th>สถานะ</th><th>ส่งเมื่อ</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td>${esc(r.g)}</td>${KORDER.map(k => `<td class="n ${r.c[k] ? '' : 'zero'}">${r.c[k]}</td>`).join('')}<td><span class="stat ${r.status}">${label[r.status]}</span></td><td class="small muted">${r.at ? fmt(r.at) + (r.by ? ' · ' + esc(r.by) : '') : '–'}</td></tr>`).join('')}
  </tbody><tfoot><tr><td>รวม</td>${KORDER.map(k => `<td class="n">${tot[k]}</td>`).join('')}<td></td><td></td></tr></tfoot></table></div>`;
}

function filteredEntries(){
  const f = A.f, q = f.q.trim().toLowerCase();
  return A.d.entries.filter(e => (!f.wg || e.wg === f.wg) && (!f.kind || e.kind === f.kind) &&
    (!f.cl || (f.cl === '_none' ? !e.cluster_id : e.cluster_id === f.cl)) &&
    (!q || (e.body + ' ' + e.detail).toLowerCase().includes(q)));
}
function allView(){
  const list = filteredEntries();
  const byKind = k => list.filter(e => e.kind === k).sort((a, b) => b.priority - a.priority);
  const card = k => `<div class="card ${k}"><h3><span class="pill ${k}">${KIND[k]}</span><span class="count muted small" style="margin-left:auto">${byKind(k).length}</span></h3>${byKind(k).map(e => entryLi(e)).join('') || '<p class="muted small">ไม่มีรายการ</p>'}</div>`;
  const groups = allGroups().sort((a, b) => a.localeCompare(b, 'th'));
  return `<div class="filters">
    <select class="select" data-f="wg" aria-label="กรองตามกลุ่มงาน"><option value="">ทุกกลุ่มงาน</option>${groups.map(g => `<option value="${esc(g)}"${A.f.wg === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>
    <select class="select" data-f="kind" aria-label="กรองตามประเภท"><option value="">ทุกประเภท</option>${KORDER.map(k => `<option value="${k}"${A.f.kind === k ? ' selected' : ''}>${KIND[k]}</option>`).join('')}</select>
    <select class="select" data-f="cl" aria-label="กรองตามประเด็น"><option value="">ทุกประเด็น</option><option value="_none"${A.f.cl === '_none' ? ' selected' : ''}>ยังไม่จัดกลุ่ม</option>${A.d.clusters.map(c => `<option value="${esc(c.id)}"${A.f.cl === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <input class="input" data-f="q" type="search" placeholder="ค้นหาคำ" value="${esc(A.f.q)}" aria-label="ค้นหา">
    <span class="muted small">${list.length} รายการ</span>${viewSw(A.view, 'data-aview')}</div>
  ${A.view !== 'list' ? '<div id="gHost" class="ghost"></div>' : A.f.kind ? `<div class="card ${A.f.kind}">${byKind(A.f.kind).map(e => entryLi(e)).join('') || '<p class="muted small">ไม่มีรายการ</p>'}</div>` :
   `<div class="quad">${['S','W','O','T'].map(card).join('')}</div><div class="quad">${['ISSUE','IDEA'].map(card).join('')}</div><div class="card DATA" style="margin-bottom:1.5rem"><h3><span class="pill DATA">${KIND.DATA}</span></h3>${byKind('DATA').map(e => entryLi(e, false)).join('') || '<p class="muted small">ไม่มีรายการ</p>'}</div>`}`;
}

function groupTabView(){
  const d = A.d, st = clStats();
  const pool = d.entries.filter(e => A.pk.has(e.kind) && (!A.onlyFree || !e.cluster_id)).sort((a, b) => b.priority - a.priority || a.wg.localeCompare(b.wg, 'th'));
  const sel = [...A.sel].filter(id => d.entries.some(e => e.id === id));
  if (A.simSort && sel.length && window.SXD){                       // เรียงให้รายการที่ถ้อยคำใกล้กับที่เลือกอยู่บนสุด (แม้ผู้กรอกใช้คำต่างกัน)
    const picks = d.entries.filter(e => A.sel.has(e.id)), score = e => A.sel.has(e.id) ? 2 : Math.max(...picks.map(p => SXD.sim(p, e)));
    const sc = new Map(pool.map(e => [e.id, score(e)])); pool.sort((x, y) => sc.get(y.id) - sc.get(x.id));
  }
  const poolHtml = pool.map(e => `<label class="pitem"><input type="checkbox" data-sel="${esc(e.id)}"${A.sel.has(e.id) ? ' checked' : ''}><span class="b"><span><span class="pill ${e.kind}">${KIND[e.kind]}</span> ${esc(e.body)}</span>${e.detail ? `<span class="d">${esc(e.detail)}</span>` : ''}<span class="muted small">${esc(short(e.wg))}${['ISSUE','IDEA'].includes(e.kind) ? ' · ' + PRI[e.priority] : ''}${e.cluster_id ? ' · ' + esc(clName(e.cluster_id)) : ''}</span></span></label>`).join('');
  const clHtml = d.clusters.map(c => {
    const s = st[c.id], items = d.entries.filter(e => e.cluster_id === c.id);
    return `<div class="cl" data-cid="${esc(c.id)}">
      <div class="cl-top"><input class="name" data-cname value="${esc(c.name)}" maxlength="200" aria-label="ชื่อประเด็น"><button class="icon-btn" data-cdel aria-label="ลบประเด็น" title="ลบประเด็น">${ico('trash')}</button></div>
      <textarea class="cnote" data-cnote maxlength="1000" rows="1" placeholder="คำอธิบายประเด็น (ไม่บังคับ)" aria-label="คำอธิบายประเด็น">${esc(c.note)}</textarea>
      <div class="cl-meta"><span>${s.items} รายการ</span><span>${s.groups.size} กลุ่มงาน</span><span>คะแนนโหวต ${s.total}</span></div>
      <div class="cl-items">${items.map(e => `<div class="row"><div><span class="pill ${e.kind}">${KIND[e.kind]}</span> ${esc(e.body)}<div class="muted small">${esc(short(e.wg))}</div></div><button class="icon-btn neutral" data-unassign="${esc(e.id)}" aria-label="เอาออกจากประเด็น" title="เอาออกจากประเด็นนี้">${ico('x')}</button></div>`).join('') || '<p class="muted small" style="padding:.4rem">ยังไม่มีรายการ</p>'}</div></div>`;
  }).join('');
  return `<div class="split">
    <section><div class="pane-h"><h2>รายการจากกลุ่มงาน</h2><span class="muted small">${pool.length} รายการ</span></div>
      <div class="toggles" style="margin-bottom:.75rem">${KORDER.map(k => `<button class="tg" data-pk="${k}" aria-pressed="${A.pk.has(k)}">${KIND[k]}</button>`).join('')}<button class="tg" data-free aria-pressed="${A.onlyFree}">เฉพาะที่ยังไม่จัดกลุ่ม</button><button class="tg" data-simsort aria-pressed="${!!A.simSort}" title="เรียงรายการที่ถ้อยคำใกล้เคียงกับที่เลือกไว้ขึ้นก่อน">เรียงตามความคล้ายกับที่เลือก</button></div>
      <div class="card pool"><div class="act"><button class="btn sm" data-selall>เลือกทั้งหมดที่เห็น</button><button class="btn sm" data-selnone>ล้างที่เลือก</button><span class="muted small">เลือก ${sel.length}</span>
        <select class="select" data-target aria-label="ย้ายไปประเด็น"><option value="">ย้ายไปประเด็น…</option>${d.clusters.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select><button class="btn sm pri" data-move ${sel.length ? '' : 'disabled'}>ย้าย</button>
        <input class="input" data-newname placeholder="หรือตั้งชื่อประเด็นใหม่" value="${esc(A.newName)}" maxlength="200" aria-label="ชื่อประเด็นใหม่"><button class="btn sm pri" data-newcl ${sel.length ? '' : 'disabled'}>${ico('plus')}สร้างและย้าย</button></div>
      ${poolHtml || '<p class="muted" style="padding:1.5rem 0">ไม่มีรายการตามตัวกรอง</p>'}</div></section>
    <section><div class="pane-h"><h2>ประเด็นรวม</h2><span class="muted small">${d.clusters.length} ประเด็น</span><button class="btn sm" data-addcl>${ico('plus')}ประเด็นเปล่า</button></div>
      ${clHtml || '<div class="empty">ยังไม่มีประเด็น เลือกรายการทางซ้ายแล้วกด “สร้างและย้าย”</div>'}</section></div>`;
}

function voteTabView(){
  const d = A.d, open = d.settings.voting_open === '1', rk = rankList(), mx = Math.max(1, ...rk.map(r => r.s.total));
  return `<div class="ctl"><span class="switch"><span class="pulse ${open ? '' : 'off'}"></span>${open ? 'เปิดรับโหวตอยู่' : 'ปิดรับโหวต'}</span>
    <button class="btn ${open ? '' : 'pri'}" data-vopen="${open ? 0 : 1}">${open ? 'ปิดโหวต' : 'เปิดโหวต'}</button>
    <label>จุดต่อคน <input class="input" id="dots" type="number" min="1" max="20" value="${esc(d.settings.dots)}"></label>
    <button class="btn" data-vdots>บันทึกจำนวนจุด</button>
    <button class="btn danger" data-vreset style="margin-left:auto">ล้างคะแนนทั้งหมด</button></div>
  <div class="live-row"><span class="pulse ${open ? '' : 'off'}"></span><span>${d.voters_total} คนลงคะแนนแล้ว · อัปเดตอัตโนมัติทุก 15 วินาที${A.at ? ' · ล่าสุด ' + A.at.toLocaleTimeString('th-TH') : ''}</span></div>
  <div style="height:1rem"></div>
  ${rk.length ? `<div class="rank">${rk.map((r, i) => `<div class="rrow"><span class="no">${i + 1}</span><div><b>${esc(r.c.name)}</b>${r.c.note ? `<div class="muted small">${esc(r.c.note)}</div>` : ''}</div>
    <div class="rbar" title="${r.s.total} จุด" style="opacity:${r.s.total ? 1 : .35}">${r.s.total ? dotsHtml(r.s.total, 'var(--amber)', 60) : '<span class="muted small">ยังไม่มีคะแนน</span>'}</div>
    <div class="rmeta"><b style="color:var(--ink);font-size:1.1rem">${r.s.total}</b> จุด · ${r.s.voters} คน<br>${r.s.items} รายการ / ${r.s.groups.size} กลุ่มงาน</div></div>`).join('')}</div>`
    : '<div class="empty">ยังไม่มีประเด็นให้ลงคะแนน ไปที่แท็บ “จัดกลุ่มประเด็น” ก่อน</div>'}`;
}

function csvEntries(){
  const rows = [['กลุ่มงาน','ผู้กรอก','ประเภท','ข้อความ','รายละเอียด','ความสำคัญ','ประเด็นรวม','สร้างเมื่อ']];
  [...A.d.entries].sort((a, b) => a.wg.localeCompare(b.wg, 'th') || KORDER.indexOf(a.kind) - KORDER.indexOf(b.kind))
    .forEach(e => rows.push([e.wg, e.author, KIND[e.kind], e.body, e.detail, ['ISSUE','IDEA'].includes(e.kind) ? PRI[e.priority] : '', clName(e.cluster_id), e.created_at]));
  return toCSV(rows);
}
function csvRank(){
  const rows = [['อันดับ','ประเด็น','คำอธิบาย','คะแนนโหวต','จำนวนผู้โหวต','จำนวนรายการ','จำนวนกลุ่มงาน']];
  rankList().forEach((r, i) => rows.push([i + 1, r.c.name, r.c.note, r.s.total, r.s.voters, r.s.items, r.s.groups.size]));
  return toCSV(rows);
}
function printSummary(){
  const d = A.d, rk = rankList(), subs = d.submissions.filter(s => s.done).length;
  const sec = k => { const l = d.entries.filter(e => e.kind === k); return l.length ? `<h2>${KIND[k]} (${l.length})</h2><ul>${l.map(e => `<li>${esc(e.body)} <small>(${esc(short(e.wg))})</small></li>`).join('')}</ul>` : ''; };
  $('#printArea').innerHTML = `<img src="assets/logo.png" alt="" style="height:64px;margin-bottom:8px"><h1>สรุปมุมมองกลุ่มงาน · แผนยุทธศาสตร์ โรงพยาบาลสันทราย</h1>
    <p>พิมพ์เมื่อ ${fmt(new Date().toISOString())} · ส่งแล้ว ${subs} กลุ่มงาน · ${d.entries.length} รายการ · ผู้ลงคะแนน ${d.voters_total} คน</p>
    <h2>ลำดับประเด็นตามคะแนนโหวต</h2>${rk.length ? `<table><thead><tr><th>#</th><th>ประเด็น</th><th class="n">คะแนน</th><th class="n">ผู้โหวต</th><th class="n">รายการ</th><th class="n">กลุ่มงาน</th></tr></thead><tbody>
    ${rk.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.c.name)}</td><td class="n">${r.s.total}</td><td class="n">${r.s.voters}</td><td class="n">${r.s.items}</td><td class="n">${r.s.groups.size}</td></tr>`).join('')}</tbody></table>` : '<p>ยังไม่มีประเด็น</p>'}
    ${['S','W','O','T','ISSUE','IDEA'].map(sec).join('')}`;
  setTimeout(() => window.print(), 80);
}
function expView(){
  return `<div class="exp"><div class="card"><div><b>รายการทั้งหมดจากทุกกลุ่มงาน</b><p class="muted small">ไฟล์ CSV เปิดด้วย Excel ได้ ภาษาไทยไม่เพี้ยน</p></div><button class="btn pri" data-exp="entries">${ico('download')}ดาวน์โหลด CSV</button></div>
    <div class="card"><div><b>ลำดับประเด็นและคะแนนโหวต</b><p class="muted small">ใช้ต่อในการสังเคราะห์วิสัยทัศน์ พันธกิจ และผลลัพธ์สุขภาพ</p></div><button class="btn pri" data-exp="rank">${ico('download')}ดาวน์โหลด CSV</button></div>
    <div class="card"><div><b>สรุปสำหรับพิมพ์</b><p class="muted small">อันดับประเด็น พร้อม SWOT ประเด็น และข้อเสนอ</p></div><button class="btn" data-exp="print">${ico('print')}พิมพ์ / บันทึกเป็น PDF</button></div></div>`;
}
function renderAdmin(){
  const body = A.tab === 'map' ? '<div id="smbHost"></div>' : {over: overView, all: allView, group: groupTabView, vote: voteTabView, exp: expView}[A.tab]();
  const open = A.d.settings.voting_open === '1';
  setTabs(ATABS, A.tab, 'data-atab', {vote: open ? '<span class="live">เปิดอยู่</span>' : ''});
  view(`<div class="wrap"><h2>ภาพรวมของทีมยุทธศาสตร์</h2>
    <div class="live-row"><span class="pulse ${open ? '' : 'off'}"></span><span>ข้อมูลอัปเดตอัตโนมัติ · ล่าสุด ${A.at.toLocaleTimeString('th-TH')}</span><button class="btn sm" data-act="refresh">${ico('refresh')}รีเฟรช</button></div>
    <div id="pane">${body}</div>${A.tab === 'map' ? '' : navBtns(ATABS, A.tab, 'data-atab')}</div>`);
  if (A.tab === 'map') mountMap();
  if (A.tab === 'all' && A.view !== 'list') mountGraph('admin');
  if (window.SXD) SXD.refresh();
  $$('textarea.cnote').forEach(t => { t.style.height = 'auto'; t.style.height = Math.max(36, t.scrollHeight) + 'px'; });
}
async function aCall(fn, body, okMsg){
  try { const r = await rpc(fn, {p_pass: session.pass, ...body}); if (okMsg) toast(okMsg); await loadAdmin(true); renderAdmin(); return r; }
  catch(e){ if (e.auth) return logout('รหัสผ่านทีมยุทธศาสตร์ไม่ถูกต้องหรือถูกเปลี่ยนแล้ว'); toast(e.message); }
}
function adminClick(t){
  const tab = t.closest('[data-atab]'); if (tab){ A.tab = tab.dataset.atab; return renderAdmin(); }
  const av = t.closest('[data-aview]'); if (av){ A.view = av.dataset.aview; return renderAdmin(); }
  const pk = t.closest('[data-pk]'); if (pk){ const k = pk.dataset.pk; A.pk.has(k) ? A.pk.delete(k) : A.pk.add(k); return renderAdmin(); }
  if (t.closest('[data-free]')){ A.onlyFree = !A.onlyFree; return renderAdmin(); }
  if (t.closest('[data-simsort]')){ A.simSort = !A.simSort; return renderAdmin(); }
  if (t.closest('[data-selnone]')){ A.sel.clear(); return renderAdmin(); }
  if (t.closest('[data-selall]')){ $$('[data-sel]').forEach(c => A.sel.add(c.dataset.sel)); return renderAdmin(); }
  if (t.closest('[data-move]')){ const to = $('[data-target]').value; if (!to) return toast('เลือกประเด็นปลายทางก่อน'); const ids = [...A.sel]; A.sel.clear(); return aCall('sx_admin_assign', {p_ids: ids, p_cluster: to}, 'ย้ายแล้ว ' + ids.length + ' รายการ'); }
  if (t.closest('[data-newcl]')){
    const name = ($('[data-newname]').value || '').trim(); if (!name) return toast('ตั้งชื่อประเด็นใหม่ก่อน');
    const ids = [...A.sel]; A.sel.clear(); A.newName = '';
    return rpc('sx_admin_save_cluster', {p_pass: session.pass, p_cluster: {name}}).then(r => aCall('sx_admin_assign', {p_ids: ids, p_cluster: r.id}, 'สร้างประเด็นและย้ายแล้ว')).catch(e => toast(e.message)); }
  if (t.closest('[data-addcl]')){ const name = prompt('ชื่อประเด็นใหม่'); if (name && name.trim()) return aCall('sx_admin_save_cluster', {p_cluster: {name: name.trim()}}, 'สร้างประเด็นแล้ว'); return; }
  const un = t.closest('[data-unassign]'); if (un) return aCall('sx_admin_assign', {p_ids: [un.dataset.unassign], p_cluster: null});
  const cd = t.closest('[data-cdel]');
  if (cd){ if (cd.dataset.arm){ return aCall('sx_admin_delete_cluster', {p_id: cd.closest('.cl').dataset.cid}, 'ลบประเด็นแล้ว (รายการกลับไปเป็นยังไม่จัดกลุ่ม)'); }
    cd.dataset.arm = 1; cd.textContent = 'ยืนยันลบ'; cd.style.padding = '0 .6rem'; cd.style.color = 'var(--red)';
    setTimeout(() => { if (cd.isConnected){ cd.dataset.arm = ''; cd.innerHTML = ico('trash'); cd.style.padding = ''; cd.style.color = ''; } }, 3000); return; }
  const vo = t.closest('[data-vopen]'); if (vo) return aCall('sx_admin_set_voting', {p_open: vo.dataset.vopen === '1', p_dots: +A.d.settings.dots}, vo.dataset.vopen === '1' ? 'เปิดโหวตแล้ว' : 'ปิดโหวตแล้ว');
  if (t.closest('[data-vdots]')){ const n = Math.max(1, Math.min(20, parseInt($('#dots').value, 10) || 5)); return aCall('sx_admin_set_voting', {p_open: A.d.settings.voting_open === '1', p_dots: n}, 'บันทึกแล้ว ' + n + ' จุดต่อคน'); }
  const vr = t.closest('[data-vreset]');
  if (vr){ if (vr.dataset.arm) return aCall('sx_admin_reset_votes', {}, 'ล้างคะแนนแล้ว'); vr.dataset.arm = 1; vr.textContent = 'กดอีกครั้งเพื่อยืนยันล้างคะแนน';
    setTimeout(() => { if (vr.isConnected){ vr.dataset.arm = ''; vr.textContent = 'ล้างคะแนนทั้งหมด'; } }, 3500); return; }
  const ex = t.closest('[data-exp]');
  if (ex){ const k = ex.dataset.exp, day = new Date().toISOString().slice(0, 10);
    if (k === 'entries') download(`sx-entries-${day}.csv`, csvEntries(), 'text/csv;charset=utf-8');
    else if (k === 'rank') download(`sx-ranking-${day}.csv`, csvRank(), 'text/csv;charset=utf-8');
    else printSummary(); return; }
  const act = t.closest('[data-act]');
  if (act && act.dataset.act === 'refresh') loadAdmin(true).then(ok => ok && renderAdmin());
}
function adminChange(t){
  if (t.dataset.sel){ t.checked ? A.sel.add(t.dataset.sel) : A.sel.delete(t.dataset.sel); if (A.simSort) return renderAdmin(); const c = $('.act .muted'); if (c) c.textContent = 'เลือก ' + A.sel.size; $$('[data-move],[data-newcl]').forEach(b => b.disabled = !A.sel.size); return; }
  if (t.dataset.f){ A.f[t.dataset.f] = t.value; return renderAdmin(); }
  const cl = t.closest('.cl');
  if (cl && (t.hasAttribute('data-cname') || t.hasAttribute('data-cnote'))){
    const c = A.d.clusters.find(x => x.id === cl.dataset.cid); if (!c) return;
    const name = $('[data-cname]', cl).value.trim(), note = $('[data-cnote]', cl).value.trim();
    if (!name){ $('[data-cname]', cl).value = c.name; return toast('ชื่อประเด็นต้องไม่ว่าง'); }
    if (name === c.name && note === c.note) return;
    rpc('sx_admin_save_cluster', {p_pass: session.pass, p_cluster: {id: c.id, name, note}}).then(() => { c.name = name; c.note = note; toast('บันทึกแล้ว'); }).catch(e => toast(e.message));
  }
}

/* ---------- ตัวเชื่อมเหตุการณ์และเริ่มระบบ ---------- */
let qT;
document.addEventListener('click', e => {
  const t = e.target; if (!(t instanceof Element)) return;
  const lm = t.closest('[data-lmode]'); if (lm){ readDraft(); loginMode = lm.dataset.lmode; loginErr = ''; return loginView(); }
  const dm = t.closest('[data-demo]'); if (dm) return startDemo(dm.dataset.demo);
  if (t.closest('[data-tab],[data-atab]')) animNext = true;
  const a = t.closest('[data-act]');
  if (a && a.dataset.act === 'demoreset'){ if (session && session.demo){ if (window.SMB && SMB.reset) SMB.reset(); DEMO.reset(session.role); animNext = true; toast('รีเซ็ตข้อมูลตัวอย่างแล้ว'); boot(); } return; }
  if (a && a.dataset.act === 'logout') return logout();
  if (a && a.dataset.act === 'reload') return boot();
  if (session && session.role === 'admin' && A) adminClick(t); else if (session && G) groupClick(t);
});
document.addEventListener('submit', e => { if (e.target.id === 'f1') onLogin1(e); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'wg'){ $('#wgo').hidden = t.value !== '__other'; if (t.value === '__other') $('#wgt').focus(); return; }
  if (G && session && session.role === 'group'){
    if (t.dataset.pf === 'q'){ clearTimeout(qT); const v = t.value; qT = setTimeout(() => { G.peer.f.q = v; renderGroup(); const x = $('[data-pf=q]'); if (x){ x.focus(); x.setSelectionRange(v.length, v.length); } }, 300); return; }
    groupInput(t); }
  else if (A && t.matches('[data-newname]')) A.newName = t.value;
  else if (A && t.dataset.f === 'q'){ clearTimeout(qT); const v = t.value; qT = setTimeout(() => { A.f.q = v; renderAdmin(); const q = $('[data-f=q]'); if (q){ q.focus(); q.setSelectionRange(v.length, v.length); } }, 300); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'wg'){ $('#wgo').hidden = t.value !== '__other'; return; }
  if (G && session && session.role === 'group'){ if (t.dataset.pf && t.dataset.pf !== 'q'){ G.peer.f[t.dataset.pf] = t.value; renderGroup(); } else if (t.classList.contains('f-pri')) groupInput(t); return; }
  if (A) adminChange(t);
});
function boot(){
  animNext = true;
  if (G) clearInterval(G.poll); if (A) clearInterval(A.poll);
  if (!session){ loginView(); return; }
  if (session.role === 'admin') enterAdmin(); else enterGroup();
}
const T0 = performance.now();
function hideSplash(){
  const sp = $('#splash'); if (!sp) return;
  setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 600); }, Math.max(0, 1150 - (performance.now() - T0)));
}
boot();
hideSplash();
