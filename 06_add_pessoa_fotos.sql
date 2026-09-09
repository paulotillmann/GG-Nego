-- Migration: 06_add_pessoa_fotos.sql
-- Tabela auxiliar para fotos da pessoa (até 5 fotos por pessoa) e bucket de storage

CREATE TABLE IF NOT EXISTS public.pessoa_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  foto_url text NOT NULL,
  descricao text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_pessoa_fotos_pessoa_id ON public.pessoa_fotos(pessoa_id);

-- Habilitar RLS
ALTER TABLE public.pessoa_fotos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pessoa_fotos' AND policyname = 'Permitir leitura de fotos para usuários autenticados'
  ) THEN
    CREATE POLICY "Permitir leitura de fotos para usuários autenticados"
      ON public.pessoa_fotos FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pessoa_fotos' AND policyname = 'Permitir inserção de fotos para usuários autenticados'
  ) THEN
    CREATE POLICY "Permitir inserção de fotos para usuários autenticados"
      ON public.pessoa_fotos FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pessoa_fotos' AND policyname = 'Permitir atualização de fotos para usuários autenticados'
  ) THEN
    CREATE POLICY "Permitir atualização de fotos para usuários autenticados"
      ON public.pessoa_fotos FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pessoa_fotos' AND policyname = 'Permitir exclusão de fotos para usuários autenticados'
  ) THEN
    CREATE POLICY "Permitir exclusão de fotos para usuários autenticados"
      ON public.pessoa_fotos FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- 2. Criar bucket pessoa-fotos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('pessoa-fotos', 'pessoa-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para pessoa-fotos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Permitir leitura pública de pessoa-fotos'
  ) THEN
    CREATE POLICY "Permitir leitura pública de pessoa-fotos"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'pessoa-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Permitir upload em pessoa-fotos para autenticados'
  ) THEN
    CREATE POLICY "Permitir upload em pessoa-fotos para autenticados"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'pessoa-fotos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Permitir delete em pessoa-fotos para autenticados'
  ) THEN
    CREATE POLICY "Permitir delete em pessoa-fotos para autenticados"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'pessoa-fotos');
  END IF;
END $$;
