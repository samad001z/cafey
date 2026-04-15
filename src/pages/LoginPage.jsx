import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <section className="auth-page">
      <h1>Customer Login</h1>
      <p>Sign in with Supabase Auth to place and track your orders.</p>
      <Link className="action primary" to="/customer/home">
        Continue as Demo Customer
      </Link>
      <Link className="action" to="/">
        Back to Home
      </Link>
    </section>
  )
}
