import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

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

loadDotEnv()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  console.error(`Missing ${missing.join(', ')} in environment.`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const demoAdminEmail = process.env.DEMO_ADMIN_EMAIL || 'owner@qaffeine.com'
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD || '12345678'

const demoStaffEmployeeId = process.env.DEMO_STAFF_EMPLOYEE_ID || 'EMP-1001'
const demoStaffEmail = process.env.DEMO_STAFF_EMAIL || `${demoStaffEmployeeId.toLowerCase()}@qaffeine.internal`
const demoStaffPassword = process.env.DEMO_STAFF_PASSWORD || '12345678'
const demoStaffPhone = process.env.DEMO_STAFF_PHONE || '+919999999999'

async function findUserByEmail(email) {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users || []
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found

    if (users.length < perPage) break
    page += 1
  }

  return null
}

async function createOrFetchUser({ email, password, emailConfirm = true, userMetadata = {} }) {
  const createResult = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    user_metadata: userMetadata,
  })

  if (!createResult.error) return createResult.data.user

  const conflictMessage = String(createResult.error.message || '').toLowerCase()
  if (!conflictMessage.includes('already') && !conflictMessage.includes('exists')) {
    throw createResult.error
  }

  const existing = await findUserByEmail(email)
  if (!existing) throw createResult.error

  const updateResult = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: { ...(existing.user_metadata || {}), ...userMetadata },
  })

  if (updateResult.error) throw updateResult.error
  return updateResult.data.user
}

async function getFirstBranchId() {
  const { data, error } = await supabase
    .from('branches')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.id || null
}

async function upsertProfile(userId, payload) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...payload })

  if (error) throw error
}

async function main() {
  const branchId = await getFirstBranchId()

  const adminUser = await createOrFetchUser({
    email: demoAdminEmail,
    password: demoAdminPassword,
    userMetadata: { role: 'admin' },
  })

  await upsertProfile(adminUser.id, {
    role: 'admin',
    full_name: 'Qaffeine Owner',
    phone: '+919111111111',
    branch_id: branchId,
    is_active: true,
  })

  const staffUser = await createOrFetchUser({
    email: demoStaffEmail,
    password: demoStaffPassword,
    userMetadata: { role: 'staff', employee_id: demoStaffEmployeeId },
  })

  await upsertProfile(staffUser.id, {
    role: 'staff',
    full_name: 'Demo Staff',
    phone: demoStaffPhone,
    employee_id: demoStaffEmployeeId,
    branch_id: branchId,
    is_active: true,
  })

  console.log('Demo auth users are ready:')
  console.log(`Admin email: ${demoAdminEmail}`)
  console.log(`Admin password: ${demoAdminPassword}`)
  console.log(`Staff employee ID: ${demoStaffEmployeeId}`)
  console.log(`Staff login email used by backend: ${demoStaffEmail}`)
  console.log(`Staff password: ${demoStaffPassword}`)
}

main().catch((error) => {
  console.error('Failed to bootstrap demo users:', error.message || error)
  process.exit(1)
})
