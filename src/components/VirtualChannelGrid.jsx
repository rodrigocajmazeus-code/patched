import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LIVE_TV_ROW_HEIGHT, tvGridColumns, visibleTvRows } from '../tv/virtualGrid.js'

function ChannelCard({ channel, selected, favorite, onSelect, onFavorite }) {
  return (
    <article className={'group relative min-w-0 overflow-hidden rounded-lg border bg-[#19221e] transition-colors ' + (selected ? 'border-[#91baa5]' : 'border-white/10 hover:border-white/30')}>
      <button type="button" onClick={() => onSelect(channel)} aria-pressed={selected}
        className="flex h-full min-h-[160px] w-full flex-col items-start px-3 pb-3 pt-4 text-left">
        <span className="relative mb-3 flex h-12 w-20 items-center justify-center rounded-md bg-[#101614] text-2xl">
          {channel.flag}
          {channel.logo && <img src={channel.logo} alt="" loading="lazy" referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full rounded-md object-contain p-1"
            onError={event => { event.currentTarget.style.display = 'none' }} />}
        </span>
        <strong className="line-clamp-2 text-sm leading-5 text-cream">{channel.name}</strong>
        <span className="mt-1 text-[11px] text-mist">{channel.flag} {channel.countryName}</span>
        <span className={'mt-auto pt-2 text-[10px] font-semibold ' + (channel.source ? 'text-[#a9d7ae]' : 'text-[#aab0b1]')}>
          {channel.source ? (channel.sources?.length > 1 ? channel.sources.length + ' señales para intentar' : '1 señal para intentar') : channel.website ? 'Abrir sitio oficial' : 'Sin enlace de emisión'}
        </span>
      </button>
      <button type="button" onClick={() => onFavorite(channel.id)} aria-label={(favorite ? 'Quitar de' : 'Añadir a') + ' favoritos: ' + channel.name}
        aria-pressed={favorite} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0c120f]/90 text-base text-cream hover:text-brand">
        {favorite ? '♥' : '♡'}
      </button>
    </article>
  )
}

export default function VirtualChannelGrid({ channels, selectedId, favorites, onSelect, onFavorite }) {
  const rootRef = useRef(null)
  const [width, setWidth] = useState(360)
  const [position, setPosition] = useState({ start: 0, end: 0, firstRow: 0 })
  const columns = tvGridColumns(width)
  const totalRows = Math.ceil(channels.length / columns)
  const favoriteIds = useMemo(() => new Set(favorites), [favorites])

  useLayoutEffect(() => {
    let frame = 0
    const measure = () => {
      const element = rootRef.current
      if (!element) return
      const measuredWidth = element.clientWidth
      const next = visibleTvRows({
        itemCount: channels.length,
        columns: tvGridColumns(measuredWidth),
        top: element.getBoundingClientRect().top,
        viewportHeight: window.innerHeight,
      })
      setWidth(prev => prev === measuredWidth ? prev : measuredWidth)
      setPosition(prev =>
        prev.start === next.start && prev.end === next.end && prev.firstRow === next.firstRow
          ? prev
          : { start: next.start, end: next.end, firstRow: next.firstRow }
      )
    }
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    if (observer && rootRef.current) observer.observe(rootRef.current)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [channels.length])

  return (
    <div ref={rootRef} aria-label={'Directorio de ' + channels.length + ' canales; desliza para explorar todos'}
      className="relative mt-5 w-full" style={{ height: totalRows * LIVE_TV_ROW_HEIGHT }}>
      <div className="absolute inset-x-0 grid gap-3" style={{
        top: position.firstRow * LIVE_TV_ROW_HEIGHT,
        gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))',
        gridAutoRows: (LIVE_TV_ROW_HEIGHT - 12) + 'px',
      }}>
        {channels.slice(position.start, position.end).map(channel =>
          <ChannelCard key={channel.id} channel={channel} selected={selectedId === channel.id}
            favorite={favoriteIds.has(channel.id)} onSelect={onSelect} onFavorite={onFavorite} />
        )}
      </div>
    </div>
  )
}
