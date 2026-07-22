import { runGmailPixImport } from '../scripts/import-nubank-pix.mjs'

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
