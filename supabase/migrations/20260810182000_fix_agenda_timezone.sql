-- Corrige o problema de fuso horário ao converter a data e hora do pedido para a agenda
CREATE OR REPLACE FUNCTION sync_agenda_from_pedido(p_pedido_id UUID)
RETURNS VOID AS $$
DECLARE
    v_pedido RECORD;
    v_tem_locacao BOOLEAN;
    v_resumo TEXT;
    v_data_hora_entrega TIMESTAMP WITH TIME ZONE;
    v_data_hora_devolucao TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Verifica se tem locação
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

    -- Formata data/hora de entrega respeitando o fuso horário oficial (America/Sao_Paulo)
    IF v_pedido.data_entrega IS NOT NULL THEN
        IF v_pedido.horario_entrega IS NOT NULL AND TRIM(v_pedido.horario_entrega) != '' THEN
            v_data_hora_entrega := ((v_pedido.data_entrega::text || ' ' || v_pedido.horario_entrega || ':00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
        ELSE
            v_data_hora_entrega := ((v_pedido.data_entrega::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
        END IF;
    END IF;

    -- Só gera/atualiza eventos se o pedido estiver em fluxo ativo (Confirmado ou Entregue)
    IF v_pedido.status IN ('Confirmado', 'Entregue') THEN
        IF v_pedido.tipo_entrega = 'entrega' AND v_data_hora_entrega IS NOT NULL THEN
            INSERT INTO public.agenda_eventos (pedido_id, tipo, data_hora, status, resumo_itens, endereco, responsavel, observacoes)
            VALUES (p_pedido_id, 'Entrega', v_data_hora_entrega, 'Agendado', v_resumo, v_pedido.endereco_entrega, v_pedido.responsavel, v_pedido.observacoes)
            ON CONFLICT (pedido_id, tipo) 
            DO UPDATE SET 
                data_hora = EXCLUDED.data_hora,
                resumo_itens = EXCLUDED.resumo_itens,
                endereco = EXCLUDED.endereco,
                responsavel = EXCLUDED.responsavel,
                observacoes = EXCLUDED.observacoes,
                updated_at = NOW();
                
            -- Remove um eventual evento de Retirada que possa ter existido antes
            DELETE FROM public.agenda_eventos WHERE pedido_id = p_pedido_id AND tipo = 'Retirada';
            
        ELSIF v_pedido.tipo_entrega = 'retirada' AND v_data_hora_entrega IS NOT NULL THEN
            INSERT INTO public.agenda_eventos (pedido_id, tipo, data_hora, status, resumo_itens, endereco, responsavel, observacoes)
            VALUES (p_pedido_id, 'Retirada', v_data_hora_entrega, 'Agendado', v_resumo, v_pedido.endereco_entrega, v_pedido.responsavel, v_pedido.observacoes)
            ON CONFLICT (pedido_id, tipo) 
            DO UPDATE SET 
                data_hora = EXCLUDED.data_hora,
                resumo_itens = EXCLUDED.resumo_itens,
                endereco = EXCLUDED.endereco,
                responsavel = EXCLUDED.responsavel,
                observacoes = EXCLUDED.observacoes,
                updated_at = NOW();
                
            -- Remove um eventual evento de Entrega
            DELETE FROM public.agenda_eventos WHERE pedido_id = p_pedido_id AND tipo = 'Entrega';
        END IF;

        -- Gera Devolução se houver locação e data fim
        IF v_tem_locacao AND v_pedido.data_fim_locacao IS NOT NULL THEN
            v_data_hora_devolucao := ((v_pedido.data_fim_locacao::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
            INSERT INTO public.agenda_eventos (pedido_id, tipo, data_hora, status, resumo_itens, endereco, responsavel, observacoes)
            VALUES (p_pedido_id, 'Devolução', v_data_hora_devolucao, 'Agendado', v_resumo, v_pedido.endereco_entrega, v_pedido.responsavel, v_pedido.observacoes)
            ON CONFLICT (pedido_id, tipo) 
            DO UPDATE SET 
                data_hora = EXCLUDED.data_hora,
                resumo_itens = EXCLUDED.resumo_itens,
                endereco = EXCLUDED.endereco,
                responsavel = EXCLUDED.responsavel,
                observacoes = EXCLUDED.observacoes,
                updated_at = NOW();
        ELSE
            -- Se não tem mais locação ou tirou a data fim, exclui o evento Devolução
            DELETE FROM public.agenda_eventos WHERE pedido_id = p_pedido_id AND tipo = 'Devolução';
        END IF;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Corrige os eventos que já haviam sido gerados de forma errada
UPDATE public.agenda_eventos ae
SET data_hora = ((p.data_entrega::text || ' ' || COALESCE(p.horario_entrega, '00:00') || ':00')::timestamp AT TIME ZONE 'America/Sao_Paulo')
FROM public.pedidos p
WHERE ae.pedido_id = p.id AND ae.tipo IN ('Entrega', 'Retirada');

UPDATE public.agenda_eventos ae
SET data_hora = ((p.data_fim_locacao::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo')
FROM public.pedidos p
WHERE ae.pedido_id = p.id AND ae.tipo = 'Devolução';
