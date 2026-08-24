-- Hardening the excluir_pedido_seguro RPC

-- Revoke default execute from PUBLIC
REVOKE EXECUTE ON FUNCTION public.excluir_pedido_seguro(UUID) FROM PUBLIC;

-- Grant execute only to authenticated users (the internal check validates if they are admin)
GRANT EXECUTE ON FUNCTION public.excluir_pedido_seguro(UUID) TO authenticated;

-- Redefine function with SET search_path to prevent search path hijacking
CREATE OR REPLACE FUNCTION public.excluir_pedido_seguro(p_pedido_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pedido RECORD;
    v_item RECORD;
    v_eh_admin BOOLEAN;
BEGIN
    -- 1. Verificar permissão de administrador
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND papel = 'administrador' AND ativo = true
    ) INTO v_eh_admin;

    IF NOT v_eh_admin THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir pedidos.';
    END IF;

    -- 2. Obter o pedido e lockar para update
    SELECT * INTO v_pedido FROM public.pedidos WHERE id = p_pedido_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    -- 3. Reverter Estoque conforme status
    IF v_pedido.status = 'Confirmado' THEN
        -- Reverter qtd_reservada
        FOR v_item IN (SELECT * FROM public.pedidos_itens WHERE pedido_id = p_pedido_id)
        LOOP
            UPDATE public.itens_estoque
            SET qtd_reservada = qtd_reservada - v_item.quantidade
            WHERE id = v_item.item_estoque_id AND tipo = 'locacao';
        END LOOP;
    ELSIF v_pedido.status = 'Entregue' THEN
        -- Reverter qtd_alugada
        FOR v_item IN (SELECT * FROM public.pedidos_itens WHERE pedido_id = p_pedido_id)
        LOOP
            UPDATE public.itens_estoque
            SET qtd_alugada = qtd_alugada - v_item.quantidade
            WHERE id = v_item.item_estoque_id AND tipo = 'locacao';
        END LOOP;
    END IF;

    -- 4. Excluir o pedido.
    -- Devido ao ON DELETE CASCADE em pedidos_itens e agenda_eventos, eles serão excluídos automaticamente.
    DELETE FROM public.pedidos WHERE id = p_pedido_id;

END;
$$;
