import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function normalizeEnvValue(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim()
  }
  return text
}

function firstEnv(...keys) {
  for (const key of keys) {
    const value = normalizeEnvValue(process.env[key])
    if (value) return value
  }
  return ''
}

const supabaseUrl = firstEnv('VITE_SUPABASE_URL')
const serviceRoleKey = firstEnv('SUPABASE_SERVICE_ROLE_KEY')
const googlePlacesApiKey = firstEnv('GOOGLE_PLACES_API_KEY', 'VITE_GOOGLE_PLACES_API_KEY')
const defaultPlaceId = firstEnv('GOOGLE_PLACE_ID', 'VITE_GOOGLE_PLACE_ID')

const accountSid = firstEnv('TWILIO_ACCOUNT_SID')
const authToken = firstEnv('TWILIO_AUTH_TOKEN')
const verifyServiceSid = firstEnv('TWILIO_VERIFY_SERVICE_SID')

const razorpayKeyId = firstEnv('RAZORPAY_KEY_ID', 'VITE_RAZORPAY_KEY_ID')
const razorpaySecret = firstEnv('RAZORPAY_SECRET', 'RAZORPAY_KEY_SECRET', 'VITE_RAZORPAY_SECRET')
const razorpayWebhookSecret = firstEnv('RAZORPAY_WEBHOOK_SECRET') || razorpaySecret

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null

export function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload)
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body)
    } catch {
      throw new Error('Invalid JSON body')
    }
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Invalid JSON body')
  }
}

export async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment.')
  }
}

function requireRazorpayConfig() {
  if (!razorpayKeyId || !razorpaySecret) {
    throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_SECRET in server environment.')
  }
}

function razorpayAuthHeader() {
  return `Basic ${Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString('base64')}`
}

export function getRazorpayPublicConfig() {
  requireRazorpayConfig()
  return { keyId: razorpayKeyId }
}

export async function createRazorpayOrder({ amountPaise, receipt, notes = {} }) {
  requireRazorpayConfig()

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: razorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Number(amountPaise),
      currency: 'INR',
      receipt,
      notes,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.id) {
    const message = payload?.error?.description || payload?.error?.reason || ''
    if (/authentication failed/i.test(message)) {
      throw new Error('Razorpay authentication failed. Verify RAZORPAY_KEY_ID and RAZORPAY_SECRET belong to the same account and mode (test/live).')
    }
    throw new Error(message || 'Unable to create Razorpay order')
  }

  return payload
}

export function verifyRazorpayCheckoutSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  requireRazorpayConfig()
  const signedPayload = `${String(razorpayOrderId)}|${String(razorpayPaymentId)}`
  const digest = crypto
    .createHmac('sha256', razorpaySecret)
    .update(signedPayload)
    .digest('hex')

  return digest === String(razorpaySignature || '')
}

export function verifyRazorpayWebhookSignature({ rawBody, receivedSignature }) {
  if (!razorpayWebhookSecret) {
    throw new Error('Missing RAZORPAY_WEBHOOK_SECRET (or RAZORPAY_SECRET fallback) in server environment.')
  }

  const digest = crypto
    .createHmac('sha256', razorpayWebhookSecret)
    .update(String(rawBody || ''))
    .digest('hex')

  return digest === String(receivedSignature || '')
}

export async function createPaymentIntent({ razorpayOrderId, customerId, branchId, orderPayload, itemsPayload, amount }) {
  requireSupabaseAdmin()

  const payload = {
    razorpay_order_id: String(razorpayOrderId),
    customer_id: customerId || null,
    branch_id: branchId,
    order_payload: orderPayload,
    items_payload: itemsPayload,
    amount: Number(amount || 0),
    currency: 'INR',
    status: 'created',
  }

  const { data, error } = await supabaseAdmin
    .from('payment_intents')
    .upsert(payload, { onConflict: 'razorpay_order_id' })
    .select('id, razorpay_order_id, status')
    .single()

  if (error) throw error
  return data
}

