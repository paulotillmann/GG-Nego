-- Migration: add_alterado_por_to_pessoa
-- Adiciona campo de texto livre para registrar quem alterou o cadastro

ALTER TABLE public.pessoa
ADD COLUMN alterado_por text;

COMMENT ON COLUMN public.pessoa.alterado_por
IS 'Nome de texto livre da última pessoa que alterou o cadastro. Sem FK — valor livre.';
