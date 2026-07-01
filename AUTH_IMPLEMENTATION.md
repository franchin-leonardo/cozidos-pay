# 🔐 Autenticação Supabase Auth Integrada

## Visão Geral

A autenticação completa foi integrada ao projeto usando **Supabase Auth**. O sistema inclui:

✅ **Login e Logout**  
✅ **Registro de usuários (futuro)**  
✅ **Proteção de rotas**  
✅ **Sistema de roles (admin/user)**  
✅ **Sessão persistente**  
✅ **Menu do usuário no header**  

---

## Arquivos Criados

### 1. **src/hooks/useAuth.ts** (140 linhas)
Hook principal de autenticação com Supabase Auth.

**Funcionalidades:**
- Carrega sessão ao montar componente
- Implementa listener para mudanças de autenticação
- Funções: `signUp()`, `signIn()`, `signOut()`
- Retorna: `user`, `loading`, `error`, `isAuthenticated`, `isAdmin`
- Gerenciamento de roles do usuário

**Exemplo de uso:**
```typescript
const { user, isAdmin, signIn, signOut } = useAuth()
```

### 2. **src/contexts/AuthContext.tsx** (22 linhas)
Contexto React para compartilhar autenticação globalmente.

**Exports:**
- `AuthProvider` - Componente wrapper
- `AuthContextType` - Type do contexto

**Uso em main.tsx:**
```typescript
<AuthProvider>
  <App />
</AuthProvider>
```

### 3. **src/contexts/useAuthContext.ts** (10 linhas)
Hook customizado para usar o contexto de autenticação.

**Exemplo:**
```typescript
const { user, isAdmin, signOut } = useAuthContext()
```

### 4. **src/pages/LoginPage.tsx** (110 linhas)
Página de login com design amigável e integrado com tema da app.

**Features:**
- Input de email e senha
- Feedback visual durante login
- Exibição de credenciais padrão para teste
- Estilos responsivos
- Tratamento de erros

### 5. **src/pages/LoginPage.css** (220 linhas)
Estilos da página de login.

**Design:**
- Gradient background com cores do tema
- Animação de entrada (slideUp)
- Inputs com ícones
- Botão com spinner durante loading
- Box informativo com credenciais

### 6. **src/components/ProtectedRoute.tsx** (85 linhas)
Componente de proteção de rotas.

**Funcionalidades:**
- Verifica se usuário está autenticado
- Redireciona para LoginPage se não autenticado
- Mostra loading durante verificação
- Pode exigir permissões de admin
- Mensagem de acesso restrito

**Uso:**
```typescript
<ProtectedRoute requireAdmin={true}>
  <AdminDashboard />
</ProtectedRoute>
```

### 7. **src/components/UserMenu.tsx** (45 linhas)
Menu de usuário no header.

**Mostra:**
- Avatar com ícone de usuário
- Email do usuário
- Badge "Admin" se aplicável
- Botão de logout

### 8. **src/components/UserMenu.css** (120 linhas)
Estilos do menu de usuário.

---

## Alterações em Arquivos Existentes

### **src/main.tsx**
```typescript
// Antes:
<StrictMode>
  <App />
</StrictMode>

// Depois:
<StrictMode>
  <AuthProvider>
    <App />
  </AuthProvider>
</StrictMode>
```

### **src/App.tsx**
- Imports de `ProtectedRoute` e `UserMenu`
- Envolvimento do retorno JSX com `<ProtectedRoute>`
- Adição de `UserMenu` no header
- Nova classe `.header-actions` para layout

### **src/App.css**
- Adicionada classe `.header-actions` para agrupar botões no header
- Flexbox para alinhamento correto

---

## Fluxo de Autenticação

```
┌─────────────────┐
│   App carrega   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ AuthProvider carrega sessão │
└────────┬────────────────────┘
         │
         ▼
    ┌─────────────┐
    │ Autenticado?│
    └─┬─────────┬─┘
      │         │
   Sim│         │Não
      ▼         ▼
   ┌────────┐  ┌──────────┐
   │ App    │  │LoginPage │
   └────────┘  └──────────┘
```

---

## Como Usar

### 1️⃣ Criar Usuário Admin

**Via Dashboard Supabase:**
1. Acesse: https://supabase.com/dashboard/project/ixuzdjxksvtxiwscguad/auth/users
2. Clique em "+ Create a new user"
3. Preencha:
   - Email: `admin@cozidos.com`
   - Senha: `admin123`
4. Clique em "Additional fields" e adicione:
   ```json
   {
     "role": "admin"
   }
   ```
5. Clique em "Create user"

**Via SQL:**
```sql
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_sso_user
) VALUES (
  gen_random_uuid(),
  'admin@cozidos.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"role": "admin"}'::jsonb,
  '{}'::jsonb,
  false
);
```

### 2️⃣ Testar Login

1. Acesse: http://localhost:5173
2. Login com:
   - Email: `admin@cozidos.com`
   - Senha: `admin123`
3. Você será redirecionado para o dashboard

### 3️⃣ Usar no Código

**Componente com autenticação:**
```typescript
import { useAuthContext } from '@/contexts/useAuthContext'

export function MyComponent() {
  const { user, isAdmin, signOut } = useAuthContext()

  if (!user) return <LoginPage />

  return (
    <div>
      <p>Bem-vindo, {user.email}!</p>
      {isAdmin && <p>Você é admin</p>}
      <button onClick={signOut}>Sair</button>
    </div>
  )
}
```

---

## Próximas Etapas

### 1. Integração com Supabase Data
Adicionar `user_id` às tabelas:
- `movements` (adicionar coluna `user_id`)
- `expenses` (adicionar coluna `user_id`)
- Atualizar RLS para filtrar por usuário logado

### 2. Criar Mais Usuários
```typescript
const { signUp } = useAuthContext()

// Usuário regular
await signUp('usuario@email.com', 'senha123', 'user')

// Outro admin
await signUp('admin2@email.com', 'senha123', 'admin')
```

### 3. Implementar Registro
- Criar página de signup
- Permitir auto-registro com role 'user'
- Enviar email de confirmação

### 4. Recuperação de Senha
- Implementar fluxo de reset de senha
- Email com link de recuperação

### 5. Logout em Todos os Dispositivos
```typescript
await supabase.auth.signOut({ scope: 'others' })
```

---

## Segurança

✅ Senhas com hash seguro (bcrypt via Supabase)  
✅ Sessão armazenada em localStorage (seguro via Supabase)  
✅ Tokens JWT para requisições à API  
✅ RLS (Row Level Security) pronto para ativar  
✅ Roles de usuário para controle de acesso  

---

## Troubleshooting

### "useAuthContext deve ser usado dentro de AuthProvider"
**Causa:** Você está usando `useAuthContext()` em um componente fora de `<AuthProvider>`  
**Solução:** Envolver o componente com `<AuthProvider>` ou usar `<ProtectedRoute>`

### Sessão não persiste após reload
**Causa:** Cookies desabilitados ou localStorage com problemas  
**Solução:** Verificar console do navegador, limpar localStorage

### Login sem resposta
**Causa:** Credenciais incorretas ou Supabase indisponível  
**Solução:** Verificar email/senha, testar conexão com Supabase

---

## Documentação Relacionada

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Setup do Supabase
- [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) - Criar usuários
- [SUPABASE_READY.md](SUPABASE_READY.md) - API do Supabase
