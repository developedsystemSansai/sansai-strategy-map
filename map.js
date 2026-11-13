/* แผนที่ยุทธศาสตร์ (Strategy Map Builder) ฝังในระบบ — ทุกคนดูได้ ทีมยุทธศาสตร์แก้ไขได้ */
(function(){
/* ================= ค่าคงที่ ================= */
const PERS = [
  {id:'outcome', code:'H', name:'ผลลัพธ์ทางสุขภาพ / พันธกิจ', q:'ประชาชนในพื้นที่มีสุขภาพดีขึ้นอย่างไร', color:'#0f766e', tint:'#e7f4f1', level:4,
   kpi:['ร้อยละผู้ป่วยเบาหวานที่ควบคุมระดับน้ำตาลได้','อัตราตายด้วยโรคหลอดเลือดสมอง']},
  {id:'customer', code:'C', name:'ผู้รับบริการและผู้มีส่วนได้ส่วนเสีย', q:'ผู้ป่วย ชุมชน ภาคีเครือข่าย ต้องการคุณค่าอะไร', color:'#1d4ed8', tint:'#eaf0fd', level:3,
   kpi:['ความพึงพอใจผู้รับบริการ','ระยะเวลารอคอย OPD']},
  {id:'finance', code:'F', name:'การเงินและทรัพยากร', q:'ใช้งบประมาณและทรัพยากรอย่างคุ้มค่าและยั่งยืนอย่างไร', color:'#b45309', tint:'#fdf3e7', level:2,
   kpi:['ระดับวิกฤตการเงิน (Risk Score)','ต้นทุนต่อหน่วยบริการ']},
  {id:'process', code:'P', name:'กระบวนการภายใน', q:'ต้องเก่งกระบวนการใด (คุณภาพ ความปลอดภัย การส่งต่อ การป้องกันโรค)', color:'#6d28d9', tint:'#f2edfc', level:1,
   kpi:['ความครอบคลุมการคัดกรอง','อุบัติการณ์ความเสี่ยงระดับรุนแรง (E–I)']},
  {id:'learning', code:'L', name:'การเรียนรู้และพัฒนา', q:'บุคลากร ระบบสารสนเทศ วัฒนธรรมความปลอดภัย พร้อมแค่ไหน', color:'#4d7c0f', tint:'#eff6e5', level:0,
   kpi:['อัตราการคงอยู่ของบุคลากร','ชั่วโมงพัฒนาบุคลากรต่อคน']}
];
const PGROUPS = [
  {id:'pp',  name:'ส่งเสริมสุขภาพและป้องกันโรค (P&P)'},
  {id:'ps',  name:'บริการรักษาพยาบาลที่มีคุณภาพและปลอดภัย'},
  {id:'ref', name:'ระบบส่งต่อและเครือข่ายบริการ'},
  {id:'gov', name:'การบริหารจัดการและธรรมาภิบาล'}
];
const EXC = [
  {id:'ppp', name:'PP&P Excellence', th:'ส่งเสริมสุขภาพ ป้องกันโรค คุ้มครองผู้บริโภค'},
  {id:'service', name:'Service Excellence', th:'บริการเป็นเลิศ'},
  {id:'people', name:'People Excellence', th:'บุคลากรเป็นเลิศ'},
  {id:'gov', name:'Governance Excellence', th:'บริหารจัดการเป็นเลิศด้วยธรรมาภิบาล'}
];
const TOWS = [
  {id:'SO', name:'SO – ใช้จุดแข็ง ฉวยโอกาส'},
  {id:'WO', name:'WO – แก้จุดอ่อน ด้วยโอกาส'},
  {id:'ST', name:'ST – ใช้จุดแข็ง รับมืออุปสรรค'},
  {id:'WT', name:'WT – ลดจุดอ่อน เลี่ยงอุปสรรค'}
];
const THEME_COLORS = ['#0ea5e9','#f97316','#10b981','#a855f7','#ef4444','#eab308'];
const THEME_SUGGEST = ['ลดโรค NCDs','บริการปลอดภัย','องค์กรสมรรถนะสูง','ดูแลผู้สูงอายุแบบบูรณาการ','สุขภาพแม่และเด็ก','ลดอุบัติเหตุทางถนน'];
const STEPS = [
  {n:1, t:'วิเคราะห์สถานการณ์'},
  {n:2, t:'วิสัยทัศน์และผลลัพธ์'},
  {n:3, t:'ธีมกลยุทธ์'},
  {n:4, t:'วัตถุประสงค์'},
  {n:5, t:'เหตุและผล'},
  {n:6, t:'ตรวจสอบ'},
  {n:7, t:'Balanced Scorecard'},
  {n:8, t:'แผนที่ยุทธศาสตร์'}
];

/* ================= เครื่องมือทั่วไป ================= */
let R = null;
const $ = s => R.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const P = id => PERS.find(p => p.id === id);
function toast(msg, ms = 2600){ const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms); }
function busy(v){ const l = $('#smbLoading'); if (l) l.classList.toggle('show', v); }
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k, v){ try { localStorage.setItem(k, v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};

/* ================= เชื่อมต่อฐานข้อมูล (Supabase ผ่าน app.js) ================= */
let CTX = null, READONLY = true;
async function call(fn, ...args){
  if (fn === 'listMaps'){ const l = await CTX.rpc('sx_map_list', {}); return (l || []).map(m => ({id: m.id, org: m.org, year: m.year, updatedAt: m.updated_at || ''})); }
  if (fn === 'getMap') return JSON.stringify(await CTX.rpc('sx_map_get', {p_id: args[0]}));
  if (fn === 'saveMap') return CTX.rpc('sx_map_save', {p_pass: CTX.pass(), p_map: JSON.parse(args[0])});
  if (fn === 'deleteMap') return CTX.rpc('sx_map_delete', {p_pass: CTX.pass(), p_id: args[0]});
  throw new Error('ไม่รองรับการทำงานนี้');
}

/* ================= สถานะ ================= */
function blank(){
  return {id:'', org:'โรงพยาบาลสันทราย', year:'2570', areaData:'', swot:{S:'',W:'',O:'',T:''}, tows:[],
          vision:'', mission:'', outcomes:'', financeBeside:false,
          themes:[], objectives:[], links:[]};
}
let S = blank(), dirty = false, step = 1, linkSrc = null, maps = [], E = null;

function setDirty(v = true){
  dirty = v; const sb = $('#smbSave'); if (sb) sb.classList.toggle('dirty', v);
}
function normalize(m){
  const b = blank(); m = Object.assign(b, m || {});
  m.swot = Object.assign({S:'',W:'',O:'',T:''}, m.swot || {});
  m.objectives = (m.objectives || []).map(o => Object.assign({id:uid(), name:'', persp:'process', theme:'', pgroup:'', exc:[], src:[], desc:'', kpis:[], inits:[]}, o));
  return m;
}
function codeMap(){
  const c = {};
  PERS.forEach(p => S.objectives.filter(o => o.persp === p.id).forEach((o, i) => c[o.id] = p.code + (i + 1)));
  return c;
}
const lvl = pid => (S.financeBeside && pid === 'finance') ? 3 : P(pid).level;
const theme = id => S.themes.find(t => t.id === id);
const themeColor = id => (theme(id) || {}).color || '#94a3b8';
const objById = id => S.objectives.find(o => o.id === id);

/* ================= Render หลัก ================= */
function renderTabs(){
  $('#smbTabs').innerHTML = STEPS.map(s => `<button class="tab ${s.n === step ? 'on' : ''}" data-act="tab" data-s="${s.n}"><span class="n">${s.n === 8 ? '◎' : s.n}</span>${s.t}</button>`).join('');
}
var render = function(){
  if (READONLY && !S.id){
    $('#smbTabs').innerHTML = '';
    $('#smbView').innerHTML = `<div class="empty">${ready ? 'ทีมยุทธศาสตร์ยังไม่ได้เผยแพร่แผนที่ยุทธศาสตร์' : 'กำลังโหลดแผนที่ยุทธศาสตร์…'}</div>`;
    return;
  }
  renderTabs();
  $('#smbView').innerHTML = VIEWS[step]() + navBtns();
  if (READONLY) lock($('#smbView'));
  if (step === 5) drawMap('#map5', {selected: linkSrc, onClick: READONLY ? (id => openObj(id)) : linkClick});
  if (step === 8) drawMap('#map8', {onClick: id => openObj(id)});
}
function navBtns(){
  return `<div class="navbtns">
    ${step > 1 ? `<button class="btn" data-act="tab" data-s="${step - 1}">← ${STEPS[step - 2].t}</button>` : '<span></span>'}
    ${step < 8 ? `<button class="btn pri" data-act="tab" data-s="${step + 1}">${STEPS[step].t} →</button>` : ''}
  </div>`;
}
function renderMapSel(){
  const opts = maps.map(m => `<option value="${esc(m.id)}" ${m.id === S.id ? 'selected' : ''}>${esc(m.org || '(ไม่มีชื่อ)')}${m.year ? ' – ' + esc(m.year) : ''}</option>`);
  $('#smbMapSel').innerHTML = `<option value="">${S.id ? '— เลือกแผนที่ —' : '— แผนที่ใหม่ (ยังไม่บันทึก) —'}</option>` + opts.join('');
}

/* ================= มุมมองแต่ละขั้น ================= */
const VIEWS = {
1(){
  const towsBlock = TOWS.map(t => `
    <div class="card" style="margin:0">
      <h4 style="margin:0 0 8px">${t.name}</h4>
      ${S.tows.map((x, i) => x.type !== t.id ? '' : `<div class="tows-item"><input type="text" data-l="tows" data-i="${i}" data-f="text" value="${esc(x.text)}" placeholder="กลยุทธ์…"><button class="btn sm ghost danger" data-act="delTows" data-i="${i}" title="ลบ">✕</button></div>`).join('')}
      <button class="btn sm" data-act="addTows" data-t="${t.id}">＋ เพิ่มกลยุทธ์ ${t.id}</button>
    </div>`).join('');
  return `
  <h2>ขั้นที่ 1 · วิเคราะห์สถานการณ์</h2>
  <p class="sub">SWOT/TOWS ร่วมกับข้อมูลสุขภาพพื้นที่</p>
  <div class="card">
    <div class="grid2">
      <div class="fld"><label class="f">ชื่อหน่วยงาน</label><input type="text" data-k="org" value="${esc(S.org)}" placeholder="เช่น โรงพยาบาลชุมชน… / สสจ.… / เขตสุขภาพที่…"></div>
      <div class="fld"><label class="f">ปีงบประมาณของแผน</label><input type="text" data-k="year" value="${esc(S.year)}" placeholder="เช่น 2570 หรือ 2570–2574"></div>
    </div>
    <div class="fld"><label class="f">ข้อมูลสุขภาพพื้นที่</label>
      <textarea data-k="areaData" placeholder="เช่น สาเหตุการตาย 5 อันดับแรก, ความชุกโรคเรื้อรัง (NCDs), โครงสร้างประชากร/สัดส่วนผู้สูงอายุ, ปัญหาสุขภาพเฉพาะพื้นที่">${esc(S.areaData)}</textarea>
      <div class="kpi-hint">แนะนำ: สาเหตุการตาย · โรคเรื้อรัง (เบาหวาน ความดัน CKD) · ประชากรสูงวัย · ผลงานตัวชี้วัดเขตสุขภาพปีที่ผ่านมา</div>
    </div>
  </div>
  <div class="card">
    <h3>SWOT</h3><p class="sub small">พิมพ์ 1 ข้อต่อ 1 บรรทัด</p>
    <div class="grid4">
      ${[['S','จุดแข็ง (Strengths)'],['W','จุดอ่อน (Weaknesses)'],['O','โอกาส (Opportunities)'],['T','อุปสรรค (Threats)']].map(([k, n]) =>
        `<div class="q ${k}"><h4>${n}</h4><textarea data-k="swot.${k}">${esc(S.swot[k])}</textarea></div>`).join('')}
    </div>
  </div>
  <div class="card">
    <h3>TOWS Matrix → กลยุทธ์</h3>
    <p class="sub small">กลยุทธ์ที่ได้จะนำไปผูกกับวัตถุประสงค์ในขั้นที่ 4 และตรวจความครอบคลุมในขั้นที่ 6</p>
    <div class="grid2">${towsBlock}</div>
  </div>`;
},
2(){
  return `
  <h2>ขั้นที่ 2 · วิสัยทัศน์และผลลัพธ์สุขภาพที่ต้องการ</h2>
  <p class="sub">วางไว้บนสุดของแผนที่ — ในภาคสุขภาพ “สุขภาพของประชาชน” อยู่บนสุด ไม่ใช่กำไร</p>
  <div class="card">
    <div class="fld"><label class="f">วิสัยทัศน์</label><textarea data-k="vision" style="min-height:70px" placeholder="เช่น เครือข่ายบริการสุขภาพคุณภาพ ประชาชนสุขภาพดี ภายในปี 2570">${esc(S.vision)}</textarea></div>
    <div class="fld"><label class="f">พันธกิจ</label><textarea data-k="mission" style="min-height:70px">${esc(S.mission)}</textarea></div>
    <div class="fld"><label class="f">ผลลัพธ์ทางสุขภาพที่ต้องการ (Health Outcomes)</label><textarea data-k="outcomes" placeholder="เช่น อัตราตายจากโรคหลอดเลือดสมองลดลง, ผู้ป่วยเบาหวานควบคุมน้ำตาลได้ดีขึ้น">${esc(S.outcomes)}</textarea>
      <div class="kpi-hint">ผลลัพธ์เหล่านี้จะกลายเป็นวัตถุประสงค์ในมุมมอง “ผลลัพธ์ทางสุขภาพ / พันธกิจ” — ปุ่มด้านล่างช่วยแปลงให้อัตโนมัติ</div>
    </div>
    <button class="btn" data-act="outcomesToObj">แปลงผลลัพธ์ (ทีละบรรทัด) เป็นวัตถุประสงค์มุมมองบนสุด</button>
  </div>
  <div class="card">
    <h3>โครงสร้างมุมมอง</h3>
    <table class="subtbl" style="margin-bottom:12px">
      <tr><th>ระดับ</th><th>มุมมอง</th><th>คำถามหลัก</th></tr>
      ${PERS.map((p, i) => `<tr><td>${i === 0 ? 'บนสุด' : i === 4 ? 'ล่างสุด' : i + 1}</td><td><span class="dot" style="background:${p.color}"></span> <b>${p.name}</b></td><td class="muted">${p.q}</td></tr>`).join('')}
    </table>
    <label class="row" style="cursor:pointer"><input type="checkbox" data-k="financeBeside" ${S.financeBeside ? 'checked' : ''}> วางมุมมอง “การเงิน” คู่กับ “ผู้รับบริการ” ในระดับเดียวกัน</label>
  </div>`;
},
3(){
  const n = S.themes.length;
  return `
  <h2>ขั้นที่ 3 · จัดกลุ่มกลยุทธ์เป็นธีม</h2>
  <p class="sub">แนะนำ 3–4 ธีม แต่ละธีมคือ “เส้นทางเหตุและผล” จากล่างขึ้นบน</p>
  <div class="hint">ปัจจุบันมี <b>${n}</b> ธีม ${n >= 3 && n <= 4 ? '✓ อยู่ในช่วงที่แนะนำ' : '— แนะนำ 3–4 ธีม'}</div>
  <div class="card">
    ${S.themes.map((t, i) => `
      <div class="theme-row">
        <input type="color" data-l="themes" data-i="${i}" data-f="color" value="${esc(t.color)}" title="สีธีม">
        <input type="text" data-l="themes" data-i="${i}" data-f="name" value="${esc(t.name)}" placeholder="ชื่อธีม">
        <input type="text" class="desc" data-l="themes" data-i="${i}" data-f="desc" value="${esc(t.desc || '')}" placeholder="คำอธิบาย / เป้าหมายของธีม">
        <button class="btn sm ghost danger" data-act="delTheme" data-i="${i}">ลบ</button>
      </div>`).join('') || '<p class="muted">ยังไม่มีธีม</p>'}
    <div class="row" style="margin-top:10px">
      <button class="btn" data-act="addTheme">＋ เพิ่มธีม</button>
      <span class="muted small">หรือเลือกจากตัวอย่าง:</span>
      ${THEME_SUGGEST.filter(s => !S.themes.some(t => t.name === s)).map(s => `<span class="chip click" data-act="addTheme" data-name="${esc(s)}">＋ ${esc(s)}</span>`).join('')}
    </div>
  </div>
  <div class="card">
    <h3>กลยุทธ์จาก TOWS (ขั้นที่ 1)</h3>
    ${S.tows.filter(t => t.text.trim()).map(t => `<div class="small">• <b>${t.type}</b> ${esc(t.text)}</div>`).join('') || '<p class="muted small">ยังไม่มี — กลับไปเพิ่มที่ขั้นที่ 1</p>'}
  </div>`;
},
4(){
  const codes = codeMap();
  const thOpts = sel => `<option value="">— ไม่ระบุธีม —</option>` + S.themes.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  return `
  <h2>ขั้นที่ 4 · วัตถุประสงค์เชิงกลยุทธ์</h2>
  <p class="sub">แปลงธีมเป็นวัตถุประสงค์ แล้ววางลงแต่ละมุมมอง (คลิก “แก้ไข” เพื่อระบุ 4 Excellence, กลยุทธ์ TOWS, KPI และโครงการ)</p>
  ${PERS.map(p => {
    const list = S.objectives.filter(o => o.persp === p.id);
    return `<section class="psec">
      <header style="background:${p.color}"><b>${p.name}</b><span>${p.q}</span></header>
      <div class="body">
        <div class="objs">${list.map(o => objCard(o, codes)).join('') || '<div class="empty small">ยังไม่มีวัตถุประสงค์</div>'}</div>
        <div class="addline">
          <input type="text" id="new-${p.id}" placeholder="พิมพ์วัตถุประสงค์ใหม่ แล้วกด Enter" data-enter="addObj" data-p="${p.id}">
          <select id="newth-${p.id}">${thOpts(store.get('smb_lastTheme') || '')}</select>
          <button class="btn pri" data-act="addObj" data-p="${p.id}">เพิ่ม</button>
        </div>
        <div class="kpi-hint">ตัวอย่าง KPI มุมมองนี้: ${p.kpi.join(' · ')}</div>
      </div>
    </section>`;
  }).join('')}`;
},
5(){
  const codes = codeMap();
  const ordered = [...S.objectives].sort((a, b) => lvl(a.persp) - lvl(b.persp));
  const opt = o => `<option value="${o.id}">${codes[o.id]} ${esc(o.name)}</option>`;
  return `
  <h2>ขั้นที่ 5 · ลากลูกศรเหตุและผล (ล่าง → บน)</h2>
  <p class="sub">“ถ้าทำสิ่งนี้ได้ดี → จะส่งผลให้…” เชื่อมจากมุมมองล่างไปบนจนถึงผลลัพธ์สุขภาพ</p>
  <div class="linkgrid">
    <div class="card" style="margin:0">
      <h3>เพิ่มความเชื่อมโยง</h3>
      <div class="fld"><label class="f">สาเหตุ (จาก)</label><select id="lkFrom">${ordered.map(opt).join('')}</select></div>
      <div class="fld"><label class="f">ผลลัพธ์ (ไป)</label><select id="lkTo">${[...ordered].reverse().map(opt).join('')}</select></div>
      <button class="btn pri" data-act="addLink">＋ เชื่อมลูกศร</button>
      <div class="linklist">
        <div class="small muted" style="margin-bottom:4px">ลูกศรทั้งหมด ${S.links.length} เส้น</div>
        ${S.links.map((l, i) => { const a = objById(l.from), b = objById(l.to); if (!a || !b) return '';
          return `<div class="linkitem"><span class="t"><b>${codes[a.id]}</b> ${esc(a.name)} <b style="color:var(--pri)">→</b> <b>${codes[b.id]}</b> ${esc(b.name)}</span><button class="btn sm ghost danger" data-act="delLink" data-i="${i}">✕</button></div>`; }).join('')}
      </div>
    </div>
    <div>
      <div class="mode">${linkSrc ? `เลือกต้นทาง <b>${codes[linkSrc] || ''}</b> แล้ว — คลิกกล่องปลายทางบนแผนที่ (คลิกกล่องเดิมเพื่อยกเลิก)` : '<b>วิธีลัด:</b> คลิกกล่องต้นทาง (สาเหตุ) แล้วคลิกกล่องปลายทาง (ผลลัพธ์) เพื่อสร้างลูกศร'}</div>
      <div class="mapbox" id="map5"></div>
    </div>
  </div>`;
},
6(){
  const res = runChecks();
  const cnt = k => res.filter(r => r.lv === k).length;
  const codes = codeMap();
  return `
  <h2>ขั้นที่ 6 · ตรวจสอบความสอดคล้องและครอบคลุม</h2>
  <p class="sub">ตรวจโครงสร้างแผนที่ ความเชื่อมโยงเหตุและผล ความครอบคลุมกลยุทธ์ และความสอดคล้องกับนโยบาย</p>
  <div class="score">
    <div><b style="color:var(--ok)">${cnt('ok')}</b>ผ่าน</div>
    <div><b style="color:#d97706">${cnt('warn')}</b>ควรปรับ</div>
    <div><b style="color:var(--err)">${cnt('err')}</b>ต้องแก้</div>
  </div>
  <div class="card"><ul class="checks">
    ${res.map(r => `<li><span class="ic ${r.lv}">${r.lv === 'ok' ? '✓' : r.lv === 'warn' ? '!' : '✕'}</span><div>${r.t}${r.d ? `<div class="small muted">${r.d}</div>` : ''}</div></li>`).join('')}
  </ul></div>
  <div class="card">
    <h3>ความสอดคล้องกับกรอบ 4 Excellence ของกระทรวงสาธารณสุข</h3>
    <div class="exc-grid">
      ${EXC.map(x => { const os = S.objectives.filter(o => (o.exc || []).includes(x.id));
        return `<div><b>${x.name}</b><div class="small muted">${x.th}</div>
          <div style="margin-top:6px">${os.map(o => `<span class="chip">${codes[o.id]}</span>`).join('') || '<span class="small" style="color:var(--err)">ยังไม่มีวัตถุประสงค์</span>'}</div></div>`; }).join('')}
    </div>
    <p class="small muted" style="margin:10px 0 0">ควรตรวจสอบแผนยุทธศาสตร์ฉบับล่าสุดของกระทรวงฯ ตัวชี้วัดของเขตสุขภาพ และมาตรฐาน HA ก่อนใช้งานจริง</p>
  </div>`;
},
7(){
  const codes = codeMap();
  let rows = '';
  PERS.forEach(p => {
    const list = S.objectives.filter(o => o.persp === p.id);
    if (!list.length) return;
    const span = list.reduce((a, o) => a + Math.max(1, o.kpis.length), 0);
    list.forEach((o, oi) => {
      const ks = o.kpis.length ? o.kpis : [null];
      ks.forEach((k, ki) => {
        rows += `<tr>
          ${oi === 0 && ki === 0 ? `<td class="pc" rowspan="${span}" style="background:${p.color}">${p.name}</td>` : ''}
          ${ki === 0 ? `<td rowspan="${ks.length}" style="border-left:4px solid ${themeColor(o.theme)}"><b>${codes[o.id]}</b> ${esc(o.name)}<div><button class="btn sm" data-act="editObj" data-id="${o.id}" style="margin-top:4px">แก้ไข KPI/โครงการ</button></div></td>` : ''}
          ${k ? `<td>${esc(k.name)}</td><td>${esc(k.baseline)}</td><td><b>${esc(k.target)}</b> ${esc(k.unit)}</td><td>${esc(k.freq)}</td><td>${esc(k.owner)}</td>`
              : `<td colspan="5" class="empty">ยังไม่กำหนด KPI</td>`}
          ${ki === 0 ? `<td rowspan="${ks.length}">${o.inits.map(it => `• ${esc(it.name)}${it.budget ? ` <span class="muted small">(${esc(it.budget)})</span>` : ''}`).join('<br>') || '<span class="empty">—</span>'}</td>` : ''}
        </tr>`;
      });
    });
  });
  return `
  <h2>ขั้นที่ 7 · ต่อยอดเป็น Balanced Scorecard</h2>
  <p class="sub">กำหนด KPI ค่าเป้าหมาย และโครงการ ให้ทุกวัตถุประสงค์</p>
  <div class="row" style="margin-bottom:12px">
    <button class="btn" data-act="exportCSV">ดาวน์โหลด CSV</button>
  </div>
  <div class="tblwrap"><table class="bsc">
    <tr><th>มุมมอง</th><th>วัตถุประสงค์เชิงกลยุทธ์</th><th>ตัวชี้วัด (KPI)</th><th>ค่าฐาน</th><th>ค่าเป้าหมาย</th><th>ความถี่</th><th>ผู้รับผิดชอบ</th><th>โครงการ/แผนงาน</th></tr>
    ${rows || '<tr><td colspan="8" class="empty" style="padding:20px">ยังไม่มีวัตถุประสงค์ — ไปที่ขั้นที่ 4</td></tr>'}
  </table></div>`;
},
8(){
  return `
  <div class="row" style="margin-bottom:12px">
    <div><h2>แผนที่ยุทธศาสตร์ (Strategy Map)</h2><p class="sub" style="margin:0">คลิกกล่องเพื่อแก้ไขวัตถุประสงค์</p></div>
    <span class="spacer"></span>
    <button class="btn" data-act="exportSVG">ดาวน์โหลด SVG</button>
    <button class="btn" data-act="exportPNG">ดาวน์โหลด PNG</button>
    <button class="btn pri" data-act="printMap">พิมพ์ / บันทึก PDF</button>
  </div>
  <div class="mapbox" id="map8"></div>`;
}
};

function objCard(o, codes){
  const th = theme(o.theme);
  const pg = PGROUPS.find(g => g.id === o.pgroup);
  return `<div class="obj" style="border-left-color:${themeColor(o.theme)}">
    <div class="code">${codes[o.id]}</div>
    <div class="nm">${esc(o.name)}</div>
    <div>${th ? `<span class="chip"><span class="dot" style="background:${th.color}"></span>${esc(th.name)}</span>` : ''}
      ${pg ? `<span class="chip">${esc(pg.name)}</span>` : ''}
      ${(o.exc || []).map(e => `<span class="chip">${EXC.find(x => x.id === e).name.replace(' Excellence', '')}</span>`).join('')}
      <span class="chip">KPI ${o.kpis.length}</span></div>
    <div class="acts">
      <button class="btn sm" data-act="editObj" data-id="${o.id}">แก้ไข</button>
      <button class="btn sm ghost" data-act="moveObj" data-id="${o.id}" data-d="-1" title="เลื่อนซ้าย">◀</button>
      <button class="btn sm ghost" data-act="moveObj" data-id="${o.id}" data-d="1" title="เลื่อนขวา">▶</button>
      <span class="spacer"></span>
      <button class="btn sm ghost danger" data-act="delObj" data-id="${o.id}">ลบ</button>
    </div>
  </div>`;
}

/* ================= หน้าต่างแก้ไขวัตถุประสงค์ ================= */
function openObj(id){
  const o = objById(id); if (!o) return;
  E = JSON.parse(JSON.stringify(o));
  renderDlg();
  $('#smbDlg').showModal();
}
function renderDlg(){
  const codes = codeMap(), p = P(E.persp);
  const kpiList = `<datalist id="kpiSug">${PERS.flatMap(x => x.kpi).map(k => `<option value="${esc(k)}">`).join('')}</datalist>`;
  $('#smbDlgInner').innerHTML = `
  <div class="dlg-h"><b style="font-size:17px">${codes[E.id] || ''} แก้ไขวัตถุประสงค์</b><span class="spacer"></span><button class="btn sm ghost" data-act="closeDlg">✕</button></div>
  <div class="dlg-b">
    <div class="fld"><label class="f">วัตถุประสงค์เชิงกลยุทธ์</label><input type="text" data-e="name" value="${esc(E.name)}"></div>
    <div class="grid2">
      <div class="fld"><label class="f">มุมมอง</label><select data-e="persp" data-re="1">${PERS.map(x => `<option value="${x.id}" ${x.id === E.persp ? 'selected' : ''}>${x.name}</option>`).join('')}</select></div>
      <div class="fld"><label class="f">ธีมกลยุทธ์</label><select data-e="theme"><option value="">— ไม่ระบุ —</option>${S.themes.map(t => `<option value="${t.id}" ${t.id === E.theme ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
    </div>
    ${E.persp === 'process' ? `<div class="fld"><label class="f">กลุ่มกระบวนการ</label><select data-e="pgroup"><option value="">— ไม่ระบุ —</option>${PGROUPS.map(g => `<option value="${g.id}" ${g.id === E.pgroup ? 'selected' : ''}>${g.name}</option>`).join('')}</select></div>` : ''}
    <div class="fld"><label class="f">คำอธิบาย</label><textarea data-e="desc" style="min-height:60px">${esc(E.desc)}</textarea></div>
    <div class="grid2">
      <div class="fld"><label class="f">สอดคล้องกับ 4 Excellence</label><div class="ckgrid">
        ${EXC.map(x => `<label><input type="checkbox" data-earr="exc" value="${x.id}" ${E.exc.includes(x.id) ? 'checked' : ''}>${x.name}</label>`).join('')}</div></div>
      <div class="fld"><label class="f">มาจากกลยุทธ์ TOWS</label><div class="ckgrid" style="flex-direction:column">
        ${S.tows.filter(t => t.text.trim()).map(t => `<label><input type="checkbox" data-earr="src" value="${t.id}" ${E.src.includes(t.id) ? 'checked' : ''}><b>${t.type}</b> ${esc(t.text)}</label>`).join('') || '<span class="small muted">ยังไม่มีกลยุทธ์ TOWS</span>'}</div></div>
    </div>
    <h3 style="margin-top:8px">ตัวชี้วัด (KPI)</h3>
    <div class="kpi-hint" style="margin:-4px 0 6px">ตัวอย่างมุมมองนี้: ${p.kpi.map(k => `<span class="chip click" data-act="addKpi" data-name="${esc(k)}">＋ ${esc(k)}</span>`).join('')}</div>
    <div style="overflow-x:auto"><table class="subtbl" style="min-width:720px">
      <tr><th style="width:32%">ตัวชี้วัด</th><th>หน่วย</th><th>ค่าฐาน</th><th>ค่าเป้าหมาย</th><th>ความถี่</th><th>ผู้รับผิดชอบ</th><th></th></tr>
      ${E.kpis.map((k, i) => `<tr>
        <td><input type="text" list="kpiSug" data-ek="kpis" data-i="${i}" data-f="name" value="${esc(k.name)}"></td>
        ${['unit','baseline','target','freq','owner'].map(f => `<td><input type="text" data-ek="kpis" data-i="${i}" data-f="${f}" value="${esc(k[f])}" ${f === 'freq' ? 'list="freqSug"' : ''}></td>`).join('')}
        <td><button class="btn sm ghost danger" data-act="delSub" data-k="kpis" data-i="${i}">✕</button></td></tr>`).join('')}
    </table></div>
    <button class="btn sm" data-act="addKpi" style="margin-top:6px">＋ เพิ่ม KPI</button>
    <datalist id="freqSug"><option value="รายเดือน"><option value="รายไตรมาส"><option value="ราย 6 เดือน"><option value="รายปี"></datalist>${kpiList}
    <h3 style="margin-top:16px">โครงการ / แผนงาน</h3>
    <div style="overflow-x:auto"><table class="subtbl" style="min-width:620px">
      <tr><th style="width:40%">ชื่อโครงการ</th><th>งบประมาณ</th><th>ผู้รับผิดชอบ</th><th>ระยะเวลา</th><th></th></tr>
      ${E.inits.map((it, i) => `<tr>
        ${['name','budget','owner','period'].map(f => `<td><input type="text" data-ek="inits" data-i="${i}" data-f="${f}" value="${esc(it[f])}"></td>`).join('')}
        <td><button class="btn sm ghost danger" data-act="delSub" data-k="inits" data-i="${i}">✕</button></td></tr>`).join('')}
    </table></div>
    <button class="btn sm" data-act="addInit" style="margin-top:6px">＋ เพิ่มโครงการ</button>
  </div>
  <div class="dlg-f"><button class="btn" data-act="closeDlg">ยกเลิก</button><button class="btn pri" data-act="saveObj">บันทึกวัตถุประสงค์</button></div>`;
  if (READONLY) lock($('#smbDlg'));
}

/* ================= การวาดแผนที่ (SVG) ================= */
const FONT = 'Sarabun, "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
const mctx = document.createElement('canvas').getContext('2d');
const segr = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('th', {granularity:'word'}) : null;
function tw(s, size, weight){ mctx.font = `${weight} ${size}px ${FONT}`; return mctx.measureText(s).width; }
function wrap(text, w, size, weight = 400){
  text = String(text || '').replace(/\s+/g, ' ').trim();
  if (!text) return [''];
  const parts = segr ? Array.from(segr.segment(text), s => s.segment) : Array.from(text);
  const lines = []; let cur = '';
  for (let p of parts){
    if (tw(cur + p, size, weight) <= w){ cur += p; continue; }
    if (cur.trim()){ lines.push(cur.trim()); cur = ''; }
    p = p.replace(/^\s+/, '');
    if (tw(p, size, weight) <= w){ cur = p; continue; }
    for (const ch of Array.from(p)){
      if (cur && tw(cur + ch, size, weight) > w){ lines.push(cur); cur = ch; } else cur += ch;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
function svgText(x, y, lines, size, weight, fill, anchor = 'start', lh = 1.35){
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">` +
    lines.map((l, i) => `<tspan x="${x}" dy="${i ? size * lh : 0}">${esc(l)}</tspan>`).join('') + `</text>`;
}

function buildMapSVG(opts = {}){
  const W = 1280, PAD = 20, LW = 180, G = 16;
  const cx0 = PAD + LW + 10, cw = W - PAD - cx0;
  const codes = codeMap();
  const thIdx = id => { const i = S.themes.findIndex(t => t.id === id); return i < 0 ? 99 : i; };
  const objsOf = (pid, f) => S.objectives.filter(o => o.persp === pid && (!f || f(o)))
    .map((o, i) => ({o, i})).sort((a, b) => thIdx(a.o.theme) - thIdx(b.o.theme) || a.i - b.i).map(x => x.o);
  const bg = [], boxes = [], arrows = [], pos = {};
  let y = PAD;

  // หัวเรื่อง
  bg.push(svgText(PAD, y + 22, [`Strategy Map: ${S.org || 'ชื่อหน่วยงาน'}${S.year ? '  ปี ' + S.year : ''}`], 22, 700, '#14302b'));
  y += 38;
  // วิสัยทัศน์
  const vw = W - 2 * PAD - 150;
  const vL = wrap(S.vision || '(ยังไม่ได้กำหนดวิสัยทัศน์)', vw, 17, 600);
  const mL = S.mission ? wrap('พันธกิจ: ' + S.mission, vw, 13.5, 400) : [];
  const vh = 22 + vL.length * 23 + (mL.length ? 6 + mL.length * 19 : 0);
  bg.push(`<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${vh}" rx="10" fill="#0f2e2a"/>`);
  bg.push(svgText(PAD + 18, y + vh / 2 + 6, ['วิสัยทัศน์'], 16, 700, '#5eead4'));
  bg.push(svgText(PAD + 140, y + 11 + 17, vL, 17, 600, '#ffffff'));
  if (mL.length) bg.push(svgText(PAD + 140, y + 11 + 17 + vL.length * 23 + 2, mL, 13.5, 400, '#b7d7d1', 'start', 1.4));
  y += vh + 12;

  const rows = S.financeBeside ? [['outcome'], ['customer', 'finance'], ['process'], ['learning']] : PERS.map(p => [p.id]);
  rows.forEach(r => {
    let segs;
    if (r.length === 2){
      segs = r.map(pid => ({title: P(pid).name, pid, objs: objsOf(pid), w: (cw - G) / 2}));
    } else if (r[0] === 'process'){
      const groups = PGROUPS.map(g => ({title: g.name, pid: 'process', objs: objsOf('process', o => o.pgroup === g.id)})).filter(g => g.objs.length);
      const other = objsOf('process', o => !PGROUPS.some(g => g.id === o.pgroup));
      if (other.length) groups.push({title: groups.length ? 'อื่น ๆ' : null, pid: 'process', objs: other});
      if (groups.length <= 1) segs = [{title: groups[0] && groups[0].title, pid: 'process', objs: objsOf('process'), w: cw}];
      else {
        const tot = groups.reduce((a, g) => a + Math.max(g.objs.length, 1.3), 0);
        segs = groups.map(g => Object.assign(g, {w: (cw - G * (groups.length - 1)) * Math.max(g.objs.length, 1.3) / tot}));
      }
    } else segs = [{title: null, pid: r[0], objs: objsOf(r[0]), w: cw}];

    // คำนวณขนาด
    segs.forEach(sg => {
      const n = sg.objs.length, minW = 150, maxW = 230;
      sg.per = Math.max(1, Math.min(n || 1, Math.floor((sg.w + G) / (minW + G))));
      sg.bw = Math.min(maxW, (sg.w - G * (sg.per - 1)) / sg.per);
      const items = sg.objs.map(o => { const L = wrap(o.name || '(ไม่มีชื่อ)', sg.bw - 22, 14, 500); return {o, L, h: 36 + L.length * 19 + 10}; });
      sg.lines = []; for (let i = 0; i < n; i += sg.per) sg.lines.push(items.slice(i, i + sg.per));
      sg.lineH = sg.lines.map(l => Math.max(...l.map(b => b.h)));
      sg.titleL = sg.title ? wrap(sg.title, sg.w - 24, 12.5, 700) : [];
      sg.headH = sg.titleL.length ? sg.titleL.length * 17 + 8 : 0;
      sg.h = sg.headH + (n ? sg.lineH.reduce((a, b) => a + b, 0) + G * (sg.lines.length - 1) : 36);
    });
    const hh = Math.max(...segs.map(s => s.headH));
    segs.forEach(sg => { sg.h += hh - sg.headH; sg.headH = hh; });
    const rowH = Math.max(86, Math.max(...segs.map(s => s.h)) + 2 * G);
    const p0 = P(r[0]);
    // ป้ายมุมมองด้านซ้าย
    const lblColor = r.length === 2 ? '#334155' : p0.color;
    bg.push(`<rect x="${PAD}" y="${y}" width="${LW}" height="${rowH}" rx="10" fill="${lblColor}"/>`);
    const lblLines = r.flatMap(pid => wrap(P(pid).name, LW - 24, 15, 700));
    bg.push(svgText(PAD + LW / 2, y + rowH / 2 - (lblLines.length - 1) * 10 + 5, lblLines, 15, 700, '#fff', 'middle', 1.33));
    // พื้นหลังและกล่อง
    let sx = cx0;
    segs.forEach((sg, si) => {
      const pp = P(sg.pid);
      bg.push(`<rect x="${sx}" y="${y}" width="${sg.w}" height="${rowH}" rx="10" fill="${pp.tint}" stroke="${pp.color}" stroke-opacity=".25"/>`);
      if (sg.titleL.length) bg.push(svgText(sx + 12, y + G + 10, sg.titleL, 12.5, 700, pp.color, 'start', 1.3));
      if (!sg.objs.length) bg.push(svgText(sx + sg.w / 2, y + rowH / 2 + 5, ['ยังไม่มีวัตถุประสงค์'], 13, 400, '#94a3b8', 'middle'));
      let ly = y + G + sg.headH;
      sg.lines.forEach((line, li) => {
        const lh = sg.lineH[li], tot = line.length * sg.bw + (line.length - 1) * G;
        let bx = sx + (sg.w - tot) / 2;
        line.forEach(b => {
          const o = b.o, col = themeColor(o.theme), sel = opts.selected === o.id;
          pos[o.id] = {x: bx, y: ly, w: sg.bw, h: lh};
          boxes.push(`<g data-id="${o.id}">
            <rect class="box" x="${bx}" y="${ly}" width="${sg.bw}" height="${lh}" rx="12" fill="${sel ? '#fff8db' : '#fff'}" stroke="${sel ? '#d97706' : col}" stroke-width="${sel ? 3.5 : 2}"/>
            <rect x="${bx + 10}" y="${ly + 9}" width="${tw(codes[o.id], 12, 700) + 14}" height="19" rx="9.5" fill="${col}"/>
            ${svgText(bx + 17, ly + 23, [codes[o.id]], 12, 700, '#fff')}
            ${svgText(bx + 11, ly + 48, b.L, 14, 500, '#1e293b', 'start', 1.36)}
          </g>`);
          bx += sg.bw + G;
        });
        ly += lh + G;
      });
      if (si < segs.length - 1) sx += sg.w + G;
    });
    y += rowH + 10;
  });

  // ลูกศร
  const outN = {}, inN = {}, outI = {}, inI = {};
  S.links.forEach(l => { outN[l.from] = (outN[l.from] || 0) + 1; inN[l.to] = (inN[l.to] || 0) + 1; });
  S.links.forEach(l => {
    const a = pos[l.from], b = pos[l.to]; if (!a || !b) return;
    const ko = outI[l.from] = (outI[l.from] || 0) + 1, ki = inI[l.to] = (inI[l.to] || 0) + 1;
    const off = (k, n, w) => Math.max(-w * .35, Math.min(w * .35, (k - 1 - (n - 1) / 2) * 14));
    let d;
    if (Math.abs(a.y - b.y) < 4){
      const right = a.x < b.x;
      const x1 = right ? a.x + a.w : a.x, x2 = right ? b.x : b.x + b.w, y1 = a.y + a.h / 2, y2 = b.y + b.h / 2;
      d = `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
    } else {
      const up = a.y > b.y;
      const x1 = a.x + a.w / 2 + off(ko, outN[l.from], a.w), x2 = b.x + b.w / 2 + off(ki, inN[l.to], b.w);
      const y1 = up ? a.y : a.y + a.h, y2 = up ? b.y + b.h + 2 : b.y - 2;
      const dy = (y2 - y1) / 2;
      d = `M${x1} ${y1} C${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
    }
    arrows.push(`<path d="${d}" fill="none" stroke="#334155" stroke-width="1.7" stroke-opacity=".7" marker-end="url(#ah)"/>`);
  });

  // คำอธิบายสัญลักษณ์
  let lx = PAD; const ly = y + 14;
  const legend = [svgText(lx, ly + 4, ['ธีมกลยุทธ์:'], 13, 700, '#334155')];
  lx += 82;
  S.themes.forEach(t => {
    legend.push(`<rect x="${lx}" y="${ly - 8}" width="14" height="14" rx="4" fill="${t.color}"/>`);
    legend.push(svgText(lx + 20, ly + 4, [t.name || '-'], 13, 500, '#334155'));
    lx += 20 + tw(t.name || '-', 13, 500) + 22;
  });
  legend.push(svgText(W - PAD, ly + 4, ['→ ลูกศร = ความสัมพันธ์เหตุและผล (ล่าง → บน)'], 12.5, 400, '#64748b', 'end'));
  const H = ly + 26;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}'>
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#334155"/></marker></defs>
    <rect width="${W}" height="${H}" fill="#fff"/>
    ${bg.join('')}${arrows.join('')}${boxes.join('')}${legend.join('')}
  </svg>`;
}
function drawMap(sel, opts){
  const box = $(sel); if (!box) return;
  const go = () => {
    box.innerHTML = buildMapSVG(opts);
    box.onclick = e => { const g = e.target.closest('[data-id]'); if (g && opts.onClick) opts.onClick(g.dataset.id); };
  };
  go();
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(go);
}
function linkClick(id){
  if (!linkSrc){ linkSrc = id; render(); return; }
  if (linkSrc === id){ linkSrc = null; render(); return; }
  addLink(linkSrc, id); linkSrc = null; render();
}
function addLink(from, to){
  if (!from || !to || from === to) return toast('เลือกต้นทางและปลายทางที่ต่างกัน');
  if (S.links.some(l => l.from === from && l.to === to)) return toast('มีลูกศรนี้อยู่แล้ว');
  S.links.push({from, to}); setDirty();
  const a = objById(from), b = objById(to);
  if (lvl(a.persp) > lvl(b.persp)) toast('⚠ ลูกศรชี้จากบนลงล่าง — ปกติเหตุและผลควรชี้จากล่างขึ้นบน', 4000);
}

/* ================= ตรวจสอบ ================= */
function runChecks(){
  const R = [], codes = codeMap(), list = ids => ids.map(id => codes[id]).join(', ');
  const push = (lv, t, d) => R.push({lv, t, d});
  push(S.vision.trim() ? 'ok' : 'err', S.vision.trim() ? 'กำหนดวิสัยทัศน์แล้ว' : 'ยังไม่ได้กำหนดวิสัยทัศน์');
  const sw = ['S','W','O','T'].filter(k => S.swot[k].trim()).length;
  push(sw === 4 ? 'ok' : 'warn', sw === 4 ? 'วิเคราะห์ SWOT ครบ 4 ด้าน' : `SWOT ยังไม่ครบ (มี ${sw}/4 ด้าน)`);
  push(S.areaData.trim() ? 'ok' : 'warn', S.areaData.trim() ? 'มีข้อมูลสุขภาพพื้นที่ประกอบการวิเคราะห์' : 'ยังไม่มีข้อมูลสุขภาพพื้นที่ (สาเหตุการตาย NCDs ประชากรสูงวัย)');
  const nt = S.themes.length;
  push(nt >= 3 && nt <= 4 ? 'ok' : 'warn', `มีธีมกลยุทธ์ ${nt} ธีม` + (nt >= 3 && nt <= 4 ? '' : ' (แนะนำ 3–4 ธีม)'));
  const missP = PERS.filter(p => !S.objectives.some(o => o.persp === p.id));
  push(missP.length ? 'err' : 'ok', missP.length ? 'บางมุมมองยังไม่มีวัตถุประสงค์' : 'ทุกมุมมองมีวัตถุประสงค์อย่างน้อย 1 ข้อ', missP.map(p => p.name).join(', '));
  const noTh = S.objectives.filter(o => !theme(o.theme));
  if (S.objectives.length) push(noTh.length ? 'warn' : 'ok', noTh.length ? `วัตถุประสงค์ ${noTh.length} ข้อยังไม่ระบุธีม` : 'ทุกวัตถุประสงค์ระบุธีมแล้ว', list(noTh.map(o => o.id)));
  S.themes.forEach(t => {
    const ps = new Set(S.objectives.filter(o => o.theme === t.id).map(o => o.persp));
    if (ps.size < 3) push('warn', `ธีม “${esc(t.name)}” ครอบคลุมเพียง ${ps.size} มุมมอง`, 'ธีมที่ดีควรมีวัตถุประสงค์ไล่ตั้งแต่การเรียนรู้ → กระบวนการ → ผู้รับบริการ/ผลลัพธ์สุขภาพ');
  });
  // ความเชื่อมโยง
  if (S.objectives.length){
    const linked = new Set(S.links.flatMap(l => [l.from, l.to]));
    const iso = S.objectives.filter(o => !linked.has(o.id));
    push(iso.length ? 'err' : 'ok', iso.length ? `วัตถุประสงค์ที่ไม่มีลูกศรเชื่อมเลย ${iso.length} ข้อ` : 'ทุกวัตถุประสงค์มีลูกศรเชื่อมโยง', list(iso.map(o => o.id)));
    const top = new Set(S.objectives.filter(o => o.persp === 'outcome').map(o => o.id));
    const adj = {}; S.links.forEach(l => (adj[l.from] = adj[l.from] || []).push(l.to));
    const reach = id => { const seen = new Set([id]), q = [id]; while (q.length){ const c = q.shift(); if (top.has(c)) return true; (adj[c] || []).forEach(n => { if (!seen.has(n)){ seen.add(n); q.push(n); } }); } return false; };
    const dead = S.objectives.filter(o => !top.has(o.id) && !reach(o.id));
    push(dead.length ? 'warn' : 'ok', dead.length ? `วัตถุประสงค์ ${dead.length} ข้อ ยังส่งผลไม่ถึงผลลัพธ์ทางสุขภาพ` : 'ทุกวัตถุประสงค์มีเส้นทางเหตุและผลไปถึงผลลัพธ์ทางสุขภาพ', list(dead.map(o => o.id)));
    const down = S.links.filter(l => { const a = objById(l.from), b = objById(l.to); return a && b && lvl(a.persp) > lvl(b.persp); });
    if (down.length) push('warn', `มีลูกศรชี้จากบนลงล่าง ${down.length} เส้น`, down.map(l => codes[l.from] + '→' + codes[l.to]).join(', '));
  }
  // 4 Excellence
  const missE = EXC.filter(x => !S.objectives.some(o => (o.exc || []).includes(x.id)));
  push(missE.length ? 'warn' : 'ok', missE.length ? 'ยังไม่ครอบคลุม 4 Excellence ของกระทรวงฯ' : 'สอดคล้องครบทั้ง 4 Excellence', missE.map(x => x.name).join(', '));
  // TOWS
  const tw_ = S.tows.filter(t => t.text.trim());
  if (!tw_.length) push('warn', 'ยังไม่มีกลยุทธ์จาก TOWS Matrix ให้ตรวจความครอบคลุม');
  else {
    const used = new Set(S.objectives.flatMap(o => o.src || []));
    const un = tw_.filter(t => !used.has(t.id));
    push(un.length ? 'warn' : 'ok', un.length ? `กลยุทธ์ TOWS ${un.length} ข้อ ยังไม่ถูกแปลงเป็นวัตถุประสงค์` : 'ทุกกลยุทธ์ TOWS ถูกแปลงเป็นวัตถุประสงค์แล้ว', un.map(t => `${t.type}: ${esc(t.text)}`).join(' · '));
  }
  // BSC
  if (S.objectives.length){
    const noK = S.objectives.filter(o => !o.kpis.some(k => k.name.trim()));
    push(noK.length ? 'warn' : 'ok', noK.length ? `วัตถุประสงค์ ${noK.length} ข้อ ยังไม่มี KPI` : 'ทุกวัตถุประสงค์มี KPI', list(noK.map(o => o.id)));
    const noT = S.objectives.filter(o => o.kpis.some(k => k.name.trim() && !String(k.target).trim()));
    if (noT.length) push('warn', `มี KPI ที่ยังไม่กำหนดค่าเป้าหมาย`, list(noT.map(o => o.id)));
    const noI = S.objectives.filter(o => !o.inits.some(i => i.name.trim()));
    if (noI.length) push('warn', `วัตถุประสงค์ ${noI.length} ข้อ ยังไม่มีโครงการรองรับ`, list(noI.map(o => o.id)));
  }
  return R;
}

/* ================= ส่งออก ================= */
function download(name, data, type){
  const b = data instanceof Blob ? data : new Blob([data], {type: type || 'application/octet-stream'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const fileBase = () => ('StrategyMap_' + (S.org || 'map') + (S.year ? '_' + S.year : '')).replace(/[\\/:*?"<>|\s]+/g, '_');
function bscRows(){
  const codes = codeMap();
  const rows = [['มุมมอง','รหัส','วัตถุประสงค์','ธีม','4 Excellence','KPI','หน่วย','ค่าฐาน','ค่าเป้าหมาย','ความถี่','ผู้รับผิดชอบ KPI','โครงการ','งบประมาณ','ผู้รับผิดชอบโครงการ','ระยะเวลา']];
  PERS.forEach(p => S.objectives.filter(o => o.persp === p.id).forEach(o => {
    const n = Math.max(o.kpis.length, o.inits.length, 1);
    for (let i = 0; i < n; i++){
      const k = o.kpis[i] || {}, it = o.inits[i] || {};
      rows.push([p.name, codes[o.id], o.name, (theme(o.theme) || {}).name || '', (o.exc || []).map(e => EXC.find(x => x.id === e).name).join(', '),
        k.name || '', k.unit || '', k.baseline || '', k.target || '', k.freq || '', k.owner || '', it.name || '', it.budget || '', it.owner || '', it.period || '']);
    }
  }));
  return rows;
}

/* ================= การกระทำ (คลิก) ================= */
const ACT = {
  tab(el){ step = +el.dataset.s; linkSrc = null; render(); window.scrollTo(0, 0); },
  addTows(el){ S.tows.push({id: uid(), type: el.dataset.t, text: ''}); setDirty(); render(); },
  delTows(el){ S.tows.splice(+el.dataset.i, 1); setDirty(); render(); },
  addTheme(el){
    const used = S.themes.map(t => t.color);
    S.themes.push({id: uid(), name: el.dataset.name || '', desc: '', color: THEME_COLORS.find(c => !used.includes(c)) || THEME_COLORS[S.themes.length % THEME_COLORS.length]});
    setDirty(); render();
  },
  async delTheme(el){
    const t = S.themes[+el.dataset.i];
    if (!(await ask(`ลบธีม “${t.name}” ?`))) return;
    S.objectives.forEach(o => { if (o.theme === t.id) o.theme = ''; });
    S.themes.splice(+el.dataset.i, 1); setDirty(); render();
  },
  outcomesToObj(){
    const lines = S.outcomes.split('\n').map(s => s.replace(/^[\s•\-\d.)]+/, '').trim()).filter(Boolean);
    let n = 0;
    lines.forEach(l => { if (!S.objectives.some(o => o.persp === 'outcome' && o.name === l)){ S.objectives.push(newObj(l, 'outcome', '')); n++; } });
    setDirty(); toast(n ? `เพิ่มวัตถุประสงค์ผลลัพธ์สุขภาพ ${n} ข้อ` : 'ไม่มีรายการใหม่ให้เพิ่ม');
  },
  addObj(el){
    const p = el.dataset.p, inp = $('#new-' + p), th = $('#newth-' + p).value;
    const name = inp.value.trim(); if (!name){ inp.focus(); return; }
    store.set('smb_lastTheme', th);
    S.objectives.push(newObj(name, p, th)); setDirty(); render();
    const ni = $('#new-' + p); if (ni) ni.focus();
  },
  editObj(el){ openObj(el.dataset.id); },
  async delObj(el){
    const o = objById(el.dataset.id);
    if (!(await ask(`ลบวัตถุประสงค์ “${o.name}” และลูกศรที่เกี่ยวข้อง?`))) return;
    S.objectives = S.objectives.filter(x => x.id !== o.id);
    S.links = S.links.filter(l => l.from !== o.id && l.to !== o.id);
    setDirty(); render();
  },
  moveObj(el){
    const o = objById(el.dataset.id), d = +el.dataset.d;
    const same = S.objectives.filter(x => x.persp === o.persp), k = same.indexOf(o), t = same[k + d];
    if (!t) return;
    const i = S.objectives.indexOf(o), j = S.objectives.indexOf(t);
    [S.objectives[i], S.objectives[j]] = [S.objectives[j], S.objectives[i]];
    setDirty(); render();
  },
  addLink(){ addLink($('#lkFrom').value, $('#lkTo').value); render(); },
  delLink(el){ S.links.splice(+el.dataset.i, 1); setDirty(); render(); },
  // dialog
  closeDlg(){ $('#smbDlg').close(); E = null; },
  saveObj(){
    if (!E.name.trim()) return toast('กรุณาระบุชื่อวัตถุประสงค์');
    if (E.persp !== 'process') E.pgroup = '';
    E.kpis = E.kpis.filter(k => Object.values(k).some(v => String(v).trim()));
    E.inits = E.inits.filter(k => Object.values(k).some(v => String(v).trim()));
    const i = S.objectives.findIndex(o => o.id === E.id);
    S.objectives[i] = E; $('#smbDlg').close(); E = null; setDirty(); render();
  },
  addKpi(el){ E.kpis.push({name: el.dataset.name || '', unit: '', baseline: '', target: '', freq: '', owner: ''}); renderDlg(); },
  addInit(){ E.inits.push({name: '', budget: '', owner: '', period: ''}); renderDlg(); },
  delSub(el){ E[el.dataset.k].splice(+el.dataset.i, 1); renderDlg(); },
  // export
  exportCSV(){
    const csv = bscRows().map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    download(fileBase().replace('StrategyMap', 'BSC') + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
  },
  exportSVG(){ download(fileBase() + '.svg', buildMapSVG(), 'image/svg+xml;charset=utf-8'); },
  exportPNG(){ ACT._exportPNGReal(); },
  _exportPNGReal(){
    const svg = buildMapSVG(), m = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    const w = +m[1], h = +m[2], img = new Image(), sc = 2;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w * sc; c.height = h * sc;
      const g = c.getContext('2d'); g.scale(sc, sc); g.drawImage(img, 0, 0, w, h);
      c.toBlob(b => download(fileBase() + '.png', b), 'image/png');
    };
    img.onerror = () => toast('สร้าง PNG ไม่สำเร็จ — ลองใช้ SVG หรือพิมพ์เป็น PDF');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  },
  printMap(){
    const w = window.open('', '_blank');
    if (!w) return toast('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต pop-up');
    w.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${esc(fileBase())}</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet"><style>@page{size:A4 landscape;margin:8mm}body{margin:0;font-family:Sarabun,sans-serif}svg{width:100%;height:auto}</style></head><body>${buildMapSVG()}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 600);
  },
  // top bar
  async newMap(){
    if (dirty && !(await ask('มีการแก้ไขที่ยังไม่บันทึก ต้องการเริ่มแผนที่ใหม่หรือไม่?'))) return;
    S = blank(); step = 1; setDirty(false); renderMapSel(); render();
  },
  async loadExample(){
    if (dirty && !(await ask('มีการแก้ไขที่ยังไม่บันทึก ต้องการโหลดตัวอย่างแทนหรือไม่?'))) return;
    S = normalize(example()); step = 8; setDirty(true); renderMapSel(); render();
    toast('โหลดตัวอย่างแล้ว (ข้อมูลสมมติ) — กด “บันทึก” หากต้องการเก็บไว้');
  },
  save(){
    if (!S.org.trim()) { step = 1; render(); return toast('กรุณาระบุชื่อหน่วยงานก่อนบันทึก'); }
    busy(true);
    call('saveMap', JSON.stringify(S)).then(r => { S.id = r.id; busy(false); setDirty(false); toast('บันทึกเรียบร้อย'); return refreshList(); })
      .catch(e => { busy(false); toast('บันทึกไม่สำเร็จ: ' + (e.message || e), 5000); });
  },
  async delMap(){
    if (!S.id) return toast('แผนที่นี้ยังไม่ได้บันทึก');
    if (!(await ask(`ลบแผนที่ “${S.org}” ถาวร?`))) return;
    busy(true);
    call('deleteMap', S.id).then(() => { busy(false); S = blank(); setDirty(false); toast('ลบแล้ว'); refreshList(); render(); })
      .catch(e => { busy(false); toast(e.message || String(e)); });
  }
};
function newObj(name, persp, th){
  return {id: uid(), name, persp, theme: th || '', pgroup: '', exc: [], src: [], desc: '', kpis: [], inits: []};
}

/* ================= ผูกเหตุการณ์ ================= */
function setPath(obj, path, v){ const k = path.split('.'); let o = obj; while (k.length > 1) o = o[k.shift()]; o[k[0]] = v; }
function bind(){
  ['click','input','change','keydown','keyup'].forEach(t => R.addEventListener(t, e => e.stopPropagation()));
R.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  e.preventDefault(); if (READONLY && !RO_OK.has(el.dataset.act)) return; const f = ACT[el.dataset.act]; if (f) f(el);
});
R.addEventListener('input', e => {
  if (READONLY) return;
  const t = e.target, d = t.dataset;
  const val = t.type === 'checkbox' ? t.checked : t.value;
  if (d.k){ setPath(S, d.k, val); setDirty(); if (d.k === 'financeBeside') render(); }
  else if (d.l){ S[d.l][+d.i][d.f] = val; setDirty(); }
  else if (d.e && E){ E[d.e] = val; if (d.re) renderDlg(); }
  else if (d.ek && E){ E[d.ek][+d.i][d.f] = val; }
  else if (d.earr && E){ const a = E[d.earr]; const i = a.indexOf(t.value); if (t.checked && i < 0) a.push(t.value); if (!t.checked && i >= 0) a.splice(i, 1); }
});
R.addEventListener('change', e => { if (e.target.dataset.e && E && e.target.dataset.re){ E[e.target.dataset.e] = e.target.value; renderDlg(); } });
R.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset.enter){ e.preventDefault(); ACT[e.target.dataset.enter](e.target); }
});
$('#smbMapSel').addEventListener('change', async e => {
  const id = e.target.value; if (!id) return;
  if (dirty && !(await ask('มีการแก้ไขที่ยังไม่บันทึก ต้องการเปิดแผนที่อื่นหรือไม่?'))){ renderMapSel(); return; }
  busy(true);
  call('getMap', id).then(j => { S = normalize(JSON.parse(j)); busy(false); setDirty(false); renderMapSel(); render(); })
    .catch(err => { busy(false); toast(err.message || String(err)); });
});
if (!window._smbUnload) window.addEventListener('beforeunload', e => { if (dirty){ e.preventDefault(); e.returnValue = ''; } }), window._smbUnload = true;

}
function refreshList(){ return call('listMaps').then(l => { maps = l || []; renderMapSel(); }).catch(() => {}); }
/* ================= ข้อมูลตัวอย่าง (สมมติ) ================= */
function example(){
  const k = (name, unit, baseline, target, freq, owner) => ({name, unit, baseline, target, freq, owner});
  const it = (name, budget, owner, period) => ({name, budget, owner, period});
  return {
    id: '', org: 'โรงพยาบาลสันทราย', year: '2570',
    areaData: 'สาเหตุการตาย 3 อันดับแรก: โรคหลอดเลือดสมอง, มะเร็ง, อุบัติเหตุทางถนน\nผู้ป่วยเบาหวานควบคุมระดับน้ำตาลได้ 28% (ต่ำกว่าเป้าหมายเขต)\nผู้สูงอายุเพิ่มขึ้นต่อเนื่อง และมีผู้ป่วยโรคระบบทางเดินหายใจช่วงฝุ่น PM2.5 (ม.ค.–เม.ย.)\nประชากรแฝงและเขตเมืองขยายตัวจากปริมณฑลเชียงใหม่\n(ข้อมูลสมมติเพื่อการสาธิต — โปรดแทนด้วยข้อมูลจริงของ รพ.สันทราย)',
    swot: {S: 'ทีมสหวิชาชีพ NCD clinic เข้มแข็ง\nเครือข่าย อสม. และ รพ.สต. ในอำเภอสันทราย\nผ่านการรับรอง HA',
           W: 'ระยะเวลารอคอย OPD นาน\nระบบข้อมูลยังไม่เชื่อมโยงกับ รพ.สต.\nบุคลากรลาออก/โยกย้ายบ่อย',
           O: 'นโยบาย Digital Health และ Telemedicine\nความร่วมมือ อปท. และกองทุนสุขภาพตำบล\nใกล้โรงพยาบาลศูนย์/มหาวิทยาลัยแพทย์ในเชียงใหม่',
           T: 'ประชากรสูงวัยเพิ่มขึ้นเร็ว\nฝุ่น PM2.5 และหมอกควันรายปี\nค่าใช้จ่ายด้านยาและเวชภัณฑ์สูงขึ้น'},
    tows: [
      {id: 't1', type: 'SO', text: 'ขยาย NCD clinic เชิงรุกร่วมกับ อสม. และ รพ.สต. ในอำเภอสันทราย'},
      {id: 't2', type: 'WO', text: 'ใช้ Telemedicine และระบบข้อมูลเชื่อมโยงลดการรอคอย'},
      {id: 't3', type: 'ST', text: 'พัฒนา Stroke Fast Track ร่วมกับโรงพยาบาลแม่ข่ายในเชียงใหม่'},
      {id: 't4', type: 'WT', text: 'บริหารต้นทุนและสร้างความผูกพันของบุคลากร'}
    ],
    vision: 'โรงพยาบาลสันทราย: โรงพยาบาลคุณภาพ เครือข่ายเข้มแข็ง ประชาชนอำเภอสันทรายสุขภาพดี ภายในปี 2570',
    mission: 'จัดบริการสุขภาพแบบองค์รวมที่ปลอดภัย ร่วมกับชุมชนและภาคีเครือข่าย ด้วยบุคลากรที่มีความสุข',
    outcomes: 'ผู้ป่วยเบาหวานและความดันโลหิตสูงควบคุมโรคได้ดี\nอัตราตายจากโรคหลอดเลือดสมองลดลง\nประชาชนได้รับผลกระทบจากฝุ่น PM2.5 น้อยลง',
    financeBeside: false,
    themes: [
      {id: 'th1', name: 'ลดโรค NCDs', desc: '', color: '#0ea5e9'},
      {id: 'th2', name: 'บริการปลอดภัยไร้รอยต่อ', desc: '', color: '#f97316'},
      {id: 'th3', name: 'องค์กรสมรรถนะสูง', desc: '', color: '#10b981'},
      {id: 'th4', name: 'สุขภาพจากฝุ่นและสิ่งแวดล้อม', desc: '', color: '#a855f7'}
    ],
    objectives: [
      {id: 'o1', persp: 'outcome', name: 'ผู้ป่วยเบาหวานและความดันโลหิตสูงควบคุมโรคได้ดี', theme: 'th1', exc: ['ppp'], src: ['t1'],
        kpis: [k('ร้อยละผู้ป่วยเบาหวานที่ควบคุมระดับน้ำตาลได้', '%', '28', '≥ 40', 'รายไตรมาส', 'กลุ่มงาน NCD')], inits: []},
      {id: 'o2', persp: 'outcome', name: 'ลดการตายจากโรคหลอดเลือดสมอง', theme: 'th2', exc: ['service'], src: ['t3'],
        kpis: [k('อัตราตายด้วยโรคหลอดเลือดสมอง', '%', '9.2', '< 7', 'รายไตรมาส', 'องค์กรแพทย์')], inits: []},
      {id: 'o3', persp: 'customer', name: 'ผู้รับบริการพึงพอใจ ได้รับบริการรวดเร็ว', theme: 'th2', exc: ['service'], src: ['t2'],
        kpis: [k('ความพึงพอใจผู้รับบริการ', '%', '82', '≥ 85', 'ราย 6 เดือน', 'ศูนย์คุณภาพ'), k('ระยะเวลารอคอย OPD', 'นาที', '95', '≤ 60', 'รายเดือน', 'งาน OPD')],
        inits: [it('OPD Telemedicine และนัดหมายออนไลน์', '350,000', 'งาน OPD', 'ต.ค. 69 – ก.ย. 70')]},
      {id: 'o4', persp: 'customer', name: 'ชุมชนและภาคีเครือข่ายมีส่วนร่วมดูแลสุขภาพ', theme: 'th1', exc: ['ppp'], src: ['t1'],
        kpis: [k('ร้อยละตำบลที่มีแผนสุขภาพร่วมกับ อปท.', '%', '40', '≥ 80', 'รายปี', 'กลุ่มงานบริการปฐมภูมิ')], inits: []},
      {id: 'o5', persp: 'finance', name: 'ใช้งบประมาณอย่างคุ้มค่า ไม่วิกฤตการเงิน', theme: 'th3', exc: ['gov'], src: ['t4'],
        kpis: [k('ระดับวิกฤตการเงิน (Risk Score)', 'ระดับ', '3', '≤ 1', 'รายไตรมาส', 'กลุ่มงานบริหาร'), k('ต้นทุนต่อหน่วยบริการ OPD', 'บาท', '820', '≤ 780', 'รายปี', 'งานการเงิน')],
        inits: [it('ระบบบริหารคลังยาและเวชภัณฑ์', '120,000', 'กลุ่มงานเภสัชกรรม', 'ปี 2570')]},
      {id: 'o6', persp: 'process', pgroup: 'pp', name: 'คัดกรองและจัดการความเสี่ยง NCDs เชิงรุกในชุมชน', theme: 'th1', exc: ['ppp'], src: ['t1'],
        kpis: [k('ความครอบคลุมการคัดกรองเบาหวาน/ความดัน', '%', '78', '≥ 90', 'รายไตรมาส', 'รพ.สต. เครือข่าย')],
        inits: [it('อสม. คัดกรองเชิงรุก + NCD Remission Clinic', '450,000', 'กลุ่มงาน NCD', 'ต.ค. 69 – ก.ย. 70')]},
      {id: 'o7', persp: 'process', pgroup: 'ref', name: 'Stroke Fast Track และระบบส่งต่อไร้รอยต่อ', theme: 'th2', exc: ['service'], src: ['t3'],
        kpis: [k('ร้อยละผู้ป่วย Stroke ได้รับการส่งต่อภายใน 60 นาที', '%', '65', '≥ 85', 'รายเดือน', 'ER')],
        inits: [it('ซ้อมแผน Stroke Fast Track ร่วมกับ รพ.แม่ข่าย', '60,000', 'ER', 'ไตรมาส 1–2')]},
      {id: 'o8', persp: 'process', pgroup: 'ps', name: 'บริการรักษาพยาบาลปลอดภัยตามมาตรฐาน HA', theme: 'th2', exc: ['service'], src: [],
        kpis: [k('อุบัติการณ์ความเสี่ยงระดับรุนแรง (E–I)', 'ครั้ง', '6', '0', 'รายเดือน', 'ทีมบริหารความเสี่ยง')], inits: []},
      {id: 'o9', persp: 'process', pgroup: 'gov', name: 'บริหารจัดการด้วยธรรมาภิบาลและควบคุมต้นทุน', theme: 'th3', exc: ['gov'], src: ['t4'],
        kpis: [k('ผลการประเมิน ITA', 'คะแนน', '88', '≥ 92', 'รายปี', 'กลุ่มงานบริหาร')], inits: []},
      {id: 'o10', persp: 'learning', name: 'บุคลากรมีสมรรถนะและความสุขในการทำงาน', theme: 'th3', exc: ['people'], src: ['t4'],
        kpis: [k('อัตราการคงอยู่ของบุคลากร', '%', '89', '≥ 95', 'รายปี', 'งานทรัพยากรบุคคล'), k('ชั่วโมงพัฒนาบุคลากรต่อคน', 'ชม./คน/ปี', '12', '≥ 20', 'รายปี', 'งานพัฒนาบุคลากร')],
        inits: [it('Happy MOPH และแผนพัฒนารายบุคคล (IDP)', '200,000', 'งานทรัพยากรบุคคล', 'ปี 2570')]},
      {id: 'o11', persp: 'learning', name: 'ระบบสารสนเทศเชื่อมโยงข้อมูลสุขภาพทั้งเครือข่าย', theme: 'th1', exc: ['gov'], src: ['t2'],
        kpis: [k('ร้อยละ รพ.สต. ที่เชื่อมข้อมูลกับโรงพยาบาล', '%', '50', '100', 'รายไตรมาส', 'ศูนย์ IT')],
        inits: [it('เชื่อมโยงข้อมูล HIS และ Dashboard NCD', '300,000', 'ศูนย์ IT', 'ต.ค. 69 – มี.ค. 70')]},
      {id: 'o13', persp: 'outcome', name: 'ลดผลกระทบสุขภาพจากฝุ่น PM2.5', theme: 'th4', exc: ['ppp'], src: ['t1'],
        kpis: [k('อัตราผู้ป่วยโรคระบบทางเดินหายใจที่เกี่ยวข้องกับฝุ่นต่อแสนประชากร', 'ต่อแสน', '—', 'ลดลง', 'รายเดือน (ม.ค.–เม.ย.)', 'กลุ่มงานบริการปฐมภูมิ')],
        inits: [it('คลินิกมลพิษ/ห้องปลอดฝุ่น และเครือข่ายเฝ้าระวังกับ อปท.', '150,000', 'กลุ่มงานบริการปฐมภูมิ', 'ต.ค. 69 – เม.ย. 70')]},
      {id: 'o12', persp: 'learning', name: 'สร้างวัฒนธรรมความปลอดภัย (Safety Culture)', theme: 'th2', exc: ['people'], src: [],
        kpis: [k('ร้อยละบุคลากรที่รายงานความเสี่ยง', '%', '60', '≥ 90', 'รายไตรมาส', 'ทีมบริหารความเสี่ยง')], inits: []}
    ],
    links: [
      {from: 'o10', to: 'o6'}, {from: 'o10', to: 'o8'}, {from: 'o11', to: 'o6'}, {from: 'o11', to: 'o7'},
      {from: 'o11', to: 'o9'}, {from: 'o12', to: 'o8'}, {from: 'o6', to: 'o4'}, {from: 'o6', to: 'o1'},
      {from: 'o7', to: 'o2'}, {from: 'o8', to: 'o3'}, {from: 'o9', to: 'o5'}, {from: 'o5', to: 'o3'},
      {from: 'o3', to: 'o2'}, {from: 'o4', to: 'o1'}, {from: 'o6', to: 'o13'}, {from: 'o4', to: 'o13'}
    ]
  };
}

/* ================= หน้าต่างระบบ (แทน confirm/alert) ================= */
let _askRes = null;
function sysOpen(html){ $('#smbSysInner').innerHTML = html; const d = $('#smbSys'); if (!d.open) d.showModal(); }
function sysClose(v){ const d = $('#smbSys'); if (d.open) d.close(); if (_askRes){ const r = _askRes; _askRes = null; r(v); } }
function ask(msg){
  return new Promise(res => {
    _askRes = res;
    sysOpen(`<div class="dlg-h"><b>ยืนยัน</b></div><div class="dlg-b">${esc(msg)}</div>
      <div class="dlg-f"><button class="btn" data-act="sysNo">ยกเลิก</button><button class="btn pri" data-act="sysYes">ตกลง</button></div>`);
  });
}
function info(title, html){
  sysOpen(`<div class="dlg-h"><b style="font-size:17px">${title}</b><span class="spacer"></span><button class="btn sm ghost" data-act="sysNo" aria-label="ปิด">✕</button></div>
    <div class="dlg-b">${html}</div><div class="dlg-f"><button class="btn pri" data-act="sysNo">ปิด</button></div>`);
}
ACT.sysYes = () => sysClose(true);
ACT.sysNo = () => sysClose(false);


/* ================= โหมดอ่านอย่างเดียว ================= */
const RO_OK = new Set(['tab','exportCSV','exportSVG','exportPNG','printMap','closeDlg','sysYes','sysNo','editObj']);
function lock(el){
  el.querySelectorAll('input,select,textarea').forEach(x => { x.disabled = true; });
  el.querySelectorAll('[data-act]').forEach(b => { if (!RO_OK.has(b.dataset.act)) b.hidden = true; });
  el.querySelectorAll('.addline,.mode,.kpi-hint').forEach(x => { x.hidden = true; });
  el.querySelectorAll('#lkFrom,#lkTo').forEach(x => { const f = x.closest('.fld'); if (f) f.hidden = true; });
  el.querySelectorAll('[data-act="editObj"]').forEach(b => { b.textContent = 'ดูรายละเอียด'; });
  el.querySelectorAll('.linkgrid>.card h3').forEach(h => { h.textContent = 'ลูกศรเหตุและผล'; });
  el.querySelectorAll('.sub').forEach(p => { p.textContent = p.textContent.replace('คลิกกล่องเพื่อแก้ไขวัตถุประสงค์', 'คลิกกล่องเพื่อดูรายละเอียดวัตถุประสงค์'); });
  el.querySelectorAll('.dlg-h b').forEach(b => { b.textContent = b.textContent.replace('แก้ไขวัตถุประสงค์', 'รายละเอียดวัตถุประสงค์'); });
  el.querySelectorAll('.dlg-f [data-act="closeDlg"]').forEach(b => { b.textContent = 'ปิด'; });
}

/* ================= เริ่มต้น / ติดตั้งลงหน้า ================= */
let ready = false, lastRO = null;
async function firstLoad(){
  busy(true);
  try {
    maps = await call('listMaps') || [];
    if (maps.length){ S = normalize(JSON.parse(await call('getMap', maps[0].id))); step = 8; }
    else step = READONLY ? 8 : 1;
  } catch(e){ toast(e.message || String(e), 5000); }
  busy(false); ready = true; setDirty(false); renderMapSel(); render();
}
function mount(root, opts){
  R = root; CTX = opts; READONLY = !opts.canEdit;
  if (lastRO !== READONLY){ lastRO = READONLY; ready = false; S = blank(); dirty = false; step = 1; maps = []; E = null; linkSrc = null; }
  root.innerHTML = `<div class="smb">
    <div class="smb-bar"><select id="smbMapSel" title="เลือกแผนที่"></select>
      ${READONLY ? '<span class="muted small">อ่านอย่างเดียว · ทีมยุทธศาสตร์เป็นผู้แก้ไขแผนที่</span>' : `<button class="btn" data-act="newMap">＋ ใหม่</button><button class="btn" data-act="loadExample">ตัวอย่าง</button><button class="btn pri" id="smbSave" data-act="save">บันทึก</button><button class="btn" data-act="delMap" title="ลบแผนที่นี้">ลบ</button>`}
    </div>
    <nav class="tabs smb-tabs" id="smbTabs"></nav>
    <div id="smbView"></div>
    <dialog id="smbSys"><div id="smbSysInner"></div></dialog>
    <dialog id="smbDlg"><div id="smbDlgInner"></div></dialog>
    <div class="smb-loading" id="smbLoading">กำลังทำงาน…</div></div>`;
  bind();
  $('#smbSys').addEventListener('cancel', () => sysClose(false));
  if (!ready){ render(); firstLoad(); }
  else { setDirty(dirty); renderMapSel(); render(); }
}
window.SMB = {mount, isDirty: () => dirty, example: () => example(),
  reset(){ ready = false; lastRO = null; S = blank(); dirty = false; step = 1; maps = []; E = null; linkSrc = null; }};
})();
