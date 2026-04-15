import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, QrCode, ScanLine, Search, Star, Store, X } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './MenuOrder.css'

const LAST_RECEIPT_KEY = 'qaffeine_last_receipt'
const checkoutSteps = ['Type & Table', 'Review', 'Payment']

const imageMenuCatalog = [
  // Signature beverages
  { name: 'Nutella Butter Latte', category: 'Signature Beverages', price: 219, is_veg: true },
  { name: 'Nutmeg Dates Latte', category: 'Signature Beverages', price: 209, is_veg: true },
  { name: 'Berry Blast', category: 'Signature Beverages', price: 249, is_veg: true },
  { name: 'Dry Fruit Destruction', category: 'Signature Beverages', price: 249, is_veg: true },
  { name: 'Ferry Ferrero', category: 'Signature Beverages', price: 249, is_veg: true },
  { name: 'Great Indian Filter Coffee', category: 'Signature Beverages', price: 129, is_veg: true },

  // Espresso / hot coffees
  { name: 'Solo Espresso', category: 'Hot Coffees', price: 79, is_veg: true },
  { name: 'Doppio Espresso', category: 'Hot Coffees', price: 99, is_veg: true },
  { name: 'Cortado', category: 'Hot Coffees', price: 109, is_veg: true },
  { name: 'Macchiato', category: 'Hot Coffees', price: 119, is_veg: true },
  { name: 'Americano', category: 'Hot Coffees', price: 159, is_veg: true },
  { name: 'Flat White', category: 'Hot Coffees', price: 209, is_veg: true },
  { name: 'Qaffeccino', category: 'Hot Coffees', price: 199, is_veg: true },
  { name: 'Qaffe Latte', category: 'Hot Coffees', price: 199, is_veg: true },
  { name: 'Qaffe Mocha', category: 'Hot Coffees', price: 199, is_veg: true },
  { name: 'Cappuccino', category: 'Hot Coffees', price: 169, is_veg: true },
  { name: 'Cafe Latte', category: 'Hot Coffees', price: 179, is_veg: true },
  { name: 'Cafe Mocha', category: 'Hot Coffees', price: 179, is_veg: true },
  { name: 'Affogato', category: 'Hot Coffees', price: 189, is_veg: true },
  { name: 'Bullet Latte', category: 'Hot Coffees', price: 239, is_veg: true },
  { name: 'Hot Chocolate', category: 'Hot Beverages', price: 219, is_veg: true },

  // Iced and cold coffees
  { name: 'Iced Espresso', category: 'Iced Coffees', price: 109, is_veg: true },
  { name: 'Iced Americano', category: 'Iced Coffees', price: 149, is_veg: true },
  { name: 'Classic Iced Latte', category: 'Iced Coffees', price: 189, is_veg: true },
  { name: 'Iced Bullet Latte', category: 'Iced Coffees', price: 249, is_veg: true },
  { name: 'Classic Latte', category: 'Iced Coffees', price: 209, is_veg: true },
  { name: 'Caramel Latte', category: 'Iced Coffees', price: 249, is_veg: true },
  { name: 'Cinnamon Latte', category: 'Iced Coffees', price: 249, is_veg: true },
  { name: 'Iced Mocha', category: 'Iced Coffees', price: 219, is_veg: true },
  { name: 'Classic Cold Coffee', category: 'Cold Coffees', price: 219, is_veg: true },
  { name: 'Vanilla Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Caramel Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Hazelnut Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Vegan Cold Coffee', category: 'Cold Coffees', price: 249, is_veg: true },
  { name: 'Mocha Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Crunchy Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Nutty Cold Coffee', category: 'Cold Coffees', price: 259, is_veg: true },
  { name: 'Salted Caramel Cold Coffee', category: 'Cold Coffees', price: 249, is_veg: true },

  // Milkshakes and mocktails
  { name: 'Oreo Mania', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Nutella Shake', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Choco Loaded Brownie', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Strawberry Shake', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Crazy Kitkat', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Chocolate Crush', category: 'Milkshakes', price: 229, is_veg: true },
  { name: 'Mint Mojito', category: 'Mocktails', price: 209, is_veg: true },
  { name: 'Orange Mint', category: 'Mocktails', price: 209, is_veg: true },
  { name: 'Lychee Love', category: 'Mocktails', price: 229, is_veg: true },
  { name: 'Ginger Colada', category: 'Mocktails', price: 229, is_veg: true },
  { name: 'Jamun Kala Khatta', category: 'Mocktails', price: 229, is_veg: true },

  // Teas
  { name: 'Chai', category: 'Teas', price: 99, is_veg: true },
  { name: 'Natural Green Tea', category: 'Teas', price: 139, is_veg: true },
  { name: 'Detox Tea', category: 'Teas', price: 159, is_veg: true },
  { name: 'Rose Tea', category: 'Teas', price: 159, is_veg: true },
  { name: 'Lavender Chamomile Tea', category: 'Teas', price: 159, is_veg: true },
  { name: 'Peach Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Orange Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Honey Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Lemon Iced Tea', category: 'Teas', price: 209, is_veg: true },
  { name: 'Ginger Iced Tea', category: 'Teas', price: 209, is_veg: true },

  // Quick bites, wraps, pizza, desserts
  { name: 'Spinach Mais Triangolo', category: 'Quick Bites', price: 59, is_veg: true },
  { name: 'Malai Brocolli Puff', category: 'Quick Bites', price: 69, is_veg: true },
  { name: 'Mushroom Quiche', category: 'Quick Bites', price: 139, is_veg: true },
  { name: 'Grilled Paneer Hot Dog', category: 'Quick Bites', price: 199, is_veg: true },
  { name: 'Pesto Paneer Panini', category: 'Quick Bites', price: 199, is_veg: true },
  { name: 'Assorted Veg Sliders', category: 'Quick Bites', price: 199, is_veg: true },
  { name: 'Paneer Makhani Sub', category: 'Quick Bites', price: 209, is_veg: true },
  { name: 'Cheesy Mushroom', category: 'Quick Bites', price: 219, is_veg: true },
  { name: 'Chilli Paneer Sheermal', category: 'Quick Bites', price: 229, is_veg: true },
  { name: 'Saute Paneer Calzone', category: 'Quick Bites', price: 229, is_veg: true },
  { name: 'Chilli Chicken Puff', category: 'Quick Bites', price: 69, is_veg: false },
  { name: 'Chicken Triangolo', category: 'Quick Bites', price: 79, is_veg: false },
  { name: 'Chicken Keema Pav', category: 'Quick Bites', price: 149, is_veg: false },
  { name: 'Egg N Cheese Focassia', category: 'Quick Bites', price: 169, is_veg: false },
  { name: 'Tandori Chicken Hot Dog', category: 'Quick Bites', price: 219, is_veg: false },
  { name: 'Pesto Chicken Panini', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Assorted Chicken Sliders', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Spicy Pulled Chicken', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Cheesy Chicken Quiche', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Chicken Makhani Sub', category: 'Quick Bites', price: 229, is_veg: false },
  { name: 'Malabary Chicken', category: 'Quick Bites', price: 239, is_veg: false },
  { name: 'Chicken Burito', category: 'Quick Bites', price: 249, is_veg: false },
  { name: 'Garlic Chicken Brioche', category: 'Quick Bites', price: 269, is_veg: false },
  { name: 'Paneer Wrap', category: 'Wraps', price: 209, is_veg: true },
  { name: 'Chicken Wrap', category: 'Wraps', price: 219, is_veg: false },
  { name: 'Farm Fresh Pizza (2 Slices)', category: 'Pizza', price: 149, is_veg: true },
  { name: 'Peri Peri Chicken Pizza', category: 'Pizza', price: 169, is_veg: false },
  { name: 'Tres Leches', category: 'Desserts', price: 89, is_veg: true },
  { name: 'Chocolate Brownie', category: 'Desserts', price: 149, is_veg: true },
  { name: 'Caramel Tre-Strato', category: 'Desserts', price: 179, is_veg: true },
  { name: 'Chocolate Doughnuts', category: 'Desserts', price: 149, is_veg: false },
  { name: 'Red Velvet Brownie', category: 'Desserts', price: 159, is_veg: false },
  { name: 'Choco Tre-Strato Pastry', category: 'Desserts', price: 189, is_veg: false },
  { name: 'Blueberry Pastry', category: 'Desserts', price: 199, is_veg: false },
  { name: 'Almond Milk Tre-Strato', category: 'Desserts', price: 199, is_veg: false },
  { name: 'Almond Muffin', category: 'Muffins', price: 119, is_veg: true },
  { name: 'Chocolava Muffin', category: 'Muffins', price: 119, is_veg: true },
  { name: 'Oat Cookie', category: 'Cookies', price: 69, is_veg: false },
  { name: 'Chocochip Cookie', category: 'Cookies', price: 79, is_veg: false },
  { name: 'Toffee Caramel Cookie', category: 'Cookies', price: 89, is_veg: false },
  { name: 'Newyork Choco Chip Cookie', category: 'Cookies', price: 129, is_veg: false },
  { name: 'Double Dark Choco Cookie', category: 'Cookies', price: 129, is_veg: false },
  { name: 'Marble Cake', category: 'Dry Cakes', price: 129, is_veg: false },
  { name: 'White Chocolate Tea Cake', category: 'Dry Cakes', price: 129, is_veg: false },
  { name: 'Lemon Loaf', category: 'Dry Cakes', price: 139, is_veg: false },
  { name: 'Banana Walnut Cake', category: 'Dry Cakes', price: 149, is_veg: false },
]

function keyOfItem(item) {
  const name = String(item?.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
  const category = normalizeCategory(item?.category)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')

  return `${category}|${name}`
}

function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dishImageUrl(name, category, seed = '') {
  const query = [name, category, 'food', 'dish', 'restaurant']
    .filter(Boolean)
    .join(',')
  const safeSeed = String(seed || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)

  return `https://source.unsplash.com/640x480/?${encodeURIComponent(query)}${safeSeed ? `&sig=${safeSeed}` : ''}`
}

function toFallbackItem(item, index) {
  const slug = slugify(`${item.category}-${item.name}`)
  return {
    id: `fallback-${slug}-${index}`,
    name: item.name,
    description: 'House-crafted Qaffeine classic prepared fresh for every order.',
    price: item.price,
    category: item.category,
    is_veg: item.is_veg,
    image_url: dishImageUrl(item.name, item.category, slug),
    branch_id: null,
    is_available: true,
    source: 'fallback',
  }
}

function dedupeMenuItems(items) {
  const deduped = new Map()

  for (const item of items) {
    const key = keyOfItem(item)
    if (!key) continue

    const existing = deduped.get(key)
    if (!existing) {
      deduped.set(key, item)
      continue
    }

    // Prefer DB-backed row over fallback row. If same source, prefer one with image.
    const existingIsFallback = existing.source === 'fallback'
    const itemIsFallback = item.source === 'fallback'

    if (existingIsFallback && !itemIsFallback) {
      deduped.set(key, item)
      continue
    }

    if (existingIsFallback === itemIsFallback) {
      if (!existing.image_url && item.image_url) deduped.set(key, item)
    }
  }

  return Array.from(deduped.values())
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ''),
  )
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function normalizeCategory(value) {
  return value?.trim() || 'Others'
}

function parseTableQrPayload(rawValue) {
  const raw = String(rawValue || '').trim()
  if (!raw) return { table: '', branchId: '' }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw)
      return {
        table: String(parsed?.table || parsed?.tableNumber || '').trim(),
        branchId: String(parsed?.branch || parsed?.branchId || '').trim(),
      }
    } catch {
      // Continue with URL/plain parsing.
    }
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      const queryTable = String(url.searchParams.get('table') || '').trim()
      const queryBranch = String(url.searchParams.get('branch') || url.searchParams.get('branchId') || '').trim()
      const pathMatch = url.pathname.match(/\/table\/([^/?#]+)/i)
      const pathTable = String(pathMatch?.[1] || '').trim()

      return {
        table: decodeURIComponent(queryTable || pathTable),
        branchId: decodeURIComponent(queryBranch),
      }
    } catch {
      // Continue with plain parsing.
    }
  }

  const queryTableMatch = raw.match(/(?:\?|&)table=([^&#]+)/i)
  const queryBranchMatch = raw.match(/(?:\?|&)(?:branch|branchId)=([^&#]+)/i)
  if (queryTableMatch || queryBranchMatch) {
    return {
      table: queryTableMatch?.[1] ? decodeURIComponent(queryTableMatch[1]).trim() : '',
      branchId: queryBranchMatch?.[1] ? decodeURIComponent(queryBranchMatch[1]).trim() : '',
    }
  }

  return { table: raw, branchId: '' }
}

export default function MenuOrder() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const { tableNumber: routeTableNumber } = useParams()
  const localApiBase = String(import.meta.env.VITE_OTP_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '')
  const focusItemName = String(searchParams.get('focus') || '').trim()
  const branchFromQuery = String(searchParams.get('branch') || searchParams.get('branchId') || '').trim()

  const [menuItems, setMenuItems] = useState([])
  const [branches, setBranches] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOutlet, setSelectedOutlet] = useState('all')
  const [activeCategory, setActiveCategory] = useState('')
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [orderType, setOrderType] = useState('dine_in')
  const [checkoutOutlet, setCheckoutOutlet] = useState('')
  const [tableNumber, setTableNumber] = useState(searchParams.get('table') || routeTableNumber || '')
  const [paying, setPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [manualTableInput, setManualTableInput] = useState('')
  const [recentOrders, setRecentOrders] = useState([])
  const [historyError, setHistoryError] = useState('')
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [manualQrValue, setManualQrValue] = useState('')
  const [isScannerReady, setIsScannerReady] = useState(false)
  const videoRef = useRef(null)
  const scannerStreamRef = useRef(null)
  const scannerRafRef = useRef(null)

  const hasReceipt = Boolean(receipt?.orderId && receipt?.paidAt)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_RECEIPT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed?.orderId || !parsed?.paidAt) return

      const ageMs = Date.now() - new Date(parsed.paidAt).getTime()
      if (ageMs > 2 * 60 * 60 * 1000) return

      setReceipt(parsed)
      setCreatedOrderId(parsed.orderId)
      setPaymentSuccess(true)
    } catch {
      // Ignore invalid cached receipt payloads.
    }
  }, [])

  const branchNameMap = useMemo(() => {
    const map = new Map()
    for (const branch of branches) map.set(branch.id, branch.name)
    return map
  }, [branches])

  const customerName = useMemo(
    () => profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Customer',
    [profile?.full_name, user?.email, user?.user_metadata?.full_name, user?.user_metadata?.name],
  )

  useEffect(() => {
    if (routeTableNumber) {
      setTableNumber(routeTableNumber)
      setOrderType('table_order')
    }
  }, [routeTableNumber])

  useEffect(() => {
    if (searchParams.get('table')) {
      setOrderType('table_order')
    }
  }, [searchParams])

  useEffect(() => {
    if (!branchFromQuery || !branches.length) return
    if (!branches.some((branch) => branch.id === branchFromQuery)) return

    setSelectedOutlet(branchFromQuery)
    setCheckoutOutlet(branchFromQuery)
  }, [branchFromQuery, branches])

  useEffect(() => {
    let active = true

    const fetchData = async () => {
      setLoading(true)

      const [{ data: branchData, error: branchError }, { data: itemData, error: itemError }] = await Promise.all([
        supabase.from('branches').select('id, name, is_open').order('created_at', { ascending: true }),
        supabase
          .from('menu_items')
          .select('id, name, description, price, category, is_veg, image_url, branch_id, is_available')
          .order('created_at', { ascending: true }),
      ])

      if (!active) return

      if (branchError) {
        console.error('Unable to fetch branches:', branchError)
        toast.error('Could not load outlets.')
      }

      if (itemError) {
        console.error('Unable to fetch menu:', itemError)
        toast.error('Could not load menu items.')
      }

      const safeBranches = branchData ?? []
      const safeItems = (itemData ?? []).filter((item) => item.is_available !== false)
      const fallbackItems = imageMenuCatalog.map(toFallbackItem)

      // Merge DB items with image-derived catalog and remove duplicates.
      const mergedItems = dedupeMenuItems([
        ...safeItems.map((item) => ({ ...item, source: 'db' })),
        ...fallbackItems,
      ])

      setBranches(safeBranches)
      setMenuItems(mergedItems)

      const firstOutlet = safeBranches[0]?.id || ''
      setCheckoutOutlet((prev) => prev || firstOutlet)
      setLoading(false)
    }

    fetchData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let active = true

    const fetchRecentOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, branch_id')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      if (!active) return

      if (error) {
        console.error('Unable to fetch recent orders:', error)
        setHistoryError('Order history is currently unavailable.')
        setRecentOrders([])
        return
      }

      setHistoryError('')
      setRecentOrders(data || [])
    }

    fetchRecentOrders()

    return () => {
      active = false
    }
  }, [user?.id])

  const outletFilteredItems = useMemo(() => {
    if (selectedOutlet === 'all') return menuItems
    return menuItems.filter(
      (item) => item.branch_id === null || item.branch_id === selectedOutlet,
    )
  }, [menuItems, selectedOutlet])

  const searchFilteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return outletFilteredItems

    return outletFilteredItems.filter((item) => {
      const haystack = `${item.name || ''} ${item.description || ''} ${item.category || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [outletFilteredItems, searchQuery])

  const categoryCounts = useMemo(() => {
    const map = new Map()

    for (const item of outletFilteredItems) {
      const category = normalizeCategory(item.category)
      map.set(category, (map.get(category) || 0) + 1)
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [outletFilteredItems])

  const groupedItems = useMemo(() => {
    const map = new Map()

    for (const item of searchFilteredItems) {
      const category = normalizeCategory(item.category)
      if (!map.has(category)) map.set(category, [])
      map.get(category).push(item)
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [searchFilteredItems])

  useEffect(() => {
    if (!categoryCounts.length) {
      setActiveCategory('')
      return
    }

    const firstCategory = categoryCounts[0][0]
    setActiveCategory((prev) => prev || firstCategory)
  }, [categoryCounts])

  useEffect(() => {
    if (!focusItemName || !menuItems.length) return

    const match = menuItems.find((item) => String(item.name || '').toLowerCase() === focusItemName.toLowerCase())
    if (!match) return

    setSearchQuery(match.name)
    setActiveCategory(normalizeCategory(match.category))

    const id = window.setTimeout(() => {
      const card = document.querySelector(`[data-item-id="${match.id}"]`)
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)

    return () => window.clearTimeout(id)
  }, [focusItemName, menuItems])

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([itemId, quantity]) => {
        const item = menuItems.find((candidate) => candidate.id === itemId)
        if (!item || quantity <= 0) return null
        return {
          ...item,
          quantity,
        }
      })
      .filter(Boolean)
  }, [cart, menuItems])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0),
    [cartItems],
  )

  const gstAmount = useMemo(() => subtotal * 0.05, [subtotal])
  const packaging = cartItems.length ? 10 : 0
  const grandTotal = subtotal + gstAmount + packaging

  const increment = (itemId) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))
  }

  const decrement = (itemId) => {
    setCart((prev) => {
      const current = prev[itemId] || 0
      if (current <= 1) {
        const copy = { ...prev }
        delete copy[itemId]
        return copy
      }
      return { ...prev, [itemId]: current - 1 }
    })
  }

  const openCheckout = () => {
    if (!cartItems.length) {
      toast.error('Start adding items to continue.')
      return
    }

    const defaultOutlet = selectedOutlet !== 'all' ? selectedOutlet : branches[0]?.id || ''
    setCheckoutOutlet(defaultOutlet)
    setCheckoutStep(1)
    setPaymentSuccess(false)
    setCreatedOrderId('')
    setReceipt(null)
    sessionStorage.removeItem(LAST_RECEIPT_KEY)
    setIsCheckoutOpen(true)
  }

  const closeCheckout = () => {
    if (paying) return
    setIsCheckoutOpen(false)
  }

  const stopScanner = () => {
    if (scannerRafRef.current) {
      cancelAnimationFrame(scannerRafRef.current)
      scannerRafRef.current = null
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop())
      scannerStreamRef.current = null
    }

    if (videoRef.current) videoRef.current.srcObject = null
    setIsScannerReady(false)
  }

  const closeQrScanner = () => {
    stopScanner()
    setShowQrScanner(false)
  }

  const applyScannedQr = (rawValue) => {
    const payload = parseTableQrPayload(rawValue)
    const table = payload.table.trim()
    const branchId = payload.branchId.trim()

    if (!table) {
      setScannerError('QR does not include table information. Use a table QR code.')
      return
    }

    setTableNumber(table)
    setManualTableInput(table)
    setOrderType('table_order')

    if (branchId && branches.some((branch) => branch.id === branchId)) {
      setSelectedOutlet(branchId)
      setCheckoutOutlet(branchId)
    }

    closeQrScanner()
    toast.success(branchId ? `Table ${table} connected with branch context.` : `Table ${table} connected.`)
  }

  const canMoveFromStepOne = () => {
    if (!checkoutOutlet) return false

    if (orderType === 'takeaway') return true
    if (orderType === 'table_order') return tableNumber.trim().length > 0

    return tableNumber.trim().length > 0
  }

  const persistOrder = async (razorpayOrderId = null) => {
    const orderId = crypto.randomUUID()

    const payload = {
      id: orderId,
      customer_id: user?.id ?? null,
      branch_id: checkoutOutlet,
      order_type: orderType,
      table_number: orderType === 'takeaway' ? null : tableNumber.trim() || null,
      status: 'placed',
      total_amount: Number(grandTotal.toFixed(2)),
      payment_status: 'paid',
      razorpay_order_id: razorpayOrderId,
    }

    const rows = cartItems.map((item) => ({
      order_id: orderId,
      menu_item_id: isUuid(item.id) ? item.id : null,
      quantity: item.quantity,
      unit_price: item.price,
    }))

    const persistViaLocalApi = async () => {
      const response = await fetch(`${localApiBase}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: payload, items: rows }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok || body?.ok !== true) {
        throw new Error(body?.error || 'Unable to save order through local API')
      }

      return body?.id || orderId
    }

    const isRlsError = (error) => {
      const text = String(error?.message || '').toLowerCase()
      return error?.code === '42501' || text.includes('row-level security') || text.includes('permission denied')
    }

    const { error: orderError } = await supabase
      .from('orders')
      .insert(payload)

    if (orderError) {
      if (!isRlsError(orderError)) throw orderError
      return persistViaLocalApi()
    }

    const { error: orderItemsError } = await supabase.from('order_items').insert(rows)
    if (orderItemsError) {
      if (!isRlsError(orderItemsError)) throw orderItemsError
      return persistViaLocalApi()
    }

    return orderId
  }

  const handlePayment = async () => {
    setPaying(true)

    const key = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!key) {
      toast.error('Missing VITE_RAZORPAY_KEY_ID in .env')
      setPaying(false)
      return
    }

    const loaded = await loadRazorpayScript()
    if (!loaded) {
      toast.error('Unable to load Razorpay checkout script.')
      setPaying(false)
      return
    }

    const options = {
      key,
      amount: Math.round(grandTotal * 100),
      currency: 'INR',
      name: 'Qaffeine',
      description: 'Menu order payment',
      prefill: {
        name: profile?.full_name || user?.user_metadata?.full_name || '',
        email: user?.email || '',
        contact: profile?.phone || user?.phone || '',
      },
      theme: {
        color: '#C8853A',
      },
      handler: async (response) => {
        const baseReceiptPayload = {
          customerName,
          outletName: branchNameMap.get(checkoutOutlet) || 'Qaffeine Outlet',
          orderType,
          tableNumber: orderType === 'takeaway' ? null : tableNumber.trim() || null,
          items: cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: Number(item.price || 0),
          })),
          subtotal,
          gstAmount,
          packaging,
          total: grandTotal,
          paidAt: new Date().toISOString(),
        }

        try {
          const orderId = await persistOrder(response?.razorpay_order_id || null)
          const receiptPayload = { ...baseReceiptPayload, orderId, syncStatus: 'synced' }

          setReceipt(receiptPayload)
          setCreatedOrderId(orderId)
          setPaymentSuccess(true)
          setCheckoutStep(3)
          sessionStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(receiptPayload))
          setCart({})
          setRecentOrders((prev) => [
            {
              id: orderId,
              status: 'placed',
              total_amount: Number(grandTotal.toFixed(2)),
              created_at: new Date().toISOString(),
              branch_id: checkoutOutlet,
            },
            ...prev,
          ].slice(0, 6))
          toast.success('Order placed successfully!')
        } catch (error) {
          console.error('Order save failed:', error)
          const fallbackOrderId = `PAY-${Date.now().toString().slice(-8)}`
          const fallbackReceipt = { ...baseReceiptPayload, orderId: fallbackOrderId, syncStatus: 'pending' }

          setReceipt(fallbackReceipt)
          setCreatedOrderId(fallbackOrderId)
          setPaymentSuccess(true)
          setCheckoutStep(3)
          sessionStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(fallbackReceipt))
          setCart({})

          toast.error('Payment captured. Receipt generated, but order sync is pending. Please contact support with this receipt ID.')
        } finally {
          setPaying(false)
        }
      },
      modal: {
        ondismiss: () => {
          setPaying(false)
        },
      },
    }

    try {
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (error) {
      console.error('Razorpay open failed:', error)
      toast.error('Unable to initialize Razorpay checkout.')
      setPaying(false)
    }
  }

  const unlockWithManualTable = () => {
    const value = manualTableInput.trim()
    if (!value) {
      toast.error('Enter your table number to continue')
      return
    }

    setTableNumber(value)
    setOrderType('table_order')
    toast.success(`Table ${value} connected. Start ordering.`)
  }

  useEffect(() => {
    if (!showQrScanner) return undefined

    let active = true

    const start = async () => {
      setScannerError('')

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError('Camera API is unavailable. Paste QR value manually below.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        scannerStreamRef.current = stream
        if (!videoRef.current) return

        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsScannerReady(true)

        if (!('BarcodeDetector' in window)) {
          setScannerError('Auto QR detection is not supported here. Paste QR value manually.')
          return
        }

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })

        const detectFrame = async () => {
          if (!active || !videoRef.current) return

          try {
            const codes = await detector.detect(videoRef.current)
            const code = codes?.[0]
            if (code?.rawValue) {
              applyScannedQr(code.rawValue)
              return
            }
          } catch {
            // Continue scanning.
          }

          scannerRafRef.current = requestAnimationFrame(detectFrame)
        }

        scannerRafRef.current = requestAnimationFrame(detectFrame)
      } catch (error) {
        const message = String(error?.message || '').toLowerCase()
        if (message.includes('denied') || message.includes('notallowed')) {
          setScannerError('Camera permission denied. Allow camera access or paste QR value manually.')
          return
        }
        setScannerError('Unable to access camera. Paste QR value manually.')
      }
    }

    start()

    return () => {
      active = false
      stopScanner()
    }
  }, [showQrScanner, branches])

  if (!tableNumber) {
    return (
      <main className="menu-order-page gate-page">
        <section className="qr-gate-shell">
          <motion.div
            className="cup-scene"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="coffee-cup cup-a"><i /><span /></div>
            <div className="coffee-cup cup-b"><i /><span /></div>
            <div className="coffee-cup cup-c"><i /><span /></div>
          </motion.div>

          <motion.div
            className="qr-gate-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            <p className="chip">Dine-In Smart Ordering</p>
            <h1>Scan The Table QR To Start Your Order</h1>
            <p>
              For a production-grade in-cafe flow, we first bind this order to a table. This lets us auto-link customer details, table context, and live order tracking.
            </p>

            <div className="customer-context">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Phone:</strong> {profile?.phone || user?.phone || '--'}</p>
              <p><strong>Status:</strong> Authenticated and ready</p>
            </div>

            <div className="qr-actions">
              <button type="button" className="scan-btn" onClick={() => setShowQrScanner(true)}>
                <ScanLine size={15} /> Scan Table QR
              </button>
              <p>
                Recommended QR format: {window.location.origin}/menu-order?table=T12&amp;branch=&lt;branch-id&gt;
              </p>
            </div>

            <div className="manual-entry">
              <label htmlFor="table-manual">Enter table number manually (if QR is not scannable)</label>
              <input
                id="table-manual"
                value={manualTableInput}
                onChange={(event) => setManualTableInput(event.target.value)}
                placeholder="e.g. T12"
              />
              <button type="button" onClick={unlockWithManualTable}>Continue to Menu</button>
            </div>

            {showQrScanner ? (
              <div className="mo-qr-overlay" onClick={closeQrScanner}>
                <article className="mo-qr-modal" onClick={(event) => event.stopPropagation()}>
                  <header>
                    <h3><QrCode size={16} /> Scan Table QR</h3>
                    <button type="button" onClick={closeQrScanner} aria-label="Close scanner">
                      <X size={14} />
                    </button>
                  </header>

                  <div className="mo-qr-view">
                    <video ref={videoRef} muted playsInline autoPlay />
                    {!isScannerReady ? <p><Camera size={14} /> Initializing camera...</p> : null}
                  </div>

                  {scannerError ? <p className="mo-qr-error">{scannerError}</p> : null}

                  <label>
                    Manual QR payload
                    <input
                      type="text"
                      value={manualQrValue}
                      onChange={(event) => setManualQrValue(event.target.value)}
                      placeholder="Paste table QR value/URL"
                    />
                  </label>

                  <footer>
                    <button type="button" onClick={closeQrScanner}>Cancel</button>
                    <button
                      type="button"
                      className="next"
                      disabled={!manualQrValue.trim()}
                      onClick={() => applyScannedQr(manualQrValue)}
                    >
                      Use This QR
                    </button>
                  </footer>
                </article>
              </div>
            ) : null}
          </motion.div>
        </section>
      </main>
    )
  }

  return (
    <div className="menu-order-page">
      <div className="menu-order-shell">
        <aside className="mo-left-sidebar">
          <h2>Categories</h2>
          <ul>
            {categoryCounts.map(([category, count]) => (
              <li key={category}>
                <button
                  type="button"
                  className={activeCategory === category ? 'active' : ''}
                  onClick={() => {
                    setActiveCategory(category)
                    const section = document.getElementById(`cat-${category}`)
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span>{category}</span>
                  <strong>{count}</strong>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="mo-main-content">
          <div className="mo-toolbar">
            <label className="mo-search">
              <Search size={18} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search coffee, shakes, snacks..."
              />
            </label>

            <label className="mo-outlet-picker">
              <Store size={17} />
              <select
                value={selectedOutlet}
                onChange={(event) => setSelectedOutlet(event.target.value)}
              >
                <option value="all">All outlets</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? <p className="mo-info">Loading menu...</p> : null}
          {!loading && !groupedItems.length ? (
            <p className="mo-info">No items found for your filters.</p>
          ) : null}

          {groupedItems.map(([category, items]) => (
            <section key={category} id={`cat-${category}`} className="mo-category-section">
              <div className="mo-category-head">
                <h3>{category}</h3>
                <span>{items.length} items</span>
              </div>

              <div className="mo-item-list">
                {items.map((item) => {
                  const qty = cart[item.id] || 0
                  const rating = item.rating ?? 4.7
                  return (
                    <article key={item.id} className="mo-item-card" data-item-id={item.id}>
                      <div className="mo-item-left">
                        <div className="mo-item-headline">
                          <h4>{item.name}</h4>
                          <span className={`veg-dot ${item.is_veg ? 'veg' : 'non-veg'}`} />
                        </div>
                        <p>{item.description || 'Freshly prepared and served with Qaffeine signature style.'}</p>
                        <div className="mo-item-meta">
                          <strong>₹{Number(item.price || 0).toFixed(0)}</strong>
                          <span>
                            <Star size={14} /> {rating}
                          </span>
                        </div>
                      </div>

                      <div className="mo-item-right">
                        <img
                          src={item.image_url || dishImageUrl(item.name, item.category, item.id)}
                          alt={item.name}
                          onError={(event) => {
                            event.currentTarget.onerror = null
                            event.currentTarget.src = 'https://placehold.co/200x200/1c1108/f5edd6?text=Qaffeine'
                          }}
                        />

                        {qty === 0 ? (
                          <button type="button" onClick={() => increment(item.id)}>
                            Add
                          </button>
                        ) : (
                          <div className="mo-stepper">
                            <button type="button" onClick={() => decrement(item.id)}>
                              -
                            </button>
                            <span>{qty}</span>
                            <button type="button" onClick={() => increment(item.id)}>
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </main>

        <aside className="mo-cart-sidebar">
          <h2>Your Cart</h2>

          {!cartItems.length ? (
            <div className="mo-empty-cart">
              <div className="mo-empty-illustration">🛒</div>
              <p>Start adding items!</p>
            </div>
          ) : (
            <>
              <div className="mo-cart-items">
                {cartItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <h4>{item.name}</h4>
                      <p>₹{Number(item.price || 0).toFixed(0)} each</p>
                    </div>
                    <div className="mo-stepper compact">
                      <button type="button" onClick={() => decrement(item.id)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => increment(item.id)}>
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mo-bill">
                <div>
                  <span>Subtotal</span>
                  <strong>₹{subtotal.toFixed(2)}</strong>
                </div>
                <div>
                  <span>GST (5%)</span>
                  <strong>₹{gstAmount.toFixed(2)}</strong>
                </div>
                <div>
                  <span>Packaging</span>
                  <strong>₹{packaging.toFixed(2)}</strong>
                </div>
                <div className="total">
                  <span>Total</span>
                  <strong>₹{grandTotal.toFixed(2)}</strong>
                </div>
              </div>

              <button type="button" className="mo-checkout-btn" onClick={openCheckout}>
                Proceed to Checkout
              </button>
            </>
          )}

          <section className="mo-recent-orders">
            <div className="mo-recent-head">
              <h3>Recent Orders</h3>
              <Link to="/order-details">Open all</Link>
            </div>

            {historyError ? <p className="mo-recent-empty">{historyError}</p> : null}
            {!historyError && !recentOrders.length ? (
              <p className="mo-recent-empty">No orders yet.</p>
            ) : null}

            {!historyError && recentOrders.length ? (
              <div className="mo-recent-list">
                {recentOrders.map((row) => (
                  <article key={row.id}>
                    <div>
                      <strong>{row.id.slice(0, 8).toUpperCase()}</strong>
                      <p>{branchNameMap.get(row.branch_id) || 'Qaffeine Outlet'}</p>
                    </div>
                    <div>
                      <span className={`status ${row.status}`}>{row.status}</span>
                      <strong>₹{Number(row.total_amount || 0).toFixed(2)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      <AnimatePresence>
        {isCheckoutOpen ? (
          <motion.div
            className="mo-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mo-modal"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.28 }}
            >
              <button type="button" className="mo-close" onClick={closeCheckout}>
                <X size={16} />
              </button>

              <div className="mo-step-head">
                {checkoutSteps.map((label, index) => {
                  const indexStep = index + 1
                  return (
                    <div
                      key={label}
                      className={`dot ${checkoutStep >= indexStep ? 'active' : ''}`}
                    >
                      <span>{indexStep}</span>
                      <p>{label}</p>
                    </div>
                  )
                })}
              </div>

              {checkoutStep === 1 ? (
                <div className="mo-step-content">
                  <h3>Choose Order Type</h3>
                  <div className="mo-type-toggle">
                    <button
                      type="button"
                      className={orderType === 'dine_in' ? 'active' : ''}
                      onClick={() => setOrderType('dine_in')}
                    >
                      Dine-In
                    </button>
                    <button
                      type="button"
                      className={orderType === 'takeaway' ? 'active' : ''}
                      onClick={() => setOrderType('takeaway')}
                    >
                      Takeaway
                    </button>
                    <button
                      type="button"
                      className={orderType === 'table_order' ? 'active' : ''}
                      onClick={() => setOrderType('table_order')}
                    >
                      Table Order
                    </button>
                  </div>

                  <label>
                    Outlet
                    <select
                      value={checkoutOutlet}
                      onChange={(event) => setCheckoutOutlet(event.target.value)}
                    >
                      <option value="">Select outlet</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {orderType !== 'takeaway' ? (
                    <label>
                      Table Number
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={(event) => setTableNumber(event.target.value)}
                        placeholder="e.g. T12"
                        readOnly={orderType === 'table_order' && !!searchParams.get('table')}
                      />
                    </label>
                  ) : null}

                  <div className="mo-step-actions">
                    <button
                      type="button"
                      className="next"
                      disabled={!canMoveFromStepOne()}
                      onClick={() => setCheckoutStep(2)}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : null}

              {checkoutStep === 2 ? (
                <div className="mo-step-content">
                  <h3>Review Order Summary</h3>
                  <div className="mo-review-list">
                    {cartItems.map((item) => (
                      <div key={item.id}>
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <strong>₹{(Number(item.price || 0) * item.quantity).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="mo-review-bill">
                    <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
                    <p>GST (5%): ₹{gstAmount.toFixed(2)}</p>
                    <p>Packaging: ₹{packaging.toFixed(2)}</p>
                    <strong>Total: ₹{grandTotal.toFixed(2)}</strong>
                  </div>

                  <div className="mo-step-actions">
                    <button type="button" onClick={() => setCheckoutStep(1)}>
                      Back
                    </button>
                    <button type="button" className="next" onClick={() => setCheckoutStep(3)}>
                      Proceed to Pay
                    </button>
                  </div>
                </div>
              ) : null}

              {checkoutStep === 3 ? (
                <div className="mo-step-content">
                  {!paymentSuccess && !hasReceipt ? (
                    <>
                      <h3>Pay with Razorpay</h3>
                      <p className="muted">Secure checkout for your order total of ₹{grandTotal.toFixed(2)}.</p>
                      <div className="mo-step-actions">
                        <button type="button" onClick={() => setCheckoutStep(2)} disabled={paying}>
                          Back
                        </button>
                        <button type="button" className="next" onClick={handlePayment} disabled={paying}>
                          {paying ? 'Opening Razorpay...' : 'Pay Now'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <motion.div
                      className="mo-success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="mo-graffiti-layer" aria-hidden="true">
                        <motion.span
                          className="mo-graffiti-tag is-peach"
                          initial={{ opacity: 0, y: 10, rotate: -18 }}
                          animate={{ opacity: 1, y: 0, rotate: -12 }}
                          transition={{ delay: 0.08, duration: 0.35 }}
                        >
                          yay!
                        </motion.span>
                        <motion.span
                          className="mo-graffiti-tag is-mint"
                          initial={{ opacity: 0, y: 10, rotate: 20 }}
                          animate={{ opacity: 1, y: 0, rotate: 13 }}
                          transition={{ delay: 0.16, duration: 0.35 }}
                        >
                          brew mode
                        </motion.span>
                        <motion.span
                          className="mo-graffiti-tag is-cream"
                          initial={{ opacity: 0, y: 10, rotate: -8 }}
                          animate={{ opacity: 1, y: 0, rotate: -5 }}
                          transition={{ delay: 0.24, duration: 0.35 }}
                        >
                          paid
                        </motion.span>
                        <i className="mo-graffiti-dot dot-a" />
                        <i className="mo-graffiti-dot dot-b" />
                        <i className="mo-graffiti-dot dot-c" />
                      </div>

                      <div className="mo-success-head">
                        <div className="check">✓</div>
                        <h3>Payment Successful</h3>
                        <p>Your order is confirmed and has been sent to the kitchen.</p>
                      </div>

                      {receipt ? (
                        <article className="mo-receipt-card" aria-label="Order Receipt">
                          <header className="mo-receipt-head">
                            <div>
                              <p className="eyebrow">Qaffeine Coffee House</p>
                              <h4>Tax Invoice</h4>
                            </div>
                            <strong>#{createdOrderId.slice(0, 8).toUpperCase()}</strong>
                          </header>

                          <div className="mo-receipt-meta">
                            <span><b>Guest</b> {receipt.customerName || 'Walk-in Customer'}</span>
                            <span><b>Outlet</b> {receipt.outletName}</span>
                            <span><b>Order Type</b> {receipt.orderType.replace('_', ' ')}</span>
                            {receipt.tableNumber ? <span><b>Table</b> {receipt.tableNumber}</span> : null}
                            <span><b>Invoice Date</b> {new Date(receipt.paidAt).toLocaleString()}</span>
                            <span><b>Payment</b> Razorpay (UPI/Card/Netbanking)</span>
                          </div>

                          <div className="mo-receipt-lines" role="table" aria-label="Receipt line items">
                            <div className="mo-receipt-line-head" role="row">
                              <span role="columnheader">Item</span>
                              <span role="columnheader">Qty</span>
                              <span role="columnheader">Rate</span>
                              <strong role="columnheader">Amount</strong>
                            </div>
                            {receipt.items.map((item) => (
                              <div key={`${item.id}-${item.name}`} className="mo-receipt-line-row" role="row">
                                <span>{item.name}</span>
                                <span>{item.quantity}</span>
                                <span>₹{item.unitPrice.toFixed(2)}</span>
                                <strong>₹{(item.unitPrice * item.quantity).toFixed(2)}</strong>
                              </div>
                            ))}
                          </div>

                          <div className="mo-receipt-total">
                            <p><span>Subtotal</span><strong>₹{receipt.subtotal.toFixed(2)}</strong></p>
                            <p><span>GST (5%)</span><strong>₹{receipt.gstAmount.toFixed(2)}</strong></p>
                            <p><span>Packaging</span><strong>₹{receipt.packaging.toFixed(2)}</strong></p>
                            <p className="grand"><span>Total Paid</span><strong>₹{receipt.total.toFixed(2)}</strong></p>
                          </div>

                          {receipt.syncStatus === 'pending' ? (
                            <p className="mo-receipt-warning">
                              Sync pending: payment completed but server order write needs manual verification.
                            </p>
                          ) : null}

                          <footer className="mo-receipt-foot">
                            <p>Thank you for choosing Qaffeine. Keep this invoice for support and refunds.</p>
                          </footer>
                        </article>
                      ) : (
                        <strong>Order ID: {createdOrderId}</strong>
                      )}

                      <div className="mo-step-actions receipt-actions">
                        <button type="button" className="next" onClick={() => window.print()}>
                          Print Receipt
                        </button>
                        <Link className="next" to="/order-details" onClick={closeCheckout}>
                          View Orders
                        </Link>
                        <button type="button" onClick={closeCheckout}>
                          Done
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
