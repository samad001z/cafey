import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

async function fetchProfileByUserId(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function ensureProfile(user) {
  const existing = await fetchProfileByUserId(user?.id)
  if (existing) return existing

  const payload = {
    id: user.id,
    role: 'customer',
    full_name:
      user.user_metadata?.full_name || user.user_metadata?.name || null,
    phone: user.phone || null,
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const syncAuthState = async (session) => {
      const activeUser = session?.user ?? null

      if (!mounted) return

      setUser(activeUser)

      if (!activeUser) {
        setProfile(null)
        setRole(null)
        setLoading(false)
        return
      }

      try {
        const profileRow = await ensureProfile(activeUser)
        if (!mounted) return
        setProfile(profileRow)
        setRole(profileRow?.role ?? null)
      } catch (error) {
        console.error('Unable to load profile:', error)
        if (!mounted) return

        const isRlsError = error?.code === '42501' || String(error?.message || '').toLowerCase().includes('row-level security')
        if (isRlsError) {
          const fallbackRole = activeUser?.user_metadata?.role || 'customer'
          setProfile({
            id: activeUser.id,
            role: fallbackRole,
            full_name: activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || null,
            phone: activeUser.phone || null,
          })
          setRole(fallbackRole)
        } else {
          setProfile(null)
          setRole(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Unable to get auth session:', error)
      }
      syncAuthState(data?.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true)
      syncAuthState(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      loading,
      signOut,
    }),
    [loading, profile, role, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
