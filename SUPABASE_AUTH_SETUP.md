# Configurar Usuário Admin no Supabase

A autenticação foi integrada! Agora você precisa criar um usuário admin para fazer login.

## Método 1: Via Dashboard Supabase (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/ixuzdjxksvtxiwscguad/auth/users
2. Clique no botão **"+ Create a new user"** (canto superior direito)
3. Preencha:
   - **Email**: `admin@cozidos.com`
   - **Password**: `admin123`
   - **User Metadata**: Clique em "Additional fields" e adicione:
     ```json
     {
       "role": "admin"
     }
     ```
4. Clique em **"Create user"**

## Método 2: Via SQL Editor

Se preferir usar SQL, execute no SQL Editor do Supabase:

```sql
-- Criar usuário admin
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

## Testando

Após criar o usuário:

1. **Acesse a aplicação**: http://localhost:5173
2. **Email**: `admin@cozidos.com`
3. **Senha**: `admin123`
4. Clique em **"Entrar"**

Você será redirecionado para o dashboard principal com acesso total.

## Informações Importantes

- ✅ O usuário admin tem acesso a todas as funcionalidades
- ✅ Futuros usuários podem ser criados com `role: "user"` (com menos permissões)
- ✅ A senha está armazenada com hash seguro no Supabase Auth
- ✅ Mude a senha padrão assim que possível em produção

## Como Criar Mais Usuários

No código React, você pode criar novos usuários programaticamente:

```typescript
const { signUp } = useAuthContext()

// Criar um novo usuário regular
await signUp('novo@email.com', 'senha123', 'user')

// Criar outro admin
await signUp('admin2@email.com', 'senha123', 'admin')
```

Ou use o Dashboard Supabase para criar manualmente, adicionando o `role` no User Metadata.
