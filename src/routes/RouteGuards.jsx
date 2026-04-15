import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function GuardLoader() {
  return <div className="guard-loader">Checking account access...</div>
}

export function CustomerRoute({ children }) {
  const { role, loading } = useAuth()

  if (loading) return <GuardLoader />
  if (role !== 'customer') return <Navigate to="/login" replace />

  return children
}

export function StaffRoute({ children }) {
  const { role, loading } = useAuth()

  if (loading) return <GuardLoader />
  if (role !== 'staff') return <Navigate to="/staff/login" replace />

  return children
}

export function AdminRoute({ children }) {
  const { role, loading } = useAuth()

  if (loading) return <GuardLoader />
  if (role !== 'admin') return <Navigate to="/admin/login" replace />

  return children
}
