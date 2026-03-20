-- ============================================================================
-- PlantUp Plant Logic Hardening
-- Date: 2026-03-20
--
-- Purpose
-- 1. Enforce cleaner plant metadata in social_media_schema.Plants
-- 2. Add a server-side plant_alerts table for warnings / nudges
-- 3. Recompute alerts automatically from latest controller readings
-- 4. Expose an RPC for the app to read active alerts
--
-- Important
-- - Run this first in a staging project.
-- - This file is intentionally defensive and mostly idempotent.
-- - Legacy Plants rows without plant_data_id are auto-mapped to a fallback
--   Plant_data row so this file can run end-to-end in one pass.
-- ============================================================================

begin;

-- ============================================================================
-- 0. Preconditions / safety
-- ============================================================================

create extension if not exists pgcrypto;

-- Ensure schemas exist
create schema if not exists social_media_schema;
create schema if not exists microcontroller_schema;

-- ============================================================================
-- 1. Plant metadata hardening
-- ============================================================================

-- Create a fallback plant profile so legacy rows without plant_data_id
-- can be migrated automatically in the same file.
insert into social_media_schema."Plant_data" (
  id,
  common_name,
  ideal_temperature_min_winter,
  ideal_temperature_min_summer,
  ideal_temperature_max_winter,
  ideal_temperature_max_summer,
  ideal_soil_moisture_min_summer,
  ideal_soil_moisture_min_winter,
  ideal_soil_moisture_max_summer,
  ideal_soil_moisture_max_winter,
  ideal_humidity_min_winter,
  ideal_humidity_min_summer,
  ideal_humidity_max_winter,
  ideal_humidity_max_summer,
  ideal_ec_min_winter,
  ideal_ec_min_summer,
  ideal_ec_max_winter,
  ideal_ec_max_summer,
  ideal_light_min_winter,
  ideal_light_min_summer,
  ideal_light_max_winter,
  ideal_light_max_summer,
  ideal_soil_type
)
select
  999999,
  'Unknown Plant (Fallback)',
  15,
  18,
  22,
  28,
  30,
  25,
  65,
  55,
  35,
  40,
  65,
  70,
  0.5,
  0.8,
  2.0,
  2.5,
  500,
  1000,
  10000,
  15000,
  'generic indoor potting mix'
where not exists (
  select 1
  from social_media_schema."Plant_data"
  where id = 999999
);

-- Normalize obvious empty strings so later constraints are meaningful.
update social_media_schema."Plants"
set nickname = null
where btrim(coalesce(nickname, '')) = '';

-- Trim whitespace on text columns.
update social_media_schema."Plants"
set nickname = btrim(nickname)
where nickname is not null
  and nickname <> btrim(nickname);

update social_media_schema."Plants"
set description = nullif(btrim(description), '')
where description is not null;

-- Auto-heal legacy plant rows that have no linked plant type.
update social_media_schema."Plants"
set plant_data_id = 999999
where plant_data_id is null;

-- Enforce sane nickname length.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plants_nickname_length_chk'
  ) then
    alter table social_media_schema."Plants"
      add constraint plants_nickname_length_chk
      check (nickname is null or char_length(nickname) between 1 and 50);
  end if;
end $$;

-- Enforce sane description length.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plants_description_length_chk'
  ) then
    alter table social_media_schema."Plants"
      add constraint plants_description_length_chk
      check (description is null or char_length(description) <= 500);
  end if;
end $$;

-- Add FK from Plants.plant_data_id to Plant_data(id) if not already present.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plants_plant_data_id_fkey'
  ) then
    alter table social_media_schema."Plants"
      add constraint plants_plant_data_id_fkey
      foreign key (plant_data_id)
      references social_media_schema."Plant_data"(id)
      on update cascade
      on delete restrict;
  end if;
end $$;

-- Enforce NOT NULL now that legacy NULL rows have been auto-healed.
do $$
begin
  begin
    alter table social_media_schema."Plants"
      alter column plant_data_id set not null;
  exception
    when others then
      -- Ignore if already not null or if the platform reports a harmless duplicate state.
      null;
  end;
end $$;

create index if not exists plants_user_id_idx
  on social_media_schema."Plants"(user_id);

create index if not exists plants_plant_data_id_idx
  on social_media_schema."Plants"(plant_data_id);

-- ============================================================================
-- 2. Alert table
-- ============================================================================

