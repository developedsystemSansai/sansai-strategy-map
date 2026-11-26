const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs'), path = require('path');
const root = require('path').resolve(__dirname, '..');
let html = fs.readFileSync(root + '/index.html', 'utf8').replace(/<link[^>]*>/g, '');
const errs = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => /getContext/.test((e.detail&&e.detail.message)||e.message) || errs.push('jsdomError: ' + (e.detail && e.detail.message || e.message))); vc.on('error', e => errs.push('console.error: ' + e));
const dom = new JSDOM(html, {url: 'file://' + root + '/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc});
const w = dom.window, d = w.document;
w.HTMLCanvasElement.prototype.getContext = () => ({font: '', measureText: t => ({width: String(t).length * 8}), fillText(){}, fillRect(){}, clearRect(){}, beginPath(){}, stroke(){}, fill(){}, save(){}, restore(){}});  // jsdom ไม่มี canvas จริง
w.matchMedia = w.matchMedia || (() => ({matches: false, addEventListener(){}, removeListener(){}}));
w.HTMLElement.prototype.scrollIntoView = function(){};
w.SVGElement.prototype.getBoundingClientRect = w.HTMLElement.prototype.getBoundingClientRect;
w.Element.prototype.setPointerCapture = function(){};
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
const click = el => el.dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true}));
const ev = (code) => w.eval(code);

