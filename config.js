// ตั้งค่าการเชื่อมต่อ Backend (Google Apps Script)
window.APP_CONFIG = {
  // วาง URL ของ Web App ที่ Deploy จาก Apps Script (ลงท้าย /exec)
  // ถ้าเว้นว่าง แอปจะทำงานโหมดทดลอง เก็บข้อมูลในเบราว์เซอร์เท่านั้น
  GAS_URL: '',
  // true = ให้ผู้ใช้กรอกรหัสผ่าน (ต้องตรงกับ Script Property ชื่อ PASSCODE ใน Apps Script)
  REQUIRE_PASS: true
};
