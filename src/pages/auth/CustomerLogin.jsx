import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LoaderCircle, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { buildApiUrl, resolveApiBase } from '../../lib/apiBase'
import { useAuth } from '../../context/AuthContext'

const INTRO_FORCE_KEY = 'qaffeine_intro_force'
const RESEND_COOLDOWN_SECONDS = 30
const otpProvider = String(import.meta.env.VITE_OTP_PROVIDER || 'supabase').toLowerCase()
const otpApiBase = resolveApiBase(import.meta.env.VITE_OTP_API_BASE_URL)
const buildOtpApiUrl = (path) => buildApiUrl(path, import.meta.env.VITE_OTP_API_BASE_URL)

function normalizedPhone(value) {
  return String(value || '').replace(/[^0-9+]/g, '')
}

function toE164(value) {
  const clean = normalizedPhone(value)
  if (!clean) return ''
  if (clean.startsWith('+')) return clean
  if (/^91\d{10}$/.test(clean)) return `+${clean}`
  if (/^\d{10}$/.test(clean)) return `+91${clean}`
  return clean
}

function getOAuthErrorHelp(errorMessage) {
  const text = String(errorMessage || '').toLowerCase()
  if (text.includes('provider is not enabled') || text.includes('unsupported provider')) {
    return 'Enable Google provider in Supabase Auth > Providers, then add redirect URL: ' + `${window.location.origin}/login`
  }
  if (text.includes('redirect') || text.includes('callback')) {
    return 'Add this exact redirect URL in Supabase and Google Console: ' + `${window.location.origin}/login`
  }
  return null
}

function getOtpErrorHelp(errorMessage) {
  const text = String(errorMessage || '').toLowerCase()
  if (text.includes('unsupported phone provider') || text.includes('provider is not enabled')) {
    return 'Phone OTP is disabled in Supabase. Either enable Twilio in Supabase Auth > Phone, or set VITE_OTP_PROVIDER=twilio and run npm run app.'
  }
  if (text.includes('failed to fetch')) {
    return 'OTP server is not reachable. Start full stack with npm run app.'
  }
  return null
}

function isOtpExpiredError(errorMessage) {
  const text = String(errorMessage || '').toLowerCase()
  return (
    text.includes('expired') ||
    text.includes('max check attempts reached') ||
    text.includes('verification code has expired') ||
    text.includes('token has expired')
  )
}

async function upsertCustomerProfile(userId, phone) {
  if (!userId) throw new Error('Missing authenticated user id')

  const payload = {
    id: userId,
    role: 'customer',
  }

  if (phone) payload.phone = phone

  const { error } = await supabase.from('profiles').upsert(payload)
  if (error) throw error
}

