CREATE OR REPLACE FUNCTION check_pedido_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'Entregue' AND NEW.status = 'Confirmado' THEN
        RAISE EXCEPTION 'Não é permitido alterar o status de Entregue para Confirmado';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_pedido_status_transition ON public.pedidos;

CREATE TRIGGER enforce_pedido_status_transition
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION check_pedido_status_transition();
