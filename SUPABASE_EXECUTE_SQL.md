# 🚀 Próximos Passos - Configuração Supabase

## ✅ Completado
- ✅ Projeto Supabase criado: `cozidos-pay`
- ✅ URL configurada: `https://ixuzdjxksvtxiwscguad.supabase.co`
- ✅ Anon Key configurada no `.env.local`
- ✅ Dependências instaladas (`@supabase/supabase-js`)
- ✅ Serviços criados (`src/lib/supabaseService.ts`)

## 📋 PRÓXIMO PASSO - Executar o SQL (IMPORTANTE!)

1. **Acesse SQL Editor**: https://supabase.com/dashboard/project/ixuzdjxksvtxiwscguad/sql/new

2. **Copie todo o SQL abaixo** e cole no editor:

```sql
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

-- Políticas RLS (permitir acesso a todos por enquanto)
CREATE POLICY "Allow all access to movements" ON movements
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to expenses" ON expenses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to allocations" ON movement_allocations
  FOR ALL USING (true) WITH CHECK (true);
```

3. **Clique em "Run"** (ou use Ctrl+Enter)

4. **Espere** completar (deve dizer "Success" em verde)

## 🧪 Testar Conexão

Depois de executar o SQL, reinicie o servidor:
```bash
npm run dev
```

Abra o navegador e vá para http://127.0.0.1:5173/

No **DevTools (F12)**, vá até **Console** e rode:
```javascript
import { supabase } from './src/lib/supabase'
supabase.from('movements').select().then(res => console.log(res))
```

Se retornar dados sem erro, está funcionando! ✅

## 📝 Configuração (.env.local)

Seu arquivo `.env.local` já contém:
```env
VITE_SUPABASE_URL=https://ixuzdjxksvtxiwscguad.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_mxoY-IUVg9TOgwmkeq6Sqw_-J4nlewP
```

## 🔄 Próxima Integração

Após confirmar que o SQL foi executado e testado, vou:
1. Integrar dados reais do Supabase no App.tsx
2. Substituir dados mock por queries ao banco
3. Adicionar autenticação com login/signup
4. Implementar sincronização realtime

Avise quando o SQL tiver sido executado com sucesso! 🚀