create table if not exists social_media_schema.plant_alerts (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references social_media_schema."Plants"(id) on delete cascade,
  user_id uuid not null,
  alert_key text not null,
  alert_type text not null,
  severity text not null,
  title text not null,
  message text not null,
  metric text null,
  current_value double precision null,
  target_min double precision null,
  target_max double precision null,
  source text not null default 'system',
  reading_created_at timestamptz null,
  active boolean not null default true,
  first_triggered_at timestamptz not null default now(),
  last_triggered_at timestamptz not null default now(),
  resolved_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plant_alerts_alert_key_chk check (char_length(alert_key) > 0),
  constraint plant_alerts_alert_type_chk check (
    alert_type in (
      'plant_data_missing',
      'sensor_fault',
      'soil_moisture_low',
      'soil_moisture_high',
      'humidity_low',
      'humidity_high',
      'temperature_low',
      'temperature_high',
      'light_low',
      'light_high',
      'ec_low',
      'ec_high',
      'progress_photo_due'
    )
  ),
  constraint plant_alerts_severity_chk check (severity in ('critical', 'warning', 'info'))
);

create unique index if not exists plant_alerts_active_unique_idx
  on social_media_schema.plant_alerts(plant_id, alert_key)
  where active = true;

create index if not exists plant_alerts_plant_id_active_idx
  on social_media_schema.plant_alerts(plant_id, active, severity, last_triggered_at desc);

create index if not exists plant_alerts_user_id_active_idx
  on social_media_schema.plant_alerts(user_id, active, severity, last_triggered_at desc);

-- ============================================================================
-- 3. Generic updated_at helper
-- ============================================================================

create or replace function social_media_schema.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists plant_alerts_set_updated_at on social_media_schema.plant_alerts;
create trigger plant_alerts_set_updated_at
before update on social_media_schema.plant_alerts
for each row
execute function social_media_schema.set_updated_at();

-- ============================================================================
-- 4. Alert upsert helper
-- ============================================================================

