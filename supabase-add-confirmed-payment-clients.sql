-- Migração incremental para criar estrutura de clientes de pagamentos confirmados
CREATE TABLE IF NOT EXISTS confirmed_payment_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 70.00,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_number)
);

CREATE INDEX IF NOT EXISTS confirmed_payment_clients_paid_idx
  ON confirmed_payment_clients(paid);

CREATE INDEX IF NOT EXISTS confirmed_payment_clients_number_idx
  ON confirmed_payment_clients(client_number);

ALTER TABLE confirmed_payment_clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'confirmed_payment_clients'
      AND policyname = 'Allow all access to confirmed_payment_clients'
  ) THEN
    CREATE POLICY "Allow all access to confirmed_payment_clients"
      ON confirmed_payment_clients
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

INSERT INTO confirmed_payment_clients (client_number, name, amount, paid)
VALUES
  (1, 'Sidão', 70.00, true),
  (2, 'Pensador', 70.00, true),
  (3, 'Gabigol', 70.00, true),
  (4, 'Vini', 70.00, true),
  (5, 'Luizinho', 70.00, true),
  (6, 'Beto', 70.00, false),
  (7, 'Gabriel Negrão', 70.00, false),
  (8, 'Vitor', 70.00, false),
  (9, 'Bruno', 70.00, false),
  (11, 'Eduardo', 70.00, false),
  (12, 'Palmeiras', 70.00, false),
  (13, 'Heverton', 70.00, false),
  (14, 'Caio', 70.00, false),
  (15, 'Lucato', 70.00, true),
  (16, 'Felippe', 70.00, false),
  (17, 'Marcio', 70.00, false),
  (18, 'Nantes', 70.00, false),
  (19, 'Carvalho', 70.00, false),
  (20, 'Ronan', 70.00, false),
  (21, 'Lukinhas', 70.00, false),
  (22, 'Pedro', 70.00, false)
ON CONFLICT (client_number) DO UPDATE
SET
  name = EXCLUDED.name,
  amount = EXCLUDED.amount,
  paid = EXCLUDED.paid,
  updated_at = NOW();
