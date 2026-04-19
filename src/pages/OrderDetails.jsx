import { useEffect, useMemo, useState } from 'react'
import { Check, Coffee, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './OrderDetails.css'

const stages = ['placed', 'confirmed', 'preparing', 'ready', 'completed']
const stageLabels = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing ☕',
  ready: 'Ready',
  completed: 'Completed',
}

function statusIndex(status) {
  const idx = stages.indexOf(status)
  return idx === -1 ? 0 : idx
}

function normalizePhone(value) {
  return String(value || '').replace(/[^0-9+]/g, '')
}

function shortOrderId(orderId) {
  const raw = String(orderId || '').trim()
  if (!raw) return '------'
  return `${raw.slice(0, 8).toUpperCase()}`
}

function formatOrderType(value) {
  return String(value || 'order')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function OrderDetails() {
  const { user } = useAuth()

  const [branches, setBranches] = useState([])
  const [query, setQuery] = useState('')
  const [trackingOrder, setTrackingOrder] = useState(null)
  const [activeOrders, setActiveOrders] = useState([])
  const [historyOrders, setHistoryOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())
  const [reviewModalOrder, setReviewModalOrder] = useState(null)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDraft, setReviewDraft] = useState({
    ratingFood: 5,
    ratingService: 5,
    reviewText: '',
  })

  useEffect(() => {
    let active = true

    const fetchBranches = async () => {
      const { data } = await supabase.from('branches').select('id, name')
      if (!active) return
      setBranches(data || [])
    }

    fetchBranches()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let active = true

    const fetchMine = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at, total_amount, order_type, payment_status, branch_id')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25)

      if (!active) return

      if (error) {
        console.error('Failed to fetch orders:', error)
        return
      }

      const rows = data || []
      setActiveOrders(rows.filter((row) => !['completed', 'cancelled'].includes(row.status)))
      setHistoryOrders(rows)

      if (!trackingOrder && rows.length) {
        const firstActive = rows.find((row) => !['completed', 'cancelled'].includes(row.status))
        if (firstActive) setTrackingOrder(firstActive)
      }
    }

    fetchMine()

    return () => {
      active = false
    }
  }, [trackingOrder, user?.id])

  useEffect(() => {
    if (!user?.id || !historyOrders.length) {
      setReviewedOrderIds(new Set())
      return
    }

    let active = true

    const loadReviewedOrders = async () => {
      const completedOrderIds = historyOrders
        .filter((row) => row.status === 'completed')
        .map((row) => row.id)

      if (!completedOrderIds.length) {
        if (!active) return
        setReviewedOrderIds(new Set())
        return
      }

      const { data, error } = await supabase
        .from('order_reviews')
        .select('order_id')
        .eq('customer_id', user.id)
        .in('order_id', completedOrderIds)

      if (!active) return

      if (error) {
        console.error('Unable to load review history:', error)
        setReviewedOrderIds(new Set())
        return
      }

      setReviewedOrderIds(new Set((data || []).map((row) => row.order_id)))
    }

    loadReviewedOrders()

    return () => {
      active = false
    }
  }, [historyOrders, user?.id])

  useEffect(() => {
    if (!user?.id || !historyOrders.length || reviewModalOrder || reviewSubmitting) return

    const pending = historyOrders.find(
      (row) => row.status === 'completed' && !reviewedOrderIds.has(row.id),
    )

    if (pending) {
      setReviewDraft({ ratingFood: 5, ratingService: 5, reviewText: '' })
      setReviewModalOrder(pending)
    }
  }, [historyOrders, reviewedOrderIds, reviewModalOrder, reviewSubmitting, user?.id])

  useEffect(() => {
    if (!trackingOrder?.id) return

    const channel = supabase
      .channel('order-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${trackingOrder.id}` },
        (payload) => {
          const updated = payload.new

          setTrackingOrder((prev) => ({ ...prev, ...updated }))
          setActiveOrders((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))
          setHistoryOrders((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))

          if (updated.status === 'preparing') {
            toast.success('Your order is being prepared! ☕')
          } else {
            toast.success(`Order updated: ${stageLabels[updated.status] || updated.status}`)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [trackingOrder?.id])

  const branchNameMap = useMemo(() => {
    const map = new Map()
    for (const branch of branches) map.set(branch.id, branch.name)
    return map
  }, [branches])

  const trackByQuery = async () => {
    const value = query.trim()
    if (!value) {
      toast.error('Enter an Order ID or phone number')
      return
    }

    setLoading(true)

    let orders = []

    const isOrderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    if (isOrderId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, created_at, total_amount, order_type, payment_status, branch_id')
        .eq('id', value)
        .limit(1)

      if (error) {
        setLoading(false)
        toast.error(error.message)
        return
      }

      orders = data || []
    } else {
      const phone = normalizePhone(value)

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${phone},phone.eq.${value}`)

      if (profileError) {
        setLoading(false)
        toast.error(profileError.message)
        return
      }

      const ids = (profileRows || []).map((row) => row.id)
      if (!ids.length) {
        setLoading(false)
        toast.error('No customer found with that phone number')
        return
      }

      const { data: orderRows, error: orderError } = await supabase
        .from('orders')
        .select('id, status, created_at, total_amount, order_type, payment_status, branch_id')
        .in('customer_id', ids)
        .order('created_at', { ascending: false })

      if (orderError) {
        setLoading(false)
        toast.error(orderError.message)
        return
      }

      orders = orderRows || []
    }

    setLoading(false)

    if (!orders.length) {
      toast.error('No matching order found')
      return
    }

    setTrackingOrder(orders[0])
    toast.success(`Tracking order ${orders[0].id}`)
  }

  const currentStage = statusIndex(trackingOrder?.status || 'placed')

  const submitReview = async () => {
    if (!user?.id || !reviewModalOrder?.id) return

    const cleanText = reviewDraft.reviewText.trim()
    if (!cleanText) {
      toast.error('Please share a short review, or use Skip.')
      return
    }

    setReviewSubmitting(true)

    const payload = {
      order_id: reviewModalOrder.id,
      customer_id: user.id,
      branch_id: reviewModalOrder.branch_id,
      rating_food: Number(reviewDraft.ratingFood),
      rating_service: Number(reviewDraft.ratingService),
      review_text: cleanText,
      skipped: false,
      is_published: true,
    }

    const { error } = await supabase
      .from('order_reviews')
      .upsert(payload, { onConflict: 'order_id' })

    setReviewSubmitting(false)

    if (error) {
      console.error('Review submit failed:', error)
      toast.error(error.message || 'Unable to save review right now')
      return
    }

    setReviewedOrderIds((prev) => {
      const next = new Set(prev)
      next.add(reviewModalOrder.id)
      return next
    })
    setReviewModalOrder(null)
    toast.success('Thanks for your review!')
  }

  const skipReview = async () => {
    if (!user?.id || !reviewModalOrder?.id) return

    setReviewSubmitting(true)

    const payload = {
      order_id: reviewModalOrder.id,
      customer_id: user.id,
      branch_id: reviewModalOrder.branch_id,
      rating_food: null,
      rating_service: null,
      review_text: null,
      skipped: true,
      is_published: false,
    }

    const { error } = await supabase
      .from('order_reviews')
      .upsert(payload, { onConflict: 'order_id' })

    setReviewSubmitting(false)

    if (error) {
      console.error('Review skip failed:', error)
      toast.error(error.message || 'Unable to skip review right now')
      return
    }

    setReviewedOrderIds((prev) => {
      const next = new Set(prev)
      next.add(reviewModalOrder.id)
      return next
    })
    setReviewModalOrder(null)
  }

  return (
    <main className="order-details-page">
      <section className="od-shell">
        <header>
          <h1>Track Your Order</h1>
          <p>Enter an order ID or customer phone number for live tracking.</p>
        </header>

        <div className="od-search-row">
          <label>
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter Order ID or phone number"
            />
          </label>
          <button type="button" onClick={trackByQuery} disabled={loading}>
            {loading ? 'Tracking...' : 'Track'}
          </button>
        </div>

        {user?.id && activeOrders.length ? (
          <section className="od-active-panel">
            <h2>Active Orders</h2>
            <div className="od-active-list">
              {activeOrders.map((order) => (
                <button key={order.id} type="button" onClick={() => setTrackingOrder(order)} className={trackingOrder?.id === order.id ? 'active' : ''}>
                  <span className="id-chip">#{shortOrderId(order.id)}</span>
                  <span className="meta">
                    <b>{stageLabels[order.status] || order.status}</b>
                    <small>{formatOrderType(order.order_type)} · ₹{Number(order.total_amount || 0).toFixed(2)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {trackingOrder ? (
          <section className="od-tracking-card">
            <div className="od-order-head">
              <div>
                <h2>Order #{shortOrderId(trackingOrder.id)}</h2>
                <p>
                  {branchNameMap.get(trackingOrder.branch_id) || 'Qaffeine Outlet'} · {formatOrderType(trackingOrder.order_type)}
                </p>
                <code className="od-order-code">{trackingOrder.id}</code>
              </div>
              <strong>₹{Number(trackingOrder.total_amount || 0).toFixed(2)}</strong>
            </div>

            <div className="od-stepper">
              {stages.map((status, index) => {
                const done = index < currentStage
                const current = index === currentStage

                return (
                  <div key={status} className="od-step-node">
                    <div className={`dot ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                      {done ? <Check size={14} /> : null}
                    </div>
                    <p>{stageLabels[status]}</p>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <p className="od-empty">No order selected yet.</p>
        )}

        <section className="od-history">
          <h2>Recent Orders</h2>
          {!historyOrders.length ? (
            <p className="od-empty">No order history yet.</p>
          ) : (
            <div className="od-history-list">
              {historyOrders.map((order) => (
                <article key={order.id}>
                  <div className="od-history-top">
                    <p>#{shortOrderId(order.id)}</p>
                    <strong>₹{Number(order.total_amount || 0).toFixed(2)}</strong>
                  </div>
                  <div className="od-history-meta">
                    <span>{stageLabels[order.status] || order.status}</span>
                    <span>{formatOrderType(order.order_type)}</span>
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  <div className="od-history-actions">
                    <button type="button" onClick={() => setTrackingOrder(order)}>
                      Track
                    </button>
                    <Link className="reorder" to={`/menu-order?reorder=${order.id}`}>
                      <Coffee size={14} /> Reorder
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {reviewModalOrder ? (
        <div className="od-review-backdrop" role="dialog" aria-modal="true" aria-label="Order review">
          <div className="od-review-modal">
            <span className="od-review-badge">Customer Feedback</span>
            <h3>How was your order?</h3>
            <p>
              Order #{reviewModalOrder.id.slice(0, 8).toUpperCase()} is completed. Share your food and service experience.
            </p>

            <div className="od-rating-grid">
              <label>
                Food Rating
                <select
                  value={reviewDraft.ratingFood}
                  onChange={(event) =>
                    setReviewDraft((prev) => ({ ...prev, ratingFood: Number(event.target.value) }))
                  }
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Needs Improvement</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </label>

              <label>
                Service Rating
                <select
                  value={reviewDraft.ratingService}
                  onChange={(event) =>
                    setReviewDraft((prev) => ({ ...prev, ratingService: Number(event.target.value) }))
                  }
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Needs Improvement</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </label>
            </div>

            <label className="od-review-text">
              Your Review
              <textarea
                rows={4}
                value={reviewDraft.reviewText}
                onChange={(event) => setReviewDraft((prev) => ({ ...prev, reviewText: event.target.value }))}
                placeholder="Tell us about food taste, quality, and service..."
              />
            </label>

            <small className="od-review-note">Your review helps us improve taste and service quality across outlets.</small>

            <div className="od-review-actions">
              <button type="button" className="ghost" onClick={skipReview} disabled={reviewSubmitting}>
                Skip
              </button>
              <button type="button" onClick={submitReview} disabled={reviewSubmitting}>
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
