-- Adiciona campo opcional de descricao nas movimentacoes
ALTER TABLE movements
ADD COLUMN IF NOT EXISTS description TEXT;
