-- =============================================================================
-- NEXORA / StudioFlow - Tawk Booking API backend (read-only API)
-- Migration: 20261118185200_create_tawk_api_backend.sql
--
-- Adds only objects in the dedicated studioflow_tawk_private schema and
-- service-role-only public RPC facades. It does not alter existing StudioFlow
-- tables, booking functions, authentication, payment, or WhatsApp objects.
--
-- API-key contract used by supabase/functions/studioflow-tawk-api/handler.ts:
--   public.studioflow_tawk_resolve_property_key(p_key_hash text)
--   public.studioflow_tawk_claim_property_api_rate_limit(
--       p_api_key_id uuid, p_route text)
--
-- API keys are SHA-256 hex digests only. Raw API keys must never be stored.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Private namespace
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS studioflow_tawk_private;

REVOKE ALL PRIVILEGES ON SCHEMA studioflow_tawk_private
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA studioflow_tawk_private TO service_role;

COMMENT ON SCHEMA studioflow_tawk_private IS
  'Private credentials, Tawk property mappings, and rate-limit state for the read-only StudioFlow Tawk API.';

-- -----------------------------------------------------------------------------
-- 2. External Tawk property -> internal StudioFlow owner/site/branch mapping
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studioflow_tawk_private.property_mappings (
  property_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tawk_property_id  text NOT NULL,
  owner_id          uuid NOT NULL
    REFERENCES public.studioflow_accounts(user_id) ON DELETE CASCADE,
  website_slug      text NOT NULL,
  branch_id         uuid NULL
    REFERENCES public.branches(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_mappings_tawk_property_id_nonempty
    CHECK (length(btrim(tawk_property_id)) BETWEEN 1 AND 160),
  CONSTRAINT property_mappings_website_slug_format
    CHECK (website_slug ~ '^[a-z0-9][a-z0-9-]{2,62}$')
);

COMMENT ON TABLE studioflow_tawk_private.property_mappings IS
  'Maps one Tawk property identifier to a canonical StudioFlow owner, published website slug, and optional fixed branch.';
COMMENT ON COLUMN studioflow_tawk_private.property_mappings.branch_id IS
  'NULL means salon-wide access; a UUID pins this Tawk property to one branch. Resolver checks the branch belongs to owner_id and is active.';

-- -----------------------------------------------------------------------------
-- 3. API key registry (hash-only storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studioflow_tawk_private.property_api_keys (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid NOT NULL
    REFERENCES studioflow_tawk_private.property_mappings(property_id)
    ON DELETE CASCADE,
  api_key_hash   text NOT NULL UNIQUE,
  label          text NULL,
  scopes         text[] NOT NULL
    DEFAULT ARRAY['catalogue:read', 'availability:read']::text[],
  status         text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  expires_at     timestamptz NULL,
  revoked_at     timestamptz NULL,
  last_used_at   timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_api_keys_hash_sha256_hex
    CHECK (api_key_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT property_api_keys_scopes_allowed
    CHECK (
      cardinality(scopes) > 0
      AND scopes <@ ARRAY[
        'catalogue:read',
        'availability:read',
        'action:prepare'
      ]::text[]
    ),
  -- Supports the composite FK from rate-limit rows, ensuring the key and
  -- property_id on a bucket can never disagree.
  CONSTRAINT property_api_keys_id_property_unique UNIQUE (id, property_id)
);

COMMENT ON TABLE studioflow_tawk_private.property_api_keys IS
  'Tawk API credentials. Stores only a lowercase SHA-256 hex digest, never the raw bearer token.';
COMMENT ON COLUMN studioflow_tawk_private.property_api_keys.api_key_hash IS
  'Lowercase SHA-256 hex digest of the bearer key. The raw token is shown to the administrator once at creation and is not persisted.';
COMMENT ON COLUMN studioflow_tawk_private.property_api_keys.scopes IS
  'Allowed capability strings. Step 1 uses catalogue:read and availability:read only; action:prepare is reserved and has no write endpoint in this API.';

-- -----------------------------------------------------------------------------
-- 4. Per-key, per-route atomic fixed-window rate-limit state
--     A single row per key/route is reused each minute, avoiding unbounded
--     bucket growth. The composite FK binds property_id to the owning key.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS studioflow_tawk_private.property_api_rate_limits (
  api_key_id        uuid NOT NULL,
  property_id       uuid NOT NULL,
  route             text NOT NULL
    CHECK (route IN ('catalogue', 'availability')),
  window_started_at timestamptz NOT NULL,
  request_count     integer NOT NULL DEFAULT 0
    CHECK (request_count >= 0),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_api_rate_limits_pkey PRIMARY KEY (api_key_id, route),
  CONSTRAINT property_api_rate_limits_key_property_fkey
    FOREIGN KEY (api_key_id, property_id)
    REFERENCES studioflow_tawk_private.property_api_keys(id, property_id)
    ON DELETE CASCADE
);

COMMENT ON TABLE studioflow_tawk_private.property_api_rate_limits IS
  'Atomic one-minute fixed-window counters, one row per API key and route.';

-- -----------------------------------------------------------------------------
-- 5. B-tree indexes for mapping, credential, FK, and operational lookups
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS property_mappings_tawk_property_id_uidx
  ON studioflow_tawk_private.property_mappings USING btree (tawk_property_id);
CREATE INDEX IF NOT EXISTS property_mappings_owner_slug_idx
  ON studioflow_tawk_private.property_mappings USING btree (owner_id, website_slug);
CREATE INDEX IF NOT EXISTS property_mappings_branch_id_idx
  ON studioflow_tawk_private.property_mappings USING btree (branch_id)
  WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS property_mappings_created_at_idx
  ON studioflow_tawk_private.property_mappings USING btree (created_at DESC);

-- UNIQUE(api_key_hash) already creates a B-tree index; this is kept as the
-- explicit lookup guarantee and is deliberately not duplicated.
CREATE INDEX IF NOT EXISTS property_api_keys_property_id_idx
  ON studioflow_tawk_private.property_api_keys USING btree (property_id);
CREATE INDEX IF NOT EXISTS property_api_keys_status_expiry_idx
  ON studioflow_tawk_private.property_api_keys USING btree (status, expires_at)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS property_api_keys_created_at_idx
  ON studioflow_tawk_private.property_api_keys USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS property_api_rate_limits_property_id_idx
  ON studioflow_tawk_private.property_api_rate_limits USING btree (property_id);
CREATE INDEX IF NOT EXISTS property_api_rate_limits_created_at_idx
  ON studioflow_tawk_private.property_api_rate_limits USING btree (created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. RLS on every new table; no client-role policies are created.
--     service_role is the only Data API/backend role granted table access.
-- -----------------------------------------------------------------------------
ALTER TABLE studioflow_tawk_private.property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE studioflow_tawk_private.property_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE studioflow_tawk_private.property_api_rate_limits ENABLE ROW LEVEL SECURITY;

DO $tawk_policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'studioflow_tawk_private'
      AND tablename = 'property_mappings'
      AND policyname = 'tawk_property_mappings_service_role_all'
  ) THEN
    CREATE POLICY tawk_property_mappings_service_role_all
      ON studioflow_tawk_private.property_mappings
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'studioflow_tawk_private'
      AND tablename = 'property_api_keys'
      AND policyname = 'tawk_property_api_keys_service_role_all'
  ) THEN
    CREATE POLICY tawk_property_api_keys_service_role_all
      ON studioflow_tawk_private.property_api_keys
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'studioflow_tawk_private'
      AND tablename = 'property_api_rate_limits'
      AND policyname = 'tawk_property_api_rate_limits_service_role_all'
  ) THEN
    CREATE POLICY tawk_property_api_rate_limits_service_role_all
      ON studioflow_tawk_private.property_api_rate_limits
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END
$tawk_policies$;

REVOKE ALL PRIVILEGES ON TABLE
  studioflow_tawk_private.property_mappings,
  studioflow_tawk_private.property_api_keys,
  studioflow_tawk_private.property_api_rate_limits
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  studioflow_tawk_private.property_mappings,
  studioflow_tawk_private.property_api_keys,
  studioflow_tawk_private.property_api_rate_limits
TO service_role;

-- -----------------------------------------------------------------------------
-- 7. Private role assertion. Functions remain SECURITY INVOKER; this helper
--     explicitly rejects anon/authenticated and non-service-role API calls.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION studioflow_tawk_private.assert_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF current_user <> 'service_role'
     AND COALESCE(
       pg_catalog.current_setting('request.jwt.claim.role', true),
       ''
     ) <> 'service_role'
  THEN
    RAISE EXCEPTION 'Tawk backend access is restricted to service_role'
      USING ERRCODE = '42501';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION studioflow_tawk_private.assert_service_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION studioflow_tawk_private.assert_service_role() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION studioflow_tawk_private.assert_service_role() TO service_role;

-- -----------------------------------------------------------------------------
-- 8. Resolver required by the existing Edge Function.
--     Returns the exact camelCase JSON contract expected by handler.ts.
--     It only returns a mapping when the API key, property, branch (if pinned),
--     and matching published website are all valid. It writes last_used_at only.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.studioflow_tawk_resolve_property_key(
  p_key_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_mapping jsonb;
BEGIN
  PERFORM studioflow_tawk_private.assert_service_role();

  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid Tawk API key'
      USING ERRCODE = '42501';
  END IF;

  UPDATE studioflow_tawk_private.property_api_keys AS k
  SET last_used_at = pg_catalog.clock_timestamp(),
      updated_at = pg_catalog.clock_timestamp()
  FROM studioflow_tawk_private.property_mappings AS pm
  JOIN public.studioflow_websites AS w
    ON w.owner_id = pm.owner_id
   AND w.slug = pm.website_slug
  LEFT JOIN public.branches AS b
    ON b.id = pm.branch_id
   AND b.site_id = pm.owner_id
   AND b.is_active IS TRUE
  WHERE k.property_id = pm.property_id
    AND k.api_key_hash = p_key_hash
    AND k.status = 'active'
    AND k.revoked_at IS NULL
    AND (k.expires_at IS NULL OR k.expires_at > pg_catalog.statement_timestamp())
    AND pm.status = 'active'
    AND w.published_at IS NOT NULL
    AND w.published_at <= pg_catalog.statement_timestamp()
    AND pg_catalog.jsonb_typeof(w.content) = 'object'
    AND (pm.branch_id IS NULL OR b.id IS NOT NULL)
  RETURNING pg_catalog.jsonb_build_object(
    'apiKeyId', k.id,
    'tawkPropertyId', pm.tawk_property_id,
    'ownerId', pm.owner_id,
    'websiteSlug', pm.website_slug,
    'branchId', pm.branch_id,
    'scopes', pg_catalog.to_jsonb(k.scopes)
  )
  INTO v_mapping;

  IF v_mapping IS NULL THEN
    -- SQLSTATE 42501 is mapped by the Edge Function to HTTP 401.
    RAISE EXCEPTION 'Invalid, expired, revoked, inactive, or unmapped Tawk API key'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_mapping;
END;
$function$;

REVOKE ALL ON FUNCTION public.studioflow_tawk_resolve_property_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.studioflow_tawk_resolve_property_key(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studioflow_tawk_resolve_property_key(text) TO service_role;

COMMENT ON FUNCTION public.studioflow_tawk_resolve_property_key(text) IS
  'Service-role-only resolver for SHA-256 Tawk property keys; returns the Step 1 handler camelCase mapping contract and updates only key usage metadata.';

-- -----------------------------------------------------------------------------
-- 9. Atomic per-key/per-route limiter required by the existing Edge Function.
--     Limits: catalogue 120/minute; availability 60/minute.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.studioflow_tawk_claim_property_api_rate_limit(
  p_api_key_id uuid,
  p_route text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_property_id uuid;
  v_limit integer;
  v_now timestamptz;
  v_window_start timestamptz;
  v_request_count integer;
  v_retry_after integer;
BEGIN
  PERFORM studioflow_tawk_private.assert_service_role();

  IF p_route = 'catalogue' THEN
    v_limit := 120;
  ELSIF p_route = 'availability' THEN
    v_limit := 60;
  ELSE
    RAISE EXCEPTION 'Unsupported Tawk API route'
      USING ERRCODE = '22023';
  END IF;

  -- Re-check the credential and its published property after resolver success.
  -- This also means a revoked key fails closed even during a resolver/limiter race.
  SELECT k.property_id
    INTO v_property_id
  FROM studioflow_tawk_private.property_api_keys AS k
  JOIN studioflow_tawk_private.property_mappings AS pm
    ON pm.property_id = k.property_id
  JOIN public.studioflow_websites AS w
    ON w.owner_id = pm.owner_id
   AND w.slug = pm.website_slug
  LEFT JOIN public.branches AS b
    ON b.id = pm.branch_id
   AND b.site_id = pm.owner_id
   AND b.is_active IS TRUE
  WHERE k.id = p_api_key_id
    AND k.status = 'active'
    AND k.revoked_at IS NULL
    AND (k.expires_at IS NULL OR k.expires_at > pg_catalog.statement_timestamp())
    AND pm.status = 'active'
    AND w.published_at IS NOT NULL
    AND w.published_at <= pg_catalog.statement_timestamp()
    AND pg_catalog.jsonb_typeof(w.content) = 'object'
    AND (pm.branch_id IS NULL OR b.id IS NOT NULL);

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Tawk API key or published property is no longer active'
      USING ERRCODE = '42501';
  END IF;

  v_now := pg_catalog.clock_timestamp();
  v_window_start := pg_catalog.date_trunc('minute', v_now);

  INSERT INTO studioflow_tawk_private.property_api_rate_limits AS current_bucket (
    api_key_id,
    property_id,
    route,
    window_started_at,
    request_count,
    created_at,
    updated_at
  )
  VALUES (
    p_api_key_id,
    v_property_id,
    p_route,
    v_window_start,
    1,
    v_now,
    v_now
  )
  ON CONFLICT (api_key_id, route)
  DO UPDATE SET
    property_id = EXCLUDED.property_id,
    window_started_at = EXCLUDED.window_started_at,
    request_count = CASE
      WHEN current_bucket.window_started_at = EXCLUDED.window_started_at
        THEN LEAST(current_bucket.request_count::bigint + 1, 2147483647)::integer
      ELSE 1
    END,
    updated_at = EXCLUDED.updated_at
  RETURNING request_count INTO v_request_count;

  v_retry_after := GREATEST(
    1,
    LEAST(
      60,
      CEIL(EXTRACT(EPOCH FROM (
        v_window_start + INTERVAL '1 minute' - pg_catalog.clock_timestamp()
      )))::integer
    )
  );

  RETURN pg_catalog.jsonb_build_object(
    'allowed', v_request_count <= v_limit,
    'limit', v_limit,
    'requestCount', v_request_count,
    'retryAfterSeconds', v_retry_after,
    'windowStartedAt', v_window_start
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.studioflow_tawk_claim_property_api_rate_limit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.studioflow_tawk_claim_property_api_rate_limit(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studioflow_tawk_claim_property_api_rate_limit(uuid, text) TO service_role;

COMMENT ON FUNCTION public.studioflow_tawk_claim_property_api_rate_limit(uuid, text) IS
  'Service-role-only atomic fixed-window rate limiter: 120 catalogue requests/minute and 60 availability requests/minute per API key.';

-- -----------------------------------------------------------------------------
-- 10. Read-only published catalogue helper.
--      This additional RPC gives trusted backend callers a safe projection of
--      published salon data. It does not read draft workspace data and is not
--      currently called by the Step 1 handler (which reads the same published
--      website row and branches directly).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.studioflow_tawk_get_published_catalogue(
  p_api_key_id uuid,
  p_branch_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_website_slug text;
  v_pinned_branch_id uuid;
  v_content jsonb;
  v_published_at timestamptz;
  v_effective_branch_id uuid;
  v_services jsonb;
  v_stylists jsonb;
  v_branches jsonb;
BEGIN
  PERFORM studioflow_tawk_private.assert_service_role();

  SELECT pm.owner_id, pm.website_slug, pm.branch_id, w.content, w.published_at
    INTO v_owner_id, v_website_slug, v_pinned_branch_id, v_content, v_published_at
  FROM studioflow_tawk_private.property_api_keys AS k
  JOIN studioflow_tawk_private.property_mappings AS pm
    ON pm.property_id = k.property_id
  JOIN public.studioflow_websites AS w
    ON w.owner_id = pm.owner_id
   AND w.slug = pm.website_slug
  WHERE k.id = p_api_key_id
    AND k.status = 'active'
    AND k.revoked_at IS NULL
    AND (k.expires_at IS NULL OR k.expires_at > pg_catalog.statement_timestamp())
    AND pm.status = 'active'
    AND w.published_at IS NOT NULL
    AND w.published_at <= pg_catalog.statement_timestamp()
    AND pg_catalog.jsonb_typeof(w.content) = 'object';

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Tawk API key or published website is not available'
      USING ERRCODE = '42501';
  END IF;

  IF v_pinned_branch_id IS NOT NULL AND p_branch_id IS NOT NULL
     AND p_branch_id <> v_pinned_branch_id THEN
    RAISE EXCEPTION 'This Tawk property is pinned to another branch'
      USING ERRCODE = '42501';
  END IF;

  v_effective_branch_id := COALESCE(v_pinned_branch_id, p_branch_id);

  IF v_effective_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.branches AS b
    WHERE b.id = v_effective_branch_id
      AND b.site_id = v_owner_id
      AND b.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Requested Tawk branch is inactive or does not belong to this salon'
      USING ERRCODE = '42501';
  END IF;

  -- Project only customer-facing service fields from the published snapshot.
  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', s.item ->> 'id',
        'name', s.item ->> 'name',
        'category', COALESCE(s.item ->> 'category', ''),
        'price', COALESCE(s.item -> 'price', '0'::jsonb),
        'durationMinutes', COALESCE(s.item -> 'durationMinutes', '0'::jsonb)
      ) ORDER BY s.ordinality
    ),
    '[]'::jsonb
  )
  INTO v_services
  FROM pg_catalog.jsonb_array_elements(
    CASE WHEN pg_catalog.jsonb_typeof(v_content -> 'services') = 'array'
      THEN v_content -> 'services' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS s(item, ordinality)
  WHERE NULLIF(pg_catalog.btrim(s.item ->> 'id'), '') IS NOT NULL
    AND NULLIF(pg_catalog.btrim(s.item ->> 'name'), '') IS NOT NULL;

  -- Return available published specialists only; draft staff data is never read.
  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', st.item ->> 'id',
        'name', st.item ->> 'name',
        'role', COALESCE(st.item ->> 'role', st.item ->> 'roleTitle', ''),
        'assignedServices', CASE
          WHEN pg_catalog.jsonb_typeof(st.item -> 'assignedServices') = 'array'
            THEN st.item -> 'assignedServices'
          ELSE '[]'::jsonb
        END
      ) ORDER BY st.ordinality
    ),
    '[]'::jsonb
  )
  INTO v_stylists
  FROM pg_catalog.jsonb_array_elements(
    CASE WHEN pg_catalog.jsonb_typeof(v_content -> 'stylists') = 'array'
      THEN v_content -> 'stylists' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS st(item, ordinality)
  WHERE NULLIF(pg_catalog.btrim(st.item ->> 'id'), '') IS NOT NULL
    AND NULLIF(pg_catalog.btrim(st.item ->> 'name'), '') IS NOT NULL
    AND pg_catalog.lower(COALESCE(st.item ->> 'status', 'Available')) = 'available';

  -- Hours are read from the existing branch.operating_hours field. No current
  -- StudioFlow branch/staff/booking table is modified by this migration.
  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'city', b.city,
        'workingHours', pg_catalog.to_jsonb(b) -> 'operating_hours'
      ) ORDER BY b.created_at, b.id
    ),
    '[]'::jsonb
  )
  INTO v_branches
  FROM public.branches AS b
  WHERE b.site_id = v_owner_id
    AND b.is_active IS TRUE
    AND (v_effective_branch_id IS NULL OR b.id = v_effective_branch_id);

  RETURN pg_catalog.jsonb_build_object(
    'salon', pg_catalog.jsonb_build_object(
      'slug', v_website_slug,
      'businessName', v_content #>> '{profile,businessName}',
      'city', v_content #>> '{profile,city}',
      'publishedAt', v_published_at
    ),
    'services', COALESCE(v_services, '[]'::jsonb),
    'stylists', COALESCE(v_stylists, '[]'::jsonb),
    'branches', COALESCE(v_branches, '[]'::jsonb),
    'readOnly', true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.studioflow_tawk_get_published_catalogue(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.studioflow_tawk_get_published_catalogue(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studioflow_tawk_get_published_catalogue(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.studioflow_tawk_get_published_catalogue(uuid, uuid) IS
  'Service-role-only read projection of a mapped and published salon catalogue, active stylists, active branches, and branch operating hours.';

COMMIT;

-- =============================================================================
-- OPERATOR NOTES
-- 1. Generate a high-entropy bearer token outside SQL (at least 32 random
--    bytes), calculate lowercase SHA-256 hex, and insert only that hash into
--    property_api_keys. Never put a raw key in migration history or SQL logs.
-- 2. Insert property_mappings first. owner_id must be the StudioFlow account
--    user_id; website_slug must match the published studioflow_websites.slug.
--    A branch-pinned property must use a branch whose site_id equals owner_id.
-- 3. The current Step 1 Edge Function calls the resolver and limiter above.
--    The published-catalogue helper is available for backend use but is not
--    wired into that handler version.
-- 4. This migration does not create booking/write endpoints and does not touch
--    bookings, holds, payments, WhatsApp, Meta, Auth, or existing RPC bodies.
-- =============================================================================
