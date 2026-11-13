# Strategy Map Builder – โรงพยาบาลสันทราย

เครื่องมือสร้างแผนที่ยุทธศาสตร์ (Strategy Map / BSC) 7 ขั้นตอน
Frontend เป็นไฟล์ static (Vercel) · Backend เป็น Google Apps Script · ฐานข้อมูลเป็น Google Sheet

```
index.html   หน้าเว็บทั้งหมด (ไม่ต้อง build)
detail.js    รายละเอียดรายการ/กลุ่มงาน/ประเด็นรวม (การ์ดลอยบนกราฟ + แผงข้างในมุมมองรายการ) และตัวช่วยจัดกลุ่มของทีมยุทธศาสตร์
graph.js     กราฟเครือข่ายกลุ่มงาน (ซูม/เลื่อน/ไฮไลต์ รองรับ ~60 กลุ่มงาน)
config.js    ตั้งค่า GAS_URL
vercel.json  ตั้งค่า Vercel
gas/Code.gs, gas/appsscript.json   โค้ด Backend
```

## 1) ติดตั้ง Backend (Google Apps Script)
1. เข้า https://script.google.com → **โปรเจกต์ใหม่** ตั้งชื่อ เช่น `StrategyMap API`
2. วางโค้ดจาก `gas/Code.gs` ทับไฟล์ `Code.gs`
3. (แนะนำ) เปิด **Project Settings → Show "appsscript.json"** แล้ววางเนื้อหาจาก `gas/appsscript.json`
4. **Project Settings → Script properties → Add**
   - `PASSCODE` = รหัสผ่านที่ใช้เข้าแอป (ตั้งเองได้)
   - `SHEET_ID` = (ไม่บังคับ) ID ของ Google Sheet ที่มีอยู่แล้ว ถ้าไม่ใส่ ระบบจะสร้างไฟล์ `StrategyMap_DB_รพ.สันทราย` ให้เอง
5. เลือกฟังก์ชัน `setup` แล้วกด **Run** เพื่ออนุญาตสิทธิ์ครั้งแรก (ดู URL ของ Sheet ได้ใน Execution log)
6. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - คัดลอก URL ที่ลงท้าย `/exec`

> แก้โค้ด `Code.gs` ภายหลัง ต้อง **Deploy → Manage deployments → Edit → New version** URL จึงจะใช้โค้ดใหม่

## 2) ตั้งค่า Frontend
แก้ `config.js`
```js
window.APP_CONFIG = { GAS_URL: 'https://script.google.com/macros/s/xxxxx/exec', REQUIRE_PASS: true };
```
ทดสอบในเครื่อง: `npx serve .` (ถ้า `GAS_URL` ว่าง แอปจะทำงานโหมดทดลองเก็บข้อมูลในเบราว์เซอร์)

## 3) ขึ้น GitHub → Vercel
```bash
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<ชื่อคุณ>/sansai-strategy-map.git
git push -u origin main
```
จากนั้นที่ https://vercel.com → **Add New → Project → Import** repo นี้
Framework Preset = **Other**, ไม่ต้องใส่ Build Command, Output Directory เว้นว่าง (root) → **Deploy**

## หมายเหตุด้านความปลอดภัย
- `GAS_URL` เห็นได้จากฝั่งเบราว์เซอร์ จึงต้องตั้ง `PASSCODE` ทุกครั้ง ถ้าไม่ตั้ง ใครมี URL ก็อ่าน/เขียนข้อมูลได้
- รหัสผ่านถูกเก็บใน localStorage ของเบราว์เซอร์ผู้ใช้ และตรวจที่ฝั่ง Apps Script ไม่ใช่ระบบ login รายบุคคล หากต้องการแยกสิทธิ์รายผู้ใช้ ควรใช้ Google Sign-in เพิ่มเติม
- ห้ามใส่ข้อมูลผู้ป่วยรายบุคคลในแอปนี้ (ออกแบบมาสำหรับข้อมูลระดับองค์กร)
- เซลล์ Google Sheet จุได้ 50,000 ตัวอักษร ระบบแบ่งเก็บแผนที่เป็นหลายคอลัมน์ให้อัตโนมัติ

## แผนที่ยุทธศาสตร์ในระบบรวบรวมมุมมอง
แท็บ "แผนที่ยุทธศาสตร์" (ไฟล์ `map.js`) แสดงครบ 8 ขั้นตอนของ Strategy Map Builder
- **ทุกคน** (กลุ่มงานและทีมยุทธศาสตร์) เปิดดูได้แบบอ่านอย่างเดียว ดาวน์โหลด SVG/PNG/CSV และพิมพ์ได้
- **ทีมยุทธศาสตร์** (เข้าด้วยรหัสผ่านแอดมิน) แก้ไข บันทึก และลบแผนที่ได้
- ข้อมูลเก็บในตาราง `sx_maps` ของ Supabase การเขียน/ลบตรวจรหัสผ่านที่ฝั่งฐานข้อมูล (SQL อยู่ที่ `db/sx_maps.sql`)

## โลโก้ แอนิเมชัน และโหมดตัวอย่าง

- **โลโก้** อยู่ในโฟลเดอร์ `assets/` (`logo.png` เต็ม, `emblem.png` เฉพาะตราสัญลักษณ์ใช้ที่หัวเว็บ, `favicon.png`, `apple-touch-icon.png`) — ถ้าจะเปลี่ยนโลโก้ ให้แทนที่ไฟล์ชื่อเดิม
- **แอนิเมชัน/สถานะโหลด** อยู่ท้ายไฟล์ `style.css` (หน้าเปิดระบบ แถบโหลดด้านบน spinner เลื่อนขึ้นเมื่อเปลี่ยนแท็บ ตัวเลขนับขึ้น ปุ่มหมุนขณะบันทึก) และปิดอัตโนมัติเมื่อเครื่องตั้งค่าลดการเคลื่อนไหว (`prefers-reduced-motion`)
- **โหมดตัวอย่าง** กดจากหน้าเข้าสู่ระบบได้ 2 แบบ: ผู้กรอก (กลุ่มงานเภสัชกรรม) และทีมยุทธศาสตร์ (16 กลุ่มงานกรอกเสร็จ มีผลโหวต) ข้อมูลสมมติทั้งหมดอยู่ใน `demo.js` ทำงานในหน่วยความจำของเบราว์เซอร์ **ไม่เรียก Supabase และไม่เขียนฐานข้อมูลจริง** รีเฟรชหน้าแล้วกลับเป็นปกติ
