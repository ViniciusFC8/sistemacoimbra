-- 1. Adicionar novas colunas em pedidos
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS bairro_entrega TEXT,
ADD COLUMN IF NOT EXISTS cidade_entrega TEXT;

-- 2. Atualizar a RPC criar_pedido
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
    p_bairro_entrega TEXT,
    p_cidade_entrega TEXT,
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
        endereco_entrega,
        bairro_entrega,
        cidade_entrega
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
        p_endereco_entrega,
        p_bairro_entrega,
        p_cidade_entrega
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

-- 3. Atualizar a RPC atualizar_pedido
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
    p_bairro_entrega TEXT,
    p_cidade_entrega TEXT,
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
        bairro_entrega = p_bairro_entrega,
        cidade_entrega = p_cidade_entrega,
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

-- 4. Atualizar a trigger de sincronização de agenda para usar o endereço completo
CREATE OR REPLACE FUNCTION sync_agenda_from_pedido(p_pedido_id UUID)
RETURNS VOID AS $$
DECLARE
    v_pedido RECORD;
    v_tem_locacao BOOLEAN;
    v_resumo TEXT;
    v_data_hora_entrega TIMESTAMP WITH TIME ZONE;
    v_data_hora_devolucao TIMESTAMP WITH TIME ZONE;
    v_status_entrega TEXT;
    v_status_devolucao TEXT;
    v_endereco_completo TEXT;
