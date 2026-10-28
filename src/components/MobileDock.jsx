import { NavLink, useLocation } from 'react-router-dom'

// Navegación inferior de inspiración editorial; no reutiliza HTML, CSS ni assets de CuePlay.
const routes = [
  { to: '/', text: 'Inicio', icon: 'home' },
  { to: '/anime', text: 'Anime', icon: 'tv' },
  { to: '/series', text: 'Series', icon: 'tv' },
  { to: '/movies', text: 'Películas', icon: 'film' },
  { to: '/tv', text: 'TV', icon: 'tv' },
  { to: '/search', text: 'Buscar', icon: 'search' },
]

function Icon({ type }) {
  const common = { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
    film: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m10 0h4M3 15h4m10 0h4"/></>,
    tv: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 22h6M12 19v3"/></>,
    bookmark: <path d="M5 3h14v18l-7-5-7 5z"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  }
  return <svg {...common}>{paths[type]}</svg>
}

export default function MobileDock() {
  const location=useLocation()
  if(location.pathname.startsWith('/watch/') || location.pathname.startsWith('/party/')) return null
  return (
    <nav className="cue-mobile-dock" aria-label="Navegación móvil">
      {routes.map(r=><NavLink key={r.to} to={r.to} end={r.to === '/'}
        className={({isActive})=>'cue-dock-item'+(isActive?' cue-dock-active':'')}>
        <Icon type={r.icon}/><span>{r.text}</span>
      </NavLink>)}
    </nav>
  )
}
