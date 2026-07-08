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

Opcional para webhook PagBank:

- `PAGBANK_WEBHOOK_TOKEN`

Opcional para EDI PagBank (Consultar movimentos):

- `PAGBANK_EDI_USER` (numero do estabelecimento)
- `PAGBANK_EDI_TOKEN` (token especifico da API EDI)
- `PAGBANK_EDI_AUTH_MODE` (`basic` padrao; use `headers` se seu contrato exigir)

Sem essas variaveis, o app sobe mas nao consegue autenticar nem carregar dados do Supabase.

## Webhook PagBank (Notificacoes)

Foi adicionado um endpoint para receber notificacoes de mudanca de status:

- URL: `/api/pagbank/webhook`
- Metodo: `POST`

### Configurar no PagBank

Cadastre no painel/documentacao do PagBank a URL publica do projeto, por exemplo:

`https://seu-dominio.com/api/pagbank/webhook`

Se quiser proteger com token (recomendado), defina `PAGBANK_WEBHOOK_TOKEN` e cadastre:

`https://seu-dominio.com/api/pagbank/webhook?token=SEU_TOKEN`

### Comportamento atual

- Retorna `200 {"ok": true}` quando recebe notificacao valida.
- Registra o payload no log da funcao para auditoria inicial.
- Retorna `401` se token esperado estiver configurado e nao for enviado/corresponder.
- Retorna `405` para metodos diferentes de `POST`.

### Teste rapido

```bash
curl -X POST "https://seu-dominio.com/api/pagbank/webhook?token=SEU_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{"event":"TRANSACTION_STATUS_CHANGED","transactionCode":"A87..."}'
```

## PagBank EDI - Consultar Movimentos

Foi adicionado um endpoint proxy para consulta de movimentos EDI:

- URL: `/api/pagbank/movements`
- Metodo: `GET`

Query params suportados:

- `dateMovement` (YYYY-MM-DD)
- `pageNumber` (padrao 1)
- `pageSize` (padrao 1000)
- `typeMotion` (`1` transacional, `2` financeiro, `3` antecipacao)
- `ediVersion` (padrao `2.01`)

Exemplo:

```bash
curl "http://localhost:5173/api/pagbank/movements?dateMovement=2026-07-06&typeMotion=1&pageNumber=1&pageSize=200"
```

Observacoes importantes da doc:

- EDI nao possui sandbox.
- O token EDI e diferente do token padrao da conta/API.
- A API pode retornar cabecalho `VALIDADO` para indicar completude dos dados.
