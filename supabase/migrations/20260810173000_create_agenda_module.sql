-- Migration para criar o módulo Agenda e automações via triggers

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('Entrega', 'Retirada', 'Devolução', 'Manutenção', 'Compromisso')),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Agendado' CHECK (status IN ('Agendado', 'Concluído', 'Cancelado')),
    resumo_itens TEXT,
    endereco TEXT,
    responsavel TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (pedido_id, tipo)
);

-- Habilitar RLS
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para autenticados" ON public.agenda_eventos
    FOR ALL USING (auth.role() = 'authenticated');

-- Função centralizada para sincronizar eventos da agenda com base no estado atual do pedido
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

    -- Formata data/hora de entrega
    IF v_pedido.data_entrega IS NOT NULL THEN
        IF v_pedido.horario_entrega IS NOT NULL AND TRIM(v_pedido.horario_entrega) != '' THEN
            v_data_hora_entrega := (v_pedido.data_entrega::text || ' ' || v_pedido.horario_entrega || ':00')::timestamp with time zone;
        ELSE
            v_data_hora_entrega := (v_pedido.data_entrega::text || ' 00:00:00')::timestamp with time zone;
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
            v_data_hora_devolucao := (v_pedido.data_fim_locacao::text || ' 00:00:00')::timestamp with time zone;
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


-- Triggers para disparar a sincronização
CREATE OR REPLACE FUNCTION trg_sync_agenda_on_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    PERFORM sync_agenda_from_pedido(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agenda_sync_pedidos
AFTER INSERT OR UPDATE OF status, tipo_entrega, data_entrega, horario_entrega, data_fim_locacao, endereco_entrega, responsavel, observacoes, bebidas_por_escrito
ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION trg_sync_agenda_on_pedido();


CREATE OR REPLACE FUNCTION trg_sync_agenda_on_pedido_item()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM sync_agenda_from_pedido(OLD.pedido_id);
        RETURN OLD;
    ELSE
        PERFORM sync_agenda_from_pedido(NEW.pedido_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agenda_sync_pedidos_itens
AFTER INSERT OR UPDATE OR DELETE
ON public.pedidos_itens
FOR EACH ROW
EXECUTE FUNCTION trg_sync_agenda_on_pedido_item();
