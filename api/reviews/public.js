import { getPublishedCustomerReviews, sendJson } from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const limit = Number(req.query?.limit || 12)
    const reviews = await getPublishedCustomerReviews(limit)
    sendJson(res, 200, { ok: true, reviews })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to fetch reviews' })
  }
}
