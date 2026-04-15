import { motion } from 'framer-motion'
import { Coffee, MapPin, ShieldCheck, UserRound } from 'lucide-react'
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
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="chip">Cafe + Kitchen + Bistro</p>
          <h1>Qaffeine Hyderabad</h1>
          <p className="lead">
            A multi-branch cafe experience with table ordering, quick takeaway,
            and role-based operations for staff and admins.
          </p>
        </motion.div>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
        >
          <Link className="action primary" to="/login">
            <UserRound size={16} /> Customer Access
          </Link>
          <Link className="action" to="/staff/login">
            <ShieldCheck size={16} /> Staff Access
          </Link>
          <Link className="action" to="/admin/login">
            <ShieldCheck size={16} /> Admin Access
          </Link>
        </motion.div>
      </section>

      <section className="branch-panel">
        <div className="panel-header">
          <Coffee size={18} />
          <h2>Live Branch Network</h2>
        </div>
        <ul className="branch-list">
          {branches.map((branch, index) => (
            <motion.li
              key={branch}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <MapPin size={14} /> {branch}
            </motion.li>
          ))}
        </ul>
      </section>
    </main>
  )
}
