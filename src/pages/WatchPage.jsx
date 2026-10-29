import EpisodeDrawer from '../components/EpisodeDrawer.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  getBackdrops,
  getCast,
  getDetails,
  getRelated,
  getSeasonEpisodes,
  getVideo,
} from '../api/dataService.js'
import { backdropUrl, posterUrl } from '../api/tmdb.js'
import { useData } from '../hooks/useData.js'
import { useProvider } from '../context/ProviderContext.jsx'
import { useEpisodeProvider } from '../hooks/useEpisodeProvider.js'
import { PLAYBACK_PREFERENCES, framePolicy } from '../player/providerSelection.js'
import { languageRouting, nextAvailableProvider } from '../player/languageRouting.js'
import { adjacentEpisode, readEpisodeNumber, watchQuery } from '../player/episodeNavigation.js'
import { PRIMARY_PROVIDER_ORDER } from '../data/providers.js'
import { useApiKey } from '../context/ApiKeyContext.jsx'
import { useMyList } from '../context/MyListContext.jsx'
import { useHistory } from '../context/HistoryContext.jsx'
import { useRatings } from '../context/RatingsContext.jsx'
import { resolveEmbedUrl } from '../data/providers.js'
import { usePlayerBridge } from '../hooks/usePlayerBridge.js'
import MovieCard from '../components/MovieCard.jsx'
import Row from '../components/Row.jsx'
import PlayerEmbed from '../components/PlayerEmbed.jsx'
import PlaybackTools from '../components/PlaybackTools.jsx'
import ControlledPlayer from '../components/ControlledPlayer.jsx'
import PlaybackVerificationPanel from '../components/PlaybackVerificationPanel.jsx'
import AvailabilityStrip from '../components/AvailabilityStrip.jsx'
import ProviderEvidencePanel from '../components/ProviderEvidencePanel.jsx'
import { useVidRiftEvidence } from '../hooks/useVidRiftEvidence.js'
import { EMBED_LOAD_TIMEOUT_MS, shouldAttemptFallback, nextUntriedProvider, portalMessage } from '../player/fallbackPolicy.js'
import { getAuthorizedMedia } from '../config/authorizedMedia.js'
import PlayerAuditPanel from '../components/PlayerAuditPanel.jsx'
import {
  CheckIcon,
  ChevronLeftIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  SpinnerIcon,
  StarIcon,
  StarOutlineIcon,
  NextIcon,
  FullscreenIcon,
} from '../components/icons.jsx'

