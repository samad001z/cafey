import {
  finalizeVerifiedPayment,
  readJsonBody,
  sendJson,
  verifyRazorpayCheckoutSignature,
} from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = await readJsonBody(req)

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      sendJson(res, 400, { ok: false, error: 'Missing Razorpay verification fields' })
      return
    }

    const valid = verifyRazorpayCheckoutSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    })

    if (!valid) {
      sendJson(res, 400, { ok: false, error: 'Razorpay signature verification failed' })
      return
    }

    const result = await finalizeVerifiedPayment({ razorpayOrderId, razorpayPaymentId })
    sendJson(res, 200, {
      ok: true,
      orderId: result.orderId,
      idempotent: result.idempotent,
    })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to verify payment' })
  }
}
