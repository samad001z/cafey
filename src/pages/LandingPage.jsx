import { Coffee, MapPin, ShieldCheck, Sparkles, Timer, TrendingUp, UserRound, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

const branches = [
  'Centaurus by Phoenix',
  'My Home Bhooja',
  'Moosarambagh',
  'Secunderabad',
  'GVK One Mall',
  'Yashoda Hospitals Hitech City',
  'Qaffeine Bistro',
]

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="hero-panel">
        <div>
          <p className="chip"><Sparkles size={13} /> Cafe + Kitchen + Bistro</p>
          <h1>Qaffeine Hyderabad</h1>
          <p className="lead">
            A modern cafe operating platform for customer ordering, staff execution,
            and admin oversight across every outlet.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="action primary" to="/login">
            <UserRound size={16} /> Customer Access
          </Link>
          <Link className="action" to="/staff/login">
            <ShieldCheck size={16} /> Staff Access
          </Link>
          <Link className="action" to="/admin/login">
            <ShieldCheck size={16} /> Admin Access
          </Link>
        </div>

        <div className="hero-highlights">
          <article>
            <Timer size={16} />
            <div>
              <strong>Under 60s Ordering</strong>
              <p>Fast browse-to-checkout flow for walk-ins and table guests.</p>
            </div>
          </article>
          <article>
            <TrendingUp size={16} />
            <div>
              <strong>Real-time Ops Visibility</strong>
              <p>Kitchen, order status, and shift data available live.</p>
            </div>
          </article>
          <article>
            <Zap size={16} />
            <div>
              <strong>Production-ready Workflows</strong>
              <p>Built for daily branch operations, not just demo screens.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="branch-panel">
        <div className="panel-header">
          <Coffee size={18} />
          <h2>Live Branch Network</h2>
        </div>
        <p className="branch-intro">Currently operating across major Hyderabad hotspots.</p>
        <ul className="branch-list">
          {branches.map((branch) => (
            <li key={branch}>
              <MapPin size={14} /> {branch}
            </li>
          ))}
        </ul>

        <div className="branch-stats">
          <article>
            <p>Outlets</p>
            <strong>{branches.length}</strong>
          </article>
          <article>
            <p>Core Modules</p>
            <strong>Customer, Staff, Admin</strong>
          </article>
        </div>
      </section>

      <section className="proof-panel">
        <h2>Built For Real Cafe Operations</h2>
        <p>From reservations to KDS and shift attendance, every flow is designed for speed and reliability.</p>
        <div>
          <Link className="action primary" to="/login">Launch Customer Journey</Link>
          <Link className="action" to="/staff/login">Open Staff Workspace</Link>
        </div>
      </section>
    </main>
  )
}
