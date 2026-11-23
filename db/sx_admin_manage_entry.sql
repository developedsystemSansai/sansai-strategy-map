-- ทีมยุทธศาสตร์ลบ / กู้คืน / แก้ไขข้อความ รายการของกลุ่มงาน (ใช้รหัสผ่านแอดมินเท่านั้น)
-- ทุกฟังก์ชันคืนค่าเดิมเพื่อให้เลิกทำได้ · ใช้กับโปรเจกต์ Supabase เดียวกับระบบรวบรวมมุมมอง (migration: sx_admin_delete_restore_edit_entry)
create or replace function public.sx_admin_delete_entry(p_pass text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  perform public.sx_auth(p_pass, true);
  delete from public.sx_entries e where e.id = p_id returning to_jsonb(e) into r;
  if r is null then raise exception 'ไม่พบรายการ'; end if;
  return r;
end $$;

create or replace function public.sx_admin_restore_entry(p_pass text, p_entry jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id text := p_entry->>'id'; v_cl text := nullif(p_entry->>'cluster_id', ''); v_frame text := nullif(p_entry->>'frame', '');
begin
  perform public.sx_auth(p_pass, true);
  if v_id is null or coalesce(btrim(p_entry->>'wg'), '') = '' or coalesce(btrim(p_entry->>'body'), '') = '' then raise exception 'ข้อมูลรายการไม่ครบ'; end if;
  if v_cl is not null and not exists (select 1 from public.sx_clusters where id = v_cl) then v_cl := null; end if;
  insert into public.sx_entries(id, wg, author, kind, body, detail, priority, frame, cluster_id, created_at, updated_at)
  values (v_id, p_entry->>'wg', coalesce(p_entry->>'author', ''), p_entry->>'kind', p_entry->>'body', coalesce(p_entry->>'detail', ''),
          coalesce((p_entry->>'priority')::int, 2), v_frame, v_cl, coalesce((p_entry->>'created_at')::timestamptz, now()), now())
  on conflict (id) do nothing;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.sx_admin_edit_entry(p_pass text, p_id text, p_body text, p_detail text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_body text := btrim(coalesce(p_body, '')); v_detail text := btrim(coalesce(p_detail, '')); ob text; od text;
begin
  perform public.sx_auth(p_pass, true);
  if v_body = '' then raise exception 'ข้อความว่าง'; end if;
  if char_length(v_body) > 1000 or char_length(v_detail) > 2000 then raise exception 'ข้อความยาวเกินกำหนด'; end if;
  select body, detail into ob, od from public.sx_entries where id = p_id;
  if not found then raise exception 'ไม่พบรายการ'; end if;
  update public.sx_entries set body = v_body, detail = v_detail, updated_at = now() where id = p_id;
  return jsonb_build_object('id', p_id, 'body', v_body, 'detail', v_detail, 'prev', jsonb_build_object('body', ob, 'detail', od));
end $$;

revoke all on function public.sx_admin_delete_entry(text, text), public.sx_admin_restore_entry(text, jsonb), public.sx_admin_edit_entry(text, text, text, text) from public;
grant execute on function public.sx_admin_delete_entry(text, text), public.sx_admin_restore_entry(text, jsonb), public.sx_admin_edit_entry(text, text, text, text) to anon, authenticated;
