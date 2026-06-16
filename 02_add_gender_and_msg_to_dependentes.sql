-- Adiciona as colunas gender e mensagem_padrao na tabela dependentes
ALTER TABLE public.dependentes 
ADD COLUMN IF NOT EXISTS gender text DEFAULT 'Não definido',
ADD COLUMN IF NOT EXISTS mensagem_padrao text;
