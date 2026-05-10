const BULLET = '• '

/**
 * Call when the user presses Space.
 * If the text from the start of the current line to the cursor is exactly "-",
 * replaces it with "• " and returns the new value + cursor position.
 * Returns null if no transformation applies.
 */
export function applyBulletSpace(
  value: string,
  cursor: number,
): { value: string; cursor: number } | null {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1
  const textFromLineStart = value.slice(lineStart, cursor)
  if (textFromLineStart !== '-') return null

  const newValue = value.slice(0, lineStart) + BULLET + value.slice(cursor)
  return { value: newValue, cursor: lineStart + BULLET.length }
}

/**
 * Call when the user presses Enter.
 * If the current line starts with "• ":
 *   - Empty bullet ("• " with nothing after): removes the bullet prefix, no new line.
 *   - Non-empty bullet: inserts "\n• " at the cursor.
 * Returns null if the current line is not a bullet line (let default Enter behavior run).
 */
export function applyBulletEnter(
  value: string,
  cursor: number,
): { value: string; cursor: number } | null {
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1
  const lineEnd = value.indexOf('\n', cursor)
  const currentLine = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)

  if (!currentLine.startsWith(BULLET)) return null

  const bulletContent = currentLine.slice(BULLET.length)

  if (bulletContent.trim() === '') {
    // Empty bullet: remove "• " from this line, place cursor at line start
    const newValue = value.slice(0, lineStart) + value.slice(lineStart + BULLET.length)
    return { value: newValue, cursor: lineStart }
  }

  // Non-empty bullet: continue with new bullet on next line
  const newValue = value.slice(0, cursor) + '\n' + BULLET + value.slice(cursor)
  return { value: newValue, cursor: cursor + 1 + BULLET.length }
}
