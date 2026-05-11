import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '../EmptyState'

describe('EmptyState', () => {
  it('renders the hint text', () => {
    render(<EmptyState />)
    expect(screen.getByText('Double-click anywhere to create a note')).toBeInTheDocument()
  })

  it('has pointer-events none so it does not block canvas', () => {
    render(<EmptyState />)
    const container = screen.getByText('Double-click anywhere to create a note').closest('div')!.parentElement!
    expect(container.style.pointerEvents).toBe('none')
  })
})
