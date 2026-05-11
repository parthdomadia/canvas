export function EmptyState() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: 'var(--accent)',
        animation: 'pulse-dot 1.5s ease-in-out infinite alternate',
      }} />
      <div>
        <span style={{
          color: 'var(--node-text-secondary)',
          fontSize: 14,
          fontFamily: "'Alpino', system-ui, -apple-system, sans-serif",
        }}>
          Double-click anywhere to create a note
        </span>
      </div>
    </div>
  )
}
