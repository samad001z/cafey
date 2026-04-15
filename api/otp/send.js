import { readJsonBody, sendJson, sendOtp } from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { phone } = await readJsonBody(req)
    if (!phone) {
      sendJson(res, 400, { ok: false, error: 'Phone is required' })
      return
    }

    const payload = await sendOtp(String(phone))
    sendJson(res, 200, { ok: true, status: payload.status || 'pending' })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to send OTP' })
  }
}
