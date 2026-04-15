import { createServer } from 'node:http'
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
    const rawValue = line.slice(idx + 1).trim()
    if (!key || process.env[key]) continue
    process.env[key] = rawValue
  }
}

loadDotEnv()

const port = Number(process.env.OTP_SERVER_PORT || 8787)
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID
const allowedOrigin = process.env.OTP_ALLOWED_ORIGIN || '*'
const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY || ''
const defaultPlaceId = process.env.GOOGLE_PLACE_ID || process.env.VITE_GOOGLE_PLACE_ID || ''
const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null

function hasTwilioConfig() {
  return Boolean(accountSid && authToken && verifyServiceSid)
}

if (hasTwilioConfig() && !String(verifyServiceSid).startsWith('VA')) {
  console.warn('TWILIO_VERIFY_SERVICE_SID should start with VA. Current value appears to be a different SID type.')
}

const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  res.end(JSON.stringify(payload))
}

function ensureTwilioReady() {
  if (!hasTwilioConfig()) {
    throw new Error('Twilio OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.')
  }
  if (!String(verifyServiceSid).startsWith('VA')) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is invalid. Use Twilio Verify Service SID that starts with VA.')
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString('utf8')
      if (body.length > 1024 * 30) {
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function sendOtp(phone) {
  ensureTwilioReady()
  const formData = new URLSearchParams({
    To: phone,
    Channel: 'sms',
  })

  const response = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || 'Unable to send OTP')
  }

  return payload
}

async function verifyOtp(phone, code) {
  ensureTwilioReady()
  const formData = new URLSearchParams({
    To: phone,
    Code: code,
  })

  const response = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || 'Unable to verify OTP')
  }

  return payload
}

