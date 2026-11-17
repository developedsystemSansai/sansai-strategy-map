/* ตรวจส่วนสถิติความคืบหน้าบนหน้าล็อกอิน (ใช้ข้อมูลจำลอง)  รัน: node tests/login-progress.js [ok|fail] */
const {JSDOM, VirtualConsole} = require('jsdom'); const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(root + '/index.html', 'utf8').replace(/<link[^>]*>/g, '');
const errs = []; const vc = new VirtualConsole();
vc.on('jsdomError', e => /getContext/.test((e.detail&&e.detail.message)||e.message) || errs.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));
const mode = process.argv[2] || 'ok';
const dom = new JSDOM(html, {url: 'file://' + root + '/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc});
const w = dom.window, d = w.document; let calls = 0;
w.HTMLCanvasElement.prototype.getContext = () => ({font:'', measureText: t => ({width: String(t).length*8})});
w.matchMedia = w.matchMedia || (() => ({matches:false, addEventListener(){}, removeListener(){}}));
w.fetch = async (url, opt) => {
  calls++; if (mode === 'fail') throw new Error('offline');
  if (/sx_public_progress/.test(url)) return {ok:true, json: async () => ({groups:[
    {wg:'กลุ่มงานการพยาบาล', items:12, done:true, last:'2026-11-17T03:00:00Z'},
    {wg:'กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค', items:7, done:true, last:'2026-11-17T04:00:00Z'},
    {wg:'กลุ่มงานแพทย์', items:3, done:false, last:'2026-11-17T05:00:00Z'},
    {wg:'หน่วยงานนอกรายการ', items:2, done:false, last:'2026-11-17T05:30:00Z'}], now:'x'})};
  return {ok:false, status:500, json: async () => ({})};
};
const sleep = ms => new Promise(r => setTimeout(r, ms)); const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
let pass=0, fail=0; const ok=(c,m)=>{c?pass++:fail++; console.log((c?'PASS ':'FAIL ')+m)};
(async () => {
  await sleep(2200);
  const sec = $('#prog'); ok(!!sec, 'มีส่วนสถิติ #prog บนหน้าล็อกอิน');
  if (mode === 'ok') {
    const nums = $$('#prog .pstat b').map(b => b.textContent); console.log('stats:', nums.join(','));
    ok(nums[0]==='2' && nums[1]==='2', 'ส่งแล้ว 2 กำลังกรอก 2 (รวมกลุ่มนอกรายการ)');
    const total = +nums[3], none = +nums[2]; ok(total === none + 4, 'ยังไม่เริ่ม = ทั้งหมด − 4  (' + none + '+4=' + total + ')');
    ok($$('#prog .pchip.d').length === 2 && $$('#prog .pchip.w').length === 2, 'ชิปส่งแล้ว 2 / กำลังกรอก 2');
    ok(/12 รายการ/.test($('#prog').textContent) === false && /3 รายการ/.test($('#prog').textContent), 'กลุ่มที่กำลังกรอกแสดงจำนวนรายการ');
    ok(!!$('#prog details.pnone'), 'รายชื่อที่ยังไม่เริ่มพับไว้ใน details');
    ok($('#prog .pbar i.d').style.width !== '' && $('#prog .pbar i.w').style.width !== '', 'แถบความคืบหน้ามีความกว้างทั้งสองส่วน');
    ok(/ไม่แสดงเนื้อหา/.test($('#prog').textContent), 'มีข้อความระบุว่าแสดงเฉพาะชื่อกลุ่มและจำนวน');
    const before = calls; $('[data-progreload]').dispatchEvent(new w.MouseEvent('click', {bubbles:true})); await sleep(300);
    ok(calls === before + 1, 'ปุ่มรีเฟรชเรียกฐานข้อมูลอีกครั้ง');
    // สลับโหมดล็อกอินแล้วสถิติยังอยู่
    $('[data-lmode]').dispatchEvent(new w.MouseEvent('click', {bubbles:true})); await sleep(200);
    ok(!!$('#prog .pstat'), 'สลับโหมดทีมยุทธศาสตร์ สถิติยังแสดง');
  } else {
    ok(/ไม่ได้|เชื่อมต่อ/.test(sec.textContent), 'โหลดไม่ได้: แสดงข้อความแทน ไม่พัง  [' + sec.textContent.replace(/\s+/g,' ').slice(0,80) + ']');
    ok(!!$('#f1'), 'ฟอร์มล็อกอินยังใช้งานได้');
  }
  ok(errs.length === 0, 'ไม่มี runtime error ' + errs.join(' | '));
  console.log(`== ${pass} passed, ${fail} failed ==`); process.exit(fail ? 1 : 0);
})();
