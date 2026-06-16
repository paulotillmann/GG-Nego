-- Criar bucket wpp-attachments se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wpp-attachments', 'wpp-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de segurança para o bucket wpp-attachments
DROP POLICY IF EXISTS "Permitir upload para usuarios autenticados wpp" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para todos wpp" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusao para usuarios autenticados wpp" ON storage.objects;

CREATE POLICY "Permitir upload para usuarios autenticados wpp" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wpp-attachments');

CREATE POLICY "Permitir leitura para todos wpp" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'wpp-attachments');

CREATE POLICY "Permitir exclusao para usuarios autenticados wpp" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'wpp-attachments');
