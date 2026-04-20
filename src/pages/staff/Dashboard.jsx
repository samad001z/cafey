import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Clock3, ClipboardList, LogIn, LogOut, Minus, Plus, ReceiptText, Search, ShoppingBag, Timer, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { buildApiUrl, resolveApiBase } from '../../lib/apiBase'
import { useAuth } from '../../context/AuthContext'
import './Dashboard.css'

const tabs = {
  ORDERS: 'orders',
  KDS: 'kds',
  CHECK: 'check',
  HISTORY: 'history',
}

const ACTIVE_ORDER_STATUSES = ['placed', 'confirmed', 'preparing', 'ready']
const LIVE_ORDER_MAX_AGE_MINUTES = 60

function initialsFromName(name) {
  const value = String(name || '').trim()
  if (!value) return 'ST'
  const pieces = value.split(/\s+/).filter(Boolean)
  return pieces.slice(0, 2).map((piece) => piece[0]?.toUpperCase() || '').join('')
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTime(value) {
  if (!value) return '--'
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value) {
  if (!value) return '--'
  return new Date(value).toLocaleDateString()
}

function durationBetween(start, end) {
  if (!start || !end) return '--'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return '--'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function durationMinutesBetween(start, end) {
  if (!start || !end) return 0
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return 0
  return Math.floor(ms / 60000)
}

function formatDurationFromMinutes(totalMinutes) {
  const mins = Math.max(0, Number(totalMinutes || 0))
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  return `${hours}h ${minutes}m`
}

function minutesAgo(createdAt, now) {
  const diffMs = now.getTime() - new Date(createdAt).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 1) return 'Just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

function elapsedMinutes(createdAt, now) {
  const diffMs = now.getTime() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diffMs / 60000))
}

function elapsedClock(createdAt, now) {
  const diffMs = Math.max(0, now.getTime() - new Date(createdAt).getTime())
  const totalSeconds = Math.floor(diffMs / 1000)
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  const hh = Math.floor(totalSeconds / 3600)
  if (hh > 0) return `${String(hh).padStart(2, '0')}:${mm}:${ss}`
  return `${mm}:${ss}`
}

function urgencyFromMinutes(mins) {
  if (mins < 5) return 'green'
  if (mins < 10) return 'amber'
  return 'red'
}

function playBellChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return

    const ctx = new Ctx()
    const now = ctx.currentTime

    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85)

    const toneA = ctx.createOscillator()
    toneA.type = 'sine'
    toneA.frequency.setValueAtTime(1046.5, now)
    toneA.frequency.exponentialRampToValueAtTime(784.0, now + 0.32)
    toneA.connect(gain)

    const toneB = ctx.createOscillator()
    toneB.type = 'triangle'
    toneB.frequency.setValueAtTime(1318.5, now + 0.06)
    toneB.frequency.exponentialRampToValueAtTime(987.8, now + 0.45)
    toneB.connect(gain)

    toneA.start(now)
    toneB.start(now + 0.06)
    toneA.stop(now + 0.5)
    toneB.stop(now + 0.7)

    window.setTimeout(() => {
      ctx.close().catch(() => {})
    }, 900)
  } catch {
    // Ignore audio permission/runtime errors.
  }
}

function statusAction(orderStatus) {
  if (orderStatus === 'placed') return { label: 'Accept', next: 'confirmed', tone: 'green' }
  if (orderStatus === 'confirmed') return { label: 'Start Preparing', next: 'preparing', tone: 'amber' }
  if (orderStatus === 'preparing') return { label: 'Mark Ready', next: 'ready', tone: 'blue' }
  if (orderStatus === 'ready') return { label: 'Complete', next: 'completed', tone: 'gray' }
  return null
}

function todayIsoDate() {
  const now = new Date()
  return todayIsoDateFromDate(now)
}

