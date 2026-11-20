-- ทีมยุทธศาสตร์ลากโน้ตบน Strategic Board: ย้ายรายการ S/W/O/T ไปหมวดอื่น (frame) และ/หรือเปลี่ยนประเภทข้ามฝั่ง (S/W ภายใน <-> O/T ภายนอก)
-- ใช้รหัสผ่านแอดมินเท่านั้น คืนค่าเดิม (prev) เพื่อให้เลิกทำได้ ไม่แก้ข้อความ ผู้กรอก หรือกลุ่มงานของรายการ
-- ใช้กับโปรเจกต์ Supabase เดียวกับระบบรวบรวมมุมมอง (migration: sx_admin_move_entry)
create or replace function public.sx_admin_move_entry(p_pass text, p_id text, p_kind text, p_frame text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_kind text; v_frame text; v_new text; v_in text[] := array['strategy','structure','systems','values','style','staff','skills'];
        v_ex text[] := array['political','economic','social','technological','environmental','legal'];
begin
  perform public.sx_auth(p_pass, true);
  select kind, frame into v_kind, v_frame from public.sx_entries where id = p_id;
  if not found then raise exception 'ไม่พบรายการ'; end if;
  if v_kind not in ('S','W','O','T') or p_kind is null or p_kind not in ('S','W','O','T') then raise exception 'ย้ายได้เฉพาะรายการ S/W/O/T'; end if;
  v_new := nullif(btrim(coalesce(p_frame, '')), '');
  if v_new is not null then
    if not (v_new = any(v_in) or v_new = any(v_ex)) then raise exception 'หมวดไม่ถูกต้อง'; end if;
    if (p_kind in ('S','W')) <> (v_new = any(v_in)) then raise exception 'หมวดไม่ตรงกับประเภท (S/W ใช้ 7S, O/T ใช้ PESTEL)'; end if;
  end if;
  update public.sx_entries set kind = p_kind, frame = v_new, updated_at = now() where id = p_id;
  return jsonb_build_object('id', p_id, 'kind', p_kind, 'frame', v_new, 'prev', jsonb_build_object('kind', v_kind, 'frame', v_frame));
end $$;
revoke all on function public.sx_admin_move_entry(text, text, text, text) from public;
grant execute on function public.sx_admin_move_entry(text, text, text, text) to anon, authenticated;
