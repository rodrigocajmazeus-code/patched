import Brand from './Brand.jsx'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useMyList } from '../context/MyListContext.jsx'
import { useHistory } from '../context/HistoryContext.jsx'
import { SearchIcon, CloseIcon } from './icons.jsx'

const navLinks = [{to:'/',label:'Inicio'},{to:'/anime',label:'Anime'},{to:'/series',label:'Series'},{to:'/movies',label:'Películas'},{to:'/tv',label:'TV en vivo'},{to:'/mylist',label:'Mi lista'}]
const libraryLinks = [{to:'/history',label:'Historial'},{to:'/cobertura',label:'Comprobaciones'},{to:'/inventario',label:'Índice de disponibilidad'},{to:'/party',label:'Sala compartida'},{to:'/settings',label:'Configuración'}]
export default function Navbar() {
  const [menuOpen,setMenuOpen]=useState(false)
  const {items}=useMyList()
  const {items:historyItems}=useHistory()
  const location=useLocation()
  useEffect(()=>setMenuOpen(false),[location.pathname,location.search])
  useEffect(()=>{if(!menuOpen)return;const close=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setMenuOpen(false)}};document.addEventListener('keydown',close,true);return()=>document.removeEventListener('keydown',close,true)},[menuOpen])
  return <header className="cinema-header">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    <nav className="cinema-nav" aria-label="Navegación principal">
      <Link to="/" className="cinema-wordmark" aria-label="PATCHED inicio"><Brand /></Link>
      <div className="cinema-nav-links">{navLinks.map(l=><NavLink key={l.to} to={l.to} end={l.to==='/'}>{l.label}{l.to==='/mylist'&&items.length>0&&<small>{items.length}</small>}</NavLink>)}</div>
      <div className="cinema-nav-actions">
        <Link className="cinema-icon-button" to="/search" aria-label="Buscar"><SearchIcon className="h-5 w-5" /></Link>
        <button className="cinema-icon-button" aria-label="Abrir o cerrar menú" aria-controls="site-menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<CloseIcon className="h-5 w-5" />:<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg>}</button>
      </div>
    </nav>
    {menuOpen&&<div id="site-menu" className="cinema-menu"><div className="cinema-menu-categories">{navLinks.map(l=><NavLink key={l.to} to={l.to} end={l.to==='/'}>{l.label}</NavLink>)}</div><div className="cinema-menu-library">{libraryLinks.map(l=><Link key={l.to} to={l.to}>{l.label}{l.to==='/history'&&historyItems.length>0&&<small> {historyItems.length}</small>}</Link>)}<Dropdown mobile /></div></div>}
  </header>
}
function Dropdown({ mobile = false }) {
  const [open, setOpen] = useState(false)
  const base = mobile
    ? 'flex w-full items-center justify-between py-3 text-base font-semibold text-cream hover:text-white'
    : 'flex items-center gap-1 text-sm font-semibold text-cream/85 hover:text-white transition-colors'

  return (
    <div className={mobile ? 'relative' : 'relative'}>
      <button className={base} onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}>
        Explorar por género
        <svg
          className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute left-0 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-surface-light/95 p-2 shadow-2xl shadow-black/50 backdrop-blur md:grid-cols-3 ${
            mobile ? 'static mt-1' : 'mt-3 w-[440px]'
          }`}
          onMouseLeave={mobile ? undefined : () => setOpen(false)}
        >
          {GENRES.map((g) => (
            <Link
              key={g.id}
              to={`/genre/${g.id}`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-cream/85 transition-colors hover:bg-brand/20 hover:text-white"
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export const GENRES = [
  { id: 28, name: 'Acción' },
  { id: 12, name: 'Aventura' },
  { id: 16, name: 'Animación' },
  { id: 35, name: 'Comedia' },
  { id: 80, name: 'Crimen' },
  { id: 99, name: 'Documental' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Familiar' },
  { id: 14, name: 'Fantasía' },
  { id: 36, name: 'Historia' },
  { id: 27, name: 'Terror' },
  { id: 10402, name: 'Música' },
  { id: 9648, name: 'Misterio' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ciencia ficción' },
  { id: 53, name: 'Suspense' },
]
