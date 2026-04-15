import { readJsonBody, sendJson, verifyOtp } from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { phone, code } = await readJsonBody(req)
    if (!phone || !code) {
      sendJson(res, 400, { ok: false, error: 'Phone and code are required' })
      return
    }

    const payload = await verifyOtp(String(phone), String(code))
    sendJson(res, 200, { ok: true, status: payload.status || 'pending' })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to verify OTP' })
  }
}
