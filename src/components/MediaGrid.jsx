import MovieCard from './MovieCard.jsx'

export default function MediaGrid({ items, loading, error, onRetry, emptyText = 'Todavía no hay títulos aquí.' }) {
  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface p-8 text-center">
        <p className="text-red-400">No se pudo cargar esta selección.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 rounded bg-white px-5 py-2 text-sm font-bold text-black hover:bg-cream"
          >
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="cinema-media-grid">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-surface p-10 text-center">
        <p className="text-mist">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="cinema-media-grid">
      {items.map((m) => (
        <MovieCard key={m.key} media={m} fill />
      ))}
    </div>
  )
}