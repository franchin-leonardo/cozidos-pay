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
  const hasCredentialsJson = isConfigured(process.env.GMAIL_OAUTH_CREDENTIALS_JSON)
  const hasClientId = isConfigured(process.env.GMAIL_CLIENT_ID)
  const hasClientSecret = isConfigured(process.env.GMAIL_CLIENT_SECRET)
  const hasRefreshToken = isConfigured(process.env.GMAIL_REFRESH_TOKEN)

  return (hasCredentialsJson || (hasClientId && hasClientSecret)) && hasRefreshToken
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

  let body = {}
  try {
    body = req.body && typeof req.body === 'object' ? req.body : {}
  } catch (error) {
    if (error?.statusCode === 400) {
      const errorId = createErrorId()
      console.error('[import-pix] invalid request body', {
        errorId,
        method: req.method,
        query: req.query,
      })

      return res.status(400).json({
        ok: false,
        error: `JSON invalido no corpo da requisicao. (ref: ${errorId})`,
      })
    }
    throw error
  }

  const requestedMax = Number(body?.max ?? req.query?.max)
  const max = Number.isFinite(requestedMax) && requestedMax > 0
    ? requestedMax
    : 30

  const dryRun = body?.dryRun === true || req.query?.dryRun === 'true'

  if (!hasGmailConfig()) {
    return res.status(200).json({
      ok: true,
      integrationConfigured: false,
      result: {
        processedEmails: 0,
        inserted: 0,
        skipped: 0,
        reason: 'gmail-not-configured',
      },
    })
  }

  if (!hasSupabaseConfig()) {
    return res.status(200).json({
      ok: true,
      integrationConfigured: false,
      result: {
        processedEmails: 0,
        inserted: 0,
        skipped: 0,
        reason: 'supabase-not-configured',
      },
    })
  }

  try {
    const result = await runGmailPixImport({ dryRun, max })
    return res.status(200).json({ ok: true, result })
  } catch (error) {
    const errorId = createErrorId()
    const message = error instanceof Error ? error.message : 'Erro inesperado ao importar PIX'
    const diagnostics = getErrorDiagnostics(error)

    console.error('[import-pix] import failed', {
      errorId,
      diagnostics,
      request: {
        method: req.method,
        max,
        dryRun,
      },
      envHints: {
        hasGmailCredentialsJson: isConfigured(process.env.GMAIL_OAUTH_CREDENTIALS_JSON),
        hasGmailClientId: isConfigured(process.env.GMAIL_CLIENT_ID),
        gmailClientIdMasked: maskClientId(process.env.GMAIL_CLIENT_ID),
        hasGmailClientSecret: isConfigured(process.env.GMAIL_CLIENT_SECRET),
        hasGmailRefreshToken: isConfigured(process.env.GMAIL_REFRESH_TOKEN),
        gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || null,
      },
    })

    if (typeof message === 'string' && message.includes('invalid_grant')) {
      return res.status(500).json({
        ok: false,
        error:
          `Autorizacao do Gmail expirada ou revogada. Gere um novo GMAIL_REFRESH_TOKEN e tente novamente. (ref: ${errorId})`,
      })
    }

    if (typeof message === 'string' && message.startsWith('Variavel obrigatoria ausente: GMAIL_')) {
      return res.status(200).json({
        ok: true,
        integrationConfigured: false,
        result: {
          processedEmails: 0,
          inserted: 0,
          skipped: 0,
          reason: 'gmail-not-configured',
        },
      })
    }

    return res.status(500).json({ ok: false, error: `${message} (ref: ${errorId})` })
  }
}
