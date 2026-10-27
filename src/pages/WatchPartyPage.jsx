import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CreatePartyModal from '../components/CreatePartyModal.jsx'
import JoinPartyModal from '../components/JoinPartyModal.jsx'

export default function WatchPartyPage() {
  const [searchParams] = useSearchParams()
  const joinCode = searchParams.get('code')
  const [modal, setModal] = useState(joinCode ? 'join' : null)
  const navigate = useNavigate()

  const handleCreate = ({ code, name, media }) => {
    navigate(`/party/${code}`, { state: { hostName: name, media } })
  }

  const handleJoin = ({ code, name }) => {
    navigate(`/party/${code}`, { state: { memberName: name } })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink pt-16 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15">
          <svg className="h-8 w-8 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white sm:text-4xl">Sala compartida</h1>
        <p className="mt-2 text-sm text-mist sm:text-base">
          Disfruta películas y series con amigos en tiempo real.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setModal('create')}
            className="group rounded-xl border border-white/10 bg-surface p-5 text-left transition-all hover:border-brand/30 hover:bg-surface/80"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-2xl font-black text-brand transition-transform group-hover:scale-110">+</div>
            <p className="text-base font-black text-white">Crear una sala</p>
            <p className="mt-0.5 text-xs text-mist">Elige una película o serie e invita a tus amigos</p>
          </button>

          <button
            onClick={() => setModal('join')}
            className="group rounded-xl border border-white/10 bg-surface p-5 text-left transition-all hover:border-brand/30 hover:bg-surface/80"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition-transform group-hover:scale-110">&#8594;</div>
            <p className="text-base font-black text-white">Unirse a una sala</p>
            <p className="mt-0.5 text-xs text-mist">Introduce un código o utiliza un enlace para entrar</p>
          </button>
        </div>

        <p className="mt-6 text-xs text-mist/60">
          Host-driven playback sync via the VidFast postMessage API. Parties expire when everyone
          leaves.
        </p>
      </div>

      {modal === 'create' && (
        <CreatePartyModal onClose={() => setModal(null)} onCreate={handleCreate} />
      )}
      {modal === 'join' && (
        <JoinPartyModal onClose={() => setModal(null)} onJoin={handleJoin} />
      )}
    </div>
  )
}
