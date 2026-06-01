export function LoadingSpinner() {
  return (
    <div className="empty" aria-live="polite" aria-busy="true">
      <div className="spinner" aria-hidden="true" />
      <div className="empty-text">Cargando…</div>
    </div>
  )
}

export default LoadingSpinner
