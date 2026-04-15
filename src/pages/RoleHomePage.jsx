import { useAuth } from '../context/AuthContext'

export default function RoleHomePage({ title, description }) {
  const { user, role, signOut } = useAuth()

  return (
    <section className="auth-page">
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="meta">Signed in role: {role ?? 'unknown'}</p>
      <p className="meta">User id: {user?.id ?? 'no session'}</p>
      <button
        className="action"
        type="button"
        onClick={() => {
          signOut().catch((error) => {
            console.error('Sign out failed:', error)
          })
        }}
      >
        Sign Out
      </button>
    </section>
  )
}