export default function CustomerLogin() {
  const navigate = useNavigate()
  const { user, role, loading: authLoading } = useAuth()

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [provisioningRole, setProvisioningRole] = useState(false)
  const [otpModeUsed, setOtpModeUsed] = useState(otpProvider)
  const [roleProvisionAttempted, setRoleProvisionAttempted] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return undefined

    const timerId = window.setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearTimeout(timerId)
  }, [resendCooldown])

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    if (role === 'customer') {
      navigate('/', { replace: true })
      return
    }

    if (!role && !roleProvisionAttempted) {
      if (provisioningRole) return
      setProvisioningRole(true)

      upsertCustomerProfile(user.id, user.phone)
        .then(() => navigate('/', { replace: true }))
        .catch((error) => {
          console.error('Unable to assign customer role:', error)
          const isRlsError = error?.code === '42501' || String(error?.message || '').toLowerCase().includes('row-level security')
          toast.error(
            isRlsError
              ? 'Profile write blocked by Supabase RLS. Run the profiles policy SQL once.'
              : 'Login succeeded, but role setup failed. Please retry.',
          )
          setRoleProvisionAttempted(true)
        })
        .finally(() => {
          setProvisioningRole(false)
        })
    }
  }, [authLoading, navigate, provisioningRole, role, roleProvisionAttempted, user])

  const handleGoogleSignIn = async () => {
    if (submitting) return
    setSubmitting(true)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      toast.error(error.message)
      const help = getOAuthErrorHelp(error.message)
      if (help) toast.error(help, { duration: 7000 })
      setSubmitting(false)
      return
    }

    if (data?.url) {
      sessionStorage.setItem(INTRO_FORCE_KEY, '1')
      window.location.assign(data.url)
      return
    }

    toast.error('Google sign-in did not return a redirect URL. Check Google provider setup in Supabase.')
    setSubmitting(false)
  }

  const handleGuestLogin = async () => {
    setSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw error

      await upsertCustomerProfile(data?.user?.id, null)
      toast.success('Signed in with demo guest mode')
      sessionStorage.setItem(INTRO_FORCE_KEY, '1')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error.message || 'Unable to continue as guest')
    } finally {
      setSubmitting(false)
    }
  }

  const sendTwilioOtp = async (cleanPhone) => {
    const response = await fetch(buildOtpApiUrl('/api/otp/send'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.ok !== true) {
      throw new Error(payload?.error || 'Failed to send Twilio OTP')
    }
  }

  const verifyTwilioOtp = async (cleanPhone, code) => {
    const response = await fetch(buildOtpApiUrl('/api/otp/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, code }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.ok !== true) {
      throw new Error(payload?.error || 'OTP verification failed')
    }

    if (payload?.status !== 'approved') {
      throw new Error('Invalid OTP. Please try again.')
    }
  }

  const requestOtp = async (cleanPhone, { resend = false } = {}) => {
    if (otpProvider === 'twilio') {
      await sendTwilioOtp(cleanPhone)
      setOtpModeUsed('twilio')
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        const text = String(error.message || '').toLowerCase()
        if (text.includes('unsupported phone provider') || text.includes('provider is not enabled')) {
          await sendTwilioOtp(cleanPhone)
          setOtpModeUsed('twilio')
          toast.success('Supabase phone OTP is disabled. Switched to Twilio OTP automatically.')
        } else {
          throw error
        }
      } else {
        setOtpModeUsed('supabase')
      }
    }

    setOtpSent(true)
    setOtp('')
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    toast.success(resend ? 'OTP resent to your phone.' : 'OTP sent to your phone.')
  }

  const handleSendOtp = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    const cleanPhone = toE164(phone)

    try {
      await requestOtp(cleanPhone)
    } catch (error) {
      toast.error(error.message)
      const help = getOtpErrorHelp(error.message)
      if (help) toast.error(help, { duration: 7000 })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (submitting || resendCooldown > 0 || !otpSent) return
    setSubmitting(true)

    const cleanPhone = toE164(phone)
    try {
      await requestOtp(cleanPhone, { resend: true })
    } catch (error) {
      toast.error(error.message || 'Unable to resend OTP')
      const help = getOtpErrorHelp(error.message)
      if (help) toast.error(help, { duration: 7000 })
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    const cleanPhone = toE164(phone)

    try {
      let userId = null

      if (otpModeUsed === 'twilio') {
        await verifyTwilioOtp(cleanPhone, otp)

        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
          throw new Error('Twilio OTP verified, but Supabase anonymous sign-in is disabled. Enable it in Supabase Auth settings.')
        }

        userId = data?.user?.id
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: cleanPhone,
          token: otp,
          type: 'sms',
        })

        if (error) throw error
        userId = data?.user?.id
      }

      await upsertCustomerProfile(userId, cleanPhone)
      toast.success('Welcome to Qaffeine!')
      sessionStorage.setItem(INTRO_FORCE_KEY, '1')
      navigate('/', { replace: true })
    } catch (error) {
      console.error('OTP verification failed:', error)
      toast.error(error.message || 'OTP verification failed')
      if (isOtpExpiredError(error.message)) {
        setOtp('')
        setResendCooldown(0)
        toast('OTP expired. Tap Resend OTP to get a new code.')
      }
    } finally {
      setSubmitting(false)
    }
  }



  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-logo">Qaffeine</p>
        <h1 className="auth-heading">Crafted coffee. Real kitchen. Fast service.</h1>
        <p className="auth-tagline">
          Sign in as customer to order, reserve tables, and track live status.
        </p>

        <div className="auth-mini-note">
          Secure sign-in with Google or OTP. No card data is stored in this app.
        </div>

        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={handleGoogleSignIn}
          disabled={submitting}
        >
          {submitting ? <LoaderCircle className="spin" size={18} /> : null}
          Continue with Google
        </button>

        <div className="auth-divider" aria-hidden="true">
          <span />
          <p>{otpModeUsed === 'twilio' ? 'or use Twilio OTP' : 'or use phone OTP'}</p>
          <span />
        </div>

        <button
          type="button"
          className="auth-btn auth-btn-ghost"
          onClick={handleGuestLogin}
          disabled={submitting}
        >
          Continue as Guest (Demo)
        </button>

        <form className="auth-form" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
          <label htmlFor="customer-phone">Phone Number</label>
          <div className="input-with-icon">
            <Phone size={16} />
            <input
              id="customer-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 9876543210"
              required
            />
          </div>

          {otpSent ? (
            <>
              <label htmlFor="customer-otp">OTP</label>
              <input
                id="customer-otp"
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit code"
                required
              />
            </>
          ) : null}

          <button type="submit" className="auth-btn auth-btn-primary" disabled={submitting}>
            {submitting ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
          </button>

          {otpSent ? (
            <div className="auth-otp-tools">
              <button
                type="button"
                className="auth-resend-link"
                onClick={handleResendOtp}
                disabled={submitting || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          ) : null}

          {otpModeUsed === 'twilio' ? (
            <p className="auth-mode-note">
              Twilio mode enabled. Ensure local API server is running at {otpApiBase}.
            </p>
          ) : null}
        </form>

        <p className="portal-links">
          <Link to="/staff/login">Staff? Login here</Link>
          <span>|</span>
          <Link to="/admin/login">Admin? Login here</Link>
        </p>
      </section>
    </main>
  )
}
