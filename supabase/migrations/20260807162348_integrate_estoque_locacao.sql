-- Garante que valores nulos sejam 0 para evitar problemas matemáticos
UPDATE public.itens_estoque SET qtd_reservada = 0 WHERE qtd_reservada IS NULL;
UPDATE public.itens_estoque SET qtd_alugada = 0 WHERE qtd_alugada IS NULL;
UPDATE public.itens_estoque SET qtd_manutencao = 0 WHERE qtd_manutencao IS NULL;

-- Adiciona constraints de validação de estoque
ALTER TABLE public.itens_estoque 
ADD CONSTRAINT chk_qtd_nao_negativa 
CHECK (quantidade_total >= 0 AND qtd_reservada >= 0 AND qtd_alugada >= 0 AND qtd_manutencao >= 0);

ALTER TABLE public.itens_estoque 
ADD CONSTRAINT chk_qtd_disponivel 
CHECK ((qtd_reservada + qtd_alugada + qtd_manutencao) <= quantidade_total);

-- Trigger 1: Inserção de itens no pedido (Reservar estoque)
CREATE OR REPLACE FUNCTION sync_locacao_estoque_on_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo TEXT;
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM public.pedidos WHERE id = NEW.pedido_id;
    SELECT tipo INTO v_tipo FROM public.itens_estoque WHERE id = NEW.item_estoque_id;

    IF v_tipo = 'locacao' AND v_status = 'Confirmado' THEN
        UPDATE public.itens_estoque
        SET qtd_reservada = qtd_reservada + NEW.quantidade
        WHERE id = NEW.item_estoque_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_locacao_estoque_insert ON public.pedidos_itens;
CREATE TRIGGER trg_sync_locacao_estoque_insert
AFTER INSERT ON public.pedidos_itens
FOR EACH ROW
EXECUTE FUNCTION sync_locacao_estoque_on_item_insert();


-- Trigger 2: Mudança de status do pedido (Mover de reservado para alugado, ou remover alugado)
CREATE OR REPLACE FUNCTION sync_locacao_estoque_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Confirmado' AND NEW.status = 'Entregue' THEN
        -- Move de reservada para alugada
        UPDATE public.itens_estoque
        SET qtd_reservada = qtd_reservada - pi.quantidade,
            qtd_alugada = qtd_alugada + pi.quantidade
        FROM public.pedidos_itens pi
        WHERE pi.pedido_id = NEW.id
          AND pi.item_estoque_id = public.itens_estoque.id
          AND public.itens_estoque.tipo = 'locacao';

    ELSIF OLD.status = 'Entregue' AND NEW.status = 'Finalizado' THEN
        -- Remove de alugada (devolve ao estoque)
        UPDATE public.itens_estoque
        SET qtd_alugada = qtd_alugada - pi.quantidade
        FROM public.pedidos_itens pi
        WHERE pi.pedido_id = NEW.id
          AND pi.item_estoque_id = public.itens_estoque.id
          AND public.itens_estoque.tipo = 'locacao';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_locacao_estoque_status ON public.pedidos;
CREATE TRIGGER trg_sync_locacao_estoque_status
AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_locacao_estoque_on_status_change();
