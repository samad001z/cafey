import {
  getOrderByRazorpayOrderId,
  readJsonBody,
  recoverVerifiedPaymentFromGateway,
  sendJson,
} from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    let razorpayOrderId = String(req.query?.razorpay_order_id || '').trim()
    if (!razorpayOrderId && req.method === 'POST') {
      const body = await readJsonBody(req)
      razorpayOrderId = String(body?.razorpay_order_id || '').trim()
    }

    if (!razorpayOrderId) {
      sendJson(res, 400, { ok: false, error: 'razorpay_order_id is required' })
      return
    }

    let order = await getOrderByRazorpayOrderId(razorpayOrderId)
    if (!order?.id) {
      try {
        const recovered = await recoverVerifiedPaymentFromGateway(razorpayOrderId)
        if (recovered?.orderId) {
          order = { id: recovered.orderId }
        }
      } catch {
        // Keep default non-verified response below if gateway recovery fails.
      }
    }

    sendJson(res, 200, {
      ok: true,
      verified: Boolean(order?.id),
      orderId: order?.id || null,
    })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to fetch payment status' })
  }
}
