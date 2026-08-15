-- Criar trigger de DELETE para subtrair reservas se um item for removido
CREATE OR REPLACE FUNCTION sync_locacao_estoque_on_item_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo TEXT;
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.pedidos WHERE id = OLD.pedido_id;
    SELECT tipo INTO v_tipo FROM public.itens_estoque WHERE id = OLD.item_estoque_id;

    IF v_tipo = 'locacao' AND v_status = 'Confirmado' THEN
        UPDATE public.itens_estoque
        SET qtd_reservada = qtd_reservada - OLD.quantidade
        WHERE id = OLD.item_estoque_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_locacao_estoque_delete ON public.pedidos_itens;
CREATE TRIGGER trg_sync_locacao_estoque_delete
AFTER DELETE ON public.pedidos_itens
FOR EACH ROW
EXECUTE FUNCTION sync_locacao_estoque_on_item_delete();

-- Criar a RPC atualizar_pedido
CREATE OR REPLACE FUNCTION atualizar_pedido(
    p_pedido_id UUID,
    p_cliente_id UUID,
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
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    item JSONB;
    v_status TEXT;
BEGIN
    -- Validar se o pedido existe e o status
    SELECT status INTO v_status FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Pedido não encontrado';
    END IF;

    IF v_status != 'Confirmado' THEN
        RAISE EXCEPTION 'Somente pedidos Confirmados podem ser editados. Status atual: %', v_status;
    END IF;

    -- Atualizar dados do pedido
    UPDATE public.pedidos
    SET 
        cliente_id = p_cliente_id,
        tipo_entrega = p_tipo_entrega,
        data_entrega = p_data_entrega,
        data_fim_locacao = p_data_fim_locacao,
        horario_entrega = p_horario_entrega,
        forma_pagamento = p_forma_pagamento,
        responsavel = p_responsavel,
        observacoes = p_observacoes,
        bebidas_por_escrito = p_bebidas_por_escrito,
        valor_total = p_valor_total,
        endereco_entrega = p_endereco_entrega,
        updated_at = NOW()
    WHERE id = p_pedido_id;

    -- Remover itens atuais (aciona a trigger de DELETE que subtrai a reserva)
    DELETE FROM public.pedidos_itens WHERE pedido_id = p_pedido_id;

    -- Inserir novos itens (aciona a trigger de INSERT que soma a reserva)
    -- Se a nova reserva ultrapassar o disponível, a CHECK constraint de itens_estoque cancela a transação inteira.
    IF p_itens IS NOT NULL AND jsonb_array_length(p_itens) > 0 THEN
        FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
        LOOP
            INSERT INTO public.pedidos_itens (pedido_id, item_estoque_id, quantidade)
            VALUES (
                p_pedido_id,
                (item->>'item_estoque_id')::UUID,
                (item->>'quantidade')::INTEGER
            );
        END LOOP;
    ELSIF p_bebidas_por_escrito IS NULL OR TRIM(p_bebidas_por_escrito) = '' THEN
        RAISE EXCEPTION 'O pedido deve ter pelo menos um item ou bebidas descritas';
    END IF;

    RETURN p_pedido_id;
END;
$$;
