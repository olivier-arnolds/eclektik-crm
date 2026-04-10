import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)
const ALLOWED_DOMAIN = 'eclectik.co'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      validateAndSet(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAndSet(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  function validateAndSet(session) {
    if (!session) {
      setSession(null)
      return
    }
    const email = session.user?.email || ''
    if (!email.endsWith('@' + ALLOWED_DOMAIN)) {
      supabase.auth.signOut()
      setError('Alleen @eclectik.co accounts hebben toegang.')
      setSession(null)
      return
    }
    if (session.provider_token) {
      localStorage.setItem('graph_token', session.provider_token)
    }
    setSession(session)
    setError(null)
  }

  async function login() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile Mail.Read Mail.Send Calendars.Read',
        redirectTo: window.location.origin
      }
    })
    if (error) setError(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('graph_token')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
