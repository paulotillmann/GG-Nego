-- 1. Adicionar colunas na tabela de dependentes se não existirem
ALTER TABLE public.dependentes
ADD COLUMN IF NOT EXISTS atendimento_humano boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS atendimento_humano_reset_em timestamp with time zone DEFAULT NULL;

-- 2. Adicionar coluna na tabela de pessoa se não existir
ALTER TABLE public.pessoa
ADD COLUMN IF NOT EXISTS atendimento_humano_reset_em timestamp with time zone DEFAULT NULL;

-- 3. Criar função para redefinir o status de atendimento humano
CREATE OR REPLACE FUNCTION public.reset_atendimento_humano_status()
RETURNS void AS $$
BEGIN
    -- Resetar Pessoas
    UPDATE public.pessoa
    SET 
        atendimento_humano = false,
        atendimento_humano_reset_em = NULL
    WHERE 
        atendimento_humano = true
        AND atendimento_humano_reset_em IS NOT NULL
        AND atendimento_humano_reset_em <= NOW();

    -- Resetar Dependentes
    UPDATE public.dependentes
    SET 
        atendimento_humano = false,
        atendimento_humano_reset_em = NULL
    WHERE 
        atendimento_humano = true
        AND atendimento_humano_reset_em IS NOT NULL
        AND atendimento_humano_reset_em <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Habilitar a extensão pg_cron e agendar a execução da função a cada 1 hora
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Remover agendamento anterior se existir para evitar duplicados
SELECT cron.unschedule('reset-atendimento-humano-job') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-atendimento-humano-job');

-- Criar agendamento para rodar de hora em hora
SELECT cron.schedule(
    'reset-atendimento-humano-job',
    '0 * * * *', -- a cada 1 hora (no minuto 0)
    'SELECT public.reset_atendimento_humano_status()'
);
