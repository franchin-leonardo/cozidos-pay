import { runGmailPixImport } from '../scripts/import-nubank-pix.mjs'

function isConfigured(value) {
  return typeof value === 'string' && value.trim().length > 0
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

  const requestedMax = Number(req.body?.max ?? req.query?.max)
  const max = Number.isFinite(requestedMax) && requestedMax > 0
    ? requestedMax
    : 30

  const dryRun = req.body?.dryRun === true || req.query?.dryRun === 'true'

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
    const message = error instanceof Error ? error.message : 'Erro inesperado ao importar PIX'

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

    return res.status(500).json({ ok: false, error: message })
  }
}
