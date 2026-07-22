import dotenv from 'dotenv'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })
dotenv.config()

const DEFAULT_FROM = 'todomundo@nubank.com.br'
const DEFAULT_SUBJECT = 'Você recebeu uma transferência'
const MONTH_MAP = {
  JAN: 0,
  FEV: 1,
  MAR: 2,
  ABR: 3,
  MAI: 4,
  JUN: 5,
  JUL: 6,
  AGO: 7,
  SET: 8,
  OUT: 9,
  NOV: 10,
  DEZ: 11,
}


function parseCredentialsJson(rawJson) {
  if (!rawJson) return null

  try {
    const parsed = JSON.parse(rawJson)
    return parsed.web || parsed.installed || null
  } catch {
    throw new Error('JSON invalido em GMAIL_OAUTH_CREDENTIALS_JSON')
  }
}

function resolveOAuthConfig() {
  const inlineJson = parseCredentialsJson(process.env.GMAIL_OAUTH_CREDENTIALS_JSON)

  const clientId = process.env.GMAIL_CLIENT_ID || inlineJson?.client_id
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || inlineJson?.client_secret
  const redirectUri =
    process.env.GMAIL_REDIRECT_URI || inlineJson?.redirect_uris?.[0] || 'http://localhost:3000/oauth2callback'
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId) {
    throw new Error('Variavel obrigatoria ausente: GMAIL_CLIENT_ID (ou GMAIL_OAUTH_CREDENTIALS_JSON)')
  }

  if (!clientSecret) {
    throw new Error('Variavel obrigatoria ausente: GMAIL_CLIENT_SECRET (ou GMAIL_OAUTH_CREDENTIALS_JSON)')
  }

  if (!refreshToken) {
    throw new Error('Variavel obrigatoria ausente: GMAIL_REFRESH_TOKEN')
  }

  return { clientId, clientSecret, redirectUri, refreshToken }
}

function parseArgs(argv) {
  const args = { dryRun: false, max: 30 }

  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }

    if (arg.startsWith('--max=')) {
      const value = Number(arg.split('=')[1])
      if (!Number.isNaN(value) && value > 0) {
        args.max = value
      }
    }
  }

  return args
}

function decodeBase64Url(value) {
  if (!value) return ''
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf-8')
}

function htmlToText(html) {
  if (!html) return ''

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function collectTextParts(payload) {
  if (!payload) return []

  const parts = []

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    parts.push(decodeBase64Url(payload.body.data))
  }

   if (payload.mimeType === 'text/html' && payload.body?.data) {
    parts.push(htmlToText(decodeBase64Url(payload.body.data)))
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      parts.push(...collectTextParts(part))
    }
  }

  return parts
}

function parseAmount(text) {
  const match = text.match(/R\$\s*([\d.]+,\d{2})/i)
  if (!match) return null

  const normalized = match[1].replace(/\./g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : null
}

function parseName(text) {
  const patterns = [
    /transfer[êe]ncia de\s+(.+?)\s+e\s+o\s+valor/i,
    /transfer[êe]ncia de\s+([^\n\r,.]+)/i,
    /de\s+([^\n\r,.]+)\s+via\s+pix/i,
    /recebeu\s+de\s+([^\n\r,.]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1].trim()
    }
  }

  return 'PIX Nubank'
}

function parseDateFromBody(text, fallbackIso) {
  const match = text.match(/(\d{1,2})\s+([A-Z]{3})\s+[àa]s\s+(\d{2}:\d{2})/i)
  if (!match) {
    return new Date(fallbackIso)
  }

  const day = Number(match[1])
  const monthKey = match[2].toUpperCase()
  const month = MONTH_MAP[monthKey]
  const [hour, minute] = match[3].split(':').map(Number)

  if (month === undefined || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute)) {
    return new Date(fallbackIso)
  }

  const now = new Date()
  let year = now.getFullYear()
  let date = new Date(year, month, day, hour, minute, 0)

  // Ajusta virada de ano quando o email antigo cai no ano anterior.
  if (date.getTime() > now.getTime() + 1000 * 60 * 60 * 24) {
    year -= 1
    date = new Date(year, month, day, hour, minute, 0)
  }

  return date
}

function toDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeString(date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function getTodayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

async function getMessage(gmail, id) {
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  })

  return data
}

