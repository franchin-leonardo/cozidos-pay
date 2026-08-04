import { runGmailPixImport } from '../scripts/import-nubank-pix.mjs'

function isConfigured(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function createErrorId() {
  const nonce = Math.random().toString(36).slice(2, 8)
  return `import-pix-${Date.now()}-${nonce}`
}

function maskClientId(clientId) {
  if (!isConfigured(clientId)) {
    return null
  }

  const value = String(clientId)
  if (value.length <= 10) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`
  }

  return `${value.slice(0, 6)}***${value.slice(-6)}`
}

function getErrorDiagnostics(error) {
  const responseData = error?.response?.data
  const oauthError =
    responseData && typeof responseData === 'object' ? responseData.error : null
  const oauthDescription =
    responseData && typeof responseData === 'object'
      ? responseData.error_description
      : null

  return {
    message: error instanceof Error ? error.message : String(error),
    code: error?.code ?? null,
    status: error?.response?.status ?? error?.status ?? null,
    oauthError,
    oauthDescription,
    stack: error instanceof Error ? error.stack : null,
  }
}

function hasGmailConfig() {
  const hasClientId = isConfigured(process.env.GMAIL_CLIENT_ID)
  const hasClientSecret = isConfigured(process.env.GMAIL_CLIENT_SECRET)
  const hasRefreshToken = isConfigured(process.env.GMAIL_REFRESH_TOKEN)

  return ((hasClientId && hasClientSecret)) && hasRefreshToken
}

function hasSupabaseConfig() {
  const hasSupabaseUrl = isConfigured(process.env.SUPABASE_URL) || isConfigured(process.env.VITE_SUPABASE_URL)
  const hasSupabaseKey = isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY) || isConfigured(process.env.VITE_SUPABASE_ANON_KEY)

  return hasSupabaseUrl && hasSupabaseKey
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const requestedMax = Number(req.body?.max ?? req.query?.max)
  const max = Number.isFinite(requestedMax) && requestedMax > 0
    ? requestedMax
    : 30

  const dryRun = req.body?.dryRun === true || req.query?.dryRun === 'true'

  try {
    const result = await runGmailPixImport({ dryRun, max })
    return res.status(200).json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao importar PIX'
    return res.status(500).json({ ok: false, error: message })
  }
}