async function fetchGoogleReviews(placeId) {
  if (!googlePlacesApiKey) {
    return { reviews: [], reason: 'Google Places API key is missing' }
  }

  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=reviews`, {
    headers: {
      'X-Goog-Api-Key': googlePlacesApiKey,
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      reviews: [],
      reason: payload?.error?.message || `Google Places request failed with ${response.status}`,
    }
  }

  const rawReviews = Array.isArray(payload?.reviews)
    ? payload.reviews
    : Array.isArray(payload?.result?.reviews)
      ? payload.result.reviews
      : []

  const normalized = rawReviews
    .map((row, index) => {
      const reviewText = String(
        row?.text?.text ||
        row?.text ||
        row?.originalText?.text ||
        row?.originalText ||
        row?.comment ||
        '',
      ).trim()

      const name = String(
        row?.authorAttribution?.displayName ||
        row?.author_name ||
        row?.author ||
        `Google User ${index + 1}`,
      ).trim()

      const rating = Number(row?.rating || row?.stars || 5)
      const sourceLabel = String(row?.relativePublishTimeDescription || row?.publishTime || 'Google Review')

      return {
        id: row?.name || row?.review_id || `google-review-${index + 1}`,
        name,
        review: reviewText,
        rating: Number.isFinite(rating) ? Math.max(1, Math.min(5, rating)) : 5,
        source: sourceLabel,
      }
    })
    .filter((row) => row.review)

  return { reviews: normalized, reason: null }
}

async function createOrderWithServiceRole(order, items) {
  if (!supabaseAdmin) {
    throw new Error('Local order API is not configured. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  }

  const orderId = String(order?.id || crypto.randomUUID())

  const { error: orderError } = await supabaseAdmin
    .from('orders')
    .upsert({ ...order, id: orderId })

  if (orderError) throw orderError

  const { error: deleteItemsError } = await supabaseAdmin
    .from('order_items')
    .delete()
    .eq('order_id', orderId)

  if (deleteItemsError) throw deleteItemsError

  const safeItems = Array.isArray(items) ? items : []
  if (safeItems.length) {
    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(
        safeItems.map((row) => ({
          order_id: orderId,
          menu_item_id: row.menu_item_id || null,
          quantity: Number(row.quantity || 1),
          unit_price: Number(row.unit_price || 0),
        })),
      )

    if (itemsError) throw itemsError
  }

  return orderId
}

async function getStaffOrdersForBranch(branchId) {
  if (!supabaseAdmin) {
    throw new Error('Local staff API is not configured. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('id, table_number, order_type, status, created_at, total_amount, payment_status')
    .eq('branch_id', branchId)
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: false })

  if (ordersError) throw ordersError

  const orderRows = orders || []
  const orderIds = orderRows.map((row) => row.id)
  if (!orderIds.length) {
    return { orders: [], itemsByOrderId: {} }
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('order_id, quantity, menu_items(name)')
    .in('order_id', orderIds)

  if (itemsError) throw itemsError

  const itemsByOrderId = {}
  for (const row of orderItems || []) {
    if (!itemsByOrderId[row.order_id]) itemsByOrderId[row.order_id] = []
    itemsByOrderId[row.order_id].push({
      quantity: row.quantity,
      name: row.menu_items?.name || 'Custom item',
    })
  }

  return { orders: orderRows, itemsByOrderId }
}

async function getStaffMenuForBranch(branchId) {
  if (!supabaseAdmin) {
    throw new Error('Local staff API is not configured. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  }

  const { data, error } = await supabaseAdmin
    .from('menu_items')
    .select('id, name, price, branch_id, is_available')
    .or(`branch_id.eq.${branchId},branch_id.is.null`)
    .neq('is_available', false)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

async function getPublishedCustomerReviews(limit = 12) {
  if (!supabaseAdmin) {
    throw new Error('Local reviews API is not configured. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.')
  }

  const safeLimit = Math.max(1, Math.min(40, Number(limit || 12)))

  const { data, error } = await supabaseAdmin
    .from('order_reviews')
    .select('id, review_text, rating_food, rating_service, created_at, profiles(full_name)')
    .eq('is_published', true)
    .eq('skipped', false)
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.id,
    name: row.profiles?.full_name || 'Qaffeine Customer',
    review: String(row.review_text || '').trim(),
    rating: Number(((Number(row.rating_food || 0) + Number(row.rating_service || 0)) / 2 || 5).toFixed(1)),
    source: 'Qaffeine Customer',
    created_at: row.created_at,
  })).filter((row) => row.review)
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/google/reviews')) {
    const url = new URL(req.url, `http://localhost:${port}`)
    const placeId = url.searchParams.get('placeId') || defaultPlaceId

    if (!placeId) {
      sendJson(res, 200, { ok: false, reviews: [], reason: 'placeId is required' })
      return
    }

    const data = await fetchGoogleReviews(placeId)
    sendJson(res, 200, {
      ok: !data.reason,
      reviews: data.reviews || [],
      reason: data.reason || null,
    })
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/staff/orders')) {
    try {
      const url = new URL(req.url, `http://localhost:${port}`)
      const branchId = url.searchParams.get('branchId')
      if (!branchId) {
        sendJson(res, 400, { ok: false, error: 'branchId is required' })
        return
      }

      const payload = await getStaffOrdersForBranch(branchId)
      sendJson(res, 200, { ok: true, ...payload })
      return
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || 'Unable to fetch staff orders' })
      return
    }
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/staff/menu')) {
    try {
      const url = new URL(req.url, `http://localhost:${port}`)
      const branchId = url.searchParams.get('branchId')
      if (!branchId) {
        sendJson(res, 400, { ok: false, error: 'branchId is required' })
        return
      }

      const menu = await getStaffMenuForBranch(branchId)
      sendJson(res, 200, { ok: true, menu })
      return
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || 'Unable to fetch menu' })
      return
    }
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/reviews/public')) {
    try {
      const url = new URL(req.url, `http://localhost:${port}`)
      const limit = Number(url.searchParams.get('limit') || 12)
      const reviews = await getPublishedCustomerReviews(limit)
      sendJson(res, 200, { ok: true, reviews })
      return
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message || 'Unable to fetch reviews' })
      return
    }
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    if (req.url === '/api/otp/send') {
      const { phone } = await readBody(req)
      if (!phone) {
        sendJson(res, 400, { ok: false, error: 'Phone is required' })
        return
      }

      const payload = await sendOtp(String(phone))
      sendJson(res, 200, { ok: true, status: payload.status || 'pending' })
      return
    }

    if (req.url === '/api/otp/verify') {
      const { phone, code } = await readBody(req)
      if (!phone || !code) {
        sendJson(res, 400, { ok: false, error: 'Phone and code are required' })
        return
      }

      const payload = await verifyOtp(String(phone), String(code))
      sendJson(res, 200, { ok: true, status: payload.status || 'pending' })
      return
    }

    if (req.url === '/api/orders/create') {
      const { order, items } = await readBody(req)
      if (!order || !order.branch_id) {
        sendJson(res, 400, { ok: false, error: 'Invalid order payload' })
        return
      }

      const id = await createOrderWithServiceRole(order, items)
      sendJson(res, 200, { ok: true, id })
      return
    }

    sendJson(res, 404, { ok: false, error: 'Not found' })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'OTP request failed' })
  }
})

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.log(`Port ${port} is already in use. Reusing existing local API server instance.`)
    process.exit(0)
    return
  }

  console.error('Local API server failed to start:', error.message || error)
  process.exit(1)
})

server.listen(port, () => {
  console.log(`Twilio OTP server running on http://localhost:${port}`)
})
