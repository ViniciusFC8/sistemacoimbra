-- 1. Tabela itens_estoque
CREATE TABLE public.itens_estoque (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('venda', 'locacao')),
    categoria text,
    unidade text,
    quantidade_total integer NOT NULL DEFAULT 0,
    estoque_minimo integer,
    qtd_reservada integer NOT NULL DEFAULT 0,
    qtd_alugada integer NOT NULL DEFAULT 0,
    qtd_manutencao integer NOT NULL DEFAULT 0,
    qtd_disponivel integer GENERATED ALWAYS AS (quantidade_total - qtd_reservada - qtd_alugada - qtd_manutencao) STORED,
    status text GENERATED ALWAYS AS (
        CASE 
            WHEN tipo = 'venda' AND quantidade_total <= 0 THEN 'Indisponível'
            WHEN tipo = 'venda' AND quantidade_total < COALESCE(estoque_minimo, 10) THEN 'Estoque baixo'
            ELSE 'Disponível'
        END
    ) STORED,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT itens_estoque_pkey PRIMARY KEY (id),
    CONSTRAINT itens_estoque_quantidade_total_check CHECK (quantidade_total >= 0),
    CONSTRAINT itens_estoque_qtd_reservada_check CHECK (qtd_reservada >= 0),
    CONSTRAINT itens_estoque_qtd_alugada_check CHECK (qtd_alugada >= 0),
    CONSTRAINT itens_estoque_qtd_manutencao_check CHECK (qtd_manutencao >= 0),
    CONSTRAINT itens_estoque_soma_check CHECK ((qtd_reservada + qtd_alugada + qtd_manutencao) <= quantidade_total)
);

-- 2. Tabela movimentacoes_estoque
CREATE TABLE public.movimentacoes_estoque (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    quantidade_anterior integer NOT NULL,
    quantidade_nova integer NOT NULL,
    motivo text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT movimentacoes_estoque_pkey PRIMARY KEY (id),
    CONSTRAINT movimentacoes_estoque_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.itens_estoque(id) ON DELETE RESTRICT,
    CONSTRAINT movimentacoes_estoque_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT movimentacoes_estoque_motivo_check CHECK (length(trim(motivo)) >= 4)
);

-- 3. Triggers
CREATE TRIGGER set_itens_estoque_updated_at
    BEFORE UPDATE ON public.itens_estoque
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS - itens_estoque
ALTER TABLE public.itens_estoque ENABLE ROW LEVEL SECURITY;

-- Usuários ativos podem visualizar
CREATE POLICY "Usuários ativos podem visualizar itens_estoque"
    ON public.itens_estoque FOR SELECT
    USING (public.is_active_user());

-- Administrador e operacao podem cadastrar e alterar
CREATE POLICY "Admins e operacao podem cadastrar itens_estoque"
    ON public.itens_estoque FOR INSERT
    WITH CHECK (
        public.is_active_user() AND 
        public.has_role(ARRAY['administrador', 'operacao'])
    );

CREATE POLICY "Admins e operacao podem alterar itens_estoque"
    ON public.itens_estoque FOR UPDATE
    USING (
        public.is_active_user() AND 
        public.has_role(ARRAY['administrador', 'operacao'])
    );

-- Não permitir exclusão física (sem POLICY FOR DELETE)

-- 5. RLS - movimentacoes_estoque
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Usuários ativos podem visualizar
CREATE POLICY "Usuários ativos podem visualizar movimentacoes_estoque"
    ON public.movimentacoes_estoque FOR SELECT
    USING (public.is_active_user());

-- Administrador e operacao podem cadastrar
CREATE POLICY "Admins e operacao podem cadastrar movimentacoes_estoque"
    ON public.movimentacoes_estoque FOR INSERT
    WITH CHECK (
        public.is_active_user() AND 
        public.has_role(ARRAY['administrador', 'operacao'])
    );

-- Movimentações não devem ser alteradas nem excluídas (sem POLICY FOR UPDATE / DELETE)
