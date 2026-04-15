import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || 'Unexpected application error'),
    }
  }

  componentDidCatch(error, errorInfo) {
    // Keep details in console for diagnosis while showing a safe UI to users.
    console.error('AppErrorBoundary caught an error:', error, errorInfo)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
            background: 'radial-gradient(circle at 12% 8%, rgba(164,119,100,0.22), transparent 34%), #130d09',
            color: '#FBF3E8',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <section
            style={{
              width: 'min(560px, 96vw)',
              border: '1px solid rgba(164,119,100,0.42)',
              borderRadius: '16px',
              background: '#1B130F',
              padding: '1rem',
              display: 'grid',
              gap: '0.65rem',
            }}
          >
            <p style={{ margin: 0, color: '#D7BCAB', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Qaffeine Recovery Mode
            </p>
            <h1 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.5rem, 3.4vw, 2.2rem)' }}>
              Something went wrong, but your session is safe.
            </h1>
            <p style={{ margin: 0, color: '#D7BCAB' }}>
              A runtime error interrupted this screen. You can reload instantly, or return home and continue browsing.
            </p>
            <p
              role="status"
              style={{
                margin: 0,
                border: '1px solid rgba(164,119,100,0.32)',
                borderRadius: '10px',
                background: 'rgba(164,119,100,0.12)',
                padding: '0.55rem 0.65rem',
                color: '#F4E4D9',
                fontSize: '0.88rem',
                wordBreak: 'break-word',
              }}
            >
              {this.state.errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  minHeight: '40px',
                  borderRadius: '999px',
                  border: '1px solid #A47764',
                  background: '#A47764',
                  color: '#130d09',
                  fontWeight: 700,
                  padding: '0 0.9rem',
                  cursor: 'pointer',
                }}
              >
                Reload App
              </button>
              <Link
                to="/"
                style={{
                  minHeight: '40px',
                  borderRadius: '999px',
                  border: '1px solid rgba(164,119,100,0.42)',
                  color: '#FBF3E8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  padding: '0 0.9rem',
                }}
              >
                Back to Home
              </Link>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
