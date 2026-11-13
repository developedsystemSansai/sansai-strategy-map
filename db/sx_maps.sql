-- แผนที่ยุทธศาสตร์: ทุกคนอ่านได้ (sx_map_list / sx_map_get) แต่เฉพาะทีมยุทธศาสตร์ (รหัสผ่านแอดมิน) บันทึก/ลบได้
-- ใช้กับโปรเจกต์ Supabase เดียวกับระบบรวบรวมมุมมอง (ต้องมี sx_auth อยู่แล้ว) — รันแล้วเมื่อ 2569-11-13
create table if not exists public.sx_maps (
  id text primary key,
  org text not null default '',
  year text not null default '',
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.sx_maps enable row level security;  -- ไม่มี policy: เข้าถึงผ่านฟังก์ชันด้านล่างเท่านั้น

create or replace function public.sx_map_list()
returns jsonb language sql security definer set search_path = '' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'org', org, 'year', year, 'updated_at', updated_at) order by updated_at desc), '[]'::jsonb)
  from public.sx_maps;
$$;

create or replace function public.sx_map_get(p_id text)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare v jsonb;
begin
  select data into v from public.sx_maps where id = p_id;
  if v is null then raise exception 'ไม่พบข้อมูลแผนที่'; end if;
  return v;
end $$;

create or replace function public.sx_map_save(p_pass text, p_map jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  perform public.sx_auth(p_pass, true);
  if jsonb_typeof(p_map) <> 'object' then raise exception 'ข้อมูลแผนที่ไม่ถูกต้อง'; end if;
  if pg_column_size(p_map) > 2000000 then raise exception 'ข้อมูลแผนที่ใหญ่เกินไป'; end if;
  v_id := nullif(p_map->>'id', '');
  if v_id is null then v_id := replace(gen_random_uuid()::text, '-', ''); end if;
  p_map := jsonb_set(p_map, '{id}', to_jsonb(v_id));
  insert into public.sx_maps(id, org, year, data, updated_at)
  values (v_id, left(coalesce(p_map->>'org', ''), 200), left(coalesce(p_map->>'year', ''), 40), p_map, now())
  on conflict (id) do update set org = excluded.org, year = excluded.year, data = excluded.data, updated_at = now();
  return jsonb_build_object('id', v_id, 'updatedAt', now());
end $$;

create or replace function public.sx_map_delete(p_pass text, p_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.sx_auth(p_pass, true);
  delete from public.sx_maps where id = p_id;
  return true;
end $$;

revoke all on function public.sx_map_list(), public.sx_map_get(text), public.sx_map_save(text, jsonb), public.sx_map_delete(text, text) from public;
grant execute on function public.sx_map_list(), public.sx_map_get(text), public.sx_map_save(text, jsonb), public.sx_map_delete(text, text) to anon, authenticated;
