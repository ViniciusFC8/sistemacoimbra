-- Função para criação transacional de pedidos
CREATE OR REPLACE FUNCTION public.criar_pedido(
    p_cliente_id UUID,
    p_status TEXT,
    p_tipo_entrega TEXT,
    p_data_entrega DATE,
    p_data_fim_locacao DATE,
    p_horario_entrega TEXT,
    p_forma_pagamento TEXT,
    p_responsavel TEXT,
    p_observacoes TEXT,
    p_bebidas_por_escrito TEXT,
    p_valor_total NUMERIC,
    p_endereco_entrega TEXT,
    p_itens JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_pedido_id UUID;
    v_item RECORD;
    v_itens_count INTEGER;
BEGIN
    -- Validar que ao menos um item estruturado ou bebidas_por_escrito foi informado
    v_itens_count := COALESCE(jsonb_array_length(p_itens), 0);
    IF v_itens_count = 0 AND (p_bebidas_por_escrito IS NULL OR trim(p_bebidas_por_escrito) = '') THEN
        RAISE EXCEPTION 'O pedido deve conter pelo menos um item ou uma anotação de bebidas.';
    END IF;

    -- Inserir o pedido
    INSERT INTO public.pedidos (
        cliente_id,
        status,
        tipo_entrega,
        data_entrega,
        data_fim_locacao,
        horario_entrega,
        forma_pagamento,
        responsavel,
        observacoes,
        bebidas_por_escrito,
        valor_total,
        endereco_entrega
    )
    VALUES (
        p_cliente_id,
        p_status,
        p_tipo_entrega,
        p_data_entrega,
        p_data_fim_locacao,
        p_horario_entrega,
        p_forma_pagamento,
        p_responsavel,
        p_observacoes,
        p_bebidas_por_escrito,
        p_valor_total,
        p_endereco_entrega
    )
    RETURNING id INTO v_pedido_id;

    -- Inserir os itens, se houver
    IF v_itens_count > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(item_estoque_id UUID, quantidade INTEGER)
        LOOP
            INSERT INTO public.pedidos_itens (
                pedido_id,
                item_estoque_id,
                quantidade
            )
            VALUES (
                v_pedido_id,
                v_item.item_estoque_id,
                v_item.quantidade
            );
        END LOOP;
    END IF;

    RETURN v_pedido_id;
END;
$$;
