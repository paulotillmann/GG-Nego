-- 1. Criar função de sincronização do status de atendimento humano do dependente para a pessoa (titular)
CREATE OR REPLACE FUNCTION public.sync_dependent_atendimento_humano()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar o titular (pessoa_id)
    UPDATE public.pessoa
    SET 
        atendimento_humano = NEW.atendimento_humano,
        atendimento_humano_reset_em = NEW.atendimento_humano_reset_em
    WHERE 
        id = NEW.pessoa_id;

    -- Atualizar qualquer pessoa com o mesmo telefone do dependente (se preenchido)
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        UPDATE public.pessoa
        SET 
            atendimento_humano = NEW.atendimento_humano,
            atendimento_humano_reset_em = NEW.atendimento_humano_reset_em
        WHERE 
            phone = NEW.phone;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recriar o trigger associado à tabela dependentes
DROP TRIGGER IF EXISTS sync_dependent_atendimento_humano_trigger ON public.dependentes;

CREATE TRIGGER sync_dependent_atendimento_humano_trigger
AFTER UPDATE OF atendimento_humano, atendimento_humano_reset_em ON public.dependentes
FOR EACH ROW
EXECUTE FUNCTION public.sync_dependent_atendimento_humano();