function todayIsoDateFromDate(now) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isWithinLiveOrderWindow(createdAt) {
  if (!createdAt) return false
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs >= 0 && ageMs <= LIVE_ORDER_MAX_AGE_MINUTES * 60 * 1000
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const localApiBase = resolveApiBase(import.meta.env.VITE_OTP_API_BASE_URL)
  const buildLocalApiUrl = (path) => buildApiUrl(path, import.meta.env.VITE_OTP_API_BASE_URL)

  const [activeTab, setActiveTab] = useState(tabs.ORDERS)
  const [branchName, setBranchName] = useState('')
  const [now, setNow] = useState(new Date())

  const [todayAttendance, setTodayAttendance] = useState(null)
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const [liveOrders, setLiveOrders] = useState([])
  const [todayOrders, setTodayOrders] = useState([])
  const [itemsByOrderId, setItemsByOrderId] = useState({})

  const [loadingOrders, setLoadingOrders] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState('')
  const [counterBusy, setCounterBusy] = useState(false)
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [counterMenu, setCounterMenu] = useState([])
  const [counterReceipt, setCounterReceipt] = useState(null)
  const [counterCart, setCounterCart] = useState([])
  const [counterSearch, setCounterSearch] = useState('')
  const [counterCategory, setCounterCategory] = useState('all')

  const [counterOrder, setCounterOrder] = useState({
    orderType: 'takeaway',
    tableNumber: '',
    collectedAmount: '',
  })
  const seenPlacedOrderIdsRef = useRef(new Set())
  const chimeReadyRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile?.branch_id) return

    let active = true

    const fetchBranch = async () => {
      const { data } = await supabase.from('branches').select('name').eq('id', profile.branch_id).single()
      if (!active) return
      setBranchName(data?.name || 'Assigned Branch')
    }

    fetchBranch()

    return () => {
      active = false
    }
  }, [profile?.branch_id])

  const fetchAttendance = async () => {
    if (!user?.id || !profile?.branch_id) return

    const firstDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)
    const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0)

    const start = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`
    const end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const [{ data: todayData }, { data: historyData, error: historyError }] = await Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', user.id)
        .eq('branch_id', profile.branch_id)
        .eq('date', todayIsoDate())
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', user.id)
        .eq('branch_id', profile.branch_id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false }),
    ])

    if (historyError) {
      console.error('Attendance load failed:', historyError)
      toast.error('Unable to load attendance history')
      return
    }

    setTodayAttendance(todayData || null)
    setAttendanceHistory(historyData || [])
  }

  useEffect(() => {
    fetchAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.branch_id, displayMonth])

  useEffect(() => {
    if (!profile?.branch_id) return

    let active = true

    const fetchCounterMenu = async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, branch_id, is_available')
        .or(`branch_id.eq.${profile.branch_id},branch_id.is.null`)
        .neq('is_available', false)
        .order('name', { ascending: true })

      if (!active) return

      const supabaseRows = data || []

      if (error || !supabaseRows.length) {
        try {
          const response = await fetch(buildLocalApiUrl(`/api/staff/menu?branchId=${encodeURIComponent(profile.branch_id)}`))
          const payload = await response.json().catch(() => ({}))
          if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || 'Unable to fetch counter menu')
          const rows = payload.menu || []
          setCounterMenu(rows)
          return
        } catch (fallbackError) {
          console.error('Counter menu fetch failed:', fallbackError)
          if (error) toast.error('Unable to load counter menu')
          return
        }
      }

      setCounterMenu(supabaseRows)
    }

    fetchCounterMenu()

    return () => {
      active = false
    }
  }, [localApiBase, profile?.branch_id])

  useEffect(() => {
    const placedIds = new Set(
      liveOrders
        .filter((order) => order.status === 'placed')
        .map((order) => order.id),
    )

    if (!chimeReadyRef.current) {
      seenPlacedOrderIdsRef.current = placedIds
      chimeReadyRef.current = true
      return
    }

    let hasNewPlacedOrder = false
    for (const id of placedIds) {
      if (!seenPlacedOrderIdsRef.current.has(id)) {
        hasNewPlacedOrder = true
        break
      }
    }

    if (hasNewPlacedOrder && activeTab === tabs.KDS) {
      playBellChime()
      toast.success('New order ticket arrived', { icon: '🔔' })
    }

    seenPlacedOrderIdsRef.current = placedIds
  }, [activeTab, liveOrders])

  const fetchLiveOrders = async () => {
    if (!profile?.branch_id) {
      setLiveOrders([])
      setItemsByOrderId({})
      setLoadingOrders(false)
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, table_number, order_type, status, created_at, total_amount, payment_status')
      .eq('branch_id', profile.branch_id)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false })

    const shouldFallbackToLocal = !!ordersError || !(ordersData || []).length

    if (shouldFallbackToLocal) {
      try {
        const response = await fetch(`${localApiBase}/api/staff/orders?branchId=${encodeURIComponent(profile.branch_id)}`)
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || 'Unable to fetch live orders')

        const orderRows = payload.orders || []
        const activeRows = orderRows.filter(
          (row) => ACTIVE_ORDER_STATUSES.includes(row.status) && isWithinLiveOrderWindow(row.created_at),
        )
        setTodayOrders(orderRows)
        setLiveOrders(activeRows)
        setItemsByOrderId(payload.itemsByOrderId || {})
        setLoadingOrders(false)
        return
      } catch (fallbackError) {
        console.error('Live orders fetch failed:', fallbackError)
        if (ordersError) toast.error('Unable to fetch live orders')
        setLoadingOrders(false)
        return
      }
    }

    const orderRows = ordersData || []
    const activeRows = orderRows.filter(
      (row) => ACTIVE_ORDER_STATUSES.includes(row.status) && isWithinLiveOrderWindow(row.created_at),
    )
    setTodayOrders(orderRows)
    setLiveOrders(activeRows)

    if (!orderRows.length) {
      setItemsByOrderId({})
      setLoadingOrders(false)
      return
    }

    const orderIds = orderRows.map((order) => order.id)

    const { data: orderItemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, quantity, menu_items(name)')
      .in('order_id', orderIds)

    if (itemsError) {
      console.error('Order items fetch failed:', itemsError)
      toast.error('Unable to fetch order items')
      setLoadingOrders(false)
      return
    }

    const grouped = {}
    for (const row of orderItemsData || []) {
      if (!grouped[row.order_id]) grouped[row.order_id] = []
      grouped[row.order_id].push({
        quantity: row.quantity,
        name: row.menu_items?.name || 'Custom item',
      })
    }

    setItemsByOrderId(grouped)
    setLoadingOrders(false)
  }

  useEffect(() => {
    let canceled = false

    const run = async () => {
      await fetchLiveOrders()
    }

    run()

    const id = setInterval(() => {
      if (!canceled) fetchLiveOrders()
    }, 5000)

    return () => {
      canceled = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.branch_id])

  const handleCheckIn = async () => {
    if (!user?.id || !profile?.branch_id) {
      toast.error('Missing staff profile or branch assignment')
      return
    }

    setAttendanceBusy(true)

    const nowDate = new Date()
    const lateCutoff = new Date(nowDate)
    lateCutoff.setHours(9, 30, 0, 0)

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        staff_id: user.id,
        branch_id: profile.branch_id,
        checked_in_at: nowDate.toISOString(),
        status: nowDate > lateCutoff ? 'late' : 'present',
      })
      .select('*')
      .single()

    setAttendanceBusy(false)

    if (error) {
      console.error('Check-in failed:', error)
      toast.error(error.message || 'Check-in failed')
      return
    }

    setTodayAttendance(data)
    fetchAttendance()
    toast.success('Checked in successfully')
  }

  const handleCheckOut = async () => {
    if (!todayAttendance?.id) return

    setAttendanceBusy(true)

    const { data, error } = await supabase
      .from('attendance')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', todayAttendance.id)
      .select('*')
      .single()

    setAttendanceBusy(false)

    if (error) {
      console.error('Check-out failed:', error)
      toast.error(error.message || 'Check-out failed')
      return
    }

    setTodayAttendance(data)
    fetchAttendance()
    toast.success('Checked out successfully')
  }

  const advanceOrderStatus = async (orderId, nextStatus) => {
    setUpdatingOrderId(orderId)

    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', orderId)

    setUpdatingOrderId('')

    if (error) {
      console.error('Order status update failed:', error)
      toast.error(error.message || 'Failed to update order')
      return
    }

    toast.success(`Order moved to ${nextStatus}`)
    fetchLiveOrders()
  }

  const createCounterCashOrder = async (event) => {
    event.preventDefault()
    if (!profile?.branch_id) {
      toast.error('Staff branch not assigned')
      return
    }

    if (!counterCart.length) {
      toast.error('Add at least one item to cart')
      return
    }

    const lineItemsForOrder = counterCart
      .filter((item) => item.menu_item_id && item.qty > 0)
      .map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: Number(item.qty || 1),
        unit_price: Number(item.unit_price || 0),
      }))

    if (!lineItemsForOrder.length) {
      toast.error('Your counter cart is empty')
      return
    }

    const totalAmount = lineItemsForOrder.reduce(
      (sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 1),
      0,
    )

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error('Counter cart total is invalid')
      return
    }

    const collectedAmount = Number(counterOrder.collectedAmount || 0)
    if (!Number.isFinite(collectedAmount) || collectedAmount < totalAmount) {
      toast.error(`Collected cash must be at least ₹${totalAmount.toFixed(2)}`)
      return
    }

    setCounterBusy(true)
    const orderId = crypto.randomUUID()

    const orderPayload = {
      id: orderId,
      customer_id: null,
      branch_id: profile.branch_id,
      order_type: counterOrder.orderType,
      table_number:
        counterOrder.orderType === 'table_order'
          ? counterOrder.tableNumber.trim() || 'COUNTER'
          : null,
      status: 'confirmed',
      total_amount: Number(totalAmount.toFixed(2)),
      payment_status: 'cash',
      razorpay_order_id: null,
    }

    const lineItems = [
      ...lineItemsForOrder.map((item) => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    ]

    let orderError = null
    let itemError = null

    const { error } = await supabase.from('orders').insert(orderPayload)
    orderError = error

    const shouldFallback = orderError?.code === '42501' || String(orderError?.message || '').toLowerCase().includes('row-level security')
    if (shouldFallback) {
      try {
        const response = await fetch(`${localApiBase}/api/orders/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: orderPayload, items: lineItems }),
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok || body?.ok !== true) throw new Error(body?.error || 'Unable to create counter order')
        orderError = null
      } catch (fallbackError) {
        orderError = { message: fallbackError.message }
      }
    }

    if (orderError) {
      setCounterBusy(false)
      console.error('Counter order create failed:', orderError)
      toast.error(orderError.message || 'Unable to create counter cash order')
      return
    }

    if (!shouldFallback) {
      const { error: itemInsertError } = await supabase.from('order_items').insert(lineItems)
      itemError = itemInsertError
    }

    setCounterBusy(false)

    if (itemError) {
      console.error('Counter order item create failed:', itemError)
      toast.error(itemError.message || 'Order created but item line failed')
      fetchLiveOrders()
      return
    }

    setCounterOrder((prev) => ({
      ...prev,
      tableNumber: '',
      collectedAmount: '',
    }))
    setCounterCart([])

    setCounterReceipt({
      orderId,
      items: counterCart.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitPrice: Number(item.unit_price || 0),
        lineTotal: Number(item.unit_price || 0) * Number(item.qty || 1),
      })),
      totalQty: counterCart.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      totalAmount,
      collectedAmount,
      changeAmount: Number((collectedAmount - totalAmount).toFixed(2)),
      orderType: counterOrder.orderType,
      tableNumber: counterOrder.orderType === 'table_order' ? counterOrder.tableNumber.trim() || 'COUNTER' : null,
      branchName: branchName || 'Assigned Branch',
      createdAt: new Date().toISOString(),
    })

    toast.success('Counter cash order created')
    fetchLiveOrders()
  }

  const counterCategories = useMemo(() => {
    const unique = new Set(counterMenu.map((item) => String(item.category || 'Others').trim() || 'Others'))
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [counterMenu])

  const filteredCounterMenu = useMemo(() => {
    const query = counterSearch.trim().toLowerCase()
    return counterMenu.filter((item) => {
      const category = String(item.category || 'Others').trim() || 'Others'
      const matchCategory = counterCategory === 'all' || category === counterCategory
      const matchQuery = !query || String(item.name || '').toLowerCase().includes(query)
      return matchCategory && matchQuery
    })
  }, [counterCategory, counterMenu, counterSearch])

  const counterTotals = useMemo(() => {
    const totalItems = counterCart.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    const totalAmount = counterCart.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.unit_price || 0),
      0,
    )
    return {
      totalItems,
      totalAmount: Number(totalAmount.toFixed(2)),
    }
  }, [counterCart])

  const addMenuItemToCounterCart = (item) => {
    setCounterCart((prev) => {
      const index = prev.findIndex((row) => row.menu_item_id === item.id)
      if (index === -1) {
        return [
          ...prev,
          {
            menu_item_id: item.id,
            name: item.name,
            unit_price: Number(item.price || 0),
            qty: 1,
          },
        ]
      }

      const next = [...prev]
      next[index] = {
        ...next[index],
        qty: next[index].qty + 1,
      }
      return next
    })
  }

  const changeCounterItemQty = (menuItemId, delta) => {
    setCounterCart((prev) =>
      prev
        .map((item) => {
          if (item.menu_item_id !== menuItemId) return item
          return {
            ...item,
            qty: Math.max(0, Number(item.qty || 0) + delta),
          }
        })
        .filter((item) => item.qty > 0),
    )
  }

  const removeCounterItem = (menuItemId) => {
    setCounterCart((prev) => prev.filter((item) => item.menu_item_id !== menuItemId))
  }

  const monthCalendar = useMemo(() => {
    const year = displayMonth.getFullYear()
    const month = displayMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const byDate = new Map(attendanceHistory.map((row) => [row.date, row]))
    const today = new Date()

    const cells = []
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(year, month, day)
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const record = byDate.get(dateKey)

      let marker = null
      if (record?.status === 'present') marker = 'present'
      else if (record?.status === 'late') marker = 'late'
      else if (dateObj <= today) marker = 'absent'

      cells.push({ day, marker })
    }

    return cells
  }, [attendanceHistory, displayMonth])

  const kdsOrders = useMemo(
    () => [...liveOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [liveOrders],
  )

  const allDaySummary = useMemo(() => {
    const counts = new Map()

    for (const order of kdsOrders) {
      const items = itemsByOrderId[order.id] || []
      for (const item of items) {
        const key = String(item.name || 'Custom item')
        counts.set(key, (counts.get(key) || 0) + Number(item.quantity || 0))
      }
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [itemsByOrderId, kdsOrders])

  const attendanceSnapshot = useMemo(() => {
    const last7Start = new Date(now)
    last7Start.setHours(0, 0, 0, 0)
    last7Start.setDate(last7Start.getDate() - 6)
    const last7StartKey = todayIsoDateFromDate(last7Start)
    const todayKey = todayIsoDate()

    const byDate = new Map()
    for (const row of attendanceHistory) {
      if (!row?.date) continue
      byDate.set(row.date, row)
    }

    if (todayAttendance?.date) {
      byDate.set(todayAttendance.date, todayAttendance)
    }

    let weekWorkedMinutes = 0
    let weekShiftDays = 0
    let weekLateDays = 0

    for (const [date, row] of byDate.entries()) {
      if (date < last7StartKey || date > todayKey) continue
      if (row?.checked_in_at) weekShiftDays += 1
      if (row?.status === 'late') weekLateDays += 1

      if (!row?.checked_in_at) continue
      const end = row.checked_out_at || (date === todayKey ? now.toISOString() : null)
      weekWorkedMinutes += durationMinutesBetween(row.checked_in_at, end)
    }

    const todayRow = byDate.get(todayKey) || todayAttendance
    const todayWorkedMinutes = todayRow?.checked_in_at
      ? durationMinutesBetween(todayRow.checked_in_at, todayRow.checked_out_at || now.toISOString())
      : 0

    const activeShift = Boolean(todayRow?.checked_in_at && !todayRow?.checked_out_at)
    const avgShiftMinutes = weekShiftDays ? Math.floor(weekWorkedMinutes / weekShiftDays) : 0
    const targetMinutes = 8 * 60

    return {
      todayWorkedMinutes,
      weekWorkedMinutes,
      weekShiftDays,
      weekLateDays,
      avgShiftMinutes,
      activeShift,
      productivityPct: Math.min(100, Math.round((todayWorkedMinutes / targetMinutes) * 100)),
    }
  }, [attendanceHistory, now, todayAttendance])

  return (
    <main className="staff-dashboard-page">
      <section className="staff-dashboard-shell">
        <aside className="staff-sidebar">
          <div className="staff-profile-card">
            <div className="avatar">{initialsFromName(profile?.full_name || user?.email)}</div>
            <h2>{profile?.full_name || 'Staff Member'}</h2>
            <p>{branchName || 'No branch assigned'}</p>
          </div>

          <nav className="staff-nav">
            <button
              type="button"
              className={activeTab === tabs.ORDERS ? 'active' : ''}
              onClick={() => setActiveTab(tabs.ORDERS)}
            >
              <ReceiptText size={16} /> Live Orders
            </button>
            <button
              type="button"
              className={activeTab === tabs.KDS ? 'active' : ''}
              onClick={() => setActiveTab(tabs.KDS)}
            >
              <Timer size={16} /> Kitchen Display
            </button>
            <button
              type="button"
              className={activeTab === tabs.CHECK ? 'active' : ''}
              onClick={() => setActiveTab(tabs.CHECK)}
            >
              <LogIn size={16} /> Check In/Out
            </button>
            <button
              type="button"
              className={activeTab === tabs.HISTORY ? 'active' : ''}
              onClick={() => setActiveTab(tabs.HISTORY)}
            >
              <ClipboardList size={16} /> Attendance History
            </button>
          </nav>

          <button
            type="button"
            className="staff-logout-btn"
            onClick={() => signOut().catch((error) => toast.error(error.message || 'Sign out failed'))}
          >
            <LogOut size={16} /> Logout
          </button>
        </aside>

        <section className="staff-content">
          {activeTab === tabs.CHECK ? (
            <div className="checkin-panel">
              <div className="checkin-head">
                <h1>Shift Console</h1>
                <p>Track attendance, worked hours, and shift performance in real time.</p>
              </div>

              <section className="checkin-metrics" aria-label="Shift Metrics">
                <article>
                  <p>Today Worked</p>
                  <strong>{formatDurationFromMinutes(attendanceSnapshot.todayWorkedMinutes)}</strong>
                </article>
                <article>
                  <p>Last 7 Days</p>
                  <strong>{formatDurationFromMinutes(attendanceSnapshot.weekWorkedMinutes)}</strong>
                </article>
                <article>
                  <p>Avg Shift Length</p>
                  <strong>{formatDurationFromMinutes(attendanceSnapshot.avgShiftMinutes)}</strong>
                </article>
                <article>
                  <p>Late Marks (7d)</p>
                  <strong>{attendanceSnapshot.weekLateDays}</strong>
                </article>
              </section>

              <div className="checkin-card">
                <Clock3 size={20} />
                <h2>{formatClock(now)}</h2>
                <p>{now.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p>{branchName || 'No branch assigned'}</p>
                <span className={`checkin-status-pill ${attendanceSnapshot.activeShift ? 'active' : 'idle'}`}>
                  {attendanceSnapshot.activeShift ? 'On Shift' : 'Not Checked In'}
                </span>

                <div className="checkin-timeline">
                  <p><span>Check In</span><strong>{formatTime(todayAttendance?.checked_in_at)}</strong></p>
                  <p><span>Check Out</span><strong>{formatTime(todayAttendance?.checked_out_at)}</strong></p>
                  <p><span>Worked</span><strong>{formatDurationFromMinutes(attendanceSnapshot.todayWorkedMinutes)}</strong></p>
                </div>

                <div className="checkin-progress-wrap" aria-label="Shift completion">
                  <div className="checkin-progress-head">
                    <span>Shift Progress</span>
                    <strong>{attendanceSnapshot.productivityPct}% of 8h target</strong>
                  </div>
                  <div className="checkin-progress-bar">
                    <i style={{ width: `${attendanceSnapshot.productivityPct}%` }} />
                  </div>
                </div>

                {!todayAttendance?.checked_in_at ? (
                  <button type="button" className="btn check-in" disabled={attendanceBusy} onClick={handleCheckIn}>
                    {attendanceBusy ? 'Checking In...' : 'Check In'}
                  </button>
                ) : (
                  <>
                    <p className="checked-text">Checked in at {formatTime(todayAttendance.checked_in_at)}</p>
                    {!todayAttendance?.checked_out_at ? (
                      <button type="button" className="btn check-out" disabled={attendanceBusy} onClick={handleCheckOut}>
                        {attendanceBusy ? 'Checking Out...' : 'Check Out'}
                      </button>
                    ) : (
                      <p className="checked-text">Checked out at {formatTime(todayAttendance.checked_out_at)}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === tabs.ORDERS ? (
            <div className="orders-panel">
              <h1>Live Orders</h1>

              <form className="counter-order-card" onSubmit={createCounterCashOrder}>
                <h2>Counter Cash Order</h2>
                <p>Build a full walk-in cart, collect cash, and hand over receipt instantly.</p>

                <div className="counter-grid">
                  <label>
                    Type
                    <select
                      value={counterOrder.orderType}
                      onChange={(event) => setCounterOrder((prev) => ({ ...prev, orderType: event.target.value }))}
                    >
                      <option value="takeaway">Takeaway</option>
                      <option value="dine_in">Dine-In</option>
                      <option value="table_order">Table Order</option>
                    </select>
                  </label>

                  <label>
                    Collected Cash
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={counterOrder.collectedAmount}
                      onChange={(event) => setCounterOrder((prev) => ({ ...prev, collectedAmount: event.target.value }))}
                    />
                  </label>

                  {counterOrder.orderType === 'table_order' ? (
                    <label>
                      Table Number
                      <input
                        type="text"
                        value={counterOrder.tableNumber}
                        onChange={(event) => setCounterOrder((prev) => ({ ...prev, tableNumber: event.target.value }))}
                        placeholder="e.g. T12"
                      />
                    </label>
                  ) : null}
                </div>

                <div className="counter-menu-panel">
                  <div className="counter-menu-toolbar">
                    <label className="counter-search-field">
                      <Search size={14} />
                      <input
                        type="search"
                        value={counterSearch}
                        onChange={(event) => setCounterSearch(event.target.value)}
                        placeholder="Search menu item"
                      />
                    </label>

                    <select
                      className="counter-category-select"
                      value={counterCategory}
                      onChange={(event) => setCounterCategory(event.target.value)}
                    >
                      {counterCategories.map((category) => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="counter-menu-grid">
                    {filteredCounterMenu.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="menu-chip"
                        onClick={() => addMenuItemToCounterCart(item)}
                      >
                        <strong>{item.name}</strong>
                        <span>{item.category || 'Others'}</span>
                        <b>₹{Number(item.price || 0).toFixed(2)}</b>
                        <i>Add</i>
                      </button>
                    ))}

                    {!filteredCounterMenu.length ? <p className="muted">No menu items match this search.</p> : null}
                  </div>
                </div>

                <div className="counter-cart-panel">
                  <header>
                    <h3><ShoppingBag size={16} /> Counter Cart</h3>
                    <button type="button" onClick={() => setCounterCart([])} disabled={!counterCart.length}>
                      Clear Cart
                    </button>
                  </header>

                  {!counterCart.length ? <p className="muted">No items in cart yet. Tap menu items to add.</p> : null}

                  {counterCart.length ? (
                    <div className="counter-cart-list">
                      {counterCart.map((item) => (
                        <article key={item.menu_item_id}>
                          <div>
                            <strong>{item.name}</strong>
                            <p>₹{Number(item.unit_price || 0).toFixed(2)} each</p>
                          </div>

                          <div className="qty-control">
                            <button type="button" onClick={() => changeCounterItemQty(item.menu_item_id, -1)}>
                              <Minus size={14} />
                            </button>
                            <span>{item.qty}</span>
                            <button type="button" onClick={() => changeCounterItemQty(item.menu_item_id, 1)}>
                              <Plus size={14} />
                            </button>
                            <button type="button" className="delete" onClick={() => removeCounterItem(item.menu_item_id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <b>₹{(Number(item.unit_price || 0) * Number(item.qty || 0)).toFixed(2)}</b>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  <footer>
                    <div>
                      <span>{counterTotals.totalItems} items</span>
                      <strong>₹{counterTotals.totalAmount.toFixed(2)}</strong>
                    </div>
                    <button type="submit" className="counter-create-btn" disabled={counterBusy || !counterCart.length}>
                      {counterBusy ? 'Creating...' : 'Create Cash Order'}
                    </button>
                  </footer>
                </div>
              </form>

              {counterReceipt ? (
                <article className="counter-receipt-card" aria-label="Counter receipt">
                  <header>
                    <h2>Counter Receipt</h2>
                    <div className="receipt-head-actions">
                      <strong>#{counterReceipt.orderId.slice(0, 8).toUpperCase()}</strong>
                      <button type="button" className="print-receipt-btn" onClick={() => window.print()}>
                        Thermal Print
                      </button>
                    </div>
                  </header>
                  <p>{new Date(counterReceipt.createdAt).toLocaleString()} · {counterReceipt.branchName}</p>
                  <div className="receipt-items-list">
                    {counterReceipt.items.map((item) => (
                      <div key={`${item.name}-${item.unitPrice}`} className="receipt-line">
                        <span>{item.qty}x {item.name}</span>
                        <strong>₹{item.lineTotal.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="receipt-line"><span>Total Qty</span><strong>{counterReceipt.totalQty}</strong></div>
                  <div className="receipt-line"><span>Total</span><strong>₹{counterReceipt.totalAmount.toFixed(2)}</strong></div>
                  <div className="receipt-line"><span>Collected</span><strong>₹{counterReceipt.collectedAmount.toFixed(2)}</strong></div>
                  <div className="receipt-line grand"><span>Return Change</span><strong>₹{counterReceipt.changeAmount.toFixed(2)}</strong></div>
                </article>
              ) : null}

              {loadingOrders ? <p className="muted">Loading branch orders...</p> : null}
              {loadingOrders ? (
                <div className="orders-skeleton-grid" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <article key={`sk-${n}`} className="order-skeleton-card">
                      <span className="line title" />
                      <span className="line body" />
                      <span className="line body short" />
                      <span className="line body short" />
                      <span className="line action" />
                    </article>
                  ))}
                </div>
              ) : null}
              {!loadingOrders && !liveOrders.length ? <p className="muted">No active orders at the moment.</p> : null}

              <div className="orders-list">
                {liveOrders.map((order) => {
                  const action = statusAction(order.status)
                  const list = itemsByOrderId[order.id] || []
                  return (
                    <article key={order.id} className="order-card">
                      <header>
                        <h2>Order #{order.id.slice(0, 8)}</h2>
                        <span>{order.order_type === 'takeaway' ? 'Takeaway' : order.table_number || 'Table Order'}</span>
                      </header>

                      <ul>
                        {list.length ? (
                          list.map((item, idx) => <li key={`${order.id}-${idx}`}>{item.quantity}x {item.name}</li>)
                        ) : (
                          <li>No item details</li>
                        )}
                      </ul>

                      <div className="order-meta">
                        <p>{minutesAgo(order.created_at, now)} · ₹{Number(order.total_amount || 0).toFixed(2)}</p>
                        <span className={`status ${order.status}`}>{order.status}</span>
                      </div>

                      {action ? (
                        <button
                          type="button"
                          className={`action ${action.tone}`}
                          disabled={updatingOrderId === order.id}
                          onClick={() => advanceOrderStatus(order.id, action.next)}
                        >
                          {updatingOrderId === order.id ? 'Updating...' : action.label}
                        </button>
                      ) : null}
                    </article>
                  )
                })}
              </div>

              <div className="today-orders-panel">
                <div className="today-orders-head">
                  <h2>Today&apos;s Orders</h2>
                  <span>{todayOrders.length} total</span>
                </div>

                {!todayOrders.length ? <p className="muted">No orders recorded today.</p> : null}

                {todayOrders.length ? (
                  <div className="today-orders-list">
                    {todayOrders.map((row) => (
                      <article key={`today-${row.id}`}>
                        <div>
                          <strong>#{row.id.slice(0, 8)}</strong>
                          <p>{row.order_type === 'takeaway' ? 'Takeaway' : row.table_number || 'Dine-In'}</p>
                        </div>
                        <div>
                          <span className={`status ${row.status}`}>{row.status}</span>
                          <strong>₹{Number(row.total_amount || 0).toFixed(2)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === tabs.KDS ? (
            <div className="kds-panel">
              <div className="kds-head">
                <div>
                  <h1>Kitchen Display System</h1>
                  <p>Real-time prep board for active branch tickets.</p>
                </div>
                <div className="kds-chime-pill">
                  <Bell size={15} /> Chime on new orders
                </div>
              </div>

              <section className="kds-summary">
                <header>
                  <h2>All Day Pending</h2>
                  <span>{allDaySummary.length} unique items</span>
                </header>

                {!allDaySummary.length ? <p className="muted">No pending items right now.</p> : null}

                {allDaySummary.length ? (
                  <div className="kds-summary-grid">
                    {allDaySummary.map(([name, qty]) => (
                      <article key={`sum-${name}`}>
                        <strong>{qty}x</strong>
                        <p>{name}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>

              {!kdsOrders.length ? <p className="muted">No active kitchen tickets.</p> : null}

              {kdsOrders.length ? (
                <section className="kds-ticket-grid" aria-live="polite">
                  {kdsOrders.map((order) => {
                    const mins = elapsedMinutes(order.created_at, now)
                    const urgency = urgencyFromMinutes(mins)
                    const action = statusAction(order.status)
                    const list = itemsByOrderId[order.id] || []

                    return (
                      <article key={`kds-${order.id}`} className={`kds-ticket urgency-${urgency}`}>
                        <header>
                          <h2>#{order.id.slice(0, 8).toUpperCase()}</h2>
                          <span className={`status ${order.status}`}>{order.status}</span>
                        </header>

                        <p className="kds-meta">
                          {order.order_type === 'takeaway' ? 'Takeaway' : order.table_number || 'Table'}
                        </p>

                        <p className="kds-elapsed">
                          <Clock3 size={14} /> {elapsedClock(order.created_at, now)}
                        </p>

                        <ul>
                          {list.length ? list.map((item, idx) => (
                            <li key={`${order.id}-k-${idx}`}>
                              <strong>{item.quantity}x</strong> {item.name}
                            </li>
                          )) : <li>No item details</li>}
                        </ul>

                        <footer>
                          <span>₹{Number(order.total_amount || 0).toFixed(2)}</span>
                          {action ? (
                            <button
                              type="button"
                              className={`action ${action.tone}`}
                              disabled={updatingOrderId === order.id}
                              onClick={() => advanceOrderStatus(order.id, action.next)}
                            >
                              {updatingOrderId === order.id ? 'Updating...' : action.label}
                            </button>
                          ) : null}
                        </footer>
                      </article>
                    )
                  })}
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab === tabs.HISTORY ? (
            <div className="history-panel">
              <div className="history-head">
                <h1>Attendance History</h1>
                <div className="month-controls">
                  <button
                    type="button"
                    onClick={() =>
                      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                    }
                  >
                    Prev
                  </button>
                  <strong>{displayMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="calendar-grid">
                {monthCalendar.map((cell) => (
                  <div key={cell.day} className="day-cell">
                    <span>{cell.day}</span>
                    {cell.marker ? <i className={cell.marker} /> : null}
                  </div>
                ))}
              </div>

              <div className="legend">
                <p><i className="present" /> Present</p>
                <p><i className="late" /> Late</p>
                <p><i className="absent" /> Absent</p>
              </div>

              <div className="history-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>{formatTime(row.checked_in_at)}</td>
                        <td>{formatTime(row.checked_out_at)}</td>
                        <td>{durationBetween(row.checked_in_at, row.checked_out_at)}</td>
                        <td><span className={`status ${row.status}`}>{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  )
}