export default function WatchPage() {
  const { type, id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const mediaType = type === 'tv' ? 'tv' : 'movie'
  const { apiKey } = useApiKey()
  const { has, toggle } = useMyList()
  const { add: addHistory, items: historyItems } = useHistory()
  const { get: getRating, set: setRating } = useRatings()
  const [shareLabel, setShareLabel] = useState(null)
  const initialSeason = readEpisodeNumber(searchParams, 's')
  const initialEpisode = readEpisodeNumber(searchParams, 'e')
  const autoPlay = searchParams.get('autoplay') === 'true' || searchParams.get('play') === '1'
  const [season, setSeason] = useState(initialSeason)
  const [episode, setEpisode] = useState(initialEpisode)
  const { providerId, setProvider, providerOptions, selection, selectionReason } = useEpisodeProvider({ mediaType, id, season, episode })
  const [playbackMode, setPlaybackMode] = useState(autoPlay ? 'content' : null)

  const { data: media, loading } = useData(
    () => (id ? getDetails(mediaType, id).catch(() => null) : Promise.resolve(null)),
    [mediaType, id, apiKey]
  )
  const { data: backdropPaths } = useData(
    () => (id ? getBackdrops(mediaType, id).catch(() => []) : Promise.resolve([])),
    [mediaType, id, apiKey]
  )
  const { data: cast } = useData(
    () => (id ? getCast(mediaType, id, 20).catch(() => []) : Promise.resolve([])),
    [mediaType, id, apiKey]
  )
  const { data: trailerUrl, loading: trailerLoading } = useData(
    () => (id ? getVideo(mediaType, id).catch(() => null) : Promise.resolve(null)),
    [mediaType, id, apiKey]
  )
  const { data: related } = useData(
    () => (id ? getRelated(mediaType, id).catch(() => []) : Promise.resolve([])),
    [mediaType, id, apiKey]
  )
  const { data: episodes, loading: episodesLoading } = useData(
    () => (id && mediaType === 'tv' ? getSeasonEpisodes(id, season).catch(() => []) : Promise.resolve([])),
    [mediaType, id, season, apiKey]
  )

  const userRating = media ? getRating(media.key) : 0

  const historyEntry = useMemo(
    () => historyItems.find((m) => m.key === media?.key) || null,
    [historyItems, media?.key]
  )
  const resumable = !!historyEntry && historyEntry.positionSeconds >= 15 &&
    (mediaType !== 'tv' || ((!searchParams.has('s') && !searchParams.has('e')) ||
      (historyEntry.season === season && historyEntry.episode === episode)))

  const changeEpisode = (nextSeason, nextEpisode, play = playbackMode === 'content') => {
    setSeason(nextSeason)
    setEpisode(nextEpisode)
    if (play) setPlaybackMode('content')
    setSearchParams(current => watchQuery(current, { mediaType, season: nextSeason, episode: nextEpisode, playing: play }), { replace: true })
  }

  const openPlayer = (mode) => {
    setPlaybackMode(mode)
    setSearchParams(current => watchQuery(current, { mediaType, season, episode, playing: mode === 'content' }), { replace: true })
  }

  const continueWatching = () => {
    if (resumable && mediaType === 'tv' && historyEntry.season > 0 && historyEntry.episode > 0) {
      changeEpisode(historyEntry.season, historyEntry.episode, true)
    } else {
      openPlayer('content')
    }
  }

  useEffect(() => {
    setSeason(initialSeason)
    setEpisode(initialEpisode)
    setPlaybackMode(autoPlay ? 'content' : null)
  }, [id, mediaType, initialSeason, initialEpisode, autoPlay])

  useEffect(() => {
    if (playbackMode === 'content' && media) {
      addHistory(media, {
        season: mediaType === 'tv' ? season : null,
        episode: mediaType === 'tv' ? episode : null,
      })
    }
  }, [playbackMode, media, mediaType, season, episode, addHistory])

  const seasons = Array.isArray(media?.seasons)
    ? media.seasons.filter((item) => item.season_number > 0)
    : []
  const inList = media ? has(media.key) : false
  const duration = formatDuration(media?.runtime)

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink">
        <SpinnerIcon className="h-10 w-10 text-brand" />
        <p className="text-sm font-semibold text-mist">Localizando la historia…</p>
      </div>
    )
  }

  if (!media) {
    return <PageMessage>No se encontró este título.</PageMessage>
  }

  if (playbackMode) {
    return (
      <PlayerView
        media={media}
        mediaType={mediaType}
        id={id}
        season={season}
        episode={episode}
        seasons={seasons}
        episodes={episodes || []}
        episodesLoading={episodesLoading}
        relatedItems={related || []}
        trailerUrl={trailerUrl}
        mode={playbackMode}
        providerId={providerId}
        setProvider={setProvider}
        selection={selection}
        selectionReason={selectionReason}
        providerOptions={providerOptions}
        onNavigateEpisode={(target) => changeEpisode(target.season, target.episode, true)}
        onClose={() => openPlayer(null)}
      />
    )
  }

  return (
    <div className="cinema-detail relative min-h-screen overflow-x-hidden bg-ink pb-4 pt-16">
      <BackgroundGallery
        media={media}
        backdropPaths={backdropPaths || []}
      />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10">
        <div className="relative flex min-h-[62vh] items-end pb-8 pt-16">
          <section className="max-w-2xl pb-2">
            <Link
              to={mediaType === 'tv' ? '/series' : '/movies'}
              className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-cream/70 transition hover:text-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              Volver a {mediaType === 'tv' ? 'Series' : 'Películas'}
            </Link>

            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-brand">
              {mediaType === 'tv' ? 'PATCHED · Series' : 'PATCHED · Películas'}
            </p>
            <h1 className="text-4xl font-black leading-[0.98] tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">
              {media.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-cream/90">
              {media.year && <span>{media.year}</span>}
              {duration && <span>{duration}</span>}
              {mediaType === 'tv' && <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs">SERIES</span>}
              {media.rating > 0 && (
                <span className="inline-flex items-center gap-1 text-yellow-300">
                  <StarIcon className="h-3.5 w-3.5" /> {media.rating.toFixed(1)}
                </span>
              )}
            </div>

            <h2 className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-white">Sinopsis</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-cream/85 sm:text-base">
              {media.overview || 'No hay sinopsis disponible.'}
            </p>
            {(media.genres?.length || media.numberOfEpisodes) && (
              <p className="mt-3 text-xs font-semibold text-mist">
                {[media.genres?.join(' / '), media.numberOfEpisodes ? `${media.numberOfEpisodes} episodios` : null]
                  .filter(Boolean)
                  .join('  |  ')}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={continueWatching}
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black text-black transition hover:bg-cream"
              >
                <PlayIcon className="h-5 w-5" />
                {resumable ? 'Continuar viendo' : `Ver ${mediaType === 'tv' ? 'serie' : 'película'}`}
              </button>
              {trailerUrl && (
                <button
                  onClick={() => openPlayer('trailer')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/35 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <PlayIcon className="h-4 w-4" />
                  Avance
                </button>
              )}
              <button
                onClick={() => toggle(media)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition hover:bg-white/15"
                aria-label={inList ? 'Quitar de mi lista' : 'Añadir a mi lista'}
              >
                {inList ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
              </button>
              <button
                onClick={async () => {
                  const shareUrl = window.location.href
                  const shareData = {
                    title: media.title,
                    text: `Mira ${media.title} en PATCHED`,
                    url: shareUrl,
                  }
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData)
                    } else {
                      await navigator.clipboard.writeText(shareUrl)
                      setShareLabel('Enlace copiado')
                      setTimeout(() => setShareLabel(null), 2000)
                    }
                  } catch {
                    // user cancelled or clipboard unavailable
                  }
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition hover:bg-white/15"
                aria-label="Compartir"
              >
                <ShareIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-bold text-mist">Tu valoración:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(media.key, star === userRating ? 0 : star)}
                    className="p-0.5 text-yellow-400 transition hover:scale-125"
                    aria-label={`Valorar con ${star} estrellas`}
                  >
                    {star <= userRating
                      ? <StarIcon className="h-4 w-4" />
                      : <StarOutlineIcon className="h-4 w-4 text-mist" />}
                  </button>
                ))}
              </div>
            </div>

            {shareLabel && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckIcon className="h-3.5 w-3.5" /> {shareLabel}
              </p>
            )}

            {trailerLoading && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-mist">
                <SpinnerIcon className="h-3.5 w-3.5 text-brand" /> Localizando el avance…
              </p>
            )}
          </section>

          {mediaType === 'tv' && (
            <EpisodePicker id={id} title={media.title} seasons={seasons} season={season} episode={episode} onSelect={target => changeEpisode(target.season, target.episode, true)} />
          )}
        </div>

        <div className="space-y-8 border-t border-white/10 pt-7">
          <CastRail cast={cast || []} />
          <RelatedRail items={related || []} />
        </div>
      </div>
    </div>
  )
}

