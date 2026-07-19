
-- =========================================================
-- 1. ROLES
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- 2. UNITS
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.unit_status AS ENUM ('disponivel', 'reservado', 'vendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  block text NOT NULL,
  area_m2 numeric(10,2) NOT NULL,
  price_brl numeric(14,2) NOT NULL,
  status public.unit_status NOT NULL DEFAULT 'disponivel',
  planta_url text,
  planta_mime text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.units TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Units are public read"
  ON public.units FOR SELECT
  USING (true);

CREATE POLICY "Admins insert units"
  ON public.units FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update units"
  ON public.units FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete units"
  ON public.units FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3. CUSTOM FIELDS
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.custom_field_type AS ENUM ('text','currency','number','date','boolean','select');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_type public.custom_field_type NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  visible_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_field_definitions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_field_definitions TO authenticated;
GRANT ALL ON public.custom_field_definitions TO service_role;

ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Field defs public read"
  ON public.custom_field_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins insert field defs"
  ON public.custom_field_definitions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update field defs"
  ON public.custom_field_definitions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete field defs"
  ON public.custom_field_definitions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, field_id)
);

GRANT SELECT ON public.custom_field_values TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_field_values TO authenticated;
GRANT ALL ON public.custom_field_values TO service_role;

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Field values public read"
  ON public.custom_field_values FOR SELECT
  USING (true);

CREATE POLICY "Admins insert field values"
  ON public.custom_field_values FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update field values"
  ON public.custom_field_values FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete field values"
  ON public.custom_field_values FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 4. updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_units_updated ON public.units;
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cfd_updated ON public.custom_field_definitions;
CREATE TRIGGER trg_cfd_updated BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cfv_updated ON public.custom_field_values;
CREATE TRIGGER trg_cfv_updated BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. STORAGE POLICIES for bucket "plantas"
-- =========================================================
CREATE POLICY "Plantas public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'plantas');

CREATE POLICY "Admins upload plantas"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'plantas' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update plantas"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'plantas' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete plantas"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'plantas' AND public.has_role(auth.uid(), 'admin'));
