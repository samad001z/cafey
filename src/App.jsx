import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import MenuOrder from './pages/MenuOrder'
import Reservations from './pages/Reservations'
import OrderDetails from './pages/OrderDetails'
import CustomerProfile from './pages/CustomerProfile'
import CustomerLogin from './pages/auth/CustomerLogin'
import StaffLogin from './pages/auth/StaffLogin'
import AdminLogin from './pages/auth/AdminLogin'
import AdminDashboard from './pages/admin/Dashboard'
import StaffDashboard from './pages/staff/Dashboard'
import { AdminRoute, CustomerRoute, StaffRoute } from './routes/RouteGuards'
import { useAuth } from './context/AuthContext'

const INTRO_SEEN_KEY = 'qaffeine_intro_seen'
const INTRO_FORCE_KEY = 'qaffeine_intro_force'

function IntroScreen() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0f0a06',
        color: '#f5edd6',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', display: 'grid', gap: 8, justifyItems: 'center' }}>
        <div
          style={{
            width: 44,
            height: 44,
            border: '3px solid rgba(200,133,58,0.24)',
            borderTopColor: '#c8853a',
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <h2
          style={{
            margin: 0,
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(1.4rem, 3vw, 2.1rem)',
            letterSpacing: '0.02em',
          }}
        >
          Welcome to Qaffeine
        </h2>
        <p style={{ margin: 0, color: '#8a7560' }}>Brewing every order into a premium cafe experience.</p>
      </div>
    </main>
  )
}

function SessionLoadingScreen() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0f0a06',
        color: '#f5edd6',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <p style={{ margin: 0, color: '#8a7560' }}>Restoring your session...</p>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="auth-page">
      <h1>404</h1>
      <p>The page you are looking for does not exist.</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link className="action primary" to="/">
          Back to Home
        </Link>
        <Link className="action" to="/menu">
          Go to Menu
        </Link>
      </div>
    </main>
  )
}

function App() {
  const { loading } = useAuth()
  const location = useLocation()
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false
    const seen = sessionStorage.getItem(INTRO_SEEN_KEY) === '1'
    const force = sessionStorage.getItem(INTRO_FORCE_KEY) === '1'
    return force || !seen
  })

  useEffect(() => {
    if (!showIntro) return

    const id = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1')
      sessionStorage.removeItem(INTRO_FORCE_KEY)
      setShowIntro(false)
    }, 1800)

    return () => window.clearTimeout(id)
  }, [showIntro])

  useEffect(() => {
    if (showIntro) return
    if (sessionStorage.getItem(INTRO_FORCE_KEY) === '1') {
      setShowIntro(true)
    }
  }, [location.pathname, showIntro])

  if (showIntro) return <IntroScreen />
  if (loading) return <SessionLoadingScreen />

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/menu"
        element={
          <CustomerRoute>
            <MenuOrder />
          </CustomerRoute>
        }
      />
      <Route
        path="/menu-order"
        element={
          <CustomerRoute>
            <MenuOrder />
          </CustomerRoute>
        }
      />
      <Route path="/reservations" element={<Reservations />} />
      <Route path="/order-details" element={<OrderDetails />} />
      <Route
        path="/table/:tableNumber"
        element={
          <CustomerRoute>
            <MenuOrder />
          </CustomerRoute>
        }
      />
      <Route path="/login" element={<CustomerLogin />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/profile"
        element={
          <CustomerRoute>
            <CustomerProfile />
          </CustomerRoute>
        }
      />

      <Route
        path="/staff/dashboard"
        element={
          <StaffRoute>
            <StaffDashboard />
          </StaffRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
