/*
 * PagBank EDI movements proxy.
 *
 * GET /api/pagbank/movements
 * Query params:
 * - dateMovement: YYYY-MM-DD (optional)
 * - pageNumber: integer (optional, default 1)
 * - pageSize: integer (optional, default 1000)
 * - typeMotion: 1 | 2 | 3 (optional)
 * - ediVersion: default 2.01
 */

const EDI_BASE_URL = 'https://edi.api.pagseguro.com.br'

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseIntWithDefault(value, defaultValue) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function buildAuthHeaders(user, token, authMode = 'basic') {
  if (authMode === 'headers') {
    return {
      user,
      token,
    }
  }

  const encoded = Buffer.from(`${user}:${token}`).toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const ediUser = process.env.PAGBANK_EDI_USER
  const ediToken = process.env.PAGBANK_EDI_TOKEN
  const authMode = process.env.PAGBANK_EDI_AUTH_MODE || 'basic'

  if (!ediUser || !ediToken) {
    return res.status(500).json({
      error: 'missing_edi_credentials',
      message: 'Configure PAGBANK_EDI_USER e PAGBANK_EDI_TOKEN no ambiente.',
    })
  }

  const ediVersion = String(req.query?.ediVersion || '2.01')
  const dateMovement = req.query?.dateMovement
  const pageNumber = parseIntWithDefault(req.query?.pageNumber, 1)
  const pageSize = parseIntWithDefault(req.query?.pageSize, 1000)
  const typeMotion = req.query?.typeMotion

  if (dateMovement && !isValidDate(String(dateMovement))) {
    return res.status(400).json({
      error: 'invalid_date_movement',
      message: 'dateMovement deve estar no formato YYYY-MM-DD.',
    })
  }

  if (typeMotion && !['1', '2', '3'].includes(String(typeMotion))) {
    return res.status(400).json({
      error: 'invalid_type_motion',
      message: 'typeMotion deve ser 1, 2 ou 3.',
    })
  }

  const upstreamUrl = new URL(
    `${EDI_BASE_URL}/edi/v1/${encodeURIComponent(ediVersion)}/movimentos`,
  )

  if (dateMovement) upstreamUrl.searchParams.set('dateMovement', String(dateMovement))
  upstreamUrl.searchParams.set('pageNumber', String(pageNumber))
  upstreamUrl.searchParams.set('pageSize', String(pageSize))
  if (typeMotion) upstreamUrl.searchParams.set('typeMotion', String(typeMotion))

  try {
    const response = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...buildAuthHeaders(ediUser, ediToken, authMode),
      },
    })

    const contentType = response.headers.get('content-type') || ''
    const validatedHeader = response.headers.get('VALIDADO')

    let payload
    if (contentType.includes('application/json')) {
      payload = await response.json()
    } else {
      payload = { raw: await response.text() }
    }

    return res.status(response.status).json({
      ok: response.ok,
      validated: validatedHeader,
      data: payload,
    })
  } catch (error) {
    console.error('[pagbank-edi] request failed', error)
    return res.status(502).json({
      error: 'upstream_unreachable',
      message: 'Falha ao consultar API EDI do PagBank.',
    })
  }
}
