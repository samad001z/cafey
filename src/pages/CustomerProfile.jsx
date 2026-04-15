import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Coffee, LogOut, ReceiptText, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './CustomerProfile.css'

function formatDateTime(value) {
  if (!value) return '--'
  return new Date(value).toLocaleString()
}

export default function CustomerProfile() {
  const { user, profile, role, signOut } = useAuth()
  const [recentOrders, setRecentOrders] = useState([])
  const [upcomingReservations, setUpcomingReservations] = useState([])

  const fullName = useMemo(() => {
    return profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Customer'
  }, [profile?.full_name, user?.user_metadata?.full_name, user?.user_metadata?.name])

  useEffect(() => {
    if (!user?.id) return

    let active = true

    const loadDashboardData = async () => {
      const [ordersResp, reservationsResp] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, total_amount, created_at, order_type')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('reservations')
          .select('id, date, time_slot, status, party_size, ref_code')
          .eq('customer_id', user.id)
          .gte('date', new Date().toISOString().slice(0, 10))
          .order('date', { ascending: true })
          .limit(4),
      ])

      if (!active) return

      if (ordersResp.error) {
        console.error('Unable to load orders:', ordersResp.error)
        toast.error('Could not load recent orders')
      } else {
        setRecentOrders(ordersResp.data || [])
      }

      if (reservationsResp.error) {
        console.error('Unable to load reservations:', reservationsResp.error)
      } else {
        setUpcomingReservations(reservationsResp.data || [])
      }
    }

    loadDashboardData()

    return () => {
      active = false
    }
  }, [user?.id])

  const activeOrdersCount = useMemo(
    () => recentOrders.filter((row) => !['completed', 'cancelled'].includes(row.status)).length,
    [recentOrders],
  )

  const lifetimeSpend = useMemo(
    () => recentOrders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    [recentOrders],
  )

  return (
    <main className="customer-dashboard-page">
      <section className="customer-shell">
        <header className="customer-head">
          <div className="identity">
            <span className="avatar"><UserRound size={20} /></span>
            <div>
              <h1>{fullName}</h1>
              <p>{user?.email || '--'} · {role || 'customer'}</p>
            </div>
          </div>

          <div className="head-actions">
            <Link className="cta" to="/menu-order"><Coffee size={16} /> New Order</Link>
            <Link className="cta ghost" to="/reservations"><CalendarDays size={16} /> Reserve</Link>
            <button
              className="cta ghost"
              type="button"
              onClick={() => {
                signOut().catch((error) => {
                  console.error('Sign out failed:', error)
                })
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <section className="metrics-row">
          <article>
            <h3>Active Orders</h3>
            <strong>{activeOrdersCount}</strong>
          </article>
          <article>
            <h3>Recent Spend</h3>
            <strong>₹{lifetimeSpend.toFixed(2)}</strong>
          </article>
          <article>
            <h3>Upcoming Reservations</h3>
            <strong>{upcomingReservations.length}</strong>
          </article>
          <article>
            <h3>Joined</h3>
            <strong>{new Date(profile?.created_at || user?.created_at || Date.now()).toLocaleDateString()}</strong>
          </article>
        </section>

        <section className="details-grid">
          <article className="panel">
            <h2><ReceiptText size={17} /> Recent Orders</h2>
            {!recentOrders.length ? <p className="empty">No orders yet.</p> : null}
            {recentOrders.length ? (
              <div className="list">
                {recentOrders.map((row) => (
                  <div key={row.id} className="list-row">
                    <div>
                      <strong>#{row.id.slice(0, 8).toUpperCase()}</strong>
                      <p>{formatDateTime(row.created_at)} · {row.order_type || 'order'}</p>
                    </div>
                    <div>
                      <span className={`status ${row.status}`}>{row.status}</span>
                      <b>₹{Number(row.total_amount || 0).toFixed(2)}</b>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          <article className="panel">
            <h2><CalendarDays size={17} /> Reservations</h2>
            {!upcomingReservations.length ? <p className="empty">No upcoming reservations.</p> : null}
            {upcomingReservations.length ? (
              <div className="list">
                {upcomingReservations.map((row) => (
                  <div key={row.id} className="list-row">
                    <div>
                      <strong>{row.ref_code || row.id.slice(0, 8)}</strong>
                      <p>{row.date} · {row.time_slot || '--'} · {row.party_size || 1} guests</p>
                    </div>
                    <span className={`status ${row.status}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="account-details">
              <h3>Account Details</h3>
              <p><span>Name</span><strong>{fullName}</strong></p>
              <p><span>Email</span><strong>{user?.email || '--'}</strong></p>
              <p><span>Phone</span><strong>{profile?.phone || user?.phone || '--'}</strong></p>
              <p><span>Member Since</span><strong>{formatDateTime(profile?.created_at || user?.created_at)}</strong></p>
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}