BEGIN
    SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Verifica se tem locacao
    SELECT EXISTS (
        SELECT 1 FROM public.pedidos_itens pi
        JOIN public.itens_estoque ie ON pi.item_estoque_id = ie.id
        WHERE pi.pedido_id = p_pedido_id AND ie.tipo = 'locacao'
    ) INTO v_tem_locacao;

    -- Monta resumo_itens
    SELECT string_agg(ie.nome || ' (' || pi.quantidade || ')', ', ')
    INTO v_resumo
    FROM public.pedidos_itens pi
    JOIN public.itens_estoque ie ON pi.item_estoque_id = ie.id
    WHERE pi.pedido_id = p_pedido_id;

    -- Concatena bebidas_por_escrito se houver
    IF v_pedido.bebidas_por_escrito IS NOT NULL AND TRIM(v_pedido.bebidas_por_escrito) != '' THEN
        IF v_resumo IS NOT NULL THEN
            v_resumo := v_resumo || ', ' || v_pedido.bebidas_por_escrito;
        ELSE
            v_resumo := v_pedido.bebidas_por_escrito;
        END IF;
    END IF;

    -- Formata data/hora de entrega
    IF v_pedido.data_entrega IS NOT NULL THEN
        IF v_pedido.horario_entrega IS NOT NULL AND TRIM(v_pedido.horario_entrega) != '' THEN
            v_data_hora_entrega := ((v_pedido.data_entrega::text || ' ' || v_pedido.horario_entrega || ':00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
        ELSE
            v_data_hora_entrega := ((v_pedido.data_entrega::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
        END IF;
    END IF;

    -- Prepara o endereço completo
    v_endereco_completo := CONCAT_WS(', ', NULLIF(TRIM(v_pedido.endereco_entrega), ''), NULLIF(TRIM(v_pedido.bairro_entrega), ''), NULLIF(TRIM(v_pedido.cidade_entrega), ''));

    -- Define o status dos eventos com base no pedido
    v_status_entrega := 'Agendado';
    v_status_devolucao := 'Agendado';

    IF v_pedido.status = 'Entregue' THEN
        v_status_entrega := 'Concluído';
    ELSIF v_pedido.status = 'Finalizado' THEN
        v_status_entrega := 'Concluído';
        v_status_devolucao := 'Concluído';
    ELSIF v_pedido.status = 'Cancelado' THEN
        v_status_entrega := 'Cancelado';
        v_status_devolucao := 'Cancelado';
    END IF;

    -- Só gera/atualiza eventos se o pedido estiver em fluxo ativo
    IF v_pedido.status IN ('Confirmado', 'Entregue', 'Finalizado') THEN
        IF v_pedido.tipo_entrega = 'entrega' AND v_data_hora_entrega IS NOT NULL THEN
            INSERT INTO public.agenda_eventos (pedido_id, tipo, data_hora, status, resumo_itens, endereco, responsavel, observacoes)
            VALUES (p_pedido_id, 'Entrega', v_data_hora_entrega, v_status_entrega, v_resumo, v_endereco_completo, v_pedido.responsavel, v_pedido.observacoes)
            ON CONFLICT (pedido_id, tipo) 
            DO UPDATE SET 
                data_hora = EXCLUDED.data_hora,
                status = EXCLUDED.status,
                resumo_itens = EXCLUDED.resumo_itens,
                endereco = EXCLUDED.endereco,
                responsavel = EXCLUDED.responsavel,
                observacoes = EXCLUDED.observacoes,
                updated_at = NOW();
                
            -- Remove um eventual evento de Retirada
            DELETE FROM public.agenda_eventos WHERE pedido_id = p_pedido_id AND tipo = 'Retirada';
            
        ELSIF v_pedido.tipo_entrega = 'retirada' AND v_data_hora_entrega IS NOT NULL THEN
            INSERT INTO public.agenda_eventos (pedido_id, tipo, data_hora, status, resumo_itens, endereco, responsavel, observacoes)
            VALUES (p_pedido_id, 'Retirada', v_data_hora_entrega, v_status_entrega, v_resumo, v_endereco_completo, v_pedido.responsavel, v_pedido.observacoes)
            ON CONFLICT (pedido_id, tipo) 
            DO UPDATE SET 
                data_hora = EXCLUDED.data_hora,
                status = EXCLUDED.status,
                resumo_itens = EXCLUDED.resumo_itens,
                endereco = EXCLUDED.endereco,
                responsavel = EXCLUDED.responsavel,
                observacoes = EXCLUDED.observacoes,
                updated_at = NOW();
                
            -- Remove um eventual evento de Entrega
            DELETE FROM public.agenda_eventos WHERE pedido_id = p_pedido_id AND tipo = 'Entrega';
        END IF;

        -- Gera Devolucao se houver locacao e data fim
        IF v_tem_locacao AND v_pedido.data_fim_locacao IS NOT NULL THEN
            v_data_hora_devolucao := ((v_pedido.data_fim_locacao::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
            INSERT INTO public.agenda_eventos (pedido_id, tipo, data_hora, status, resumo_itens, endereco, responsavel, observacoes)
            VALUES (p_pedido_id, 'Devolução', v_data_hora_devolucao, v_status_devolucao, v_resumo, v_endereco_completo, v_pedido.responsavel, v_pedido.observacoes)
            ON CONFLICT (pedido_id, tipo) 
            DO UPDATE SET 
                data_hora = EXCLUDED.data_hora,
                status = EXCLUDED.status,
                resumo_itens = EXCLUDED.resumo_itens,
                endereco = EXCLUDED.endereco,
                responsavel = EXCLUDED.responsavel,
                observacoes = EXCLUDED.observacoes,
                updated_at = NOW();
        ELSE
            -- Se não tem mais locacao ou tirou a data fim, exclui o evento Devolucao
            DELETE FROM public.agenda_eventos WHERE pedido_id = p_pedido_id AND tipo = 'Devolução';
        END IF;
    ELSIF v_pedido.status = 'Cancelado' THEN
       UPDATE public.agenda_eventos SET status = 'Cancelado' WHERE pedido_id = p_pedido_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atualizar todos os eventos já existentes para adotar a formatação completa
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.pedidos LOOP
        PERFORM sync_agenda_from_pedido(r.id);
    END LOOP;
END $$;
