import { Link } from 'react-router-dom'

export default function AdminLoginPage() {
  return (
    <section className="auth-page">
      <h1>Admin Login</h1>
      <p>Access branch controls, staffing, and sales operations.</p>
      <Link className="action primary" to="/admin/console">
        Continue as Demo Admin
      </Link>
      <Link className="action" to="/">
        Back to Home
      </Link>
    </section>
  )
}
