-- Migração incremental: controle de mensagens Gmail processadas no import de PIX
CREATE TABLE IF NOT EXISTS import_pix_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gmail_message_id TEXT NOT NULL UNIQUE,
  movement_id UUID REFERENCES movements(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('imported', 'duplicate_existing_movement')),
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS import_pix_messages_processed_at_idx
  ON import_pix_messages(processed_at DESC);

CREATE INDEX IF NOT EXISTS import_pix_messages_status_idx
  ON import_pix_messages(status);

ALTER TABLE import_pix_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'import_pix_messages'
      AND policyname = 'Allow all access to import_pix_messages'
  ) THEN
    CREATE POLICY "Allow all access to import_pix_messages"
      ON import_pix_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