/* ตรวจการเลือก/ลบลูกศรบนแผนที่ยุทธศาสตร์ (ขั้นที่ 5) ในโหมดตัวอย่าง  รัน: node tests/map-links.js */
w.print = () => {}; w.scrollTo = () => {};
const fire = (el, type, init) => { const e = new w.Event(type, Object.assign({bubbles: true, cancelable: true}, init || {})); el.dispatchEvent(e); return e; };
const key = (el, k) => { const e = new w.KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true}); el.dispatchEvent(e); return e; };
const mouse = (el, x, y) => el.dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true, clientX: x, clientY: y}));
const nLinks = () => ev('(function(){ return document.querySelectorAll("#map5 .lkg").length; })()');
const getLinks = () => JSON.parse(ev("JSON.stringify(SMB.links())"));
const snackTxt = () => ($('#bsnack.show') || {textContent: ''}).textContent;
(async () => {
  await sleep(1800);
  ev("startDemo('admin')"); await sleep(1800);
  click($('[data-atab="map"]')); await sleep(900);
  ok(!!$('#smbHost'), 'เปิดแท็บแผนที่ยุทธศาสตร์ได้');
  click($('#smbTabs [data-s="5"]')); await sleep(400);
  const total = $$('.linkitem').length; ok(total > 5, 'ขั้นที่ 5 มีรายการลูกศร ' + total + ' เส้น');
  ok($$('#map5 .lkg').length === total && $$('#map5 .lkhit').length === total && $$('#map5 .lkg').every(g => g.getAttribute('tabindex') === '0' && g.getAttribute('role') === 'button' && /ลูกศร/.test(g.getAttribute('aria-label'))), 'ลูกศรทุกเส้นบนแผนที่คลิกได้ (มีพื้นที่คลิกกว้าง) และเข้าถึงด้วยแป้นพิมพ์ได้');
  ok(/ลบลูกศร/.test($('.mode').textContent) && /Delete/.test($('.mode').textContent), 'มีคำแนะนำวิธีลบลูกศรในกล่องแนะนำ');
  ok($('.linkitem [data-act="delLink"]').getAttribute('title') === 'ลบลูกศรเส้นนี้' && /ลบลูกศร/.test($('.linkitem [data-act="delLink"]').getAttribute('aria-label')), 'ปุ่ม ✕ ในรายการมีคำอธิบายและป้ายสำหรับโปรแกรมอ่านหน้าจอ');
  const linkData = getLinks(); const L0 = linkData[0];
  // ---- เลือกลูกศรด้วยการคลิก ----
  const g0 = $('#map5 .lkg[data-lk="0"]'); mouse($('#map5 .lkhit[d]') && g0.querySelector('.lkhit'), 400, 300); await sleep(60);
  ok(g0.classList.contains('sel') && g0.querySelector('.lkv').getAttribute('marker-end') === 'url(#ahs)' && $('.linkitem[data-i="0"]').classList.contains('sel'), 'คลิกลูกศร: เส้นถูกเลือก (เปลี่ยนสีแดง หัวลูกศรแดง) และรายการในลิสต์ถูกไฮไลต์ตาม');
  const pop = $('#map5 .lkpop'); ok(!!pop && /ลบลูกศรนี้/.test(pop.textContent) && pop.querySelector('[data-act="delLink"]').dataset.i === '0', 'มีปุ่ม "ลบลูกศรนี้" โผล่ข้างเส้นที่เลือก พร้อมรหัสต้นทาง → ปลายทาง (' + pop.querySelector('span').textContent.replace(/\s+/g, ' ') + ')');
  ok(w.document.activeElement === g0 || g0.contains(w.document.activeElement), 'โฟกัสแป้นพิมพ์อยู่ที่เส้นที่เลือก (กด Delete ได้ทันที)');
  mouse($('#map5 svg'), 5, 5); await sleep(60); ok(!$('#map5 .lkpop') && !$('#map5 .lkg.sel'), 'คลิกพื้นที่ว่างบนแผนที่: ยกเลิกการเลือก');
  mouse(g0.querySelector('.lkhit'), 400, 300); await sleep(60); key(g0, 'Escape'); await sleep(60); ok(!$('#map5 .lkpop') && !$('#map5 .lkg.sel'), 'กด Esc: ยกเลิกการเลือก');
  // ---- ลบด้วยปุ่มที่โผล่ + เลิกทำ ----
  mouse(g0.querySelector('.lkhit'), 400, 300); await sleep(60); click($('#map5 .lkpop [data-act="delLink"]')); await sleep(150);
  ok($$('.linkitem').length === total - 1 && $$('#map5 .lkg').length === total - 1 && getLinks().length === total - 1 && !getLinks().some(l => l.from === L0.from && l.to === L0.to), 'กด "ลบลูกศรนี้": เส้นหายจากแผนที่ รายการ และข้อมูล');
  ok(/ลบลูกศร/.test(snackTxt()) && /เลิกทำ/.test(snackTxt()), 'มีแถบ "เลิกทำ" แสดงรหัสเส้นที่ลบ  [' + snackTxt() + ']');
  click($('#bsnack button')); await sleep(150);
  const after = getLinks(); ok(after.length === total && after[0].from === L0.from && after[0].to === L0.to && $$('#map5 .lkg').length === total, 'เลิกทำ: ลูกศรกลับมาที่ตำแหน่งเดิมในลำดับ');
  // ---- ลบด้วยแป้น Delete ----
  const gi = $('#map5 .lkg[data-lk="2"]'), L2 = after[2]; mouse(gi.querySelector('.lkhit'), 420, 320); await sleep(60); key(w.document.activeElement, 'Delete'); await sleep(150);
  ok(getLinks().length === total - 1 && !getLinks().some(l => l.from === L2.from && l.to === L2.to), 'เลือกเส้นแล้วกด Delete: ลบได้');
  click($('#bsnack button')); await sleep(150); ok(getLinks().length === total, 'เลิกทำการลบด้วย Delete');
  // ---- แป้นพิมพ์ล้วน: Tab → Enter เลือก → Delete ----
  const g3 = $('#map5 .lkg[data-lk="3"]'); g3.focus(); key(g3, 'Enter'); await sleep(60); ok(g3.classList.contains('sel'), 'โฟกัสเส้นด้วยแป้นพิมพ์แล้วกด Enter: เลือกได้');
  key(w.document.activeElement, 'Backspace'); await sleep(150); ok(getLinks().length === total - 1, 'กด Backspace ลบเส้นที่เลือกได้เช่นกัน'); click($('#bsnack button')); await sleep(150);
  // ---- ปุ่ม ✕ ในรายการ + เลิกทำ ----
  click($('.linkitem[data-i="1"] [data-act="delLink"]')); await sleep(150); ok($$('.linkitem').length === total - 1 && /เลิกทำ/.test(snackTxt()), 'ปุ่ม ✕ ในรายการ: ลบได้ และมีเลิกทำด้วย');
  click($('#bsnack button')); await sleep(150); ok($$('.linkitem').length === total, 'เลิกทำจากการลบในรายการ');
  // ---- ไม่พิมพ์ทับขณะแก้ช่องข้อความ ----
  const sel = $('#lkFrom'); sel.focus(); const kept = getLinks().length; mouse($('#map5 .lkg[data-lk="4"] .lkhit'), 300, 300); await sleep(40); sel.focus(); key(sel, 'Delete'); await sleep(100);
  ok(getLinks().length === kept, 'กด Delete ขณะโฟกัสอยู่ที่ช่องเลือก/ช่องพิมพ์: ไม่ลบลูกศร');
  mouse($('#map5 svg'), 5, 5); await sleep(40);
  // ---- คลิกข้อความในรายการ = ไฮไลต์ที่แผนที่ ----
  click($('.linkitem[data-i="5"] .t')); await sleep(80); ok($('#map5 .lkg[data-lk="5"]').classList.contains('sel') && $('.linkitem[data-i="5"]').classList.contains('sel') && !!$('#map5 .lkpop'), 'คลิกข้อความในรายการ: ไฮไลต์เส้นนั้นบนแผนที่ พร้อมปุ่มลบ');
  // ---- เลื่อนเมาส์บนรายการ ----
  fire($('.linkitem[data-i="6"] .t'), 'mouseover'); ok($('#map5 .lkg[data-lk="6"]').classList.contains('hov'), 'ชี้เมาส์ที่รายการ: เส้นนั้นบนแผนที่ขึ้นไฮไลต์'); fire($('.linkitem[data-i="6"] .t'), 'mouseout'); ok(!$('#map5 .lkg.hov'), 'เอาเมาส์ออก: ไฮไลต์หาย');
  // ---- ส่งออก/พิมพ์ไม่ติดพื้นที่คลิก ----
  const exp = ev("SMB.svg()"); ok(!/lkhit|lkg|data-lk|tabindex/.test(exp) && /marker-end="url\(#ah\)"/.test(exp), 'ไฟล์แผนที่ที่ส่งออก (SVG/PNG/พิมพ์) ไม่มีพื้นที่คลิกหรือสถานะเลือก');
  // ---- เพิ่มลูกศรใหม่ผ่านฟอร์ม: วาดใหม่ถูกต้อง ไม่มีเมนูค้าง ----
  mouse($('#map5 .lkg[data-lk="4"] .lkhit'), 300, 300); await sleep(40);
  const have = new Set(getLinks().map(l => l.from + '>' + l.to)); const fromS = $('#lkFrom'), toS = $('#lkTo'); let added = false;
  for (const f of [...fromS.options]) { for (const o of [...toS.options]) { if (f.value !== o.value && !have.has(f.value + '>' + o.value)) { fromS.value = f.value; toS.value = o.value; added = true; break; } } if (added) break; }
  click($('[data-act="addLink"]')); await sleep(150);
  ok(added && getLinks().length === total + 1 && $$('.linkitem').length === total + 1 && $$('#map5 .lkg').length === total + 1 && !$('.lkpop') && !$('.lkg.sel'), 'เพิ่มลูกศรใหม่: แผนที่และลิสต์ตรงกัน และล้างการเลือกเดิม');
  // ---- โหมดอ่านอย่างเดียว (เปิดแผนที่แบบไม่มีสิทธิ์แก้) ----
  ev("SMB.mount($('#smbHost'), {rpc, pass: () => '', canEdit: false})"); await sleep(1500);
  const t5 = $('#smbTabs [data-s="5"]'); if (t5){ click(t5); await sleep(300); }
  ok(!!t5 && !!$('#map5') && $$('#map5 .lkg').length === 0 && $$('#map5 .lkhit').length === 0 && $$('#map5 path[marker-end]').length > 0, 'โหมดอ่านอย่างเดียว: เห็นลูกศรแต่คลิก/ลบไม่ได้ (ไม่มีพื้นที่คลิก)');
  ok(errs.length === 0, 'ไม่มี runtime error ' + errs.join(' | '));
  console.log(`\n== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
})();
