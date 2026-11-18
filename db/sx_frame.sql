-- หมวดแนวคิดช่วยคิด (ไม่บังคับ): 7S สำหรับจุดแข็ง/จุดอ่อน และ PESTEL สำหรับโอกาส/อุปสรรค
-- ใช้กับโปรเจกต์ Supabase เดียวกับระบบรวบรวมมุมมอง — รันแล้วเมื่อ 2569-11-18 (migration: sx_entries_frame_7s_pestel)
-- ปล่อยว่างได้เสมอ ค่าที่ไม่รู้จักจะถูกเก็บเป็น null
alter table public.sx_entries add column if not exists frame text
  check (frame is null or frame in ('strategy','structure','systems','values','style','staff','skills','political','economic','social','technological','environmental','legal'));
-- ฟังก์ชัน sx_save_entry / sx_my_entries / sx_peer_view ถูกปรับให้รับและส่งคืนช่อง frame ด้วย
-- (sx_admin_all ส่งคืนช่อง frame อยู่แล้วเพราะใช้ to_jsonb ของทั้งแถว) ดูนิยามล่าสุดได้จากฐานข้อมูล
