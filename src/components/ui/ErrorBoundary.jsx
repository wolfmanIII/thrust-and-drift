/**
 * ErrorBoundary — global React error boundary.
 * Catches unhandled render/lifecycle errors and shows a recovery UI.
 * Class component: required by React error boundary API.
 */

import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload() {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-lg w-full border border-red-700/50 bg-red-950/20 rounded p-6 space-y-4">
          <h1 className="font-display text-red-400 text-lg tracking-widest">
            ⚠ ERRORE CRITICO
          </h1>
          <p className="font-mono text-sm text-slate-300 leading-relaxed">
            Si è verificato un errore imprevisto. La sessione corrente è stata
            salvata automaticamente — ricaricare la pagina per ripristinarla.
          </p>
          <pre className="font-mono text-xs text-slate-500 bg-slate-900/60 rounded p-3 overflow-auto max-h-40">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.handleReload}
            className="w-full py-2 bg-red-900/30 border border-red-700/50 text-red-400
              font-display text-xs tracking-widest rounded hover:bg-red-900/50 transition-colors"
          >
            RICARICA PAGINA
          </button>
        </div>
      </div>
    )
  }
}
