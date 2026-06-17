import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    console.error('ErrorBoundary caught:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary details:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0d0f14',
          color: '#e8eaf0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          fontFamily: 'monospace',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#ff5a5a', marginBottom: 16 }}>Erro ao carregar o app</h2>
          <pre style={{
            background: '#1e2230',
            border: '1px solid #2a2f3e',
            padding: 16,
            borderRadius: 4,
            fontSize: 12,
            maxWidth: '90vw',
            overflow: 'auto',
            color: '#ff8a8a',
          }}>
            {this.state.error?.message || 'Erro desconhecido'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: '#f0c040',
              color: '#0d0f14',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
