-- Migration generated manually
-- Includes tables, functions, triggers, and RLS policies

-- ====================================================
-- Tables
-- ====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    papel TEXT NOT NULL CHECK (papel = ANY (ARRAY['administrador'::text, 'atendente'::text, 'operacao'::text])),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    endereco TEXT NOT NULL,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL DEFAULT 'Catalão'::text,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================
-- Row Level Security
-- ====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- Functions
-- ====================================================

CREATE OR REPLACE FUNCTION public.is_active_user()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.ativo = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(required_roles text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.ativo = true
      AND profiles.papel = ANY(required_roles)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_cliente_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
    IF NOT public.has_role(ARRAY['administrador']) THEN
      RAISE EXCEPTION 'Apenas administradores podem ativar ou desativar clientes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  default_role TEXT := 'operacao';
BEGIN
  -- O primeiro usuário criado no sistema é promovido a administrador automaticamente
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    default_role := 'administrador';
  ELSE
    default_role := COALESCE(new.raw_user_meta_data->>'papel', 'operacao');
  END IF;

  INSERT INTO public.profiles (id, nome, papel, ativo)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    default_role,
    true
  );
  RETURN new;
END;
$function$;

-- ====================================================
-- Triggers
-- ====================================================

-- Trigger for clientes
DROP TRIGGER IF EXISTS trg_check_cliente_update ON public.clientes;
CREATE TRIGGER trg_check_cliente_update
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cliente_update();

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ====================================================
-- RLS Policies
-- ====================================================

-- Policies for public.clientes
CREATE POLICY "Clientes atualizáveis por admin e atendente" ON public.clientes
  FOR UPDATE TO public
  USING (has_role(ARRAY['administrador'::text, 'atendente'::text]));

CREATE POLICY "Clientes inseríveis por admin e atendente" ON public.clientes
  FOR INSERT TO public
  WITH CHECK (has_role(ARRAY['administrador'::text, 'atendente'::text]));

CREATE POLICY "Clientes visíveis por usuários ativos" ON public.clientes
  FOR SELECT TO public
  USING (is_active_user());

-- Policies for public.profiles
CREATE POLICY "Perfis gerenciáveis apenas por administradores" ON public.profiles
  FOR ALL TO public
  USING (has_role(ARRAY['administrador'::text]));

CREATE POLICY "Perfis visíveis por usuários ativos" ON public.profiles
  FOR SELECT TO public
  USING (is_active_user());
