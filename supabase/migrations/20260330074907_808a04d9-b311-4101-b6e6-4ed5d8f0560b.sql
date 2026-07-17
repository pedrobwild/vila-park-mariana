-- Restore public read access (no auth in this app, cache data is non-sensitive)
DROP POLICY IF EXISTS "Allow authenticated read on elephant_insights_cache" ON public.elephant_insights_cache;

CREATE POLICY "Allow public read on elephant_insights_cache"
ON public.elephant_insights_cache
FOR SELECT
TO anon, authenticated
USING (true);