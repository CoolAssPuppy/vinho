set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.submit_scan(p_image_path text, p_image_url text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_idempotency_key text;
  v_scan_id uuid;
  v_queue_id uuid;
begin
  if v_user_id is null then
    raise exception 'submit_scan requires an authenticated caller'
      using errcode = '28000';
  end if;

  if p_image_path is null or p_image_path = '' or p_image_url is null or p_image_url = '' then
    raise exception 'submit_scan requires a non-empty image_path and image_url'
      using errcode = '22023';
  end if;

  -- Mirror the storage RLS policy: objects live under a folder named for the
  -- owner's uid, so a path outside the caller's folder is never legitimate.
  if split_part(p_image_path, '/', 1) <> v_user_id::text then
    raise exception 'image_path must be inside the caller''s own folder'
      using errcode = '42501';
  end if;

  -- Same convention as repair_orphaned_scans(), which uses 'repair:' || path.
  v_idempotency_key := 'submit:' || p_image_path;

  -- A retry of the same upload returns the original queue id rather than
  -- enqueueing the image twice.
  select id into v_queue_id
  from public.wines_added_queue
  where idempotency_key = v_idempotency_key;

  if v_queue_id is not null then
    return v_queue_id;
  end if;

  insert into public.scans (user_id, image_path, scan_image_url)
  values (v_user_id, p_image_path, p_image_url)
  returning id into v_scan_id;

  insert into public.wines_added_queue
    (user_id, image_url, scan_id, status, idempotency_key)
  values
    (v_user_id, p_image_url, v_scan_id, 'pending', v_idempotency_key)
  returning id into v_queue_id;

  return v_queue_id;

exception
  -- Two devices (or a retry racing the original) submitting the same path.
  -- The unique constraint on idempotency_key is the arbiter; fall back to the
  -- winner's row instead of surfacing a constraint error to the client.
  when unique_violation then
    select id into v_queue_id
    from public.wines_added_queue
    where idempotency_key = v_idempotency_key;

    if v_queue_id is null then
      raise;
    end if;

    return v_queue_id;
end;
$function$
;



-- Comments and grants are not tracked by the declarative diff engine (see
-- supabase/schemas/README.md), so they are written here by hand and must be kept
-- in sync with supabase/schemas/30_submit_scan.sql.

comment on function public.submit_scan(text, text) is
  'Atomically creates a scans row and its wines_added_queue item for an uploaded scan. Idempotent on image_path via idempotency_key = ''submit:'' || image_path. Returns the queue id.';

revoke all on function public.submit_scan(text, text) from public, anon;
grant execute on function public.submit_scan(text, text) to authenticated;
