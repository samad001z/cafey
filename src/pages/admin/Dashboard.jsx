import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Bell,
  Check,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MenuSquare,
  ReceiptText,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './Dashboard.css'

const navItems = [
  { key: 'monitor', label: 'Monitor', icon: LayoutDashboard },
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'orders', label: 'Orders', icon: ReceiptText },
  { key: 'reviews', label: 'Reviews', icon: MessageSquare },
  { key: 'menu', label: 'Menu', icon: MenuSquare },
  { key: 'reservations', label: 'Reservations', icon: ClipboardList },
  { key: 'analytics', label: 'Analytics', icon: Bell },
]

const KANBAN_COLUMNS = ['placed', 'preparing', 'ready', 'completed']
const CHART_COLORS = ['#C8853A', '#73C874', '#62B5E5', '#E3C270', '#9D8BE3']

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateKey(value) {
  const d = new Date(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function formatMoney(amount) {
  return `Rs ${Number(amount || 0).toFixed(2)}`
}

function formatTime(value) {
  if (!value) return '--'
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(value) {
  if (!value) return '--'
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (mins === 0) return 'Just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

function initialsFromName(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'ST'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function randomDigits(length) {
  let output = ''
  for (let i = 0; i < length; i += 1) output += Math.floor(Math.random() * 10)
  return output
}

function randomPassword(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
  let output = ''
  for (let i = 0; i < length; i += 1) output += chars[Math.floor(Math.random() * chars.length)]
  return output
}

function generateReviewInsights(reviews = []) {
  const actionable = (reviews || []).filter((row) => !row.skipped && row.review_text)
  if (!actionable.length) {
    return {
      avgFood: 0,
      avgService: 0,
      total: 0,
      positiveRatio: 0,
      suggestions: [
        {
          title: 'Collect more reviews',
          detail: 'Prompt customers post-completion so AI insight quality improves with larger sample size.',
          confidence: 'high',
        },
      ],
    }
  }

  const avgFood = actionable.reduce((sum, row) => sum + Number(row.rating_food || 0), 0) / actionable.length
  const avgService = actionable.reduce((sum, row) => sum + Number(row.rating_service || 0), 0) / actionable.length

  const complaintBuckets = {
    speed: 0,
    taste: 0,
    temperature: 0,
    pricing: 0,
    ambience: 0,
  }

  let positiveCount = 0
  for (const row of actionable) {
    const text = String(row.review_text || '').toLowerCase()
    if ((Number(row.rating_food || 0) + Number(row.rating_service || 0)) / 2 >= 4) positiveCount += 1

    if (/(slow|delay|late|wait)/.test(text)) complaintBuckets.speed += 1
    if (/(taste|flavor|bland|salty|sweet|sour)/.test(text)) complaintBuckets.taste += 1
    if (/(cold|hot|temperature|warm)/.test(text)) complaintBuckets.temperature += 1
    if (/(price|expensive|cost|overpriced)/.test(text)) complaintBuckets.pricing += 1
    if (/(clean|hygiene|ambience|noise|crowd)/.test(text)) complaintBuckets.ambience += 1
  }

  const suggestions = []

  if (avgService < 4 || complaintBuckets.speed > 0) {
    suggestions.push({
      title: 'Service-time optimization',
      detail: 'Introduce peak-hour prep batching and a dedicated handover queue to reduce wait-time complaints.',
      confidence: complaintBuckets.speed >= 2 ? 'high' : 'medium',
    })
  }

  if (avgFood < 4 || complaintBuckets.taste > 0) {
    suggestions.push({
      title: 'Recipe consistency checks',
      detail: 'Run daily taste calibration for top sellers and standardize syrup/milk ratios per shift.',
      confidence: complaintBuckets.taste >= 2 ? 'high' : 'medium',
    })
  }

  if (complaintBuckets.temperature > 0) {
    suggestions.push({
      title: 'Temperature quality guard',
      detail: 'Add 3-minute dispatch SLA for hot drinks and use insulated pickup workflow for table handoff.',
      confidence: complaintBuckets.temperature >= 2 ? 'high' : 'medium',
    })
  }

  if (complaintBuckets.pricing > 0) {
    suggestions.push({
      title: 'Value communication',
      detail: 'Highlight combo-value messaging in menu and pilot happy-hour bundles for low-selling slots.',
      confidence: complaintBuckets.pricing >= 2 ? 'medium' : 'low',
    })
  }

  if (complaintBuckets.ambience > 0) {
    suggestions.push({
      title: 'Store ambience tuning',
      detail: 'Review table turnover cadence, cleaning checkpoints, and music volume at busy hours.',
      confidence: complaintBuckets.ambience >= 2 ? 'medium' : 'low',
    })
  }

  if (!suggestions.length) {
    suggestions.push({
      title: 'Scale what works',
      detail: 'Ratings are strong. Replicate high-performing branch SOPs across all outlets and maintain review requests.',
      confidence: 'high',
    })
  }

  return {
    avgFood,
    avgService,
    total: actionable.length,
    positiveRatio: positiveCount / actionable.length,
    suggestions,
  }
}

export default function Dashboard() {
  const { signOut } = useAuth()

  const [activePage, setActivePage] = useState('monitor')
  const [branches, setBranches] = useState([])
  const [selectedOutlet, setSelectedOutlet] = useState('all')

  const [metrics, setMetrics] = useState({ revenue: 0, activeOrders: 0, tables: 0, staffPresent: 0 })

  const [monitorBranchId, setMonitorBranchId] = useState('')
  const [staffStatusRows, setStaffStatusRows] = useState([])
  const [branchOverview, setBranchOverview] = useState([])

  const [kanbanBranchId, setKanbanBranchId] = useState('all')
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)

  const [staffRows, setStaffRows] = useState([])
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showEditStaff, setShowEditStaff] = useState(false)
  const [newStaff, setNewStaff] = useState({ full_name: '', phone: '', role: 'staff', branch_id: '', employee_id: '', password: '' })
  const [editStaff, setEditStaff] = useState(null)
  const [generatedCreds, setGeneratedCreds] = useState(null)

  const [menuItems, setMenuItems] = useState([])
  const [menuCategory, setMenuCategory] = useState('All')
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState(null)
  const [menuDraft, setMenuDraft] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_veg: true,
    image_url: '',
    branch_id: '',
    modifiers: '',
  })

  const [reservations, setReservations] = useState([])
  const [reservationBranch, setReservationBranch] = useState('all')
  const [reservationDate, setReservationDate] = useState(todayKey())
  const [reviewBranch, setReviewBranch] = useState('all')
  const [reviewRows, setReviewRows] = useState([])
  const [showSkippedReviews, setShowSkippedReviews] = useState(false)

  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return dateKey(d)
  })
  const [rangeEnd, setRangeEnd] = useState(todayKey())
  const [dailyRevenueData, setDailyRevenueData] = useState([])
  const [ordersPerBranchData, setOrdersPerBranchData] = useState([])
  const [topMenuItemsData, setTopMenuItemsData] = useState([])
  const [attendanceHeatmap, setAttendanceHeatmap] = useState([])
  const [inventoryAlerts, setInventoryAlerts] = useState([])

  const branchNameById = useMemo(() => {
    const map = new Map()
    for (const row of branches) map.set(row.id, row.name)
    return map
  }, [branches])

  const selectedOutletLabel = selectedOutlet === 'all'
    ? 'All Outlets'
    : (branchNameById.get(selectedOutlet) || 'Selected Outlet')

  const scopedBranches = useMemo(() => {
    if (selectedOutlet === 'all') return branches
    return branches.filter((branch) => branch.id === selectedOutlet)
  }, [branches, selectedOutlet])

  const menuCategories = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((row) => row.category || 'Others')))
    return ['All', ...unique]
  }, [menuItems])

  const filteredMenuItems = useMemo(() => {
    if (menuCategory === 'All') return menuItems
    return menuItems.filter((row) => (row.category || 'Others') === menuCategory)
  }, [menuCategory, menuItems])

  const reviewInsights = useMemo(() => generateReviewInsights(reviewRows), [reviewRows])
  const branchFilterOptions = useMemo(
    () => (selectedOutlet === 'all' ? branches : scopedBranches),
    [selectedOutlet, branches, scopedBranches],
  )
  const staffHiringStats = useMemo(() => {
    const total = staffRows.length
    const active = staffRows.filter((row) => row.is_active).length
    const inactive = Math.max(0, total - active)
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const hiredThisMonth = staffRows.filter((row) => {
      if (!row.created_at) return false
      return new Date(row.created_at).getTime() >= recentCutoff
    }).length
    return { total, active, inactive, hiredThisMonth }
  }, [staffRows])

  useEffect(() => {
    let active = true

    const loadBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, is_open')
        .order('created_at', { ascending: true })

      if (!active) return
      if (error) {
        toast.error('Failed to load branches')
        return
      }

      const rows = data || []
      setBranches(rows)
      setMonitorBranchId((prev) => prev || rows[0]?.id || '')
      setSelectedOutlet((prev) => (prev === 'all' ? 'all' : prev || rows[0]?.id || 'all'))
      setKanbanBranchId((prev) => prev || 'all')
      setReservationBranch((prev) => prev || 'all')
      setNewStaff((prev) => ({ ...prev, branch_id: prev.branch_id || rows[0]?.id || '' }))
    }

    loadBranches()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!branches.length) return

    if (selectedOutlet === 'all') {
      setKanbanBranchId('all')
      setReservationBranch('all')
      setReviewBranch('all')
      setMonitorBranchId((prev) => prev || branches[0]?.id || '')
      return
    }

    setMonitorBranchId(selectedOutlet)
    setKanbanBranchId(selectedOutlet)
    setReservationBranch(selectedOutlet)
    setReviewBranch(selectedOutlet)
    setNewStaff((prev) => ({ ...prev, branch_id: prev.branch_id || selectedOutlet }))
  }, [selectedOutlet, branches])

  const fetchMetrics = async () => {
    const todayIso = startOfTodayIso()

    const [revenueResp, activeOrdersResp, attendanceResp] = await Promise.all([
      supabase
        .from('orders')
        .select('total_amount, branch_id, status, created_at')
        .gte('created_at', todayIso)
        .neq('status', 'cancelled'),
      supabase
        .from('orders')
        .select('id, table_number, status, branch_id')
        .in('status', ['placed', 'confirmed', 'preparing', 'ready']),
      supabase
        .from('attendance')
        .select('staff_id, checked_in_at, checked_out_at, status, branch_id')
        .eq('date', todayKey()),
    ])

    if (revenueResp.error || activeOrdersResp.error || attendanceResp.error) {
      toast.error('Failed to load dashboard metrics')
      return
    }

    const revenueRows = revenueResp.data || []
    const activeRows = activeOrdersResp.data || []
    const attendanceRows = attendanceResp.data || []

    const revenue = revenueRows
      .filter((row) => selectedOutlet === 'all' || row.branch_id === selectedOutlet)
      .reduce((sum, row) => sum + Number(row.total_amount || 0), 0)

    const activeFiltered = activeRows.filter((row) => selectedOutlet === 'all' || row.branch_id === selectedOutlet)
    const tables = new Set(activeFiltered.map((row) => row.table_number).filter(Boolean)).size
    const staffPresent = attendanceRows.filter((row) => {
      if (selectedOutlet !== 'all' && row.branch_id !== selectedOutlet) return false
      if (!row.checked_in_at) return false
      if (row.checked_out_at) return false
      return row.status === 'present' || row.status === 'late'
    }).length

    setMetrics({
      revenue,
      activeOrders: activeFiltered.length,
      tables,
      staffPresent,
    })
  }

  const fetchStaffStatus = async () => {
    if (!monitorBranchId) return

    const { data: staffData, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, employee_id')
      .eq('role', 'staff')
      .eq('branch_id', monitorBranchId)
      .eq('is_active', true)

    if (staffError) {
      toast.error('Failed to load staff status')
      return
    }

    const staffRowsLocal = staffData || []
    const staffIds = staffRowsLocal.map((row) => row.id)

    let attendanceRows = []
    if (staffIds.length) {
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('staff_id, checked_in_at, checked_out_at, status')
        .eq('date', todayKey())
        .in('staff_id', staffIds)

      if (attError) {
        toast.error('Failed to load attendance status')
        return
      }
      attendanceRows = attData || []
    }

    const byStaffId = new Map(attendanceRows.map((row) => [row.staff_id, row]))

    const merged = staffRowsLocal.map((staff) => {
      const att = byStaffId.get(staff.id)
      if (!att?.checked_in_at) return { ...staff, att_status: 'absent', checked_in_at: null, checked_out_at: null }
      return {
        ...staff,
        att_status: att.status || 'present',
        checked_in_at: att.checked_in_at,
        checked_out_at: att.checked_out_at,
      }
    })

    setStaffStatusRows(merged)
  }

  const fetchBranchOverview = async () => {
    const [staffResp, attendanceResp, ordersResp] = await Promise.all([
      supabase.from('profiles').select('id, branch_id').eq('role', 'staff').eq('is_active', true),
      supabase.from('attendance').select('staff_id, branch_id, status, checked_in_at, checked_out_at').eq('date', todayKey()),
      supabase.from('orders').select('id, branch_id, status').in('status', ['placed', 'confirmed', 'preparing', 'ready']),
    ])

    if (staffResp.error || attendanceResp.error || ordersResp.error) {
      toast.error('Failed to load branch overview')
      return
    }

    const staffByBranch = new Map()
    for (const row of staffResp.data || []) {
      staffByBranch.set(row.branch_id, (staffByBranch.get(row.branch_id) || 0) + 1)
    }

    const presentByBranch = new Map()
    for (const row of attendanceResp.data || []) {
      if (!row.checked_in_at || row.checked_out_at) continue
      if (!['present', 'late'].includes(row.status)) continue
      presentByBranch.set(row.branch_id, (presentByBranch.get(row.branch_id) || 0) + 1)
    }

    const activeOrdersByBranch = new Map()
    for (const row of ordersResp.data || []) {
      activeOrdersByBranch.set(row.branch_id, (activeOrdersByBranch.get(row.branch_id) || 0) + 1)
    }

    const visibleBranches = selectedOutlet === 'all'
      ? branches
      : branches.filter((branch) => branch.id === selectedOutlet)

    setBranchOverview(
      visibleBranches.map((branch) => ({
        branch,
        staffPresent: presentByBranch.get(branch.id) || 0,
        staffTotal: staffByBranch.get(branch.id) || 0,
        activeOrders: activeOrdersByBranch.get(branch.id) || 0,
      })),
    )
  }

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select('id, customer_id, branch_id, order_type, table_number, status, created_at')
      .in('status', KANBAN_COLUMNS)
      .order('created_at', { ascending: true })

    if (kanbanBranchId !== 'all') query = query.eq('branch_id', kanbanBranchId)

    const { data: orderRows, error: orderError } = await query
    if (orderError) {
      toast.error('Failed to load orders')
      return
    }

    const ordersData = orderRows || []
    const orderIds = ordersData.map((row) => row.id)
    const customerIds = Array.from(new Set(ordersData.map((row) => row.customer_id).filter(Boolean)))

    let itemsRows = []
    if (orderIds.length) {
      const { data, error } = await supabase
        .from('order_items')
        .select('order_id, quantity, menu_items(name)')
        .in('order_id', orderIds)
      if (!error) itemsRows = data || []
    }

    let customerRows = []
    if (customerIds.length) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', customerIds)
      if (!error) customerRows = data || []
    }

    const itemsByOrder = new Map()
    for (const item of itemsRows) {
      if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, [])
      itemsByOrder.get(item.order_id).push({
        quantity: item.quantity,
        name: item.menu_items?.name || 'Item',
      })
    }

    const customerById = new Map(customerRows.map((row) => [row.id, row]))

    const merged = ordersData.map((row) => ({
      ...row,
      items: itemsByOrder.get(row.id) || [],
      customer: customerById.get(row.customer_id) || null,
    }))

    setOrders(merged)
    setSelectedOrder((prev) => (prev ? merged.find((row) => row.id === prev.id) || null : null))
  }

  const fetchStaffTable = async () => {
    let query = supabase
      .from('profiles')
      .select('id, full_name, role, branch_id, employee_id, avatar_url, phone, is_active, created_at')
      .eq('role', 'staff')
      .order('created_at', { ascending: false })

    if (selectedOutlet !== 'all') query = query.eq('branch_id', selectedOutlet)

    const { data, error } = await query

    if (error) {
      toast.error('Failed to load staff table')
      return
    }

    setStaffRows(data || [])
  }

  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, category, price, image_url, is_available, description, is_veg, branch_id, modifiers')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      toast.error('Failed to load menu')
      return
    }

    setMenuItems(data || [])
  }

  const fetchReservations = async () => {
    let query = supabase
      .from('reservations')
      .select('id, date, time_slot, customer_name, phone, branch_id, party_size, status, ref_code')
      .order('date', { ascending: true })

    if (reservationBranch !== 'all') query = query.eq('branch_id', reservationBranch)
    if (reservationDate) query = query.eq('date', reservationDate)

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load reservations')
      return
    }

    setReservations(data || [])
  }

  const fetchReviews = async () => {
    let query = supabase
      .from('order_reviews')
      .select('id, order_id, customer_id, branch_id, rating_food, rating_service, review_text, skipped, is_published, created_at, profiles(full_name, phone)')
      .order('created_at', { ascending: false })
      .limit(300)

    if (reviewBranch !== 'all') query = query.eq('branch_id', reviewBranch)
    if (!showSkippedReviews) query = query.eq('skipped', false)

    const { data, error } = await query
    if (error) {
      toast.error(error.message || 'Failed to load reviews')
      return
    }

    setReviewRows(data || [])
  }

  const fetchAnalytics = async () => {
    const from = `${rangeStart}T00:00:00`
    const to = `${rangeEnd}T23:59:59`

    const { data: orderRows, error: orderError } = await supabase
      .from('orders')
      .select('id, branch_id, created_at, total_amount, status')
      .gte('created_at', from)
      .lte('created_at', to)

    if (orderError) {
      toast.error('Failed to load analytics')
      return
    }

    const ordersLocal = (orderRows || []).filter((row) => row.status !== 'cancelled')
    const scopedOrders = ordersLocal.filter((row) => selectedOutlet === 'all' || row.branch_id === selectedOutlet)

    const dailyMap = new Map()
    for (const row of scopedOrders) {
      const key = dateKey(row.created_at)
      dailyMap.set(key, (dailyMap.get(key) || 0) + Number(row.total_amount || 0))
    }

    const dailySeries = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }))
    setDailyRevenueData(dailySeries)

    const branchMap = new Map()
    for (const row of scopedOrders) {
      const name = branchNameById.get(row.branch_id) || 'Unknown'
      branchMap.set(name, (branchMap.get(name) || 0) + 1)
    }
    setOrdersPerBranchData(Array.from(branchMap.entries()).map(([name, ordersCount]) => ({ name, ordersCount })))

    const orderIds = scopedOrders.map((row) => row.id)
    let topItems = []
    if (orderIds.length) {
      const { data: itemRows } = await supabase
        .from('order_items')
        .select('order_id, quantity, menu_items(name)')
        .in('order_id', orderIds)

      const topMap = new Map()
      for (const row of itemRows || []) {
        const key = row.menu_items?.name || 'Item'
        topMap.set(key, (topMap.get(key) || 0) + Number(row.quantity || 0))
      }
      topItems = Array.from(topMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    }
    setTopMenuItemsData(topItems)

    const { data: attendanceRows } = await supabase
      .from('attendance')
      .select('branch_id, date, status')
      .gte('date', rangeStart)
      .lte('date', rangeEnd)

    const days = []
    const startDate = new Date(`${rangeStart}T00:00:00`)
    const endDate = new Date(`${rangeEnd}T00:00:00`)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(dateKey(d))
    }

    const byDayBranch = new Map()
    for (const row of attendanceRows || []) {
      if (selectedOutlet !== 'all' && row.branch_id !== selectedOutlet) continue
      const key = `${row.date}|${row.branch_id}`
      if (!byDayBranch.has(key)) byDayBranch.set(key, { present: 0, late: 0, total: 0 })
      const agg = byDayBranch.get(key)
      agg.total += 1
      if (row.status === 'present') agg.present += 1
      if (row.status === 'late') agg.late += 1
    }

    const heatRows = days.map((day) => {
      const row = { date: day }
      for (const branch of scopedBranches) {
        const key = `${day}|${branch.id}`
        const agg = byDayBranch.get(key)
        row[branch.name] = agg ? `${agg.present + agg.late}/${agg.total}` : '0/0'
      }
      return row
    })
    setAttendanceHeatmap(heatRows)
  }

  const fetchInventoryAlerts = async () => {
    let query = supabase
      .from('inventory_alerts')
      .select('id, branch_id, ingredient_name, current_quantity, low_stock_threshold, message, created_at, is_read')
      .order('created_at', { ascending: false })
      .limit(40)

    if (selectedOutlet !== 'all') query = query.eq('branch_id', selectedOutlet)

    const { data, error } = await query
    if (error) {
      if (activePage === 'monitor') {
        toast.error(error.message || 'Failed to load inventory alerts')
      }
      return
    }

    setInventoryAlerts(data || [])
  }

  useEffect(() => {
    fetchMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutlet, branches.length])

  useEffect(() => {
    fetchStaffStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorBranchId])

  useEffect(() => {
    fetchBranchOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, selectedOutlet])

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanbanBranchId])

  useEffect(() => {
    fetchMenu()
  }, [])

  useEffect(() => {
    fetchStaffTable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutlet])

  useEffect(() => {
    fetchReservations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationBranch, reservationDate])

  useEffect(() => {
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewBranch, showSkippedReviews])

  useEffect(() => {
    if (!branches.length) return
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd, branches.length, selectedOutlet])

  useEffect(() => {
    fetchInventoryAlerts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutlet])

  useEffect(() => {
    const channel = supabase
      .channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        fetchStaffStatus()
        fetchBranchOverview()
        fetchMetrics()
        fetchAnalytics()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
        fetchBranchOverview()
        fetchMetrics()
        fetchAnalytics()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchStaffTable()
        fetchStaffStatus()
        fetchBranchOverview()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        fetchReservations()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_reviews' }, () => {
        fetchReviews()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchMenu()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_alerts' }, () => {
        fetchInventoryAlerts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorBranchId, selectedOutlet])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics()
      fetchBranchOverview()

      if (activePage === 'monitor') fetchStaffStatus()
      if (activePage === 'staff') fetchStaffTable()
      if (activePage === 'orders') fetchOrders()
      if (activePage === 'reservations') fetchReservations()
      if (activePage === 'reviews') fetchReviews()
      if (activePage === 'menu') fetchMenu()
      if (activePage === 'analytics') fetchAnalytics()
      if (activePage === 'monitor') fetchInventoryAlerts()
    }, 20000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, selectedOutlet, rangeStart, rangeEnd, reservationBranch, reservationDate, reviewBranch, showSkippedReviews, kanbanBranchId, monitorBranchId])

  const toggleBranchOpen = async (branch) => {
    const { error } = await supabase
      .from('branches')
      .update({ is_open: !branch.is_open })
      .eq('id', branch.id)

    if (error) {
      toast.error(error.message || 'Failed to update branch status')
      return
    }

    toast.success(`${branch.name} is now ${!branch.is_open ? 'Open' : 'Closed'}`)
    setBranches((prev) => prev.map((row) => (row.id === branch.id ? { ...row, is_open: !row.is_open } : row)))
    fetchBranchOverview()
  }

  const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) {
      toast.error(error.message || 'Order update failed')
      return
    }
    toast.success('Order status updated')
    fetchOrders()
  }

  const openAddStaff = () => {
    const id = `QF-${randomDigits(4)}`
    setNewStaff({
      full_name: '',
      phone: '',
      role: 'staff',
      branch_id: selectedOutlet !== 'all' ? selectedOutlet : (branches[0]?.id || ''),
      employee_id: id,
      password: randomPassword(8),
    })
    setGeneratedCreds(null)
    setShowAddStaff(true)
  }

  const submitAddStaff = async () => {
    if (!newStaff.full_name || !newStaff.phone || !newStaff.branch_id) {
      toast.error('Fill all required fields')
      return
    }

    const email = `${newStaff.employee_id.toLowerCase()}@qaffeine.internal`
    const password = newStaff.password

    const createResp = await supabase.auth.admin.createUser({
      email,
      password,
      phone: newStaff.phone,
      email_confirm: true,
    })

    if (createResp.error || !createResp.data?.user?.id) {
      toast.error(
        createResp.error?.message ||
          'Admin user creation failed. This action requires a secured server/service-role path.',
      )
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: createResp.data.user.id,
      role: 'staff',
      full_name: newStaff.full_name,
      phone: newStaff.phone,
      branch_id: newStaff.branch_id,
      employee_id: newStaff.employee_id,
      is_active: true,
    })

    if (profileError) {
      toast.error(profileError.message || 'Failed to save profile')
      return
    }

    setGeneratedCreds({ email, password })
    setShowAddStaff(false)
    fetchStaffTable()
    toast.success('Staff added successfully')
  }

  const submitEditStaff = async () => {
    if (!editStaff) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editStaff.full_name,
        phone: editStaff.phone,
        branch_id: editStaff.branch_id,
        is_active: editStaff.is_active,
      })
      .eq('id', editStaff.id)

    if (error) {
      toast.error(error.message || 'Update failed')
      return
    }

    setShowEditStaff(false)
    setEditStaff(null)
    fetchStaffTable()
    toast.success('Staff updated')
  }

  const toggleMenuAvailability = async (item) => {
    const next = !item.is_available
    setMenuItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_available: next } : row)))

    const { error } = await supabase.from('menu_items').update({ is_available: next }).eq('id', item.id)
    if (error) {
      toast.error(error.message || 'Failed to update item')
      setMenuItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, is_available: item.is_available } : row)))
      return
    }

    toast.success('Availability updated')
  }

  const openAddMenuItem = () => {
    setEditingMenuItem(null)
    setMenuDraft({
      name: '',
      description: '',
      price: '',
      category: '',
      is_veg: true,
      image_url: '',
      branch_id: '',
      modifiers: '',
    })
    setShowMenuModal(true)
  }

  const openEditMenuItem = (item) => {
    setEditingMenuItem(item)
    setMenuDraft({
      name: item.name || '',
      description: item.description || '',
      price: item.price || '',
      category: item.category || '',
      is_veg: item.is_veg ?? true,
      image_url: item.image_url || '',
      branch_id: item.branch_id || '',
      modifiers: item.modifiers ? JSON.stringify(item.modifiers, null, 2) : '',
    })
    setShowMenuModal(true)
  }

  const saveMenuItem = async () => {
    let parsedModifiers = {}
    if (menuDraft.modifiers && String(menuDraft.modifiers).trim()) {
      try {
        parsedModifiers = JSON.parse(String(menuDraft.modifiers))
      } catch {
        toast.error('Modifiers must be valid JSON object')
        return
      }

      if (!parsedModifiers || typeof parsedModifiers !== 'object' || Array.isArray(parsedModifiers)) {
        toast.error('Modifiers JSON must be an object like {"Milk": ["Whole", "Oat (+20)"]}')
        return
      }
    }

    const payload = {
      name: menuDraft.name,
      description: menuDraft.description || null,
      price: Number(menuDraft.price || 0),
      category: menuDraft.category || 'Others',
      is_veg: !!menuDraft.is_veg,
      image_url: menuDraft.image_url || null,
      branch_id: menuDraft.branch_id || null,
      modifiers: parsedModifiers,
    }

    if (!payload.name) {
      toast.error('Name is required')
      return
    }

    if (editingMenuItem?.id) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editingMenuItem.id)
      if (error) {
        toast.error(error.message || 'Update failed')
        return
      }
      toast.success('Menu item updated')
    } else {
      const { error } = await supabase.from('menu_items').insert({ ...payload, is_available: true })
      if (error) {
        toast.error(error.message || 'Create failed')
        return
      }
      toast.success('Menu item added')
    }

    setShowMenuModal(false)
    fetchMenu()
  }

  const updateReservationStatus = async (reservationId, status) => {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', reservationId)
    if (error) {
      toast.error(error.message || 'Unable to update reservation')
      return
    }
    toast.success(`Reservation ${status}`)
    fetchReservations()
  }

  const renderMonitor = () => {
    return (
      <div className="admin-page monitor-page">
        <section className="panel scope-banner">
          <p>
            Branch Scope
            <strong>{selectedOutletLabel}</strong>
          </p>
        </section>

        <div className="metric-grid">
          <article><h3>Today's Revenue</h3><p>{formatMoney(metrics.revenue)}</p></article>
          <article><h3>Active Orders</h3><p>{metrics.activeOrders}</p></article>
          <article><h3>Tables Occupied</h3><p>{metrics.tables}</p></article>
          <article><h3>Staff Present</h3><p>{metrics.staffPresent}</p></article>
        </div>

        <section className="panel">
          <h2>Staff Status — {monitorBranchId ? (branchNameById.get(monitorBranchId) || 'Selected Branch') : 'Branch'}</h2>
          <div className="pill-row">
            {branchFilterOptions.map((branch) => (
              <button
                key={branch.id}
                type="button"
                className={monitorBranchId === branch.id ? 'active' : ''}
                onClick={() => setMonitorBranchId(branch.id)}
              >
                {branch.name}
              </button>
            ))}
          </div>

          <div className="staff-grid">
            {staffStatusRows.map((row) => {
              let label = 'Not checked in'
              if (row.att_status === 'present') label = `Checked in at ${formatTime(row.checked_in_at)}`
              if (row.att_status === 'late') {
                const lateBy = Math.max(
                  0,
                  Math.floor(
                    (new Date(row.checked_in_at).getTime() -
                      new Date(`${todayKey()}T09:30:00`).getTime()) /
                      60000,
                  ),
                )
                label = `Late by ${lateBy} min`
              }

              return (
                <article key={row.id} className="staff-card">
                  <div className="avatar-sm">{initialsFromName(row.full_name)}</div>
                  <h3>{row.full_name || 'Staff Member'}</h3>
                  <p>{row.employee_id || 'No ID'}</p>
                  <span className={`status ${row.att_status}`}>
                    <i /> {row.att_status}
                  </span>
                  <small>{label}</small>
                </article>
              )
            })}
            {!staffStatusRows.length ? <p className="muted">No active staff found for this branch.</p> : null}
          </div>
        </section>

        <section className="panel">
          <h2>Branch Overview</h2>
          <div className="branch-overview-grid">
            {branchOverview.map((entry) => (
              <article key={entry.branch.id}>
                <h3>{entry.branch.name}</h3>
                <p>Staff present: {entry.staffPresent}/{entry.staffTotal}</p>
                <p>Active orders: {entry.activeOrders}</p>
                <button type="button" onClick={() => toggleBranchOpen(entry.branch)}>
                  {entry.branch.is_open ? 'Open' : 'Closed'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Low-Stock Alerts</h2>
            <span className="muted">{inventoryAlerts.length} recent</span>
          </div>

          {inventoryAlerts.length ? (
            <div className="inventory-alert-list">
              {inventoryAlerts.map((alert) => (
                <article key={alert.id} className="inventory-alert-card">
                  <div>
                    <h3>{alert.ingredient_name}</h3>
                    <small>{branchNameById.get(alert.branch_id) || 'Branch'} · {timeAgo(alert.created_at)}</small>
                  </div>
                  <p>{alert.message}</p>
                  <strong>
                    Current: {Number(alert.current_quantity || 0).toFixed(2)}
                    {' '}| Threshold: {Number(alert.low_stock_threshold || 0).toFixed(2)}
                  </strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No low-stock alerts right now.</p>
          )}
        </section>
      </div>
    )
  }

  const renderOrders = () => {
    const grouped = new Map(KANBAN_COLUMNS.map((status) => [status, []]))
    for (const row of orders) grouped.get(row.status)?.push(row)

    return (
      <div className="admin-page">
        <section className="panel">
          <div className="panel-head">
            <h2>Orders Kanban</h2>
            <select value={kanbanBranchId} onChange={(event) => setKanbanBranchId(event.target.value)}>
              {selectedOutlet === 'all' ? <option value="all">All branches</option> : null}
              {branchFilterOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div className="kanban-grid">
            {KANBAN_COLUMNS.map((status) => (
              <div key={status} className="kanban-col">
                <h3>{status}</h3>
                {(grouped.get(status) || []).map((order) => (
                  <article key={order.id} className="kanban-card" onClick={() => setSelectedOrder(order)}>
                    <h4>#{order.id.slice(0, 8)}</h4>
                    <p>{order.table_number || (order.order_type === 'takeaway' ? 'Takeaway' : 'Table order')}</p>
                    <ul>
                      {(order.items || []).slice(0, 3).map((item, index) => (
                        <li key={`${order.id}-${index}`}>{item.quantity}x {item.name}</li>
                      ))}
                    </ul>
                    <small>{order.customer?.full_name || 'Walk-in'} · {timeAgo(order.created_at)}</small>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>

        {selectedOrder ? (
          <aside className="side-panel">
            <button type="button" className="close" aria-label="Close order details" onClick={() => setSelectedOrder(null)}>x</button>
            <h3>Order #{selectedOrder.id}</h3>
            <p>{branchNameById.get(selectedOrder.branch_id) || 'Branch'}</p>
            <p>Customer: {selectedOrder.customer?.full_name || 'Walk-in'}</p>
            <p>Phone: {selectedOrder.customer?.phone || '--'}</p>
            <ul>
              {selectedOrder.items.map((item, idx) => <li key={`${selectedOrder.id}-item-${idx}`}>{item.quantity}x {item.name}</li>)}
            </ul>

            <label>
              Override Status
              <select value={selectedOrder.status} onChange={(event) => setSelectedOrder({ ...selectedOrder, status: event.target.value })}>
                {KANBAN_COLUMNS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => updateOrderStatus(selectedOrder.id, selectedOrder.status)}>Save Status</button>
          </aside>
        ) : null}
      </div>
    )
  }

  const renderStaffManagement = () => {
    return (
      <div className="admin-page">
        <section className="panel">
          <div className="panel-head">
            <h2>Staff Hiring & Management ({selectedOutletLabel})</h2>
            <button type="button" onClick={openAddStaff}>Add Staff</button>
          </div>

          <div className="staff-hiring-grid">
            <article><h3>Total Staff</h3><p>{staffHiringStats.total}</p></article>
            <article><h3>Active Staff</h3><p>{staffHiringStats.active}</p></article>
            <article><h3>Inactive Staff</h3><p>{staffHiringStats.inactive}</p></article>
            <article><h3>Hired (30 days)</h3><p>{staffHiringStats.hiredThisMonth}</p></article>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Photo</th><th>Name</th><th>Role</th><th>Branch</th><th>Employee ID</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row) => (
                  <tr key={row.id}>
                    <td><span className="avatar-mini">{initialsFromName(row.full_name)}</span></td>
                    <td>{row.full_name}</td>
                    <td>{row.role}</td>
                    <td>{branchNameById.get(row.branch_id) || '--'}</td>
                    <td>{row.employee_id || '--'}</td>
                    <td><span className={`status ${row.is_active ? 'present' : 'absent'}`}>{row.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button type="button" onClick={() => { setEditStaff({ ...row }); setShowEditStaff(true) }}>Edit</button>
                      <button
                        type="button"
                        onClick={async () => {
                          const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', row.id)
                          if (error) toast.error(error.message)
                          else { toast.success('Staff deactivated'); fetchStaffTable() }
                        }}
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
                {!staffRows.length ? (
                  <tr>
                    <td colSpan={7}>No staff records found in this branch scope.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {generatedCreds ? (
            <div className="credential-card">
              <h3>Generated Credentials (Shown once)</h3>
              <p>Email: {generatedCreds.email}</p>
              <p>Password: {generatedCreds.password}</p>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(`Email: ${generatedCreds.email}\nPassword: ${generatedCreds.password}`)
                  toast.success('Credentials copied')
                }}
              >
                Copy
              </button>
            </div>
          ) : null}
        </section>

        {showAddStaff ? (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3>Add Staff</h3>
              <label>Full Name<input placeholder="e.g. Aarav Singh" value={newStaff.full_name} onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })} /></label>
              <label>Phone<input placeholder="+91..." value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} /></label>
              <label>Role<select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}><option value="staff">staff</option></select></label>
              <label>Branch<select value={newStaff.branch_id} onChange={(e) => setNewStaff({ ...newStaff, branch_id: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label>Employee ID<input value={newStaff.employee_id} onChange={(e) => setNewStaff({ ...newStaff, employee_id: e.target.value.toUpperCase() })} /></label>
              <div className="row-actions">
                <button type="button" onClick={() => setNewStaff((prev) => ({ ...prev, employee_id: `QF-${randomDigits(4)}` }))}>Regenerate ID</button>
              </div>
              <label>Password<input value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} /></label>
              <div className="row-actions">
                <button type="button" onClick={() => setNewStaff((prev) => ({ ...prev, password: randomPassword(8) }))}>Regenerate Password</button>
              </div>
              <div className="row-actions"><button type="button" onClick={() => setShowAddStaff(false)}>Cancel</button><button type="button" onClick={submitAddStaff}>Create</button></div>
            </div>
          </div>
        ) : null}

        {showEditStaff && editStaff ? (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3>Edit Staff</h3>
              <label>Full Name<input value={editStaff.full_name || ''} onChange={(e) => setEditStaff({ ...editStaff, full_name: e.target.value })} /></label>
              <label>Phone<input value={editStaff.phone || ''} onChange={(e) => setEditStaff({ ...editStaff, phone: e.target.value })} /></label>
              <label>Branch<select value={editStaff.branch_id || ''} onChange={(e) => setEditStaff({ ...editStaff, branch_id: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label>Status<select value={editStaff.is_active ? 'active' : 'inactive'} onChange={(e) => setEditStaff({ ...editStaff, is_active: e.target.value === 'active' })}><option value="active">active</option><option value="inactive">inactive</option></select></label>
              <div className="row-actions"><button type="button" onClick={() => setShowEditStaff(false)}>Cancel</button><button type="button" onClick={submitEditStaff}>Save</button></div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderMenuManagement = () => {
    return (
      <div className="admin-page">
        <section className="panel">
          <div className="panel-head">
            <h2>Menu Management</h2>
            <button type="button" onClick={openAddMenuItem}>Add Item</button>
          </div>

          <div className="pill-row">
            {menuCategories.map((category) => (
              <button key={category} type="button" className={menuCategory === category ? 'active' : ''} onClick={() => setMenuCategory(category)}>
                {category}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Photo</th><th>Name</th><th>Price</th><th>Category</th><th>Available</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredMenuItems.map((item) => (
                  <tr key={item.id}>
                    <td><img className="menu-photo" src={item.image_url || 'https://picsum.photos/seed/default/80/80'} alt={item.name} /></td>
                    <td>{item.name}</td>
                    <td>{formatMoney(item.price)}</td>
                    <td>{item.category || 'Others'}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={!!item.is_available} onChange={() => toggleMenuAvailability(item)} />
                        <span />
                      </label>
                    </td>
                    <td><button type="button" onClick={() => openEditMenuItem(item)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showMenuModal ? (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3>{editingMenuItem ? 'Edit Item' : 'Add Item'}</h3>
              <label>Name<input value={menuDraft.name} onChange={(e) => setMenuDraft({ ...menuDraft, name: e.target.value })} /></label>
              <label>Description<textarea value={menuDraft.description} onChange={(e) => setMenuDraft({ ...menuDraft, description: e.target.value })} rows={3} /></label>
              <label>Price<input type="number" value={menuDraft.price} onChange={(e) => setMenuDraft({ ...menuDraft, price: e.target.value })} /></label>
              <label>Category<input value={menuDraft.category} onChange={(e) => setMenuDraft({ ...menuDraft, category: e.target.value })} /></label>
              <label>Branch<select value={menuDraft.branch_id} onChange={(e) => setMenuDraft({ ...menuDraft, branch_id: e.target.value })}><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label>Image URL<input value={menuDraft.image_url} onChange={(e) => setMenuDraft({ ...menuDraft, image_url: e.target.value })} /></label>
              <label className="checkbox"><input type="checkbox" checked={menuDraft.is_veg} onChange={(e) => setMenuDraft({ ...menuDraft, is_veg: e.target.checked })} /> Vegetarian</label>
              <label>
                Modifiers JSON
                <textarea
                  value={menuDraft.modifiers}
                  onChange={(e) => setMenuDraft({ ...menuDraft, modifiers: e.target.value })}
                  rows={5}
                  placeholder='{"Milk": ["Whole", "Oat (+20)"], "Size": ["Regular", "Large (+30)"]}'
                />
              </label>
              <div className="row-actions"><button type="button" onClick={() => setShowMenuModal(false)}>Cancel</button><button type="button" onClick={saveMenuItem}>Save</button></div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const renderReservations = () => {
    return (
      <div className="admin-page">
        <section className="panel">
          <div className="panel-head multi">
            <h2>Reservations</h2>
            <div className="filters-row">
              <select value={reservationBranch} onChange={(e) => setReservationBranch(e.target.value)}>
                {selectedOutlet === 'all' ? <option value="all">All branches</option> : null}
                {branchFilterOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
              <input type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Time</th><th>Name</th><th>Phone</th><th>Branch</th><th>Party</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {reservations.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.time_slot}</td>
                    <td>{row.customer_name}</td>
                    <td>{row.phone}</td>
                    <td>{branchNameById.get(row.branch_id) || '--'}</td>
                    <td>{row.party_size}</td>
                    <td><span className={`status ${row.status}`}>{row.status}</span></td>
                    <td>
                      <button type="button" onClick={() => updateReservationStatus(row.id, 'confirmed')}>Confirm</button>
                      <button type="button" onClick={() => updateReservationStatus(row.id, 'cancelled')}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  const renderAnalytics = () => {
    return (
      <div className="admin-page">
        <section className="panel">
          <div className="panel-head multi">
            <h2>Analytics</h2>
            <div className="filters-row">
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
          </div>

          <p className="muted">
            Scope: {selectedOutlet === 'all' ? 'All branches' : (branchNameById.get(selectedOutlet) || 'Selected branch')}
          </p>

          <div className="charts-grid">
            <article>
              <h3>Daily Revenue</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3a2a1d" />
                  <XAxis dataKey="date" stroke="#8A7560" />
                  <YAxis stroke="#8A7560" />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#C8853A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </article>

            <article>
              <h3>Orders Per Branch</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ordersPerBranchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3a2a1d" />
                  <XAxis dataKey="name" stroke="#8A7560" />
                  <YAxis stroke="#8A7560" />
                  <Tooltip />
                  <Bar dataKey="ordersCount" fill="#62B5E5" />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article>
              <h3>Top 5 Menu Items</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip />
                  <Pie data={topMenuItemsData} dataKey="value" nameKey="name" outerRadius={90}>
                    {topMenuItemsData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </article>
          </div>

          <h3>Staff Attendance Heatmap</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {scopedBranches.map((branch) => <th key={branch.id}>{branch.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {attendanceHeatmap.map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    {scopedBranches.map((branch) => <td key={`${row.date}-${branch.id}`}>{row[branch.name]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  const toggleReviewPublish = async (row) => {
    const { error } = await supabase
      .from('order_reviews')
      .update({ is_published: !row.is_published })
      .eq('id', row.id)

    if (error) {
      toast.error(error.message || 'Unable to update review visibility')
      return
    }

    setReviewRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_published: !item.is_published } : item)))
    toast.success(!row.is_published ? 'Review published' : 'Review hidden from marquee')
  }

  const renderReviews = () => {
    return (
      <div className="admin-page">
        <section className="panel ai-insights-panel">
          <div className="panel-head">
            <h2><Sparkles size={17} /> AI Review Insights</h2>
            <span>{reviewInsights.total} analyzed reviews</span>
          </div>

          <div className="insights-metric-grid">
            <article>
              <h3>Food Score</h3>
              <strong>{reviewInsights.avgFood.toFixed(2)}/5</strong>
            </article>
            <article>
              <h3>Service Score</h3>
              <strong>{reviewInsights.avgService.toFixed(2)}/5</strong>
            </article>
            <article>
              <h3>Positive Ratio</h3>
              <strong>{Math.round(reviewInsights.positiveRatio * 100)}%</strong>
            </article>
          </div>

          <div className="insights-suggestion-grid">
            {reviewInsights.suggestions.map((item) => (
              <article key={item.title}>
                <div>
                  <h3>{item.title}</h3>
                  <span className={`status ${item.confidence === 'high' ? 'present' : item.confidence === 'medium' ? 'late' : 'placed'}`}>
                    {item.confidence} confidence
                  </span>
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head multi">
            <h2>Customer Reviews</h2>
            <div className="filters-row">
              <select value={reviewBranch} onChange={(event) => setReviewBranch(event.target.value)}>
                {selectedOutlet === 'all' ? <option value="all">All branches</option> : null}
                {branchFilterOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={showSkippedReviews}
                  onChange={(event) => setShowSkippedReviews(event.target.checked)}
                />
                Show skipped
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Branch</th>
                  <th>Food</th>
                  <th>Service</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((row) => (
                  <tr key={row.id}>
                    <td>#{row.order_id.slice(0, 8)}</td>
                    <td>
                      <div className="review-customer-cell">
                        <strong>{row.profiles?.full_name || 'Customer'}</strong>
                        <small>{row.profiles?.phone || '--'}</small>
                      </div>
                    </td>
                    <td>{branchNameById.get(row.branch_id) || '--'}</td>
                    <td>{row.skipped ? '--' : `${row.rating_food || 0}/5`}</td>
                    <td>{row.skipped ? '--' : `${row.rating_service || 0}/5`}</td>
                    <td className="review-text-cell">{row.skipped ? 'Customer skipped review' : (row.review_text || '--')}</td>
                    <td>
                      <span className={`status ${row.skipped ? 'absent' : 'present'}`}>
                        {row.skipped ? 'Skipped' : (row.is_published ? 'Published' : 'Hidden')}
                      </span>
                    </td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      {!row.skipped ? (
                        <button type="button" onClick={() => toggleReviewPublish(row)}>
                          {row.is_published ? 'Hide' : 'Publish'}
                        </button>
                      ) : (
                        '--'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  const unreadAlertCount = inventoryAlerts.filter((row) => !row.is_read).length

  return (
    <main className="admin-dashboard-page">
      <header className="admin-topbar">
        <div className="topbar-brand">
          <h1>Qaffeine Admin</h1>
          <p>{selectedOutletLabel} control center</p>
        </div>
        <div className="topbar-actions">
          <select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)}>
            <option value="all">All outlets</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <button type="button" className="icon-btn has-badge" aria-label="Alerts" onClick={() => setActivePage('monitor')}>
            <Bell size={16} />
            {unreadAlertCount > 0 ? <span className="badge">{unreadAlertCount > 99 ? '99+' : unreadAlertCount}</span> : null}
          </button>
          <button type="button" className="logout" onClick={() => signOut().catch((err) => toast.error(err.message || 'Sign out failed'))}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <section className="admin-layout">
        <aside className="admin-sidebar">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={activePage === item.key ? 'active' : ''}
                onClick={() => setActivePage(item.key)}
              >
                <Icon size={16} /> {item.label}
              </button>
            )
          })}
        </aside>

        <section className="admin-content">
          {activePage === 'monitor' ? renderMonitor() : null}
          {activePage === 'orders' ? renderOrders() : null}
          {activePage === 'reviews' ? renderReviews() : null}
          {activePage === 'staff' ? renderStaffManagement() : null}
          {activePage === 'menu' ? renderMenuManagement() : null}
          {activePage === 'reservations' ? renderReservations() : null}
          {activePage === 'analytics' ? renderAnalytics() : null}
        </section>
      </section>
    </main>
  )
}
