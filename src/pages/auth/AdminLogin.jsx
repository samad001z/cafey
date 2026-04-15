import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const INTRO_FORCE_KEY = 'qaffeine_intro_force'

function getAdminLoginHelp(error) {
  const message = String(error?.message || '').toLowerCase()
  if (message.includes('invalid login credentials')) {
    return 'Demo admin credentials are missing or incorrect. Run npm run bootstrap:users, then use owner@qaffeine.com / 12345678.'
  }
  if (message.includes('email not confirmed')) {
    return 'Admin email is not confirmed. Run npm run bootstrap:users to create a confirmed demo admin.'
  }
  return null
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const demoEmail = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'owner@qaffeine.com'
  const demoPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || '12345678'

  const [email, setEmail] = useState(demoEmail)
  const [password, setPassword] = useState(demoPassword)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password.trim(),
    })

    if (error) {
      toast.error(error.message)
      const help = getAdminLoginHelp(error)
      if (help) toast.error(help, { duration: 7000 })
      setLoading(false)
      return
    }

    toast.success('Owner access granted.')
    sessionStorage.setItem(INTRO_FORCE_KEY, '1')
    navigate('/admin', { replace: true })
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-simple">
        <p className="auth-logo auth-logo-inline">
          <Lock size={15} /> Owner Access
        </p>
        <h1 className="auth-heading">Qaffeine Control Room</h1>
        <p className="auth-tagline">Sign in with admin credentials or use demo mode for testing.</p>

        <div className="auth-mini-note">
          Production tip: keep demo credentials only in local/dev environment variables.
        </div>

        <button
          type="button"
          className="auth-btn auth-btn-ghost"
          onClick={() => {
            setEmail(demoEmail)
            setPassword(demoPassword)
            toast.success('Demo admin credentials pre-filled')
          }}
        >
          Use Demo Login
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
        </form>

        <p className="auth-mode-note">Demo Email: {demoEmail}</p>
        <p className="auth-mode-note">Demo Password: {demoPassword}</p>

        <p className="portal-links">
          <Link to="/login">Customer? Login here</Link>
          <span>|</span>
          <Link to="/staff/login">Staff? Login here</Link>
        </p>
      </section>
    </main>
  )
}
