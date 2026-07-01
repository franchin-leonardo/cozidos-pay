-- Tabela de movimentações (transações financeiras)
CREATE TABLE movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de despesas (planejadas)
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de alocações (movimentações vinculadas a despesas)
CREATE TABLE movement_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_id UUID NOT NULL REFERENCES movements(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(movement_id, expense_id)
);

-- Índices para performance
CREATE INDEX movements_date_idx ON movements(date DESC);
CREATE INDEX movements_type_idx ON movements(type);
CREATE INDEX expenses_status_idx ON expenses(status);
CREATE INDEX allocations_expense_idx ON movement_allocations(expense_id);
CREATE INDEX allocations_movement_idx ON movement_allocations(movement_id);

-- Ativar RLS (Row Level Security)
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_allocations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acesso a todos por enquanto, você pode configurar melhor depois)
CREATE POLICY "Allow all access to movements" ON movements
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to allocations" ON movement_allocations
  FOR ALL USING (true) WITH CHECK (true);
