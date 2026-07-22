import dotenv from 'dotenv'
import process from 'node:process'
import fs from 'node:fs'
import { google } from 'googleapis'

dotenv.config({ path: '.env.local' })
dotenv.config()

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

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

  if (!clientId) {
    throw new Error('Variavel obrigatoria ausente: GMAIL_CLIENT_ID (ou GMAIL_OAUTH_CREDENTIALS_JSON)')
  }

  if (!clientSecret) {
    throw new Error('Variavel obrigatoria ausente: GMAIL_CLIENT_SECRET (ou GMAIL_OAUTH_CREDENTIALS_JSON)')
  }

  return { clientId, clientSecret, redirectUri }
}

function getOAuthClient() {
  const { clientId, clientSecret, redirectUri } = resolveOAuthConfig()

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

function upsertEnvValue(filePath, key, value) {
  let content = ''

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8')
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const keyRegex = new RegExp(`^${escapedKey}=.*$`, 'm')
  const newLine = `${key}=${value}`

  if (keyRegex.test(content)) {
    content = content.replace(keyRegex, newLine)
  } else {
    content = content.trimEnd()
    content = content.length > 0 ? `${content}\n${newLine}\n` : `${newLine}\n`
  }

  fs.writeFileSync(filePath, content, 'utf-8')
}

async function printAuthUrl() {
  const oauth2Client = getOAuthClient()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })

  console.log('Abra esta URL no navegador e autorize o acesso:')
  console.log(url)
  console.log('\nDepois execute: npm run gmail:auth:token -- SEU_CODE')
}

async function exchangeCodeForToken(code) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.refresh_token) {
    throw new Error(
      'Refresh token nao retornado. Remova o acesso do app em myaccount.google.com/permissions e tente novamente com prompt=consent.',
    )
  }

  const envPath = '.env.local'
  upsertEnvValue(envPath, 'GMAIL_REFRESH_TOKEN', tokens.refresh_token)

  console.log('\nRefresh token salvo com sucesso em .env.local')
  console.log('Agora rode: npm run gmail:import-pix -- --dry-run --max=5')
}

async function main() {
  try {
    const mode = process.argv[2]

    if (mode === 'url') {
      await printAuthUrl()
      return
    }

    if (mode === 'token') {
      const code = process.argv[3]
      if (!code) {
        throw new Error('Informe o codigo OAuth. Exemplo: npm run gmail:auth:token -- 4/0AbCd...')
      }
      await exchangeCodeForToken(code)
      return
    }

    throw new Error('Modo invalido. Use "url" ou "token".')
  } catch (error) {
    console.error('[gmail-auth] erro:', error.message)
    process.exit(1)
  }
}

main()
