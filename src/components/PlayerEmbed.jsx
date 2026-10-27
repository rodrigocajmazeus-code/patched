import { useMemo } from 'react'
import { getProvider, resolveEmbedUrl } from '../data/providers.js'
import { framePolicy } from '../player/providerSelection.js'
import { useProvider } from '../context/ProviderContext.jsx'

export default function PlayerEmbed({ selectedProviderId, selectedProviderOptions, mediaType, id, season = 1, episode = 1, title, className = '', iframeRef, onFrameLoad, onFrameError }) {
  const { providerId: storedProviderId, providerOptions: storedOptions, restrictedFrames } = useProvider()
  const providerOptions = selectedProviderOptions ?? storedOptions
  const providerId = selectedProviderId ?? storedProviderId
  const provider = getProvider(providerId)
  const policy = framePolicy(providerId, restrictedFrames)

  const { url: src, error } = useMemo(
    () => resolveEmbedUrl(providerId, mediaType, id, season, episode, providerOptions),
    [providerId, mediaType, id, season, episode, providerOptions]
  )

  if (error) return <p role="alert" className="p-6 text-amber-100">{error}. Elige otra fuente; no se ha cargado ningún iframe.</p>
  if (policy.blocked) return <p role="alert" className="p-6 text-amber-100">{policy.reason}</p>

  return (
    <iframe
      ref={iframeRef}
      key={src}
      src={src}
      onLoad={onFrameLoad}
      onError={onFrameError}
      referrerPolicy={provider.referrerPolicy || 'strict-origin-when-cross-origin'}
      sandbox={policy.sandbox}
      title={title || 'Video player'}
      className={`h-full w-full border-0 bg-black ${className}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}