export async function runGmailPixImport(options = {}) {
  const args = {
    dryRun: false,
    max: 30,
    ...options,
  }

  try {
    const { clientId, clientSecret, redirectUri, refreshToken } = resolveOAuthConfig()

    const shouldCheckDuplicates = !args.dryRun || process.env.DRY_RUN_CHECK_DUPLICATES === 'true'
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (shouldCheckDuplicates && (!supabaseUrl || !supabaseKey)) {
      throw new Error(
        'Defina SUPABASE_URL (ou VITE_SUPABASE_URL) e uma chave do Supabase (SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY) no .env.local',
      )
    }

    if (shouldCheckDuplicates && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[gmail-import] aviso: usando VITE_SUPABASE_ANON_KEY. Se houver restricao de RLS, use SUPABASE_SERVICE_ROLE_KEY.')
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const supabase = shouldCheckDuplicates ? createClient(supabaseUrl, supabaseKey) : null

    if (args.dryRun && !shouldCheckDuplicates) {
      console.log('[gmail-import] dry-run sem consulta ao Supabase (deduplicacao desativada).')
      console.log('[gmail-import] dica: defina DRY_RUN_CHECK_DUPLICATES=true para testar deduplicacao no dry-run.')
    }

    const from = process.env.PIX_GMAIL_FROM || DEFAULT_FROM
    const subject = process.env.PIX_GMAIL_SUBJECT || DEFAULT_SUBJECT

    const { data: listData } = await gmail.users.messages.list({
      userId: 'me',
      q: `from:${from} subject:"${subject}"`,
      maxResults: args.max,
    })

    const messageRefs = listData.messages || []
    if (messageRefs.length === 0) {
      console.log('Nenhum email encontrado com o filtro configurado.')
      return
    }

    let inserted = 0
    let skipped = 0
    let skippedNoAmount = 0
    let skippedDuplicate = 0
    let skippedBeforeToday = 0
    const todayStart = getTodayStart()

    for (const ref of messageRefs) {
      const message = await getMessage(gmail, ref.id)
      const textParts = collectTextParts(message.payload)
      const messageText = `${message.snippet || ''}\n${textParts.join('\n')}`
      const amount = parseAmount(messageText)

      if (amount === null) {
        skipped += 1
        skippedNoAmount += 1
        continue
      }

      const name = parseName(messageText)
      const internalDate = message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : new Date().toISOString()
      const parsedDate = parseDateFromBody(messageText, internalDate)

      if (parsedDate < todayStart) {
        skipped += 1
        skippedBeforeToday += 1
        continue
      }

      const movement = {
        name,
        amount,
        type: 'entrada',
        date: toDateString(parsedDate),
        time: toTimeString(parsedDate),
      }

      if (shouldCheckDuplicates) {
        const { data: existing, error: findError } = await supabase
          .from('movements')
          .select('id')
          .eq('name', movement.name)
          .eq('amount', movement.amount)
          .eq('type', movement.type)
          .eq('date', movement.date)
          .eq('time', movement.time)
          .limit(1)

        if (findError) {
          throw findError
        }

        if (existing && existing.length > 0) {
          skipped += 1
          skippedDuplicate += 1
          continue
        }
      }

      if (args.dryRun) {
        console.log('[DRY-RUN] Nova movimentacao:', movement)
        inserted += 1
        continue
      }

      const { error: insertError } = await supabase.from('movements').insert([movement])
      if (insertError) {
        throw insertError
      }

      inserted += 1
    }

    console.log(`Emails processados: ${messageRefs.length}`)
    console.log(`Movimentacoes novas: ${inserted}`)
    console.log(`Movimentacoes ignoradas: ${skipped}`)
    console.log(`Ignoradas por valor nao encontrado: ${skippedNoAmount}`)
    console.log(`Ignoradas por duplicidade: ${skippedDuplicate}`)
    console.log(`Ignoradas por serem anteriores a hoje: ${skippedBeforeToday}`)

    return {
      processedEmails: messageRefs.length,
      inserted,
      skipped,
      skippedNoAmount,
      skippedDuplicate,
      skippedBeforeToday,
      dryRun: args.dryRun,
    }
  } catch (error) {
    console.error('[gmail-import] erro:', error.message)
    throw error
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  try {
    await runGmailPixImport(args)
  } catch {
    process.exit(1)
  }
}

const executedAsCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (executedAsCli) {
  main()
}