function BackgroundGallery({media,backdropPaths}) {
  const path=media.backdrop||backdropPaths[0]
  return <div className="cinema-detail-background" aria-hidden="true"><img src={path?backdropUrl(path,'w1280'):posterUrl(media.poster,'w500')} alt="" fetchPriority="high" decoding="async" /><div /></div>
}

function EpisodePicker(props) {
  const [open, setOpen] = useState(false)
  return <><button type="button" className="cinema-button patched-episode-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>Episodios <span aria-hidden="true">↗</span></button>{open && <EpisodeDrawer {...props} onClose={() => setOpen(false)} />}</>
}

function CastRail({ cast }) {
  if (!cast.length) return null
  return (
    <section>
      <RailHeading title="Reparto" count={`${cast.length} personas`} />
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {cast.map((person) => (
          <article key={person.id} className="w-36 shrink-0 rounded-xl border border-white/10 bg-black/40 p-2 backdrop-blur">
            <div className="aspect-[4/5] overflow-hidden rounded-lg bg-surface-light">
              {person.profile ? (
                <img src={posterUrl(person.profile, 'w342')} alt={person.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-xl font-black text-mist">{initials(person.name)}</div>
              )}
            </div>
            <p className="mt-2 line-clamp-1 text-xs font-bold text-white">{person.name}</p>
            <p className="mt-0.5 line-clamp-1 text-[10px] text-mist">{person.character || 'Reparto'}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function RelatedRail({ items }) {
  if (!items.length) return null
  return (
    <section>
      <RailHeading title="También te puede interesar" count={`${items.length} títulos`} />
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-4">
        {items.map((item) => (
          <MovieCard key={item.key} media={item} />
        ))}
      </div>
    </section>
  )
}

function RailHeading({ title, count }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <span className="text-[10px] font-black uppercase tracking-wider text-mist">{count}</span>
    </div>
  )
}

function PlayerView({
  media,
  mediaType,
  id,
  season,
  episode,
  seasons,
  episodes,
  episodesLoading,
  trailerUrl,
  mode,
  providerId,
  setProvider,
  selection,
  selectionReason,
  providerOptions,
  onNavigateEpisode,
  onClose,
  relatedItems,
}) {
  const containerRef = useRef(null)
  const { providers, playbackPreference, setPlaybackPreference, restrictedFrames, setRestrictedFrames,
    excludedProviders, setExcludedProviders } = useProvider()
  const [autoFallback, setAutoFallback] = useState(false)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [playerReload, setPlayerReload] = useState(0)
  const [frameErrorUrl, setFrameErrorUrl] = useState(null)
  const [frameTimeoutUrl, setFrameTimeoutUrl] = useState(null)
  const [portalNotice, setPortalNotice] = useState(null)
  const attemptedRef = useRef(new Set())
  const lastFailureUrlRef = useRef(null)

  const availableEpisodes = episodesLoading ? [] : episodes
  const nextEpisode = adjacentEpisode({ seasons, episodes: availableEpisodes, season, episode }, 1)
  const previousEpisode = adjacentEpisode({ seasons, episodes: availableEpisodes, season, episode }, -1)

  // Playback position tracking + resume via the provider's postMessage API.
  const playerIframeRef = useRef(null)
  const { items: historyItems, updatePosition } = useHistory()
  const latestHistoryRef = useRef(historyItems)
  latestHistoryRef.current = historyItems
  const lastWrittenRef = useRef(null)
  const resumedForRef = useRef(null)
  const [resumeNotice, setResumeNotice] = useState(null)

  const contentRequest = useMemo(
    () => (mode === 'content' && providerId ? resolveEmbedUrl(providerId, mediaType, id, season, episode, providerOptions) : { url: null, error: null }),
    [mode, providerId, mediaType, id, season, episode, providerOptions]
  )
  const contentPlayerUrl = contentRequest.url
  const requestedVariant = providerId === 'moviemaster' ? providerOptions.moviemaster?.requestedVariant ?? null : providerId === 'vidcloud' ? 'sub' : null
  const routing = languageRouting(providerId, playbackPreference, requestedVariant)
  const nextProvider = nextAvailableProvider(providerId, selection.candidates, PRIMARY_PROVIDER_ORDER)
  const nextProviderName = 'Opción ' + (PRIMARY_PROVIDER_ORDER.indexOf(nextProvider) + 1)
  const currentProviderName = providers.find(item => item.id === providerId)?.name || 'Fuente no seleccionada'
  const avoidSource = () => {
    if (!providerId || excludedProviders.includes(providerId)) return
    // Persistently avoid this iframe: a pre-roll inside third-party video cannot be removed by the parent page.
    setExcludedProviders([...excludedProviders, providerId])
  }
  const restoreSource = id => {
    setExcludedProviders(excludedProviders.filter(item => item !== id))
  }
  useEffect(() => {
    setFrameLoaded(false)
    setFrameErrorUrl(null)
    setFrameTimeoutUrl(null)
  }, [contentPlayerUrl])

  const bridge = usePlayerBridge({
    iframeRef: playerIframeRef,
    playerUrl: contentPlayerUrl,
    active: mode === 'content',
  })

  const vidriftTelemetry = useVidRiftEvidence({
    iframeRef: playerIframeRef,
    active: mode === 'content' && providerId === 'vidrift' && frameLoaded &&
      !getAuthorizedMedia(mediaType, id, season, episode),
    playerUrl: contentPlayerUrl, mediaType, id, season, episode,
  })
  const evidenceRequest = useMemo(() => ({ mediaType, id, season, episode }), [mediaType, id, season, episode])

  // Begin a fresh, bounded rescue sequence for each title/episode/language.
  const rescueScope = `${mediaType}:${id}:${season}:${episode}:${playbackPreference}`
  useEffect(() => {
    attemptedRef.current.clear()
    lastFailureUrlRef.current = null
  }, [rescueScope])

  // No reliable cross-origin playback inspection is possible. A loaded iframe
  // may still show a spinner while working; DO NOT switch based on silence.
  useEffect(() => {
    if (mode !== 'content' || !contentPlayerUrl || frameLoaded) return
    const timer = setTimeout(() => setFrameTimeoutUrl(contentPlayerUrl), EMBED_LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [mode, contentPlayerUrl, frameLoaded])

  useEffect(() => {
    // Do not silently reopen an ad-supported third-party player on every error.
    // A new iframe may show a new preroll, so failover requires explicit opt-in.
    if (mode !== 'content' || !providerId || !autoFallback) return
    const status = bridge.providerStatus
    const token = contentPlayerUrl || `${rescueScope}:${providerId}:invalid`
    const failed = shouldAttemptFallback({
      currentUrl: contentPlayerUrl,
      frameLoaded,
      frameErrorUrl,
      elapsedMs: frameTimeoutUrl === contentPlayerUrl ? EMBED_LOAD_TIMEOUT_MS : 0,
      status: status?.event,
      statusUrl: status?.playerUrl,
    }) || !contentPlayerUrl && Boolean(contentRequest.error) ||
      framePolicy(providerId, restrictedFrames).blocked
    if (!failed || lastFailureUrlRef.current === token) return
    lastFailureUrlRef.current = token
    attemptedRef.current.add(providerId)
    const candidate = nextUntriedProvider({
      providerId, candidates: selection.candidates,
      attempted: attemptedRef.current, order: PRIMARY_PROVIDER_ORDER,
    })
    if (!candidate) {
      setPortalNotice(portalMessage({ kind: 'error' }))
      return
    }
    attemptedRef.current.add(candidate)
    setPortalNotice(portalMessage({ kind: 'fallback', sourceNumber: PRIMARY_PROVIDER_ORDER.indexOf(candidate) + 1 }))
    setProvider(candidate)
  }, [mode, providerId, contentPlayerUrl, contentRequest.error, bridge.providerStatus,
      frameErrorUrl, frameTimeoutUrl, frameLoaded, restrictedFrames, autoFallback,
      selection.candidates, setProvider, rescueScope])

  useEffect(() => {
    if (mode !== 'content' || !portalNotice) return
    const timer = setTimeout(() => setPortalNotice(null), 4200)
    return () => clearTimeout(timer)
  }, [portalNotice, mode])


  // Resume where the user left off once the player reports telemetry.
  useEffect(() => {
    if (mode !== 'content' || !bridge.ready || !bridge.supportsCommands || !contentPlayerUrl) return
    if (resumedForRef.current === contentPlayerUrl) return
    resumedForRef.current = contentPlayerUrl
    setResumeNotice(null)
    const sa = mediaType === 'tv' ? season : null
    const ep = mediaType === 'tv' ? episode : null
    const entry = latestHistoryRef.current.find(
      (m) => m.key === media.key && m.season === sa && m.episode === ep
    )
    const position = entry?.positionSeconds || 0
    const duration = entry?.durationSeconds || 0
    if (position < 15 || (duration > 0 && position > duration - 20)) return
    const target = duration > 5 ? Math.min(position, duration - 5) : position
    bridge.seek(target)
    bridge.play()
    setResumeNotice(target)
    const timer = setTimeout(() => setResumeNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [mode, bridge, bridge.ready, contentPlayerUrl, media.key, mediaType, season, episode])

  // Save the current position periodically and once on leave.
  useEffect(() => {
    if (mode !== 'content') return
    const sa = mediaType === 'tv' ? season : null
    const ep = mediaType === 'tv' ? episode : null
    const write = (force = false) => {
      const s = bridge.getState()
      if (s.updatedAt && s.time >= 5) {
        if (!force && lastWrittenRef.current != null && Math.abs(s.time - lastWrittenRef.current) < 4) return
        lastWrittenRef.current = s.time
        updatePosition(media.key, s.time, s.duration, sa, ep)
        return
      }
      // No live telemetry: mirror the provider's own progress store, which it
      // broadcasts as MEDIA_DATA every few seconds (progress:m{tmdbId} keys for
      // movies, progress:t{id} + show_progress.sNeN for series).
      const store = bridge.getMediaData?.()
      const mine = store?.[`${mediaType === 'tv' ? 't' : 'm'}${id}`]
      const progress =
        (mediaType === 'tv'
          ? mine?.show_progress?.[`s${season}e${episode}`]?.progress
          : null) ?? mine?.progress
      const watched = Number(progress?.watched)
      if (!Number.isFinite(watched) || watched < 5) return
      if (lastWrittenRef.current != null && Math.abs(watched - lastWrittenRef.current) < 10) return
      lastWrittenRef.current = watched
      updatePosition(media.key, watched, Number(progress.duration) || 0, sa, ep)
    }
    const timer = setInterval(() => write(), 5000)
    return () => {
      clearInterval(timer)
      write(true)
    }
  }, [mode, bridge, media.key, mediaType, id, season, episode, updatePosition])

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.target?.closest?.('dialog[open], input, textarea, select, button, [contenteditable]')) return
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          onClose()
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reloadPlayer = () => {
    setFrameLoaded(false)
    setFrameErrorUrl(null)
    setFrameTimeoutUrl(null)
    setPortalNotice('Reabriendo esta señal. Si se había detenido, adelanta manualmente hasta el punto donde falló.')
    setPlayerReload(count => count + 1)
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen?.()
    }
  }

  return (
    <div className="cinema-watch min-h-screen bg-ink pt-16">
      <div className="flex min-h-16 items-center justify-between border-b border-white/10 bg-ink px-4 sm:px-6 lg:px-10">
        <button onClick={onClose} className="inline-flex items-center gap-1 text-sm font-bold text-cream/80 hover:text-white">
          <ChevronLeftIcon className="h-5 w-5" /> Volver a detalles
        </button>
        <p className="line-clamp-1 px-4 text-xs font-bold uppercase tracking-wider text-mist">
          {mode === 'trailer' ? `${media.title} avance` : mediaType === 'tv' ? `${media.title} · S${season} E${episode}` : media.title}
        </p>
        <div className="flex items-center gap-2">
          {mediaType === 'tv' && mode === 'content' && <EpisodePicker id={id} title={media.title} seasons={seasons} season={season} episode={episode} onSelect={onNavigateEpisode} />}
          <button
            onClick={toggleFullscreen}
            className="rounded-lg border border-white/15 bg-surface p-2 text-white transition hover:bg-white/10"
            aria-label="Pantalla completa"
            title="Pantalla completa (F)"
          >
            <FullscreenIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {mode === 'content' && !getAuthorizedMedia(mediaType, id, season, episode) && (
        <div role="status" aria-live="polite" className="patched-portal-status patched-signal-strip">
          <span className="patched-portal-ink" aria-hidden="true"><span /></span>
          <span>{portalNotice || (providerId && !frameLoaded
            ? portalMessage({ sourceNumber: Math.max(1, PRIMARY_PROVIDER_ORDER.indexOf(providerId) + 1), mediaType })
            : `Reproductor externo abierto · ${providerId ? 'Opción ' + (PRIMARY_PROVIDER_ORDER.indexOf(providerId) + 1) : 'sin fuente'}. El iframe puede mostrar anuncios; el video todavía no está confirmado.`)}</span>
        </div>
      )}
      <div ref={containerRef} className={getAuthorizedMedia(mediaType, id, season, episode) ? "relative mx-auto w-full max-w-screen-2xl bg-black" : "relative mx-auto aspect-video w-full max-w-screen-2xl bg-black"}>
        {resumeNotice != null && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
            Reanudado en {formatClock(resumeNotice)}
          </div>
        )}
        {mode === 'trailer' && trailerUrl ? (
          <iframe
            src={trailerUrl}
            title={`${media.title} avance`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          getAuthorizedMedia(mediaType, id, season, episode) ? (
            <ControlledPlayer entry={getAuthorizedMedia(mediaType, id, season, episode)} />
          ) : (
            providerId ? <PlayerEmbed key={`${contentPlayerUrl}:${playerReload}`} selectedProviderId={providerId} selectedProviderOptions={providerOptions} mediaType={mediaType} id={id} season={season} episode={episode} title={media.title} iframeRef={playerIframeRef} onFrameLoad={() => setFrameLoaded(true)} onFrameError={() => setFrameErrorUrl(contentPlayerUrl)} /> : <p role="status" className="p-6 text-amber-100">No se ha cargado ningún proveedor. Elige una fuente explícitamente; no se sustituirá el idioma solicitado.</p>
          )
        )}
      </div>


      {mode === 'content' && <PlaybackTools mediaType={mediaType} id={id} season={season} episode={episode} providerId={providerId} onReload={reloadPlayer} />}

      {mode === 'content' && (
        <section className="mx-auto w-full max-w-screen-2xl border-b border-white/10 bg-[#111c16] px-4 py-3 sm:px-6 lg:px-10" aria-label="Protección frente a interrupciones externas">
          <p className="text-xs font-bold text-cream">Evitar publicidad de reproductores externos</p>
          <p className="mt-2 text-xs leading-5 text-mist">Fuente actualmente abierta: <strong className="text-cream">{providerId ? `${currentProviderName} (opción ${PRIMARY_PROVIDER_ORDER.indexOf(providerId) + 1})` : 'ninguna'}</strong>. Si ese iframe muestra anuncios como el de Halloween, puedes excluirlo. La exclusión se guarda para todos los capítulos y siguientes visitas en este navegador.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {providerId && <button type="button" onClick={avoidSource}
              className="min-h-11 rounded-md border border-amber-300/30 bg-amber-200/10 px-4 text-xs font-bold text-amber-100 hover:bg-amber-200/20">
              Dejar de usar esta opción por anuncios
            </button>}
            {PRIMARY_PROVIDER_ORDER.filter(sourceId => excludedProviders.includes(sourceId)).map(sourceId =>
              <button key={sourceId} type="button" onClick={() => restoreSource(sourceId)}
                className="min-h-11 rounded-md border border-white/20 px-3 text-xs font-semibold text-cream hover:bg-white/10">
                Reactivar opción {PRIMARY_PROVIDER_ORDER.indexOf(sourceId) + 1}
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="inline-flex items-center gap-2 text-xs text-cream/85">
              <input type="checkbox" checked={restrictedFrames}
                onChange={event => {
                  if (providerId) setProvider(providerId)
                  setRestrictedFrames(event.target.checked)
                }} />
              Restringir ventanas emergentes (no elimina anuncios de video)
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-cream/85">
              <input type="checkbox" checked={autoFallback} onChange={event => setAutoFallback(event.target.checked)} />
              Cambiar servidor automáticamente cuando falle
            </label>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-mist">
            La restricción de ventanas limita algunas acciones del iframe, pero no quita anuncios incluidos en el video.
            Algunas fuentes pueden negarse a reproducir con este modo; VidRift y VidCloud no son compatibles.
            Para evitar que se reinicie otro reproductor y vuelva a salir publicidad, el cambio automático está desactivado inicialmente.
          </p>
          {restrictedFrames && (
            <p role="status" className="mt-2 text-xs font-semibold text-amber-200">
              Protección experimental activa. {['vidrift', 'vidcloud'].includes(providerId)
                ? 'Esta fuente no funciona con sandbox; elige MovieMaster o FacilitoPlay, o desactiva la protección.'
                : 'Si la fuente muestra «sandbox no permitido», desactiva esta opción.'}
            </p>
          )}
        </section>
      )}

      {mode === 'content' && (
        <section className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-6 lg:px-10" aria-label="Servidores de reproducción">
          <span className="mr-2 text-xs font-semibold text-mist">Portales disponibles</span>
          {PRIMARY_PROVIDER_ORDER.every(id => excludedProviders.includes(id)) && <span role="status" className="text-xs font-semibold text-amber-100">Excluiste todas las fuentes principales. Puedes reactivar alguna arriba o usar un enlace externo guardado.</span>}
          {PRIMARY_PROVIDER_ORDER.map((sourceId, index) => {
            const candidate = selection.candidates.find(c => c.providerId === sourceId)
            return <button key={sourceId} type="button" disabled={!candidate?.available}
              aria-pressed={providerId === sourceId}
              onClick={() => setProvider(sourceId)}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${providerId === sourceId ? 'border-brand bg-brand/20 text-white' : 'border-white/20 bg-white/5 text-cream/80 hover:bg-white/10'} disabled:cursor-not-allowed disabled:opacity-30`}>
              Opción {index + 1}
            </button>
          })}
          {nextProvider && <button type="button" onClick={() => setProvider(nextProvider)} className="rounded-full border border-white/25 px-4 py-2 text-xs font-bold text-white hover:bg-white/10" aria-label={`Probar ${nextProviderName} manualmente`}>
            Otra señal: {nextProviderName} →
          </button>}
          <span className="text-[11px] text-mist">Cambio de opción sin perder el capítulo. El idioma puede variar.</span>
        </section>
      )}
      {mode === 'content' && <details className="patched-playback-details"><summary>Detalles de reproducción</summary>
        <p className="text-xs text-mist">Opción 1 · MovieMaster / Opción 2 · FacilitoPlay / Opción 3 · VidRift</p>
          {mode === 'content' && (
            <select
              aria-label="Proveedor de reproducción"
              value={providerId || ''}
              onChange={(event) => setProvider(event.target.value)}
              className="rounded-lg border border-white/15 bg-surface px-3 py-2 text-xs font-bold text-white outline-none"
            >
              <option value="">Elegir fuente…</option>
              {providers.map((provider) => {
                const candidate = selection.candidates.find(c => c.providerId === provider.id)
                return <option key={provider.id} value={provider.id} title={candidate?.reason || 'Excluido en ajustes'} disabled={!candidate?.available}>{provider.name} · {!candidate?.available ? 'no disponible' : candidate.confirmed ? 'audio registrado' : 'idioma por comprobar'}</option>
              })}
            </select>
          )}

      {mode === 'content' && <section className="mx-auto max-w-screen-2xl px-4 py-3 text-sm text-amber-100" aria-label="Preferencia y selección de fuente">
        <label htmlFor="playback-preference">Idioma solicitado </label>
        <select id="playback-preference" className="rounded border border-white/20 bg-surface p-2 text-white" value={playbackPreference} onChange={event => setPlaybackPreference(event.target.value)}>
          {PLAYBACK_PREFERENCES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p role="status" className="mt-2 text-xs leading-5 text-cream/75">{routing.message.replaceAll('StreamBox', 'PATCHED')}</p>
        {playbackPreference === 'ja-es' && <p className="mt-1 text-xs text-amber-200">«Subtitulado» no permite elegir automáticamente inglés, japonés ni el idioma de los subtítulos. Depende de las pistas ofrecidas en cada episodio.</p>}
        <details className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-semibold text-cream/80">Información técnica de esta fuente</summary>
          <p className="mt-2">{selectionReason}</p>
          {providerId && <p className="mt-1">{selection.candidates.find(c => c.providerId === providerId)?.reason}</p>}
        </details>
      </section>}

      {mode === 'content' && <ProviderEvidencePanel
        request={evidenceRequest}
        preference={playbackPreference}
        selectedProviderId={providerId}
        candidates={selection.candidates}
        onChoose={setProvider}
        vidriftTelemetry={vidriftTelemetry}
      />}
      {mode === 'content' && <AvailabilityStrip mediaType={mediaType} id={id} season={season} episode={episode} />}
      {mode === 'content' && providerId && !getAuthorizedMedia(mediaType, id, season, episode) && (
        <section className="mx-auto w-full max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-10">
          <PlaybackVerificationPanel mediaType={mediaType} id={id} season={season} episode={episode} providerId={providerId} requestedVariant={requestedVariant} />
        </section>
      )}
      {mode === 'content' && providerId && !contentRequest.error && !getAuthorizedMedia(mediaType, id, season, episode) && (
        <details className="mx-auto w-full max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-10">
          <summary className="cursor-pointer text-xs font-semibold text-mist hover:text-white">Diagnóstico de reproducción · informar si el video funciona</summary>
        <PlayerAuditPanel
          key={contentPlayerUrl}
          frameLoaded={frameLoaded}
          bridge={bridge}
          onChooseAnother={() => setProvider('')}
        />
        </details>
      )}


      </details>}

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-7 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
              {mode === 'trailer' ? 'Avance' : mediaType === 'tv' ? `Temporada ${season} · Episodio ${episode}` : 'Contenido seleccionado'}
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {media.title}
            </h1>
          </div>
          {mode === 'content' && mediaType === 'tv' && (
            <div className="flex flex-wrap gap-2">
              {previousEpisode && <button type="button" onClick={() => onNavigateEpisode(previousEpisode)} className="rounded-full border border-white/25 px-4 py-2.5 text-xs font-bold text-cream hover:bg-white/10">← Episodio anterior</button>}
              {nextEpisode && <button type="button" onClick={() => onNavigateEpisode(nextEpisode)} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-cream">
                {nextEpisode.season !== season ? 'Siguiente temporada' : 'Siguiente episodio'} <NextIcon className="h-4 w-4" />
              </button>}
            </div>
          )}
        </div>

      </div>
      {relatedItems?.length > 0 && <Row title="Para seguir explorando" items={relatedItems} />}
    </div>
  )
}

function PageMessage({ children }) {
  return <div className="flex min-h-screen items-center justify-center bg-ink text-mist">{children}</div>
}

function formatDuration(runtime) {
  if (!runtime) return null
  return `${runtime >= 60 ? `${Math.floor(runtime / 60)}h ` : ''}${runtime % 60}m`
}

function formatClock(seconds) {
  const total = Math.floor(seconds)
  const pad = (n) => String(n).padStart(2, '0')
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).map((word) => word[0]).slice(0, 2).join('').toUpperCase()
}
