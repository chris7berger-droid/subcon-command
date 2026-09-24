-- Isolated PostgREST and PowerSync grants. Not a production migration.
-- auth.uid() prefers the PostgREST JWT, then the fixture setting.

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims text;
  sub text;
BEGIN
  claims := current_setting('request.jwt.claims', true);
  IF claims IS NOT NULL AND claims <> '' THEN
    sub := claims::json->>'sub';
    IF sub IS NOT NULL AND sub <> '' THEN
      RETURN sub::uuid;
    END IF;
  END IF;
  RETURN NULLIF(current_setting('app.test_uid', true), '')::uuid;
END;
$$;

ALTER TABLE public.time_punches
  ALTER COLUMN tenant_id SET DEFAULT public.get_user_tenant_id();

ALTER TABLE public.call_log
  ADD COLUMN IF NOT EXISTS display_job_number text,
  ADD COLUMN IF NOT EXISTS job_number text,
  ADD COLUMN IF NOT EXISTS job_name text,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS customer_name text;

UPDATE public.call_log
   SET display_job_number = '100', job_number = '100', job_name = 'Deck', customer_name = 'Ada Co'
 WHERE id = 1;
UPDATE public.call_log
   SET display_job_number = '200', job_number = '200', job_name = 'Roof', customer_name = 'Bea Co'
 WHERE id = 2;
UPDATE public.call_log
   SET display_job_number = '300', job_number = '300', job_name = 'Other', customer_name = 'Other Co'
 WHERE id = 3;

ALTER TABLE public.tenant_config ADD COLUMN IF NOT EXISTS apps text[];
UPDATE public.tenant_config SET apps = ARRAY['sales', 'field'];

ALTER TABLE public.time_punches
  DROP CONSTRAINT IF EXISTS time_punches_employee_fk,
  DROP CONSTRAINT IF EXISTS time_punches_job_fk;
ALTER TABLE public.time_punches
  ADD CONSTRAINT time_punches_employee_fk FOREIGN KEY (employee_id) REFERENCES public.team_members (id),
  ADD CONSTRAINT time_punches_job_fk FOREIGN KEY (job_id) REFERENCES public.call_log (id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'isolated-auth';
  END IF;
END $$;
GRANT anon, authenticated TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_punches TO authenticated;
GRANT SELECT ON public.team_members, public.call_log, public.tenant_config TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS time_punches_tenant ON public.time_punches;
CREATE POLICY time_punches_tenant ON public.time_punches
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

ALTER TABLE public.call_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS call_log_tenant_select ON public.call_log;
CREATE POLICY call_log_tenant_select ON public.call_log
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_members_tenant_select ON public.team_members;
CREATE POLICY team_members_tenant_select ON public.team_members
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powersync_role') THEN
    CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'powersync_isolated';
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO powersync_role;
GRANT SELECT ON TABLE public.time_punches TO powersync_role;
GRANT SELECT ON TABLE public.time_punches TO authenticator;

DROP PUBLICATION IF EXISTS powersync;
CREATE PUBLICATION powersync FOR TABLE public.time_punches;
