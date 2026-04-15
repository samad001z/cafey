import { Link } from 'react-router-dom'

export default function StaffLoginPage() {
  return (
    <section className="auth-page">
      <h1>Staff Login</h1>
      <p>Use your staff account to manage orders and attendance.</p>
      <Link className="action primary" to="/staff/console">
        Continue as Demo Staff
      </Link>
      <Link className="action" to="/">
        Back to Home
      </Link>
    </section>
  )
}
