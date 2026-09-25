-- =========================================================
-- Server-side punch validation
-- The browser should never be trusted to decide whether a punch
-- is valid. Call this (from a Supabase Edge Function, using the
-- service role) to re-check geofence + business rules before
-- writing to `attendance`.
-- =========================================================

create or replace function validate_punch(
  p_employee_id uuid,
  p_store_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision,
  p_accuracy_threshold double precision default 50
) returns table (
  is_valid boolean,
  distance_meters integer,
  reason text
) as $$
declare
  v_store stores%rowtype;
  v_distance double precision;
  v_radius_m double precision := 6371000;
begin
  select * into v_store from stores where id = p_store_id and status = 'active';

  if v_store is null then
    return query select false, null::integer, 'store_not_found';
    return;
  end if;

  if p_accuracy > p_accuracy_threshold then
    return query select false, null::integer, 'gps_accuracy_too_low';
    return;
  end if;

  -- Haversine
  v_distance := v_radius_m * 2 * asin(sqrt(
    sin(radians(p_latitude - v_store.latitude) / 2) ^ 2 +
    cos(radians(v_store.latitude)) * cos(radians(p_latitude)) *
    sin(radians(p_longitude - v_store.longitude) / 2) ^ 2
  ));

  if v_distance > v_store.allowed_radius then
    return query select false, round(v_distance)::integer, 'outside_geofence';
    return;
  end if;

  return query select true, round(v_distance)::integer, null::text;
end;
$$ language plpgsql security definer;

-- Example use from an Edge Function (service role):
--   select * from validate_punch(:employee_id, :store_id, :lat, :lng, :accuracy);
