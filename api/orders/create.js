import { createOrderWithServiceRole, readJsonBody, sendJson } from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { order, items } = await readJsonBody(req)
    if (!order || !order.branch_id) {
      sendJson(res, 400, { ok: false, error: 'Invalid order payload' })
      return
    }

    const id = await createOrderWithServiceRole(order, items)
    sendJson(res, 200, { ok: true, id })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to create order' })
  }
}
