-- 1. Criar trigger de UPDATE para pedidos_itens
CREATE OR REPLACE FUNCTION sync_locacao_estoque_on_item_update()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo TEXT;
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.pedidos WHERE id = NEW.pedido_id;
    SELECT tipo INTO v_tipo FROM public.itens_estoque WHERE id = NEW.item_estoque_id;

    IF v_tipo = 'locacao' AND v_status = 'Confirmado' THEN
        IF OLD.item_estoque_id = NEW.item_estoque_id THEN
            UPDATE public.itens_estoque
            SET qtd_reservada = qtd_reservada - OLD.quantidade + NEW.quantidade
            WHERE id = NEW.item_estoque_id;
        ELSE
            -- Se o item for trocado diretamente (raro, mas protegido)
            UPDATE public.itens_estoque SET qtd_reservada = qtd_reservada - OLD.quantidade WHERE id = OLD.item_estoque_id;
            UPDATE public.itens_estoque SET qtd_reservada = qtd_reservada + NEW.quantidade WHERE id = NEW.item_estoque_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_locacao_estoque_update ON public.pedidos_itens;
CREATE TRIGGER trg_sync_locacao_estoque_update
AFTER UPDATE ON public.pedidos_itens
FOR EACH ROW
WHEN (OLD.quantidade IS DISTINCT FROM NEW.quantidade OR OLD.item_estoque_id IS DISTINCT FROM NEW.item_estoque_id)
EXECUTE FUNCTION sync_locacao_estoque_on_item_update();

-- 2. Atualizar a RPC atualizar_pedido para usar diffing (UPDATE/INSERT/DELETE) em vez de DELETE total
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

    -- Remover itens que não estão mais no payload
    IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
        IF p_bebidas_por_escrito IS NULL OR TRIM(p_bebidas_por_escrito) = '' THEN
            RAISE EXCEPTION 'O pedido deve ter pelo menos um item ou bebidas descritas';
        END IF;
        DELETE FROM public.pedidos_itens WHERE pedido_id = p_pedido_id;
    ELSE
        DELETE FROM public.pedidos_itens 
        WHERE pedido_id = p_pedido_id 
          AND item_estoque_id NOT IN (
              SELECT (jsonb_array_elements(p_itens)->>'item_estoque_id')::UUID
          );

        -- Inserir novos ou atualizar existentes
        FOR item IN SELECT * FROM jsonb_array_elements(p_itens)
        LOOP
            IF EXISTS (SELECT 1 FROM public.pedidos_itens WHERE pedido_id = p_pedido_id AND item_estoque_id = (item->>'item_estoque_id')::UUID) THEN
                UPDATE public.pedidos_itens
                SET quantidade = (item->>'quantidade')::INTEGER
                WHERE pedido_id = p_pedido_id AND item_estoque_id = (item->>'item_estoque_id')::UUID;
            ELSE
                INSERT INTO public.pedidos_itens (pedido_id, item_estoque_id, quantidade)
                VALUES (
                    p_pedido_id,
                    (item->>'item_estoque_id')::UUID,
                    (item->>'quantidade')::INTEGER
                );
            END IF;
        END LOOP;
    END IF;

    RETURN p_pedido_id;
END;
$$;
