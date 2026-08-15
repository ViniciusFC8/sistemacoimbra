-- ====================================================
-- Table: configuracoes_empresa
-- ====================================================

CREATE TABLE IF NOT EXISTS public.configuracoes_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_juridico TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    endereco TEXT NOT NULL,
    cidade_estado TEXT NOT NULL,
    cep TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

-- Adicionar dados padrão
INSERT INTO public.configuracoes_empresa (
    nome_juridico, nome_fantasia, whatsapp, endereco, cidade_estado, cep
) VALUES (
    'Comercial Coimbra Ltda',
    'Comercial Coimbra',
    '(64) 98170-8110',
    'R. Augusto Neto, N° 498 - São João',
    'Catalão - GO',
    '75703-300'
);

-- ====================================================
-- Trigger for updated_at
-- ====================================================

DROP TRIGGER IF EXISTS set_updated_at ON public.configuracoes_empresa;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.configuracoes_empresa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================
-- RLS Policies
-- ====================================================

-- Permitir que qualquer usuário logado ativo veja as configurações da empresa
CREATE POLICY "Configuracoes visiveis por usuarios ativos" 
  ON public.configuracoes_empresa
  FOR SELECT TO public
  USING (public.is_active_user());

-- Permitir apenas administrador atualizar
CREATE POLICY "Apenas admin pode atualizar configuracoes" 
  ON public.configuracoes_empresa
  FOR UPDATE TO public
  USING (public.has_role(ARRAY['administrador'::text]));

CREATE POLICY "Apenas admin pode inserir configuracoes" 
  ON public.configuracoes_empresa
  FOR INSERT TO public
  WITH CHECK (public.has_role(ARRAY['administrador'::text]));
