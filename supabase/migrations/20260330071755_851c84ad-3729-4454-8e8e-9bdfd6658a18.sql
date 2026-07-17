-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Allow public read on elephant_insights_cache" ON public.elephant_insights_cache;

-- Create new policy: only authenticated users can read
CREATE POLICY "Allow authenticated read on elephant_insights_cache"
ON public.elephant_insights_cache
FOR SELECT
TO authenticated
USING (true);