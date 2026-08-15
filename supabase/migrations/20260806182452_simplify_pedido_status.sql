-- Converte os status antigos para Confirmado (se não for Entregue)
UPDATE public.pedidos 
SET status = 'Confirmado' 
WHERE status != 'Entregue';

-- Remove todas as check constraints existentes no campo status da tabela pedidos
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

-- Adiciona a nova restrição e o valor padrão
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_status_check CHECK (status IN ('Confirmado', 'Entregue'));
ALTER TABLE public.pedidos ALTER COLUMN status SET DEFAULT 'Confirmado';
