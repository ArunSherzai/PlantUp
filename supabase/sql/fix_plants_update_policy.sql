-- Fix Plant card updates failing with:
--   42703: column "plant_id" does not exist
--
-- In the current schema, social_media_schema."Plants" has "id" and "user_id".
-- It does not have "plant_id". If updates fail with this error, an UPDATE
-- policy or trigger/function on "Plants" is still referencing plant_id.

-- 1) Find broken row-level security policies on Plants.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'social_media_schema'
  and tablename = 'Plants'
  and (
    qual ilike '%plant_id%'
    or with_check ilike '%plant_id%'
  );

-- 2) Drop any UPDATE/ALL policy on Plants that references the missing column.
do $$
declare
  broken_policy record;
begin
  for broken_policy in
    select policyname
    from pg_policies
    where schemaname = 'social_media_schema'
      and tablename = 'Plants'
      and cmd in ('UPDATE', 'ALL')
      and (
        qual ilike '%plant_id%'
        or with_check ilike '%plant_id%'
      )
  loop
    execute format(
      'drop policy if exists %I on social_media_schema."Plants"',
      broken_policy.policyname
    );
  end loop;
end $$;

drop policy if exists "Users can update own plants"
on social_media_schema."Plants";

create policy "Users can update own plants"
on social_media_schema."Plants"
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 3) Check triggers on Plants. If any trigger function definition contains
-- NEW.plant_id or OLD.plant_id, edit that function to use NEW.id or OLD.id.
select
  trigger_name,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'social_media_schema'
  and event_object_table = 'Plants';
