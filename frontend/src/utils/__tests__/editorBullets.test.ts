import { describe, it, expect } from 'vitest'
import { applyBulletSpace, applyBulletEnter } from '../editorBullets'

describe('applyBulletSpace', () => {
  it('converts leading dash to bullet at start of document', () => {
    // User typed "-", cursor is at position 1, presses Space
    const result = applyBulletSpace('-', 1)
    expect(result).toEqual({ value: '• ', cursor: 2 })
  })

  it('converts leading dash to bullet mid-document', () => {
    // "line1\n-" with cursor at 7 (after "-")
    const result = applyBulletSpace('line1\n-', 7)
    expect(result).toEqual({ value: 'line1\n• ', cursor: 8 })
  })

  it('returns null when line has text before the dash', () => {
    const result = applyBulletSpace('some-', 5)
    expect(result).toBeNull()
  })

  it('returns null when current text is not a dash', () => {
    const result = applyBulletSpace('hello', 5)
    expect(result).toBeNull()
  })

  it('returns null when cursor is not right after the dash', () => {
    // "- text" with cursor at 0
    const result = applyBulletSpace('- text', 0)
    expect(result).toBeNull()
  })
})

describe('applyBulletEnter', () => {
  it('continues bullet when current line has content after bullet prefix', () => {
    // "• item" cursor at end (6)
    const result = applyBulletEnter('• item', 6)
    expect(result).toEqual({ value: '• item\n• ', cursor: 9 })
  })

  it('removes bullet when current line is empty bullet', () => {
    // "• " cursor at end (2) — empty bullet
    const result = applyBulletEnter('• ', 2)
    expect(result).toEqual({ value: '', cursor: 0 })
  })

  it('continues bullet mid-document', () => {
    // "line1\n• item" cursor at 12 (end)
    const result = applyBulletEnter('line1\n• item', 12)
    expect(result).toEqual({ value: 'line1\n• item\n• ', cursor: 15 })
  })

  it('removes empty bullet mid-document, preserving following lines', () => {
    // "• \nline2" cursor at 2 (after "• ")
    const result = applyBulletEnter('• \nline2', 2)
    expect(result).toEqual({ value: '\nline2', cursor: 0 })
  })

  it('returns null on non-bullet line', () => {
    const result = applyBulletEnter('normal text', 6)
    expect(result).toBeNull()
  })

  it('returns null on non-bullet line mid-document', () => {
    const result = applyBulletEnter('line1\nline2', 9)
    expect(result).toBeNull()
  })
})
