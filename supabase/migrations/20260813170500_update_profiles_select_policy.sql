-- ====================================================
-- Update RLS Policy for Profiles SELECT
-- ====================================================

-- Drop the previous policy
DROP POLICY IF EXISTS "Perfis visíveis por usuários ativos" ON public.profiles;

-- Create the new policy that allows admins to view all, and others to view only themselves
CREATE POLICY "Perfis visiveis por admin ou proprio usuario"
  ON public.profiles
  FOR SELECT TO public
  USING (
    public.has_role(ARRAY['administrador'::text])
    OR 
    id = auth.uid()
  );
