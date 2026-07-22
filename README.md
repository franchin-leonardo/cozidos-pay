# Cozidos Pay

Aplicacao React + TypeScript + Vite para gerenciamento de movimentacoes e despesas, com autenticacao e persistencia em Supabase.

## Requisitos

- Node.js 20+
- npm 10+

## Rodar Localmente

1. Instale dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` (ou copie de `.env.example`) com:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

3. Inicie o projeto:

```bash
npm run dev
```

## Build

```bash
npm run build
```

Saida de producao: `dist/`

## Deploy na Vercel

### Opcao A: Via Dashboard (recomendado)

1. Acesse [Vercel](https://vercel.com/new)
2. Importe o repositorio `franchin-leonardo/cozidos-pay`
3. Em Build and Output Settings, mantenha:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Em Environment Variables, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em Deploy

### Opcao B: Via CLI

```bash
npm i -g vercel
vercel login
vercel
```

No primeiro deploy, informe as variaveis de ambiente no painel do projeto na Vercel.

## Variaveis de Ambiente na Vercel

Defina as variaveis para os ambientes `Production`, `Preview` e `Development`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sem essas variaveis, o app sobe mas nao consegue autenticar nem carregar dados do Supabase.

## Importar PIX da Nubank via Gmail

Esta integracao roda por script Node (backend local/cron), para evitar expor segredo do Gmail no frontend.

### 1) Configure variaveis no `.env.local`

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY

GMAIL_CLIENT_ID=SEU_CLIENT_ID
GMAIL_CLIENT_SECRET=SEU_CLIENT_SECRET
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
GMAIL_REFRESH_TOKEN=SEU_REFRESH_TOKEN

PIX_GMAIL_FROM=todomundo@nubank.com.br
PIX_GMAIL_SUBJECT=Você recebeu uma transferência
```

### 2) Gerar refresh token (uma vez)

1. Gere URL de autorizacao:

```bash
npm run gmail:auth:url
```

2. Autorize no navegador e copie o `code` do redirect.

3. Troque por refresh token:

```bash
npm run gmail:auth:token -- SEU_CODE
```

4. Salve o valor retornado em `GMAIL_REFRESH_TOKEN`.

### 3) Importar movimentacoes PIX

```bash
npm run gmail:import-pix
```

Opcional (simulacao sem gravar):

```bash
npm run gmail:import-pix -- --dry-run
```

O script filtra emails por remetente e assunto, extrai nome/valor/data e grava em `movements` como `entrada`.