export async function getPaymentIntentByRazorpayOrderId(razorpayOrderId) {
  requireSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('payment_intents')
    .select('id, razorpay_order_id, status, order_payload, items_payload, created_order_id, branch_id, amount')
    .eq('razorpay_order_id', String(razorpayOrderId))
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getOrderByRazorpayOrderId(razorpayOrderId) {
  requireSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, razorpay_order_id, created_at, total_amount, status')
    .eq('razorpay_order_id', String(razorpayOrderId))
    .maybeSingle()

  if (error) throw error
  return data
}

export async function finalizeVerifiedPayment({ razorpayOrderId, razorpayPaymentId }) {
  requireSupabaseAdmin()

  const existingOrder = await getOrderByRazorpayOrderId(razorpayOrderId)
  if (existingOrder?.id) {
    return { orderId: existingOrder.id, idempotent: true }
  }

  const intent = await getPaymentIntentByRazorpayOrderId(razorpayOrderId)
  if (!intent) {
    throw new Error('Payment intent not found for this Razorpay order')
  }

  if (intent.created_order_id) {
    return { orderId: intent.created_order_id, idempotent: true }
  }

  const orderPayload = {
    ...(intent.order_payload || {}),
    id: crypto.randomUUID(),
    razorpay_order_id: String(razorpayOrderId),
    payment_status: 'paid',
    status: intent.order_payload?.status || 'placed',
  }

  const normalizedItems = Array.isArray(intent.items_payload)
    ? intent.items_payload
    : []

  const orderItems = normalizedItems.map((row) => ({
    order_id: orderPayload.id,
    menu_item_id: row.menu_item_id || null,
    quantity: Number(row.quantity || 1),
    unit_price: Number(row.unit_price || 0),
  }))

  const { error: orderInsertError } = await supabaseAdmin
    .from('orders')
    .insert(orderPayload)

  if (orderInsertError) {
    if (orderInsertError.code === '23505') {
      const duplicate = await getOrderByRazorpayOrderId(razorpayOrderId)
      if (duplicate?.id) return { orderId: duplicate.id, idempotent: true }
    }
    throw orderInsertError
  }

  if (orderItems.length) {
    const { error: itemsInsertError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsInsertError) throw itemsInsertError
  }

  const { error: intentUpdateError } = await supabaseAdmin
    .from('payment_intents')
    .update({
      status: 'verified',
      created_order_id: orderPayload.id,
      razorpay_payment_id: String(razorpayPaymentId || ''),
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', intent.id)

  if (intentUpdateError) throw intentUpdateError

  return { orderId: orderPayload.id, idempotent: false }
}

export function resolvePlaceId(req) {
  return String(req.query?.placeId || defaultPlaceId || '').trim()
}

export async function fetchGoogleReviews(placeId) {
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

export async function getPublishedCustomerReviews(limit = 12) {
  requireSupabaseAdmin()
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

export async function createOrderWithServiceRole(order, items) {
  requireSupabaseAdmin()
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

export async function getStaffOrdersForBranch(branchId) {
  requireSupabaseAdmin()

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

export async function getStaffMenuForBranch(branchId) {
  requireSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('menu_items')
    .select('id, name, price, branch_id, is_available')
    .or(`branch_id.eq.${branchId},branch_id.is.null`)
    .neq('is_available', false)
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

function hasTwilioConfig() {
  return Boolean(accountSid && authToken && verifyServiceSid)
}

function ensureTwilioReady() {
  if (!hasTwilioConfig()) {
    throw new Error('Twilio OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.')
  }
  if (!String(verifyServiceSid).startsWith('VA')) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID is invalid. Use Verify Service SID that starts with VA.')
  }
}

const authHeader = () => `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`

export async function sendOtp(phone) {
  ensureTwilioReady()
  const formData = new URLSearchParams({ To: phone, Channel: 'sms' })

  const response = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
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

export async function verifyOtp(phone, code) {
  ensureTwilioReady()
  const formData = new URLSearchParams({ To: phone, Code: code })

  const response = await fetch(`https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
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
