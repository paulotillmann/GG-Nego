-- Cria a tabela de sequências
CREATE TABLE IF NOT EXISTS public.oficios_seq (
  id uuid primary key default gen_random_uuid(),
  ano integer not null unique,
  ultimo_numero integer not null default 0
);

-- Ativa RLS
ALTER TABLE public.oficios_seq ENABLE ROW LEVEL SECURITY;

-- Políticas (Permitir acesso total a usuários logados para a config funcionar)
CREATE POLICY "Users can view oficios_seq" ON public.oficios_seq FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update oficios_seq" ON public.oficios_seq FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can insert oficios_seq" ON public.oficios_seq FOR INSERT TO authenticated WITH CHECK (true);

-- Função que gera o próximo número
CREATE OR REPLACE FUNCTION generate_oficio_numero()
RETURNS trigger AS $$
DECLARE
  current_year integer;
  next_num integer;
BEGIN
  current_year := extract(year from NEW.data_emissao);
  
  -- Insere o ano (começando em 1) ou incrementa se já existir
  INSERT INTO public.oficios_seq (ano, ultimo_numero)
  VALUES (current_year, 1)
  ON CONFLICT (ano) DO UPDATE
  SET ultimo_numero = public.oficios_seq.ultimo_numero + 1
  RETURNING ultimo_numero INTO next_num;
  
  -- Formata a string (ex: Ofício n. 876/2026)
  NEW.numero := 'Ofício n. ' || next_num || '/' || current_year;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove a trigger anterior se existir
DROP TRIGGER IF EXISTS trg_generate_oficio_numero ON public.oficios;

-- Cria a trigger para rodar ANTES do insert, somente se numero for nulo ou vazio
CREATE TRIGGER trg_generate_oficio_numero
  BEFORE INSERT ON public.oficios
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generate_oficio_numero();
