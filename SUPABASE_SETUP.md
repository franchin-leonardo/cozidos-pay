# Integração Supabase

## 📋 Passo a Passo para Configurar

### 1️⃣ Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Vá para sua organização `franchin-leonardo`
3. Clique em "New Project"
4. Configure:
   - **Name**: `cozidos-pay` ou similar
   - **Database Password**: Salve em local seguro
   - **Region**: Escolha a mais próxima (ex: `South America (São Paulo)`)
5. Clique em "Create new project" e aguarde (~2 minutos)

### 2️⃣ Executar Schema SQL

1. No dashboard do Supabase, vá para **SQL Editor**
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `supabase-schema.sql`
4. Cole na query e clique em "Run"
5. Você verá as tabelas criadas em **Database > Tables**

### 3️⃣ Configurar Variáveis de Ambiente

1. No dashboard, vá para **Settings > API**
2. Copie:
   - **Project URL** → Copie em `VITE_SUPABASE_URL`
   - **anon public** → Copie em `VITE_SUPABASE_ANON_KEY`
3. Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Salve e reinicie o servidor (`npm run dev`)

### 4️⃣ Testar Conexão

```bash
# No console do navegador (DevTools F12)
import { supabase } from './src/lib/supabase'
supabase.from('movements').select().then(res => console.log(res))
```

Se funcionar, aparecerão os dados vindo do Supabase!

## 📊 Estrutura de Dados

### `movements` (Movimentações)
```
id: UUID (primária)
name: texto (ex: "Pix Cliente")
amount: número decimal (ex: 1500.00)
type: texto ('entrada' | 'saida')
date: data (YYYY-MM-DD)
time: hora (HH:MM)
created_at: timestamp
updated_at: timestamp
```

### `expenses` (Despesas)
```
id: UUID (primária)
name: texto (ex: "Aluguel")
target_amount: número decimal (ex: 5000.00)
status: texto ('em_andamento' | 'concluida')
created_at: timestamp
updated_at: timestamp
```

### `movement_allocations` (Alocações)
```
id: UUID (primária)
movement_id: UUID (referencia movements)
expense_id: UUID (referencia expenses)
created_at: timestamp
```

## 🔒 Segurança (Próximos Passos)

Por enquanto, as políticas RLS permitem acesso a todos. Para produção:
1. Adicione autenticação com `supabase.auth`
2. Crie políticas RLS baseadas no `auth.uid()`
3. Implemente row-level security por usuário

## 🚀 Usar no Código

```typescript
import { getMovements, addExpense, allocateMovement } from '@/lib/supabaseService'

// Buscar movimentações
const movements = await getMovements()

// Adicionar despesa
await addExpense({
  name: 'Aluguel',
  target_amount: 5000,
  status: 'em_andamento'
})

// Alocar movimento a despesa
await allocateMovement(movementId, expenseId)
```

## 📚 Documentação Oficial

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Realtime](https://supabase.com/docs/guides/realtime)
