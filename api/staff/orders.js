import { getStaffOrdersForBranch, sendJson } from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const branchId = String(req.query?.branchId || '').trim()
    if (!branchId) {
      sendJson(res, 400, { ok: false, error: 'branchId is required' })
      return
    }

    const payload = await getStaffOrdersForBranch(branchId)
    sendJson(res, 200, { ok: true, ...payload })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to fetch staff orders' })
  }
}
