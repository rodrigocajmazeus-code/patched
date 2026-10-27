import { Link } from 'react-router-dom'
import { useMyList } from '../context/MyListContext.jsx'
import MediaGrid from '../components/MediaGrid.jsx'
import { PlayIcon } from '../components/icons.jsx'

export default function MyListPage() {
  const { items } = useMyList()

  return (
    <div className="cinema-library-page mx-auto max-w-screen-2xl px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <p className="cinema-eyebrow mb-3">TU ESPACIO / GUARDADOS</p>
      <h1 className="mb-2 text-2xl font-black text-white sm:text-3xl">Mi lista</h1>
      <p className="mb-8 text-sm text-mist">
        {items.length} títulos guardados para ver a tu ritmo.
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-surface p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <PlayIcon className="h-8 w-8 text-brand" />
          </div>
          <h2 className="text-lg font-bold text-white">Tu lista todavía está vacía</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mist">
            Guarda películas, series y anime con el botón + de cada título.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-hover"
          >
            Explorar títulos
          </Link>
        </div>
      ) : (
        <MediaGrid items={items} emptyText="Tu próxima selección empieza aquí." />
      )}
    </div>
  )
}