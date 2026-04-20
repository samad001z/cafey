import {
  createPaymentIntent,
  createRazorpayOrder,
  getRazorpayPublicConfig,
  readJsonBody,
  sendJson,
} from '../_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const {
      customerId,
      branchId,
      orderType,
      tableNumber,
      customerNote,
      totalAmount,
      items,
    } = await readJsonBody(req)

    if (!branchId || !orderType || !Array.isArray(items) || !items.length) {
      sendJson(res, 400, { ok: false, error: 'Invalid payment intent payload' })
      return
    }

    const total = Number(totalAmount || 0)
    if (!Number.isFinite(total) || total <= 0) {
      sendJson(res, 400, { ok: false, error: 'Invalid total amount' })
      return
    }

    const amountPaise = Math.round(total * 100)
    const receipt = `qf-${Date.now()}-${Math.floor(Math.random() * 10000)}`

    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        branch_id: String(branchId),
        customer_id: String(customerId || ''),
      },
    })

    const orderPayload = {
      customer_id: customerId || null,
      branch_id: branchId,
      order_type: orderType,
      table_number: orderType === 'takeaway' ? null : (tableNumber || null),
      customer_note: String(customerNote || '').trim() || null,
      total_amount: Number(total.toFixed(2)),
      payment_status: 'paid',
      status: 'placed',
    }

    const itemsPayload = items.map((row) => ({
      menu_item_id: row.menu_item_id || null,
      quantity: Number(row.quantity || 1),
      unit_price: Number(row.unit_price || 0),
      name: String(row.name || ''),
      modifierSummary: String(row.modifierSummary || ''),
    }))

    await createPaymentIntent({
      razorpayOrderId: razorpayOrder.id,
      customerId,
      branchId,
      orderPayload,
      itemsPayload,
      amount: total,
    })

    const { keyId } = getRazorpayPublicConfig()

    sendJson(res, 200, {
      ok: true,
      key: keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency || 'INR',
    })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || 'Unable to initialize payment' })
  }
}
