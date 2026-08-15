-- Atualiza a check constraint
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.pedidos'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.pedidos DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_status_check CHECK (status IN ('Confirmado', 'Entregue', 'Finalizado'));

-- Atualiza a função da trigger de proteção
CREATE OR REPLACE FUNCTION check_pedido_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir Update no mesmo status
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Validar transições
    IF OLD.status = 'Confirmado' AND NEW.status != 'Entregue' THEN
        RAISE EXCEPTION 'Transição inválida de Confirmado para %', NEW.status;
    END IF;

    IF OLD.status = 'Entregue' AND NEW.status != 'Finalizado' THEN
        RAISE EXCEPTION 'Transição inválida de Entregue para %', NEW.status;
    END IF;

    IF OLD.status = 'Finalizado' THEN
        RAISE EXCEPTION 'Não é permitido alterar o status de um pedido Finalizado';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
