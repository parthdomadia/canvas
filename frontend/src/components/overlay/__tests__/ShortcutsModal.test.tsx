import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShortcutsModal } from '../ShortcutsModal'

describe('ShortcutsModal', () => {
  it('renders the trigger button', () => {
    render(<ShortcutsModal />)
    expect(screen.getByRole('button', { name: /open keyboard shortcuts/i })).toBeInTheDocument()
  })

  it('modal is not shown initially', () => {
    render(<ShortcutsModal />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens modal when trigger button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('closes modal when × button is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.click(screen.getByRole('button', { name: /close shortcuts/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes modal when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes modal when backdrop is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not close modal when card content is clicked', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    await user.click(screen.getByText('Keyboard Shortcuts'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays all five shortcut groups', async () => {
    const user = userEvent.setup()
    render(<ShortcutsModal />)
    await user.click(screen.getByRole('button', { name: /open keyboard shortcuts/i }))
    expect(screen.getByText('Canvas')).toBeInTheDocument()
    expect(screen.getByText('Selection & Actions')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Node Editing')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })
})
