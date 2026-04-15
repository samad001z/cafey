import { useEffect, useMemo, useState } from 'react'
import DatePicker from 'react-datepicker'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Check, Clock3, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import 'react-datepicker/dist/react-datepicker.css'
import './Reservations.css'

const FULL_SLOT_LIMIT = 5

function formatSlot(totalMinutes) {
  const hour24 = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  const mm = String(minutes).padStart(2, '0')
  return `${hour12}:${mm} ${ampm}`
}

const allSlots = Array.from({ length: ((22 - 11) * 60) / 30 + 1 }).map((_, index) => {
  const minutes = 11 * 60 + index * 30
  return formatSlot(minutes)
})

export default function Reservations() {
  const { user, profile } = useAuth()

  const [step, setStep] = useState(1)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState('')
  const [partySize, setPartySize] = useState(2)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  const [slotCounts, setSlotCounts] = useState({})
  const [saving, setSaving] = useState(false)
  const [successReservation, setSuccessReservation] = useState(null)

  const selectedDateKey = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(selectedDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [selectedDate])

  useEffect(() => {
    let active = true

    const run = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, address, is_open')
        .order('created_at', { ascending: true })

      if (!active) return

      if (error) {
        console.error('Failed to fetch branches:', error)
        toast.error('Could not load outlets')
        setLoading(false)
        return
      }

      setBranches(data || [])
      setSelectedBranch((prev) => prev || data?.[0]?.id || '')
      setLoading(false)
    }

    run()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedBranch || !selectedDateKey) return

    let active = true

    const fetchConflicts = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('time_slot, status')
        .eq('branch_id', selectedBranch)
        .eq('date', selectedDateKey)
        .in('status', ['pending', 'confirmed'])

      if (!active) return

      if (error) {
        console.error('Failed to fetch slot conflicts:', error)
        toast.error('Unable to load slot availability')
        return
      }

      const counts = {}
      for (const row of data || []) {
        if (!row.time_slot) continue
        counts[row.time_slot] = (counts[row.time_slot] || 0) + 1
      }

      setSlotCounts(counts)

      if (selectedSlot && (counts[selectedSlot] || 0) >= FULL_SLOT_LIMIT) {
        setSelectedSlot('')
      }
    }

    fetchConflicts()

    return () => {
      active = false
    }
  }, [selectedBranch, selectedDateKey, selectedSlot])

  useEffect(() => {
    if (!profile && !user) return
    if (!name) setName(profile?.full_name || user?.user_metadata?.full_name || '')
    if (!phone) setPhone(profile?.phone || user?.phone || '')
  }, [name, phone, profile, user])

  const selectedBranchObj = branches.find((branch) => branch.id === selectedBranch)

  const canContinueStep1 = !!selectedBranch
  const canContinueStep2 = !!selectedDate && !!selectedSlot && partySize >= 1 && partySize <= 12
  const canContinueStep3 = name.trim().length > 1 && phone.trim().length >= 8

  const submitReservation = async () => {
    if (!canContinueStep3) return

    setSaving(true)

    const payload = {
      customer_id: user?.id ?? null,
      branch_id: selectedBranch,
      date: selectedDateKey,
      time_slot: selectedSlot,
      party_size: partySize,
      customer_name: name.trim(),
      phone: phone.trim(),
      special_requests: specialRequests.trim() || null,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert(payload)
      .select('id, ref_code, date, time_slot, party_size')
      .single()

    setSaving(false)

    if (error) {
      console.error('Reservation insert failed:', error)
      toast.error(error.message || 'Failed to create reservation')
      return
    }

    setSuccessReservation(data)
    setStep(4)
    toast.success('Reservation confirmed!')
  }

  if (loading) {
    return <main className="reservations-page"><p className="res-loading">Loading reservations...</p></main>
  }

  return (
    <main className="reservations-page">
      <section className="res-shell">
        <header className="res-head">
          <h1>Reserve Your Table</h1>
          <p>Book your Qaffeine experience in 4 quick steps.</p>
          <div className="res-steps">
            {[1, 2, 3, 4].map((value) => (
              <span key={value} className={step >= value ? 'active' : ''}>Step {value}</span>
            ))}
          </div>
        </header>

        {step === 1 ? (
          <section className="res-step">
            <h2>Step 1: Choose Outlet</h2>
            <div className="res-branch-grid">
              {branches.map((branch) => {
                const active = selectedBranch === branch.id
                return (
                  <button
                    key={branch.id}
                    type="button"
                    className={`res-branch-card ${active ? 'active' : ''}`}
                    onClick={() => setSelectedBranch(branch.id)}
                  >
                    <div>
                      <h3>{branch.name}</h3>
                      <p>{branch.address || 'Hyderabad'}</p>
                    </div>
                    {active ? <Check size={18} /> : null}
                  </button>
                )
              })}
            </div>
            <div className="res-actions">
              <button type="button" className="next" disabled={!canContinueStep1} onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="res-step">
            <h2>Step 2: Date, Slot & Party Size</h2>
            <div className="res-grid-two">
              <div className="picker-block">
                <label>Date</label>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => date && setSelectedDate(date)}
                  minDate={new Date()}
                  inline
                  calendarClassName="qf-datepicker"
                />
              </div>

              <div className="slot-block">
                <label><Clock3 size={16} /> Time Slot</label>
                <div className="res-slots">
                  {allSlots.map((slot) => {
                    const isFull = (slotCounts[slot] || 0) >= FULL_SLOT_LIMIT
                    const active = slot === selectedSlot
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`${active ? 'active' : ''}`}
                        disabled={isFull}
                        onClick={() => setSelectedSlot(slot)}
                        title={isFull ? 'Slot full' : slot}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>

                <label className="party-label"><Users size={16} /> Party Size</label>
                <select value={partySize} onChange={(event) => setPartySize(Number(event.target.value))}>
                  {Array.from({ length: 12 }).map((_, index) => {
                    const count = index + 1
                    return (
                      <option key={count} value={count}>
                        {count} {count === 1 ? 'Person' : 'People'}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            <div className="res-actions">
              <button type="button" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="next" disabled={!canContinueStep2} onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="res-step">
            <h2>Step 3: Your Details</h2>
            <div className="res-form">
              <label>
                Name
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
              </label>
              <label>
                Phone
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 9876543210" />
              </label>
              <label>
                Special Requests
                <textarea
                  value={specialRequests}
                  onChange={(event) => setSpecialRequests(event.target.value)}
                  placeholder="Birthday setup, window seat, less sugar, etc."
                  rows={4}
                />
              </label>
            </div>

            <div className="res-actions">
              <button type="button" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="next" disabled={!canContinueStep3 || saving} onClick={submitReservation}>
                {saving ? 'Saving...' : 'Confirm Reservation'}
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <motion.section
            className="res-step res-success"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="check">✓</div>
            <h2>Reservation Confirmed</h2>
            <p>Your table has been reserved successfully.</p>

            <div className="res-summary">
              <p><strong>Outlet:</strong> {selectedBranchObj?.name}</p>
              <p><strong>Date:</strong> {selectedDateKey}</p>
              <p><strong>Time:</strong> {successReservation?.time_slot}</p>
              <p><strong>Party Size:</strong> {successReservation?.party_size}</p>
              <p><strong>Reference:</strong> {successReservation?.ref_code || 'QF-XXXXXX'}</p>
            </div>
          </motion.section>
        ) : null}
      </section>
    </main>
  )
}
