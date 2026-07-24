
CREATE TABLE IF NOT EXISTS public.unit_plantas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  url text NOT NULL,
  mime text,
  filename text,
  size bigint,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS unit_plantas_unit_id_idx ON public.unit_plantas(unit_id);

GRANT SELECT ON public.unit_plantas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.unit_plantas TO authenticated;
GRANT ALL ON public.unit_plantas TO service_role;

ALTER TABLE public.unit_plantas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plantas public read" ON public.unit_plantas
  FOR SELECT USING (true);

CREATE POLICY "Staff insert plantas" ON public.unit_plantas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff update plantas" ON public.unit_plantas
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff delete plantas" ON public.unit_plantas
  FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- Migra plantas antigas (uma por unidade) para a nova tabela
INSERT INTO public.unit_plantas (unit_id, url, mime, filename)
SELECT u.id, u.planta_url, u.planta_mime,
       regexp_replace(u.planta_url, '^.*/', '')
FROM public.units u
WHERE u.planta_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.unit_plantas p WHERE p.unit_id = u.id AND p.url = u.planta_url
  );
