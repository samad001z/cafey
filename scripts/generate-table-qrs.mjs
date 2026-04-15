import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!key || process.env[key]) continue
    process.env[key] = value
  }
}

function qrImageFor(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(text)}`
}

function safeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toTableCode(number) {
  return `T${String(number).padStart(2, '0')}`
}

loadDotEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const baseUrl = (process.env.QR_BASE_URL || process.env.VITE_APP_URL || 'http://localhost:5173').replace(/\/$/, '')
const maxTables = Math.max(1, Math.min(80, Number(process.env.QR_TABLE_COUNT || 20)))

const outputDir = path.resolve(process.cwd(), 'generated')
const outputFile = path.join(outputDir, 'table-qrs.html')

async function getBranches() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [
      { id: 'demo-branch-id', name: 'Demo Branch' },
    ]
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (error || !data?.length) {
    return [
      { id: 'demo-branch-id', name: 'Demo Branch' },
    ]
  }

  return data
}

function buildBranchSection(branch) {
  const rows = []

  for (let i = 1; i <= maxTables; i += 1) {
    const table = toTableCode(i)
    const qrTargetUrl = `${baseUrl}/menu-order?table=${encodeURIComponent(table)}&branch=${encodeURIComponent(branch.id)}`
    const image = qrImageFor(qrTargetUrl)
    rows.push(`
      <article class="card">
        <h4>${table}</h4>
        <img src="${image}" alt="QR for ${branch.name} ${table}" />
        <p><strong>Branch:</strong> ${branch.name}</p>
        <p><strong>Branch ID:</strong> ${branch.id}</p>
        <p><strong>URL:</strong><br/><a href="${qrTargetUrl}" target="_blank" rel="noreferrer">${qrTargetUrl}</a></p>
      </article>
    `)
  }

  return `
    <section class="branch">
      <h2>${branch.name}</h2>
      <p>Use these QR codes on tables. They include table number, branch id, and website URL in one scan payload.</p>
      <div class="grid">${rows.join('')}</div>
    </section>
  `
}

async function main() {
  const branches = await getBranches()
  const sections = branches.map(buildBranchSection).join('\n')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Qaffeine Table QR Codes</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f7f3ee; color: #2f2318; }
    main { width: min(1200px, 96vw); margin: 0 auto; padding: 24px 0 48px; }
    h1 { margin: 0 0 8px; }
    .meta { margin: 0 0 16px; color: #6a5340; }
    .branch { margin-top: 22px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
    .card { background: #fff; border: 1px solid #e8daca; border-radius: 12px; padding: 10px; }
    .card h4 { margin: 0 0 8px; }
    .card img { width: 100%; border-radius: 8px; border: 1px solid #ddd; background: #fff; }
    .card p { margin: 7px 0 0; font-size: 13px; line-height: 1.4; word-break: break-word; }
    a { color: #9b5d2e; text-decoration: none; }
    @media print {
      body { background: #fff; }
      .card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Qaffeine Table QR Pack</h1>
    <p class="meta">Base URL: ${baseUrl} | Tables per branch: ${maxTables}</p>
    ${sections}
  </main>
</body>
</html>`

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(outputFile, html, 'utf8')

  console.log(`Generated QR pack: ${outputFile}`)
  console.log('Open the HTML file in browser and print/export as PDF for table displays.')
}

main().catch((error) => {
  console.error('Failed to generate table QRs:', error.message || error)
  process.exit(1)
})
