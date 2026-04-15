import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const INTRO_FORCE_KEY = 'qaffeine_intro_force'

export default function StaffLogin() {
  const navigate = useNavigate()
  const demoEmployeeId = import.meta.env.VITE_DEMO_STAFF_EMPLOYEE_ID || 'EMP-1001'
  const demoPassword = import.meta.env.VITE_DEMO_STAFF_PASSWORD || '12345678'
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    const normalizedEmployeeId = employeeId.trim().toLowerCase()
    const email = `${normalizedEmployeeId}@qaffeine.internal`
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password.trim(),
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Welcome back, staff.')
    sessionStorage.setItem(INTRO_FORCE_KEY, '1')
    navigate('/staff/dashboard', { replace: true })
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-simple">
        <p className="auth-logo">Staff Portal</p>
        <h1 className="auth-heading">Qaffeine Operations</h1>
        <p className="auth-tagline">Use your employee credentials to continue.</p>

        <button
          type="button"
          className="auth-btn auth-btn-ghost"
          onClick={() => {
            setEmployeeId(demoEmployeeId)
            setPassword(demoPassword)
            toast.success('Demo staff credentials pre-filled')
          }}
        >
          Use Demo Staff Login
        </button>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="employee-id">Employee ID</label>
          <input
            id="employee-id"
            type="text"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            placeholder="EMP-1001"
            autoComplete="username"
            required
          />

          <label htmlFor="staff-password">Password</label>
          <input
            id="staff-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Login as Staff'}
          </button>
        </form>

        <p className="auth-mode-note">Demo Employee ID: {demoEmployeeId}</p>
        <p className="auth-mode-note">Demo Password: {demoPassword}</p>

        <p className="portal-links">
          <Link to="/login">Customer? Login here</Link>
          <span>|</span>
          <Link to="/admin/login">Admin? Login here</Link>
        </p>
      </section>
    </main>
  )
}
