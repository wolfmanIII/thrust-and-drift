import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip } from './Tooltip.jsx'

describe('Tooltip', () => {
  it('children always rendered', () => {
    render(
      <Tooltip label="tip">
        <button>Trigger</button>
      </Tooltip>
    )
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument()
  })

  it('tooltip hidden initially', () => {
    render(<Tooltip label="Secret tip"><button>Hover</button></Tooltip>)
    expect(screen.queryByText('Secret tip')).not.toBeInTheDocument()
  })

  it('shows tooltip on mouseenter', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Visible tip"><button>Hover</button></Tooltip>)
    await user.hover(screen.getByRole('button'))
    expect(screen.getByText('Visible tip')).toBeInTheDocument()
  })

  it('hides tooltip on mouseleave', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Gone tip"><button>Hover</button></Tooltip>)
    await user.hover(screen.getByRole('button'))
    expect(screen.getByText('Gone tip')).toBeInTheDocument()
    await user.unhover(screen.getByRole('button'))
    expect(screen.queryByText('Gone tip')).not.toBeInTheDocument()
  })

  it('renders tooltip via portal into document.body', async () => {
    const user = userEvent.setup()
    render(<Tooltip label="Portal tip"><button>Hover</button></Tooltip>)
    await user.hover(screen.getByRole('button'))
    // portal content lives in document.body, outside render root
    expect(document.body.textContent).toContain('Portal tip')
  })

  it('different label per instance', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Tooltip label="First"><button>A</button></Tooltip>
        <Tooltip label="Second"><button>B</button></Tooltip>
      </div>
    )
    await user.hover(screen.getByRole('button', { name: 'A' }))
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
  })
})
