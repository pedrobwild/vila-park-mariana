
-- Audit log table for admin actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,           -- 'insert' | 'update' | 'delete' | 'upload'
  entity TEXT NOT NULL,           -- table name or 'storage:plantas' etc
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff (admin + incorporadora) can view logs
CREATE POLICY "Staff can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Authenticated users can insert logs for themselves (client-side upload logging)
CREATE POLICY "Users can insert their own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- Generic trigger function that logs row changes with actor context
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_email TEXT;
  v_entity_id TEXT;
  v_action TEXT := lower(TG_OP);
  v_metadata JSONB;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_actor;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := COALESCE((OLD).id::text, NULL);
    v_metadata := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := COALESCE((NEW).id::text, NULL);
    v_metadata := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_entity_id := COALESCE((NEW).id::text, NULL);
    v_metadata := jsonb_build_object('new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity, entity_id, metadata)
  VALUES (v_actor, v_email, v_action, TG_TABLE_NAME, v_entity_id, v_metadata);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers to sensitive tables
CREATE TRIGGER audit_custom_field_definitions
AFTER INSERT OR UPDATE OR DELETE ON public.custom_field_definitions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_custom_field_values
AFTER INSERT OR UPDATE OR DELETE ON public.custom_field_values
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
