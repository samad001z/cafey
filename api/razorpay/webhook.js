import {
  finalizeVerifiedPayment,
  readRawBody,
  sendJson,
  verifyRazorpayWebhookSignature,
} from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const rawBody = await readRawBody(req)
    const signature = req.headers['x-razorpay-signature']

    const valid = verifyRazorpayWebhookSignature({ rawBody, receivedSignature: signature })
    if (!valid) {
      sendJson(res, 400, { ok: false, error: 'Invalid webhook signature' })
      return
    }

    const payload = JSON.parse(rawBody || '{}')
    const event = String(payload?.event || '')

    if (event !== 'payment.captured' && event !== 'order.paid') {
      sendJson(res, 200, { ok: true, ignored: true })
      return
    }

    const payment = payload?.payload?.payment?.entity || {}
    const razorpayOrderId = String(payment?.order_id || '').trim()
    const razorpayPaymentId = String(payment?.id || '').trim()

    if (!razorpayOrderId || !razorpayPaymentId) {
      sendJson(res, 200, { ok: true, ignored: true, reason: 'missing ids' })
      return
    }

    const result = await finalizeVerifiedPayment({ razorpayOrderId, razorpayPaymentId })

    sendJson(res, 200, {
      ok: true,
      orderId: result.orderId,
      idempotent: result.idempotent,
    })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Webhook handling failed' })
  }
}