create or replace function social_media_schema.upsert_plant_alert(
  p_plant_id uuid,
  p_user_id uuid,
  p_alert_key text,
  p_alert_type text,
  p_severity text,
  p_title text,
  p_message text,
  p_metric text default null,
  p_current_value double precision default null,
  p_target_min double precision default null,
  p_target_max double precision default null,
  p_reading_created_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  insert into social_media_schema.plant_alerts (
    plant_id,
    user_id,
    alert_key,
    alert_type,
    severity,
    title,
    message,
    metric,
    current_value,
    target_min,
    target_max,
    reading_created_at,
    metadata,
    active,
    first_triggered_at,
    last_triggered_at,
    resolved_at
  )
  values (
    p_plant_id,
    p_user_id,
    p_alert_key,
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_metric,
    p_current_value,
    p_target_min,
    p_target_max,
    p_reading_created_at,
    coalesce(p_metadata, '{}'::jsonb),
    true,
    now(),
    now(),
    null
  )
  on conflict (plant_id, alert_key)
  where active = true
  do update set
    user_id = excluded.user_id,
    alert_type = excluded.alert_type,
    severity = excluded.severity,
    title = excluded.title,
    message = excluded.message,
    metric = excluded.metric,
    current_value = excluded.current_value,
    target_min = excluded.target_min,
    target_max = excluded.target_max,
    reading_created_at = excluded.reading_created_at,
    metadata = excluded.metadata,
    active = true,
    resolved_at = null,
    last_triggered_at = now(),
    updated_at = now();
end;
$$;

-- ============================================================================
-- 5. Main alert recomputation function
-- ============================================================================

create or replace function social_media_schema.recompute_plant_alerts(
  p_plant_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, social_media_schema, microcontroller_schema
as $$
declare
  v_plant social_media_schema."Plants"%rowtype;
  v_thresholds record;
  v_controller record;
  v_latest_photo record;
  v_now timestamptz := now();
  v_is_summer boolean;
  v_active_keys text[] := array[]::text[];
  v_min double precision;
  v_max double precision;
begin
  select *
  into v_plant
  from social_media_schema."Plants"
  where id = p_plant_id;

  if not found then
    return;
  end if;

  if v_plant.plant_data_id is not null then
    select *
    into v_thresholds
    from social_media_schema."Plant_data"
    where id = v_plant.plant_data_id;
  end if;

  select *
  into v_controller
  from microcontroller_schema."Controllers"
  where plant_id = p_plant_id
  order by created_at desc nulls last, "time" desc nulls last
  limit 1;

  select created_at
  into v_latest_photo
  from social_media_schema."Plant_progress_photos"
  where plant_id = p_plant_id
  order by created_at desc
  limit 1;

  v_is_summer := extract(month from v_now) between 5 and 9;

  if v_plant.plant_data_id is null then
    v_active_keys := array_append(v_active_keys, 'plant_data_missing');
    perform social_media_schema.upsert_plant_alert(
      p_plant_id,
      v_plant.user_id,
      'plant_data_missing',
      'plant_data_missing',
      'warning',
      'Plant type missing',
      'This plant has no linked plant profile. Assign a plant type so warnings and health scoring are accurate.',
      null,
      null,
      null,
      null,
      null,
      jsonb_build_object('recommended_action', 'assign_plant_type')
    );
  end if;

  if v_controller is not null then
    -- Sensor sanity checks first
    if v_controller.soil_moisture is null or v_controller.soil_moisture < 0 or v_controller.soil_moisture > 100 then
      v_active_keys := array_append(v_active_keys, 'sensor_fault:soil_moisture');
      perform social_media_schema.upsert_plant_alert(
        p_plant_id,
        v_plant.user_id,
        'sensor_fault:soil_moisture',
        'sensor_fault',
        'critical',
        'Soil sensor issue',
        format('The latest soil moisture reading (%s) looks invalid. Recalibrate or check the sensor.', round(coalesce(v_controller.soil_moisture, -1)::numeric, 2)),
        'soil_moisture',
        v_controller.soil_moisture,
        0,
        100,
        v_controller.created_at,
        jsonb_build_object('recommended_action', 'check_sensor')
      );
    end if;

    if v_controller.humidity is not null and (v_controller.humidity < 0 or v_controller.humidity > 100) then
      v_active_keys := array_append(v_active_keys, 'sensor_fault:humidity');
      perform social_media_schema.upsert_plant_alert(
        p_plant_id,
        v_plant.user_id,
        'sensor_fault:humidity',
        'sensor_fault',
        'warning',
        'Humidity sensor issue',
        format('The latest humidity reading (%s) looks invalid. Check the sensor or its units.', round(v_controller.humidity::numeric, 2)),
        'humidity',
        v_controller.humidity,
        0,
        100,
        v_controller.created_at,
        jsonb_build_object('recommended_action', 'check_sensor')
      );
    end if;

    if v_controller.temperature is null or v_controller.temperature < -30 or v_controller.temperature > 60 then
      v_active_keys := array_append(v_active_keys, 'sensor_fault:temperature');
      perform social_media_schema.upsert_plant_alert(
        p_plant_id,
        v_plant.user_id,
        'sensor_fault:temperature',
        'sensor_fault',
        'critical',
        'Temperature sensor issue',
        format('The latest temperature reading (%s?C) looks implausible. Check sensor placement or calibration.', round(coalesce(v_controller.temperature, -999)::numeric, 2)),
        'temperature',
        v_controller.temperature,
        -30,
        60,
        v_controller.created_at,
        jsonb_build_object('recommended_action', 'check_sensor')
      );
    end if;

    if v_controller.light is null or v_controller.light < 0 or v_controller.light > 200000 then
      v_active_keys := array_append(v_active_keys, 'sensor_fault:light');
      perform social_media_schema.upsert_plant_alert(
        p_plant_id,
        v_plant.user_id,
        'sensor_fault:light',
        'sensor_fault',
        'warning',
        'Light sensor issue',
        format('The latest light reading (%s) looks invalid. Verify the sensor and units.', round(coalesce(v_controller.light, -1)::numeric, 2)),
        'light',
        v_controller.light,
        0,
        200000,
        v_controller.created_at,
        jsonb_build_object('recommended_action', 'check_sensor')
      );
    end if;

    if v_controller.electrical_conductivity is null or v_controller.electrical_conductivity < 0 or v_controller.electrical_conductivity > 10 then
      v_active_keys := array_append(v_active_keys, 'sensor_fault:electrical_conductivity');
      perform social_media_schema.upsert_plant_alert(
        p_plant_id,
        v_plant.user_id,
        'sensor_fault:electrical_conductivity',
        'sensor_fault',
        'critical',
        'EC sensor issue',
        format('The latest nutrient reading (%s) looks invalid. Verify the EC sensor and units.', round(coalesce(v_controller.electrical_conductivity, -1)::numeric, 2)),
        'electrical_conductivity',
        v_controller.electrical_conductivity,
        0,
        10,
        v_controller.created_at,
        jsonb_build_object('recommended_action', 'check_sensor')
      );
    end if;

    -- Plant threshold checks only if plant type is linked and core values look plausible.
    if v_thresholds is not null then
      if v_controller.soil_moisture between 0 and 100 then
        v_min := case when v_is_summer then v_thresholds.ideal_soil_moisture_min_summer else v_thresholds.ideal_soil_moisture_min_winter end;
        v_max := case when v_is_summer then v_thresholds.ideal_soil_moisture_max_summer else v_thresholds.ideal_soil_moisture_max_winter end;

        if v_controller.soil_moisture < v_min then
          v_active_keys := array_append(v_active_keys, 'soil_moisture_low');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'soil_moisture_low',
            'soil_moisture_low',
            case when v_controller.soil_moisture < v_min - 15 then 'critical' else 'warning' end,
            'Soil too dry',
            format('Your plant is below its ideal soil moisture range (%s, target %s to %s).', round(v_controller.soil_moisture::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'soil_moisture',
            v_controller.soil_moisture,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'water_soon')
          );
        elsif v_controller.soil_moisture > v_max then
          v_active_keys := array_append(v_active_keys, 'soil_moisture_high');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'soil_moisture_high',
            'soil_moisture_high',
            case when v_controller.soil_moisture > v_max + 15 then 'critical' else 'warning' end,
            'Soil too wet',
            format('Your plant is above its ideal soil moisture range (%s, target %s to %s).', round(v_controller.soil_moisture::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'soil_moisture',
            v_controller.soil_moisture,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'improve_drainage')
          );
        end if;
      end if;

      if v_controller.humidity between 0 and 100 then
        v_min := case when v_is_summer then v_thresholds.ideal_humidity_min_summer else v_thresholds.ideal_humidity_min_winter end;
        v_max := case when v_is_summer then v_thresholds.ideal_humidity_max_summer else v_thresholds.ideal_humidity_max_winter end;

        if v_controller.humidity < v_min then
          v_active_keys := array_append(v_active_keys, 'humidity_low');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'humidity_low',
            'humidity_low',
            case when v_controller.humidity < v_min - 15 then 'critical' else 'warning' end,
            'Air too dry',
            format('The air around your plant is too dry (%s%%, target %s%% to %s%%).', round(v_controller.humidity::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'humidity',
            v_controller.humidity,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'raise_humidity')
          );
        elsif v_controller.humidity > v_max then
          v_active_keys := array_append(v_active_keys, 'humidity_high');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'humidity_high',
            'humidity_high',
            case when v_controller.humidity > v_max + 15 then 'critical' else 'warning' end,
            'Air too humid',
            format('The air around your plant is too humid (%s%%, target %s%% to %s%%).', round(v_controller.humidity::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'humidity',
            v_controller.humidity,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'increase_airflow')
          );
        end if;
      end if;

      if v_controller.temperature between -30 and 60 then
        v_min := case when v_is_summer then v_thresholds.ideal_temperature_min_summer else v_thresholds.ideal_temperature_min_winter end;
        v_max := case when v_is_summer then v_thresholds.ideal_temperature_max_summer else v_thresholds.ideal_temperature_max_winter end;

        if v_controller.temperature < v_min then
          v_active_keys := array_append(v_active_keys, 'temperature_low');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'temperature_low',
            'temperature_low',
            case when v_controller.temperature < v_min - 5 then 'critical' else 'warning' end,
            'Temperature too low',
            format('Your plant is colder than its target range (%s?C, target %s?C to %s?C).', round(v_controller.temperature::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'temperature',
            v_controller.temperature,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'move_to_warmer_spot')
          );
        elsif v_controller.temperature > v_max then
          v_active_keys := array_append(v_active_keys, 'temperature_high');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'temperature_high',
            'temperature_high',
            case when v_controller.temperature > v_max + 5 then 'critical' else 'warning' end,
            'Temperature too high',
            format('Your plant is hotter than its target range (%s?C, target %s?C to %s?C).', round(v_controller.temperature::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'temperature',
            v_controller.temperature,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'cool_environment')
          );
        end if;
      end if;

      if v_controller.light between 0 and 200000 then
        v_min := case when v_is_summer then v_thresholds.ideal_light_min_summer else v_thresholds.ideal_light_min_winter end;
        v_max := case when v_is_summer then v_thresholds.ideal_light_max_summer else v_thresholds.ideal_light_max_winter end;

        if v_controller.light < v_min then
          v_active_keys := array_append(v_active_keys, 'light_low');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'light_low',
            'light_low',
            'warning',
            'Needs more light',
            format('Your plant is receiving too little light (%s, target %s to %s).', round(v_controller.light::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'light',
            v_controller.light,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'move_to_brighter_spot')
          );
        elsif v_controller.light > v_max then
          v_active_keys := array_append(v_active_keys, 'light_high');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'light_high',
            'light_high',
            'warning',
            'Too much light',
            format('Your plant is receiving too much light (%s, target %s to %s).', round(v_controller.light::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'light',
            v_controller.light,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'reduce_direct_light')
          );
        end if;
      end if;

      if v_controller.electrical_conductivity between 0 and 10 then
        v_min := case when v_is_summer then v_thresholds.ideal_ec_min_summer else v_thresholds.ideal_ec_min_winter end;
        v_max := case when v_is_summer then v_thresholds.ideal_ec_max_summer else v_thresholds.ideal_ec_max_winter end;

        if v_controller.electrical_conductivity < v_min then
          v_active_keys := array_append(v_active_keys, 'ec_low');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'ec_low',
            'ec_low',
            'warning',
            'Nutrients too low',
            format('Your plant''s nutrient level is low (%s, target %s to %s).', round(v_controller.electrical_conductivity::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'electrical_conductivity',
            v_controller.electrical_conductivity,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'review_fertilizer')
          );
        elsif v_controller.electrical_conductivity > v_max then
          v_active_keys := array_append(v_active_keys, 'ec_high');
          perform social_media_schema.upsert_plant_alert(
            p_plant_id,
            v_plant.user_id,
            'ec_high',
            'ec_high',
            'warning',
            'Nutrients too high',
            format('Your plant''s nutrient level is high (%s, target %s to %s).', round(v_controller.electrical_conductivity::numeric, 2), round(v_min::numeric, 2), round(v_max::numeric, 2)),
            'electrical_conductivity',
            v_controller.electrical_conductivity,
            v_min,
            v_max,
            v_controller.created_at,
            jsonb_build_object('recommended_action', 'flush_or_reduce_fertilizer')
          );
        end if;
      end if;
    end if;
  end if;

  -- Low-priority nudge: progress photo due
  if v_latest_photo.created_at is null or v_latest_photo.created_at < (v_now - interval '7 days') then
    v_active_keys := array_append(v_active_keys, 'progress_photo_due');
    perform social_media_schema.upsert_plant_alert(
      p_plant_id,
      v_plant.user_id,
      'progress_photo_due',
      'progress_photo_due',
      'info',
      'Take a progress photo',
      'It has been at least 7 days since the last progress photo. Capture a new update for this plant.',
      null,
      null,
      null,
      null,
      null,
      jsonb_build_object('recommended_action', 'take_progress_photo')
    );
  end if;

  -- Resolve alerts that are no longer active.
  update social_media_schema.plant_alerts
  set
    active = false,
    resolved_at = now(),
    updated_at = now()
  where plant_id = p_plant_id
    and active = true
    and not (alert_key = any(v_active_keys));
end;
$$;

-- ============================================================================
-- 6. Trigger wrapper functions
-- ============================================================================

create or replace function microcontroller_schema.recompute_plant_alerts_from_controller()
returns trigger
language plpgsql
security definer
set search_path = public, social_media_schema, microcontroller_schema
as $$
begin
  perform social_media_schema.recompute_plant_alerts(new.plant_id);
  return new;
end;
$$;

create or replace function social_media_schema.recompute_plant_alerts_from_plant()
returns trigger
language plpgsql
security definer
set search_path = public, social_media_schema, microcontroller_schema
as $$
begin
  perform social_media_schema.recompute_plant_alerts(new.id);
  return new;
end;
$$;

create or replace function social_media_schema.recompute_plant_alerts_from_progress_photo()
returns trigger
language plpgsql
security definer
set search_path = public, social_media_schema, microcontroller_schema
as $$
begin
  perform social_media_schema.recompute_plant_alerts(new.plant_id);
  return new;
end;
$$;

-- Recompute alerts for all plants linked to a changed Plant_data row.
create or replace function social_media_schema.recompute_plant_alerts_from_plant_data()
returns trigger
language plpgsql
security definer
set search_path = public, social_media_schema, microcontroller_schema
as $$
declare
  v_plant record;
begin
  for v_plant in
    select id
    from social_media_schema."Plants"
    where plant_data_id = new.id
  loop
    perform social_media_schema.recompute_plant_alerts(v_plant.id);
  end loop;
  return new;
end;
$$;

-- ============================================================================
-- 7. Triggers
-- ============================================================================

drop trigger if exists controllers_recompute_plant_alerts_trg
  on microcontroller_schema."Controllers";

create trigger controllers_recompute_plant_alerts_trg
after insert or update of temperature, humidity, soil_moisture, light, electrical_conductivity
on microcontroller_schema."Controllers"
for each row
execute function microcontroller_schema.recompute_plant_alerts_from_controller();

drop trigger if exists plants_recompute_plant_alerts_trg
  on social_media_schema."Plants";

create trigger plants_recompute_plant_alerts_trg
after insert or update of nickname, description, plant_data_id
on social_media_schema."Plants"
for each row
execute function social_media_schema.recompute_plant_alerts_from_plant();

drop trigger if exists plant_progress_photos_recompute_plant_alerts_trg
  on social_media_schema."Plant_progress_photos";

create trigger plant_progress_photos_recompute_plant_alerts_trg
after insert or update of created_at
on social_media_schema."Plant_progress_photos"
for each row
execute function social_media_schema.recompute_plant_alerts_from_progress_photo();

drop trigger if exists plant_data_recompute_plant_alerts_trg
  on social_media_schema."Plant_data";

create trigger plant_data_recompute_plant_alerts_trg
after update of
  ideal_temperature_min_winter,
  ideal_temperature_min_summer,
  ideal_temperature_max_winter,
  ideal_temperature_max_summer,
  ideal_soil_moisture_min_summer,
  ideal_soil_moisture_min_winter,
  ideal_soil_moisture_max_summer,
  ideal_soil_moisture_max_winter,
  ideal_humidity_min_winter,
  ideal_humidity_min_summer,
  ideal_humidity_max_winter,
  ideal_humidity_max_summer,
  ideal_ec_min_winter,
  ideal_ec_min_summer,
  ideal_ec_max_winter,
  ideal_ec_max_summer,
  ideal_light_min_winter,
  ideal_light_min_summer,
  ideal_light_max_winter,
  ideal_light_max_summer
on social_media_schema."Plant_data"
for each row
execute function social_media_schema.recompute_plant_alerts_from_plant_data();

-- ============================================================================
-- 8. RPC for the app
-- ============================================================================

create or replace function social_media_schema.get_active_plant_alerts(
  p_plant_id uuid default null
)
returns table (
  id uuid,
  plant_id uuid,
  user_id uuid,
  alert_key text,
  alert_type text,
  severity text,
  title text,
  message text,
  metric text,
  current_value double precision,
  target_min double precision,
  target_max double precision,
  source text,
  reading_created_at timestamptz,
  first_triggered_at timestamptz,
  last_triggered_at timestamptz,
  metadata jsonb
)
language sql
security definer
set search_path = public, social_media_schema
as $$
  select
    pa.id,
    pa.plant_id,
    pa.user_id,
    pa.alert_key,
    pa.alert_type,
    pa.severity,
    pa.title,
    pa.message,
    pa.metric,
    pa.current_value,
    pa.target_min,
    pa.target_max,
    pa.source,
    pa.reading_created_at,
    pa.first_triggered_at,
    pa.last_triggered_at,
    pa.metadata
  from social_media_schema.plant_alerts pa
  where pa.active = true
    and (p_plant_id is null or pa.plant_id = p_plant_id)
  order by
    case pa.severity
      when 'critical' then 1
      when 'warning' then 2
      else 3
    end,
    pa.last_triggered_at desc;
$$;

-- ============================================================================
-- 9. Optional one-time backfill
-- ============================================================================

do $$
declare
  v_plant record;
begin
  for v_plant in
    select id
    from social_media_schema."Plants"
  loop
    perform social_media_schema.recompute_plant_alerts(v_plant.id);
  end loop;
end $$;

commit;
