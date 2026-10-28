-- Guards that apply to every table and function in the public schema.
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  (select array_agg(tablename::text order by tablename)
     from pg_tables
    where schemaname = 'public' and not rowsecurity),
  null,
  'every table in public has row level security enabled'
);

select is(
  (select array_agg(distinct table_name::text || ':' || privilege_type order by table_name::text || ':' || privilege_type)
     from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type <> 'SELECT'),
  null,
  'anonymous visitors cannot write to any table'
);

select set_eq(
  $$ select distinct table_name::text
       from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon' $$,
  array['categories', 'category_credentials', 'category_ppe', 'credential_types', 'hazards', 'ppe_items'],
  'anonymous visitors can read only the public catalogues'
);

select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
      )),
  null,
  'every SECURITY DEFINER function pins its search_path'
);

select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and has_function_privilege('anon', p.oid, 'execute')),
  null,
  'anonymous visitors cannot call any function in public'
);

select * from finish();
rollback;
