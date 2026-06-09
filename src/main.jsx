import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider, useAuth } from './lib/auth'
import BDDashboard from './App'
import BDApp from './bd/BDApp'
import LoginScreen from './components/auth/LoginScreen'

// Catches any uncaught render error so one component crash shows a recoverable
// message instead of a blank white screen.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('App crashed:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#F1EFE8', fontFamily: "'DM Sans', sans-serif", color: '#111118', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Something went wrong.</div>
          <div style={{ fontSize: 13, color: '#6b6b80', maxWidth: 480 }}>The app hit an unexpected error. Reloading usually fixes it. If it keeps happening, let the team know what you were doing.</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: '0.5px solid #D3D1C7', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}

function Root() {
  const { session, loading } = useAuth()
  // Default: new BD app. Old app kept as fallback on /old
  const isOld = window.location.pathname.startsWith('/old')

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F1EFE8', fontFamily: "'DM Sans', sans-serif", color: '#888780'
      }}>
        Loading...
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return isOld ? <BDDashboard /> : <BDApp />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>
)
