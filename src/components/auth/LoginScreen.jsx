import { useAuth } from '../../lib/auth'

export default function LoginScreen() {
  const { login, error } = useAuth()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F1EFE8',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
    }}>
      <div style={{
        background: '#FFFFFF', border: '1px solid #D3D1C7', borderRadius: 16,
        padding: '48px 40px', width: 420, textAlign: 'center'
      }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#059669',
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32
        }}>
          ECLECTIK BD
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 13, color: '#6b6b80', marginBottom: 40, lineHeight: 1.6 }}>
          Log in with your @eclectik.co Microsoft account to access the BD Dashboard.
        </div>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626',
            marginBottom: 16, textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <button onClick={login} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          width: '100%', background: '#fff', border: '1px solid #D3D1C7', borderRadius: 8,
          padding: '13px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", color: '#111118',
          transition: 'all .15s', boxShadow: '0 1px 3px rgba(0,0,0,.08)'
        }}>
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Login with Microsoft
        </button>

        <div style={{ fontSize: 11, color: '#6b6b80', marginTop: 20 }}>
          Only @eclectik.co accounts have access
        </div>
      </div>
    </div>
  )
}
