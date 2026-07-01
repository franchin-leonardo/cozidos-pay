# 🔄 Teste de Sincronização Realtime com Supabase

## Status Atual

✅ **Autenticação**: Funcionando  
✅ **Hooks Integrados**: useMovements e useExpenses conectados ao Supabase  
✅ **Dashboard**: Carregando com dados mock iniciais  

## Testando Sincronização Realtime

### 1️⃣ Adicionar Movimentação via App

1. Abra o navegador em: http://localhost:5173
2. Clique em **"Simular notificação"** no header
3. Observe:
   - Nova movimentação aparece no topo da lista
   - Totais (Entradas/Saídas/Saldo) são recalculados
   - Notificação aparece na faixa superior

✅ **Esperado**: A movimentação é enviada ao Supabase via `addNewMovement()`

### 2️⃣ Verificar Dados no Supabase

1. Acesse: https://supabase.com/dashboard/project/ixuzdjxksvtxiwscguad/editor
2. Clique na tabela **`movements`**
3. Verifique se a movimentação simulada está presente

### 3️⃣ Criar Despesa

1. Na seção "Despesas", preencha:
   - Nome: `Teste sincronização`
   - Valor: `500`
2. Clique em **"Cadastrar"**

✅ **Esperado**: Despesa aparece na lista e é enviada ao Supabase

### 4️⃣ Alocar Movimentação à Despesa

**Método 1: Arrastar e Soltar**
1. Pegue uma movimentação da lista
2. Arraste até uma despesa
3. Solte para alocar

**Método 2: Selector**
1. Em uma despesa, abra o dropdown "Adicionar movimentação"
2. Selecione uma movimentação
3. Clique em "+"

✅ **Esperado**: A alocação é salva em `movement_allocations`

### 5️⃣ Editar Despesa

1. Clique no ícone de lápis em uma despesa
2. Mude o nome e/ou valor
3. Observe a atualização em tempo real

### 6️⃣ Verificar Status "Concluída"

1. Crie uma despesa com valor baixo: `100`
2. Aloque movimentações que somem ≥ R$ 100
3. Observe que o status muda para **"Concluída"**

## Padrão de Otimismo (Optimistic Updates)

Os hooks implementam **optimistic updates**:

```typescript
// 1. Estado local atualizado imediatamente (otimista)
setMovements([newMovement, ...movements])

// 2. Requisição enviada ao Supabase em background
await supabaseService.addMovement(newMovement)

// 3. Se falhar, reverte e mostra erro
// Se suceder, dados já estão em sync
```

**Benefício**: Interface responde instantaneamente mesmo antes do servidor confirmar.

## Debug: Verificar Logs do Browser

1. Abra DevTools: `F12`
2. Vá para a aba **"Console"**
3. Busque por mensagens de erro relacionadas a Supabase
4. Verifique Network → requests para `ixuzdjxksvtxiwscguad.supabase.co`

## Possíveis Problemas

### "Invalid login credentials" ao abrir a app
- ✅ **Solução**: Você já resolveu criando o usuário admin

### Dados não sincronizam
- Verifique se `.env.local` tem credenciais corretas
- Confirme que as tabelas existem no Supabase
- Verifique RLS policies (Row Level Security)

### "Erro ao carregar autenticação"
- Sessão expirou
- Faça logout e login novamente
- Ou limpe o localStorage: `localStorage.clear()`

## Comandos Úteis

```bash
# Limpar dados locais (cache, sessão)
# No DevTools Console:
localStorage.clear()
sessionStorage.clear()
location.reload()

# Verificar usuário logado
supabase.auth.getUser()

# Listar movimentações no banco
supabase.from('movements').select('*')

# Listar despesas
supabase.from('expenses').select('*')

# Ver alocações
supabase.from('movement_allocations').select('*')
```

## Próximas Implementações

1. **RLS (Row Level Security)**: Filtrar dados por usuário logado
2. **Real-time Subscriptions**: Atualizar quando outro cliente muda dados
3. **Refresh Token**: Manter usuário logado por mais tempo
4. **Offline Support**: Sincronizar quando voltar online
5. **Export**: Salvar dados em CSV/PDF

## Documentação Relacionada

- [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) - Sistema de autenticação
- [SUPABASE_READY.md](SUPABASE_READY.md) - API do Supabase
- [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) - Setup do usuário admin
