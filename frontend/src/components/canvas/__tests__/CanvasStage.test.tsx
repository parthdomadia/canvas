import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CanvasStage } from '../CanvasStage'

// Konva requires a real canvas — mock it for unit tests
vi.mock('react-konva', () => ({
  Stage: ({ children, onWheel }: any) => (
    <div data-testid="konva-stage" onWheel={onWheel}>{children}</div>
  ),
  Layer: () => <div data-testid="konva-layer" />,
}))

describe('CanvasStage', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<CanvasStage />)
    expect(getByTestId('konva-stage')).toBeInTheDocument()
  })
})
