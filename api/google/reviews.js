import { fetchGoogleReviews, resolvePlaceId, sendJson } from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const placeId = resolvePlaceId(req)
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
  } catch (error) {
    sendJson(res, 400, { ok: false, reviews: [], reason: error.message || 'Unable to fetch Google reviews' })
  }
}
