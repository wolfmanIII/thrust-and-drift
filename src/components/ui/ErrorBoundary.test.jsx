/**
 * Tests for ErrorBoundary component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary.jsx'

// Suppress React's error boundary console output during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/** Component that throws on render when told to. */
function Bomb({ explode }) {
  if (explode) throw new Error('KABOOM')
  return <div>tutto ok</div>
}

describe('ErrorBoundary — normal operation', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('tutto ok')).toBeInTheDocument()
  })

  it('does not show error UI when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>
    )
    expect(screen.queryByText(/ERRORE CRITICO/)).not.toBeInTheDocument()
  })
})

describe('ErrorBoundary — error handling', () => {
  it('shows error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/ERRORE CRITICO/)).toBeInTheDocument()
  })

  it('displays the error message', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('KABOOM')).toBeInTheDocument()
  })

  it('shows reload button', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/RICARICA PAGINA/)).toBeInTheDocument()
  })

  it('calls window.location.reload on button click', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByText(/RICARICA PAGINA/))
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('hides children after error', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    )
    expect(screen.queryByText('tutto ok')).not.toBeInTheDocument()
  })

  it('logs the error via console.error', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={true} />
      </ErrorBoundary>
    )
    expect(console.error).toHaveBeenCalled()
  })
})
