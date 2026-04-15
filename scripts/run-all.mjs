import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const rawValue = line.slice(idx + 1).trim()
    if (!key || process.env[key]) continue
    process.env[key] = rawValue
  }
}

const childProcesses = []
let shuttingDown = false

function npmCommand() {
  return 'npm'
}

function runNpmScript(scriptName, options = {}) {
  const { required = true } = options

  const child = spawn(npmCommand(), ['run', scriptName], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })

  childProcesses.push(child)

  child.on('exit', (code) => {
    if (shuttingDown) return

    if (!required) {
      if (code && code !== 0) {
        console.warn(`Optional script \"${scriptName}\" exited with code ${code}. Continuing with app server.`)
      }
      return
    }

    // If any child exits unexpectedly, stop the whole process group.
    shuttingDown = true
    for (const proc of childProcesses) {
      if (!proc.killed) proc.kill('SIGINT')
    }

    if (code && code !== 0) {
      process.exit(code)
    }
    process.exit(0)
  })
}

function shutdownAll() {
  if (shuttingDown) return
  shuttingDown = true

  for (const proc of childProcesses) {
    if (!proc.killed) proc.kill('SIGINT')
  }

  process.exit(0)
}

loadDotEnv()

const otpProvider = String(process.env.VITE_OTP_PROVIDER || 'supabase').toLowerCase()
const useTwilio = otpProvider === 'twilio'
const hasServerConfig = Boolean(
  process.env.TWILIO_ACCOUNT_SID
  || process.env.GOOGLE_PLACES_API_KEY
  || process.env.VITE_GOOGLE_PLACES_API_KEY,
)

if (useTwilio || hasServerConfig) {
  console.log('Starting full app: Vite + local API server...')
  runNpmScript('otp:twilio', { required: false })
} else {
  console.log('Starting full app: Vite (Supabase OTP mode)...')
}

runNpmScript('dev', { required: true })

process.on('SIGINT', shutdownAll)
process.on('SIGTERM', shutdownAll)
