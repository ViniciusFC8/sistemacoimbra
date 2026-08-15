-- Create pedidos table
CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('Orçamento', 'Confirmado', 'Em separação', 'Pronto', 'Saiu para entrega', 'Entregue')),
    tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('entrega', 'retirada')),
    data_entrega DATE NOT NULL,
    data_fim_locacao DATE,
    horario_entrega TEXT,
    forma_pagamento TEXT,
    responsavel TEXT,
    observacoes TEXT,
    bebidas_por_escrito TEXT,
    valor_total NUMERIC NOT NULL CHECK (valor_total >= 0),
    endereco_entrega TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_pedidos_endereco CHECK (
        (tipo_entrega = 'entrega' AND endereco_entrega IS NOT NULL AND trim(endereco_entrega) <> '') 
        OR (tipo_entrega = 'retirada')
    )
);

-- Create pedidos_itens table
CREATE TABLE public.pedidos_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    item_estoque_id UUID NOT NULL REFERENCES public.itens_estoque(id) ON DELETE RESTRICT,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0)
);

-- Indexes
CREATE INDEX idx_pedidos_cliente_id ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_itens_pedido_id ON public.pedidos_itens(pedido_id);
CREATE INDEX idx_pedidos_itens_item_estoque_id ON public.pedidos_itens(item_estoque_id);

-- Update trigger
CREATE TRIGGER set_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_itens ENABLE ROW LEVEL SECURITY;

-- Policies for pedidos
CREATE POLICY "View pedidos for active users" ON public.pedidos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true
        )
    );

CREATE POLICY "Insert pedidos for admin and atendente" ON public.pedidos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true 
            AND profiles.papel IN ('administrador', 'atendente')
        )
    );

CREATE POLICY "Update pedidos for admin and atendente" ON public.pedidos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true 
            AND profiles.papel IN ('administrador', 'atendente')
        )
    );

-- Policies for pedidos_itens
CREATE POLICY "View pedidos_itens for active users" ON public.pedidos_itens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true
        )
    );

CREATE POLICY "Insert pedidos_itens for admin and atendente" ON public.pedidos_itens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true 
            AND profiles.papel IN ('administrador', 'atendente')
        )
    );

CREATE POLICY "Update pedidos_itens for admin and atendente" ON public.pedidos_itens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true 
            AND profiles.papel IN ('administrador', 'atendente')
        )
    );

CREATE POLICY "Delete pedidos_itens for admin and atendente" ON public.pedidos_itens
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.ativo = true 
            AND profiles.papel IN ('administrador', 'atendente')
        )
    );
