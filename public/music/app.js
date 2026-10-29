/* ONDA: standalone, mobile-first music player. External playback uses official public interfaces. */
(() => {
'use strict';
const API = 'https://api.audius.co/v1';
const BACKUP_API = 'https://discoveryprovider.audius.co/v1';
const JAMENDO = 'https://api.jamendo.com/v3.0/tracks/';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_PAGE_SIZE = 25;
const SOURCES = ['todos','audius','commons','jamendo'];
const SOURCE_LABEL = {todos:'Todos los catálogos',audius:'Audius',commons:'Wikimedia Commons',jamendo:'Jamendo'};
const PAGE_SIZE = 50; // Pagination, not a catalog cap; results stream on demand.
const KEY = 'onda.prefs.v1';
const ICONS = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
 'heart-fill':'<path fill="currentColor" stroke="none" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
 music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 play:'<path fill="currentColor" stroke="none" d="m7 4 14 8-14 8z"/>',pause:'<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
 next:'<path d="m5 4 11 8-11 8z"/><path d="M19 4v16"/>',prev:'<path d="m19 4-11 8 11 8z"/><path d="M5 4v16"/>',
 queue:'<path d="M3 6h14M3 12h14M3 18h9"/><path d="m17 15 4 3-4 3z"/>',shuffle:'<path d="m4 4 16 16M16 4h4v4M20 4 4 20M16 20h4v-4"/>',
 repeat:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
 volume:'<path d="M3 9v6h4l5 4V5L7 9zM16 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12"/>',
 download:'<path d="M12 3v13m-5-5 5 5 5-5M5 20h14"/>',library:'<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><path d="m17 6 3 14"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1A7 7 0 0 0 15 6l-.5-2.5h-4.9L9.1 6a7 7 0 0 0-1.6 1.1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.6 1.1l.5 2.5h4.9L15 18a7 7 0 0 0 1.6-1.1l2.3 1 2-3.4-2-1.5A7 7 0 0 0 19 12z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M5 5l14 14M19 5 5 19"/>', chevron:'<path d="m9 5 7 7-7 7"/>',expand:'<path d="M15 3h6v6M21 3l-8 8M9 21H3v-6M3 21l8-8"/>',list:'<path d="M4 5h16M4 12h16M4 19h16"/>',file:'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',radio:'<circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/>'
};
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.music}</svg>`;
const icon = name => `<span class="ico">${svg(name)}</span>`;
const enc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
const fmt = t => { if (!Number.isFinite(+t) || +t < 0) return '0:00'; t = Math.floor(+t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2,'0')}`; };
const readPrefs = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const stored = readPrefs();
const state = {
 view:'home', source:stored.catalogV3 && SOURCES.includes(stored.source) ? stored.source : 'todos',
 jamendoId: typeof stored.jamendoId === 'string' ? stored.jamendoId : '',
 favorites:Array.isArray(stored.favorites) ? stored.favorites.filter(t=>t && t.id && t.provider !== 'local').slice(0,2000) : [],
 recent:Array.isArray(stored.recent) ? stored.recent.filter(t=>t && t.id && t.provider !== 'local').slice(0,35) : [],
 volume:Number.isFinite(stored.volume) ? stored.volume : .82,
 trending:[], underground:[], results:[], local:[], queue:[], current:null, currentIndex:-1,
 query:'', genre:'Todo', loading:true, searching:false, loadingMore:false, hasMore:false, pageOffset:0, pageKind:'search', error:'', shuffle:false, repeat:false,
 playing:false, modal:'', installPrompt:null, requestId:0, pageOffsets:{}, pageAvailable:{}, providerWarning:'', enabled:[]
};
const catalog = new Map();
const $ = selector => document.querySelector(selector);
const audio = $('#audio');
const content = $('#content');
const save = () => { try {localStorage.setItem(KEY, JSON.stringify({source:state.source,catalogV3:true,jamendoId:state.jamendoId,favorites:state.favorites, recent:state.recent, volume:state.volume}));}catch{} };
let toastTimer;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3400);}
function normalize(t, provider='audius') {
  if (!t || typeof t !== 'object') return null;
  const id = String(t.id ?? ''); if (!id) return null;
  const local = provider==='local';
  const art = local ? '' : provider==='commons' ? '' : provider==='jamendo' ? validUrl(t.image) : validUrl(t.artwork?.['480x480'] || t.artwork?.['1000x1000'] || t.artwork?.['_480x480'] || t.artwork?.['_1000x1000'] || t.artwork?.['150x150']);
  return { id:`${provider}:${id}`, rawId:id, title:String(t.title || t.name || 'Sin título'),artist:String(t.user?.name || t.artist_name || 'Artista desconocido'),art, duration:Number(t.duration) || 0,genre:String(t.genre || ''),provider,src: local ? t.src : (provider === 'jamendo' || provider === 'commons') ? validUrl(t.audio || t.src) : '', gated:provider==='audius' && (t.is_streamable===false || t.isStreamable===false || t.is_stream_gated===true || t.isStreamGated===true || t.access?.stream===false || t.stream_conditions?.follow_user_id), link:provider==='audius' ? validUrl(t.permalink) : validUrl(t.link),license:provider==='commons' ? String(t.license||'Licencia abierta') : ''};
}
function put(track) { if(track) catalog.set(track.id,track);return track; }
function normalizeList(raw, provider) {return (Array.isArray(raw)?raw:[]).map(t=>put(normalize(t,provider))).filter(Boolean).filter(t=>!t.gated);}
function rawPayload(j) { if (!j || typeof j !== 'object') throw new Error('Respuesta no válida');return Array.isArray(j.data) ? j.data : Array.isArray(j.results) ? j.results : []; }
async function getJson(url, signal) {
  const res=await fetch(url,{signal,headers:{'Accept':'application/json'}});
  if (!res.ok) throw new Error(res.status===429?'Demasiadas consultas. Intenta nuevamente.':res.status===401||res.status===403?'El servicio requiere autorización.':'Error HTTP '+res.status);
  return res.json();
}
async function audius(path){
  let err;
  for(const base of [API,BACKUP_API]){
    const c=new AbortController();const timeout=setTimeout(()=>c.abort(),12000);
    try {const j=await getJson(base+path,c.signal);clearTimeout(timeout);const raw=rawPayload(j);return {tracks:normalizeList(raw,'audius'),count:raw.length};}
    catch(e){clearTimeout(timeout);err=e;}
  }
  throw err || new Error('Audius no está disponible');
}
async function jamendo(params={}){
  if(!state.jamendoId) throw new Error('Configura tu Client ID gratuito de Jamendo en Ajustes.');
  const url=new URL(JAMENDO);Object.entries({client_id:state.jamendoId,format:'json',limit:String(PAGE_SIZE),audioformat:'mp32',...params}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  const c=new AbortController(), timeout=setTimeout(()=>c.abort(),12000);
  try {const j=await getJson(url.toString(),c.signal);if(j.headers?.status==='failed')throw new Error(j.headers.error_message || 'Jamendo rechazó la consulta');const raw=rawPayload(j);return {tracks:normalizeList(raw,'jamendo').filter(t=>t.src),count:raw.length};}finally{clearTimeout(timeout);}
}
// Open-licensed Commons recordings: filenames and their original attribution remain visible.
const cleanText = value => String(value || '').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
function commonsNormalize(page){
  const info=page.imageinfo?.[0];
  const src=validUrl(info?.url);
  const mime=String(info?.mime||'');
  if(!src || !mime.startsWith('audio/') || !/\.(ogg|oga|opus|mp3|wav|flac|m4a|webm)(?:$|\?)/i.test(src))return null;
  const meta=info.extmetadata || {};
  const name=String(page.title||'').replace(/^File:/,'').replace(/\.(ogg|oga|opus|mp3|wav|flac|m4a|webm)$/i,'').replace(/_/g,' ');
  const license=cleanText(meta.LicenseShortName?.value||'Licencia abierta');
  const artist=cleanText(meta.Artist?.value||meta.Credit?.value||'Autor en Wikimedia Commons').slice(0,140);
  return normalize({id:page.pageid,title:name,artist_name:artist,src,link:info.descriptionurl||`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,license},'commons');
}
async function commons(kind='search',query='',offset=0){
  const term=(kind==='search'?query:'music').trim() || 'music';
  const url=new URL(COMMONS);
  Object.entries({action:'query',generator:'search',gsrsearch:`filetype:audio ${term}`,gsrnamespace:'6',gsrlimit:String(COMMONS_PAGE_SIZE),gsroffset:String(offset),prop:'imageinfo',iiprop:'url|mime|extmetadata',format:'json',origin:'*',formatversion:'2'}).forEach(([k,v])=>url.searchParams.set(k,v));
  const c=new AbortController();const timer=setTimeout(()=>c.abort(),13000);
  try {
    const j=await getJson(url.toString(),c.signal);
    if(j.error)throw new Error(j.error.info||'Wikimedia rechazó la búsqueda');
    const pages=Array.isArray(j.query?.pages)?j.query.pages:[];
    return {tracks:pages.map(commonsNormalize).filter(Boolean).map(put),more:!!j.continue?.gsroffset,next:Number(j.continue?.gsroffset ?? offset+COMMONS_PAGE_SIZE)};
  } finally {clearTimeout(timer);}
}
function activeProviders(){
  if(state.source==='todos')return ['audius','commons',...(state.jamendoId?['jamendo']:[])];
  return [state.source];
}
function fetchProvider(provider,kind,query,offset){
  if(provider==='commons')return commons(kind,query,offset);
  if(provider==='audius'){
    const path=kind==='search'?`/tracks/search?query=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}`:kind==='underground'?`/tracks/trending/underground?limit=${PAGE_SIZE}&offset=${offset}`:`/tracks/trending?limit=${PAGE_SIZE}&offset=${offset}`;
    return audius(path).then(({tracks,count})=>({tracks,more:count===PAGE_SIZE,next:offset+PAGE_SIZE}));
  }
  const params=kind==='search'?{search:query,order:'relevance',offset,type:'single albumtrack'}:{order:kind==='underground'?'popularity_week':'popularity_month',offset,type:'single albumtrack'};
  return jamendo(params).then(({tracks,count})=>({tracks,more:count===PAGE_SIZE,next:offset+PAGE_SIZE}));
}
const uniqueTracks = list => [...new Map(list.map(t=>[t.id,t])).values()];
async function fetchBatch(kind,query='',offsets={},available={}){
  const providers=activeProviders().filter(p=>available[p]!==false);
  if(!providers.length)return {tracks:[],more:false,offsets:{...offsets},available:{...available},warnings:[]};
  const results=await Promise.allSettled(providers.map(p=>fetchProvider(p,kind,query,offsets[p]||0)));
  const nextOffsets={...offsets}, nextAvailable={...available},tracks=[],warnings=[];
  let successes=0;
  results.forEach((r,i)=>{
    const provider=providers[i];
    if(r.status==='fulfilled'){
      successes++;
      const v=r.value;
      tracks.push(...v.tracks);
      nextOffsets[provider]=v.next;
      nextAvailable[provider]=v.more;
    } else {
      warnings.push(`${SOURCE_LABEL[provider]}: ${r.reason?.message||'no disponible'}`);
      nextAvailable[provider]=false;
    }
  });
  if(!successes)throw new Error(warnings.join(' · ')||'Los proveedores no respondieron');
  return {tracks:uniqueTracks(tracks),more:activeProviders().some(p=>nextAvailable[p]!==false),offsets:nextOffsets,available:nextAvailable,warnings};
}
async function loadHome(){
  const seq=++state.requestId;
  state.loading=true;state.error='';state.providerWarning='';render();
  try{
    const res=await fetchBatch('trending');if(seq!==state.requestId)return;
    state.trending=res.tracks;state.providerWarning=res.warnings.join(' · ');state.loading=false;render();
    if(state.source==='audius'||state.source==='todos')fetchProvider('audius','underground','',0).then(v=>{if(seq!==state.requestId)return;state.underground=v.tracks;if(state.view==='home')render();}).catch(()=>{});
  }catch(e){if(seq!==state.requestId)return;state.error=e.message||'No se pudo cargar el catálogo';state.loading=false;state.trending=[];render();}
}
function sameFav(t){return state.favorites.some(f=>f.id===t?.id);}
function toggleFavorite(t){if(!t)return;if(t.provider==='local'){toast('Los archivos locales solo están disponibles en esta sesión.');return;}state.favorites=sameFav(t)?state.favorites.filter(f=>f.id!==t.id):[t,...state.favorites].slice(0,2000);save();render();updatePlayer();toast(sameFav(t)?'Agregada a tus favoritos':'Quitada de favoritos');}
function albumArt(t, cls='') {return `<div class="cover ${cls} ${t?.art?'':'placeholder'}">${t?.art ? `<img loading="lazy" src="${enc(t.art)}" alt="" onerror="this.parentElement.classList.add('placeholder');this.remove()"/>` : icon('music')}</div>`;}
function songCard(t) {return `<article class="album-card" data-play="${enc(t.id)}" role="button" tabindex="0" aria-label="Reproducir ${enc(t.title)} de ${enc(t.artist)}">${albumArt(t,'cover-art')}<h3 title="${enc(t.title)}">${enc(t.title)}</h3><p>${enc(t.artist)}</p><button class="card-play" data-play="${enc(t.id)}" aria-label="Reproducir ${enc(t.title)}">${icon('play')}</button></article>`;}
function songRow(t,i){return `<div class="song-row ${state.current?.id===t.id?'playing':''}" role="button" tabindex="0" data-play="${enc(t.id)}" aria-label="Reproducir ${enc(t.title)} de ${enc(t.artist)}"><span class="song-index">${String(i+1).padStart(2,'0')}</span><div class="song-info">${albumArt(t)}<div class="song-meta"><div class="song-main">${enc(t.title)}</div><div class="song-sub">${enc(t.artist)}</div></div></div><span class="song-artist">${enc(t.provider==='commons'?'Wikimedia · libre':t.genre || (t.provider==='local'?'Archivo local':t.provider==='jamendo'?'Jamendo':'Audius'))}</span><span class="song-length">${fmt(t.duration)}</span><div class="song-actions">${t.provider!=='local'?`<button class="icon-btn ${sameFav(t)?'active':''}" data-like="${enc(t.id)}" title="Favorito" aria-label="Favorito">${icon(sameFav(t)?'heart-fill':'heart')}</button>`:''}<button class="icon-btn" data-add="${enc(t.id)}" title="Añadir a la cola" aria-label="Añadir a la cola">${icon('plus')}</button></div></div>`;}
function listMarkup(list){return `<div class="track-list"><div class="list-head"><span>#</span><span>TÍTULO</span><span>GÉNERO / FUENTE</span><span>TIEMPO</span><span></span></div>${list.map(songRow).join('')}</div>`;}
function empty(title,body,action='',attr=''){return `<div class="empty-state">${icon('music')}<strong>${enc(title)}</strong><p>${enc(body)}</p>${action?`<button class="pill-btn primary" ${attr}>${enc(action)} ${icon('arrow')}</button>`:''}</div>`;}
function banner(){return `<div class="mini-banner"><div><h3>Tu música también cuenta.</h3><p>¿Tienes MP3 o FLAC en el celular? Reprodúcelos sin subirlos a ningún servidor.</p></div><button class="pill-btn" data-action="local-files">${icon('file')} Abrir archivos</button></div>`;}
function pick(list,n){return list.slice(0,n)}
function renderHome(){
 const lead=state.trending[0] || null;
 const hero=`<section class="hero"><div class="hero-info"><div class="eyebrow"><span class="status-dot"></span> TU ESPACIO PARA LA MÚSICA</div><h1>Dale play<br>a tu <em>momento.</em></h1><p>Descubre sonidos nuevos, arma tu lista y escucha sin complicarte la vida.</p><div class="hero-actions"><button class="pill-btn primary" data-action="play-trending">${icon('play')} Escuchar ahora</button><button class="pill-btn" data-view="search">Explorar música ${icon('arrow')}</button></div></div><div class="hero-art">${lead?.art?`<img src="${enc(lead.art)}" alt="Carátula de música destacada"/>`:icon('music')}</div></section>`;
 if(state.loading)return hero+`<div class="section-head"><h2>En tendencia</h2></div><div class="album-grid">${Array(5).fill('<div class="skeleton"></div>').join('')}</div>`;
 if(state.error)return hero+`<div class="notice">${enc(state.error)}. Comprueba tu conexión o cambia de fuente en Ajustes.</div><div style="margin-top:15px"><button class="pill-btn primary" data-action="reload">Reintentar</button></div>`+banner();
 return hero+`<div class="section-head"><div><h2>En tendencia</h2><div class="subline">Catálogos conectados: ${activeProviders().map(p=>SOURCE_LABEL[p]).join(' · ')} · música bajo demanda</div></div><button class="text-btn" data-action="all-trending">Ver todo ${icon('chevron')}</button></div>`+ (state.trending.length?`<section class="album-grid">${pick(state.trending,10).map(songCard).join('')}</section>`:empty('Todavía sin resultados','No se encontraron pistas disponibles.'))+`<div class="section-head"><div><h2>Para descubrir</h2><div class="subline">Algo diferente a lo de siempre</div></div></div>`+(state.underground.length?listMarkup(pick(state.underground,8)):state.trending.length?listMarkup(pick(state.trending.slice(10),8)):'')+`<div class="section-head"><div><h2>Explora más géneros</h2><div class="subline">Busca tantas canciones como quieras y sigue cargando resultados</div></div></div><div class="filters home-filters">${genres.filter(g=>g!=='Todo').map(g=>`<button class="filter-chip" data-genre="${enc(g)}">${enc(g)}</button>`).join('')}</div>`+banner();
}
const genres=['Todo','Latin','Reggaeton','Salsa','Cumbia','Pop','Rock','Hip-Hop','Electronic','House','Techno','Jazz','R&B','Lo-Fi','Ambient','Indie','Classical','Afrobeats','Metal','Funk'];
function renderSearch(){const res=state.results;return `<div class="eyebrow">EXPLORA A TU GUSTO</div><h1 class="page-heading" style="font-size:35px;margin:10px 0 0">Encuentra tu próxima favorita.</h1><div class="filters source-filters">${SOURCES.map(p=>`<button class="filter-chip ${state.source===p?'active':''}" data-source="${p}">${enc(SOURCE_LABEL[p])}</button>`).join('')}</div><div class="filters">${genres.map(g=>`<button class="filter-chip ${state.genre===g?'active':''}" data-genre="${enc(g)}">${enc(g)}</button>`).join('')}</div>${state.searching?`<div class="initial-loading"><span class="spinner"></span>Buscando canciones…</div>`:state.error?`<div class="notice">${enc(state.error)}</div><button class="pill-btn" data-action="retry-search" style="margin:12px 0">Reintentar</button>`:res.length?`<div class="section-head"><div><h2>${state.query?`Resultados de “${enc(state.query)}”`:'Explora música'}</h2><div class="subline">${res.length} canciones encontradas hasta ahora · ${activeProviders().map(p=>SOURCE_LABEL[p]).join(' + ')}</div></div></div>${state.providerWarning?`<div class="notice">${enc(state.providerWarning)}. Los demás proveedores siguen disponibles.</div>`:''}${listMarkup(res)}${state.hasMore?`<div class="more-results"><button class="pill-btn primary" data-action="load-more" ${state.loadingMore?'disabled':''}>${state.loadingMore?'<span class="spinner"></span> Buscando…':`${icon('plus')} Buscar más canciones`}</button><p>Resultados por páginas. Puedes continuar explorando el catálogo sin cargarlo entero en tu teléfono.</p></div>`:''}`:empty(state.query?'Sin coincidencias':'¿Qué te provoca escuchar?',state.query?'Prueba otro artista, canción o versión.':'Escribe algo arriba o toca un género para empezar.')}`;}
function renderLibrary(){const f=state.favorites,local=state.local;return `<div class="eyebrow">HECHA POR TI</div><h1 class="page-heading" style="font-size:35px;margin:10px 0 0">Tu música, a tu manera.</h1><div class="section-head"><div><h2>Me gusta <span style="color:var(--accent)">♥</span></h2><div class="subline">${f.length} canciones guardadas en este dispositivo</div></div>${f.length?`<button class="pill-btn primary" data-action="play-favorites">${icon('play')} Reproducir</button>`:''}</div>${f.length?listMarkup(f):empty('Todavía no tienes favoritos','Toca el corazón de una canción para guardarla aquí.','Buscar canciones','data-view="search"')}<div class="section-head"><div><h2>Archivos de tu celular</h2><div class="subline">Se usan solo en esta sesión. No se suben a Internet.</div></div><button class="text-btn" data-action="local-files">${icon('plus')} Añadir</button></div>${local.length?listMarkup(local):empty('Tu música local','Añade archivos MP3, M4A, OGG o FLAC compatibles con el navegador.','Seleccionar archivos','data-action="local-files"')}<div class="section-head"><h2>Escuchadas recientemente</h2></div>${state.recent.length?listMarkup(state.recent.slice(0,12)):empty('Aquí aparecerá tu historial','Escucha canciones para empezar a crear tu historial.')}`;}
function render(){content.innerHTML=state.view==='library'?renderLibrary():state.view==='search'?renderSearch():renderHome();document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon)});document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.classList.toggle('selected',b.dataset.view===state.view);});updatePlayer(false);}
function setView(view){state.view=view;state.error='';render();window.scrollTo({top:0,behavior:'instant'});if(view==='search')$('#search-input')?.focus();}
async function startPaged(kind,query=''){
  state.view='search';state.pageKind=kind;state.query=query.trim();state.pageOffset=0;state.results=[];
  state.error='';state.providerWarning='';state.searching=true;state.loadingMore=false;state.hasMore=false;
  const seq=++state.requestId;const offsets={},available={};render();
  try{
    const res=await fetchBatch(kind,state.query,offsets,available);if(seq!==state.requestId)return;
    state.results=res.tracks;state.pageOffsets=res.offsets;state.pageAvailable=res.available;
    state.providerWarning=res.warnings.join(' · ');state.pageOffset=PAGE_SIZE;
    state.hasMore=res.more;state.searching=false;render();
  }catch(e){if(seq!==state.requestId)return;state.searching=false;state.error=e.message || 'No se pudo buscar';render();}
}
async function searchTracks(query){state.genre='Todo';const text=query.trim();if(!text){state.view='search';state.requestId++;state.query='';state.results=[];state.hasMore=false;state.searching=false;render();return;}await startPaged('search',text);}
async function loadMore(){
  if(!state.hasMore||state.loadingMore||state.searching)return;
  const seq=state.requestId,source=state.source;
  state.loadingMore=true;render();
  try{
    const more=await fetchBatch(state.pageKind,state.query,state.pageOffsets,state.pageAvailable);
    if(seq!==state.requestId||source!==state.source)return;
    const previous=new Set(state.results.map(t=>t.id));
    state.results.push(...more.tracks.filter(t=>!previous.has(t.id)));
    state.pageOffsets=more.offsets;state.pageAvailable=more.available;
    state.providerWarning=more.warnings.join(' · ');state.pageOffset+=PAGE_SIZE;state.hasMore=more.more;
    if(!more.more)toast('Has llegado al final de las páginas disponibles.');
  }catch(e){if(seq!==state.requestId)return;toast(e.message||'No se pudo cargar otra página.');}
  finally{if(seq===state.requestId){state.loadingMore=false;render();}}
}
async function chooseGenre(genre){state.genre=genre;if(genre==='Todo')await startPaged('trending');else await startPaged('search',genre);}
async function chooseSource(source){
  if(!SOURCES.includes(source)||source===state.source)return;
  if(source==='jamendo'&&!state.jamendoId){openModal('settings');toast('Jamendo necesita tu Client ID gratuito.');return;}
  state.source=source;save();state.underground=[];
  if(state.view==='home')loadHome();else if(state.query)startPaged('search',state.query);else startPaged('trending');
}
function buildAudioURL(track){if(track.provider==='local' || track.provider==='jamendo' || track.provider==='commons')return track.src;if(track.provider==='audius')return `${API}/tracks/${encodeURIComponent(track.rawId)}/stream`;return '';}
function recentAdd(t){if(t.provider==='local')return;state.recent=[t,...state.recent.filter(x=>x.id!==t.id)].slice(0,35);save();}
function playTrack(t,queue=null){if(!t)return;if(t.gated){toast('Esta pista requiere autorización en el proveedor.');return;}if(queue){state.queue=queue.filter(Boolean);state.currentIndex=state.queue.findIndex(x=>x.id===t.id);}else if(state.queue.some(q=>q.id===t.id)){state.currentIndex=state.queue.findIndex(q=>q.id===t.id);}else{state.queue.push(t);state.currentIndex=state.queue.length-1;}state.current=t;state.playing=false;audio.pause();const src=buildAudioURL(t);if(!src){toast('Esta pista no tiene una fuente reproducible.');return;}audio.src=src;audio.load();recentAdd(t);updatePlayer();render();if(state.modal)renderModal();const promise=audio.play();if(promise?.then)promise.then(()=>{state.playing=true;updatePlayer();}).catch(err=>{state.playing=false;updatePlayer();toast(err?.name==='NotAllowedError'?'Toca reproducir para iniciar el audio.':'No se pudo iniciar esta pista. Prueba otra.');});}
function playList(list,idx=0){if(!list.length){toast('No hay canciones disponibles.');return;}playTrack(list[idx],list);}
function togglePlay(){if(!state.current){if(state.trending.length)playList(state.trending);else toast('Busca una canción para reproducir.');return;}if(audio.paused){const result=audio.play();result?.then?.(()=>{state.playing=true;updatePlayer();}).catch(()=>toast('El navegador no pudo reproducir esta canción.'));}else audio.pause();}
function nextTrack(forward=true){if(!state.queue.length)return;let index=state.currentIndex;if(state.shuffle && state.queue.length>1){let n=index;while(n===index)n=Math.floor(Math.random()*state.queue.length);index=n;}else {index+=forward?1:-1;if(index<0)index=state.queue.length-1;if(index>=state.queue.length){if(!state.repeat){audio.pause();state.playing=false;updatePlayer();return;}index=0;}}playTrack(state.queue[index],state.queue);}
function addQueue(t){state.queue.push(t);toast('Añadida a la cola: '+t.title);if(!state.current){state.currentIndex=-1;}if(state.modal==='queue')renderModal();}
function updatePlayer(updateIcons=true){const t=state.current;if($('#player-title'))$('#player-title').textContent=t?.title||'Elige algo para escuchar';if($('#player-artist'))$('#player-artist').textContent=t?.artist||'ONDA';if($('#player-cover'))$('#player-cover').innerHTML=t?.art?`<img src="${enc(t.art)}" alt=""/>`:icon('music');if(updateIcons){$('#play-btn').innerHTML=icon(audio.paused?'play':'pause');$('#shuffle-btn').classList.toggle('active',state.shuffle);$('#repeat-btn').classList.toggle('active',state.repeat);$('#player-like').innerHTML=icon(sameFav(t)?'heart-fill':'heart');$('#player-like').classList.toggle('active',sameFav(t));}$('#player-like').disabled=!t||t.provider==='local';$('#elapsed').textContent=fmt(audio.currentTime);$('#duration').textContent=fmt(Number.isFinite(audio.duration)?audio.duration:t?.duration||0);$('#seek').value=Number.isFinite(audio.duration)&&audio.duration>0?Math.floor(audio.currentTime/audio.duration*1000):0;$('#volume').value=Math.round(state.volume*100);if(updateIcons)updateMediaSession();}
function updateMediaSession(){if(!('mediaSession' in navigator)||!state.current)return;const t=state.current;try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:'ONDA',artwork:t.art?[{src:t.art,sizes:'480x480'}]:[]});navigator.mediaSession.playbackState=audio.paused?'paused':'playing';}catch{}}
function renderModal(){const root=$('#modal-root');const type=state.modal;if(!type){root.innerHTML='';return;}let body='';if(type==='settings')body=`<div class="modal-head"><h2>Configuración</h2><button class="icon-btn" data-action="close">${icon('x')}</button></div><p class="modal-desc">Elige una fuente. Todos combina Audius y grabaciones musicales abiertas de Wikimedia Commons. Si configuras Jamendo también aparecerá en Todos. No equivale a todo Spotify.</p><label for="source-select">Proveedor de música</label><select class="form-field" id="source-select">${SOURCES.map(p=>`<option value="${p}" ${state.source===p?'selected':''}>${SOURCE_LABEL[p]}${p==='jamendo'?' — requiere Client ID':''}</option>`).join('')}</select><label for="jamendo-id">Jamendo Client ID (opcional)</label><input class="form-field" id="jamendo-id" value="${enc(state.jamendoId)}" placeholder="Tu Client ID" autocomplete="off"/><p class="modal-desc">Puedes obtener un ID en <a href="https://devportal.jamendo.com/" target="_blank" rel="noopener noreferrer">developer.jamendo.com</a>. Los favoritos se guardan en este navegador, sin sincronización entre celulares.</p><div class="notice">Esta app no usa el catálogo de Spotify ni descarga música de los servicios. La música de Internet necesita conexión.</div><div class="modal-actions"><button class="pill-btn" data-action="close">Cancelar</button><button class="pill-btn primary" data-action="save-settings">Guardar</button></div>`;
else if(type==='queue')body=`<div class="modal-head"><h2>Cola de reproducción</h2><button class="icon-btn" data-action="close">${icon('x')}</button></div><p class="modal-desc">${state.queue.length} pistas en esta sesión</p>${state.queue.length?state.queue.map((t,i)=>`<div class="song-row ${state.currentIndex===i?'playing':''}" style="grid-template-columns:24px minmax(0,1fr) 35px" role="button" tabindex="0" data-queue-index="${i}"><span class="song-index">${i+1}</span><div class="song-info">${albumArt(t)}<div class="song-meta"><div class="song-main">${enc(t.title)}</div><div class="song-sub">${enc(t.artist)}</div></div></div><button class="icon-btn" data-remove-queue="${i}" title="Quitar de cola">${icon('x')}</button></div>`).join(''):empty('Cola vacía','Toca + junto a una canción para agregarla.')}`;
else if(type==='install')body=`<div class="modal-head"><h2>Instala ONDA</h2><button class="icon-btn" data-action="close">${icon('x')}</button></div><p class="modal-desc">Para tenerla como una app en tu Android:</p><p class="modal-desc"><strong>Chrome:</strong> toca ⋮ (menú) y elige <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</p><p class="modal-desc">En otros navegadores busca la opción equivalente. La instalación debe abrirse desde la dirección HTTPS publicada, no desde un archivo descargado.</p><button class="pill-btn primary" data-action="close">Entendido</button>`;
else if(type==='nowplaying'){const t=state.current;body=`<div class="modal-head"><span class="eyebrow">REPRODUCIENDO EN ONDA</span><button class="icon-btn" data-action="close">${icon('x')}</button></div>${albumArt(t,'now-cover')}<div class="now-title">${enc(t?.title||'Sin canción')}</div><div class="now-artist">${enc(t?.artist||'Explora y dale play')}</div>${t?.link?`<div class="now-attribution"><a href="${enc(t.link)}" target="_blank" rel="noopener noreferrer">Fuente: ${enc(SOURCE_LABEL[t.provider]||t.provider)}${t.license?' · '+enc(t.license):''}</a></div>`:''}<div class="seek-row"><span id="now-elapsed">${fmt(audio.currentTime)}</span><input type="range" data-seek="1" min="0" max="1000" value="${Number.isFinite(audio.duration)&&audio.duration?Math.floor(audio.currentTime/audio.duration*1000):0}" aria-label="Posición"/><span>${fmt(Number.isFinite(audio.duration)?audio.duration:t?.duration||0)}</span></div><div class="transport"><button class="icon-btn ${state.shuffle?'active':''}" data-action="shuffle">${icon('shuffle')}</button><button class="icon-btn" data-action="previous">${icon('prev')}</button><button class="play-main" data-action="play">${icon(audio.paused?'play':'pause')}</button><button class="icon-btn" data-action="next">${icon('next')}</button><button class="icon-btn ${state.repeat?'active':''}" data-action="repeat">${icon('repeat')}</button></div><div class="modal-actions" style="justify-content:space-between"><button class="icon-btn ${sameFav(t)?'active':''}" data-action="like-current">${icon(sameFav(t)?'heart-fill':'heart')}</button><button class="pill-btn" data-action="queue">${icon('queue')} Ver cola</button></div>`;}
root.innerHTML=`<div class="sheet-backdrop" data-dismiss="1"><section class="modal ${type==='nowplaying'?'modal-now':''} ${type==='queue'?'wide':''}" role="dialog" aria-modal="true" aria-label="${type==='nowplaying'?'Reproductor':type==='settings'?'Configuración':'Opciones'}">${body}</section></div>`;
}
function openModal(type){state.modal=type;renderModal();}
function closeModal(){state.modal='';renderModal();}
function openFiles(){let input=document.querySelector('#file-input');if(!input){input=document.createElement('input');input.type='file';input.id='file-input';input.accept='audio/*,.mp3,.m4a,.flac,.ogg,.wav,.opus';input.multiple=true;input.hidden=true;document.body.appendChild(input);input.addEventListener('change',()=>{const files=Array.from(input.files||[]).slice(0,500);const songs=files.filter(file=>file.type.startsWith('audio/')||/\.(mp3|m4a|flac|ogg|wav|opus)$/i.test(file.name)).map((file,i)=>put(normalize({id:`${Date.now()}-${i}`,name:file.name.replace(/\.[^.]+$/,'').replace(/_/g,' '),artist_name:'Archivo del dispositivo',src:URL.createObjectURL(file)},'local'))).filter(Boolean);state.local.push(...songs);toast(songs.length?`${songs.length} archivos añadidos (solo esta sesión)`:'No hay archivos de audio compatibles.');state.view='library';render();input.value='';});}input.click();}
async function saveSettings(){const src=$('#source-select').value;const id=$('#jamendo-id').value.trim();if(src==='jamendo'&&!id){toast('Jamendo necesita un Client ID para funcionar.');return;}state.source=src;state.jamendoId=id;state.underground=[];state.trending=[];state.results=[];state.query='';state.requestId++;state.hasMore=false;state.pageOffset=0;save();closeModal();state.view='home';loadHome();}
function handleClick(event){if(event.target?.dataset?.dismiss && event.target===event.currentTarget){closeModal();return;}const target=event.target.closest('button,[data-play],[data-queue-index],[data-view],[data-add],[data-like],[data-genre],[data-source]');if(!target)return;const view=target.dataset.view,action=target.dataset.action,play=target.dataset.play,like=target.dataset.like,add=target.dataset.add,genre=target.dataset.genre,source=target.dataset.source,queueIndex=target.dataset.queueIndex;if(view){setView(view);return;}if(like){toggleFavorite(catalog.get(like)||state.favorites.find(x=>x.id===like));return;}if(add){const track=catalog.get(add)||state.favorites.find(x=>x.id===add);if(track)addQueue(track);return;}if(genre){chooseGenre(genre);return;}if(source){chooseSource(source);return;}if(queueIndex!==undefined){playTrack(state.queue[Number(queueIndex)],state.queue);closeModal();return;}if(play){const t=catalog.get(play)||state.favorites.find(x=>x.id===play)||state.recent.find(x=>x.id===play);if(!t)return;const listing=state.view==='library'?state.favorites.concat(state.local,state.recent):state.view==='search'?state.results:state.trending.concat(state.underground);playTrack(t,listing.some(x=>x.id===t.id)?listing:null);return;}if(target.dataset.removeQueue!==undefined){const n=Number(target.dataset.removeQueue);if(n===state.currentIndex){toast('No puedes quitar la canción que está sonando.');return;}state.queue.splice(n,1);if(n<state.currentIndex)state.currentIndex--;renderModal();return;}switch(action){case 'settings':openModal('settings');break;case 'close':closeModal();break;case 'save-settings':saveSettings();break;case 'install':if(state.installPrompt){state.installPrompt.prompt();state.installPrompt.userChoice.finally(()=>{state.installPrompt=null;});}else openModal('install');break;case 'local-files':openFiles();break;case 'reload':loadHome();break;case 'retry-search':startPaged(state.pageKind,state.query);break;case 'play-trending':playList(state.trending);break;case 'play-favorites':playList(state.favorites);break;case 'all-trending':startPaged('trending');break;case 'load-more':loadMore();break;case 'like-current':toggleFavorite(state.current);break;case 'play':togglePlay();break;case 'next':nextTrack(true);break;case 'previous':if(audio.currentTime>3){audio.currentTime=0;}else nextTrack(false);break;case 'shuffle':state.shuffle=!state.shuffle;updatePlayer();if(state.modal==='nowplaying')renderModal();toast(state.shuffle?'Aleatorio activado':'Aleatorio desactivado');break;case 'repeat':state.repeat=!state.repeat;updatePlayer();if(state.modal==='nowplaying')renderModal();toast(state.repeat?'Repetir cola activado':'Repetir desactivado');break;case 'queue':openModal('queue');break;case 'nowplaying':openModal('nowplaying');break;}}
document.addEventListener('click',event=>{if(event.target.matches('.sheet-backdrop')){closeModal();return;}handleClick(event);});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if((event.key==='Enter'||event.key===' ')&&event.target.matches('[role="button"]')){event.preventDefault();event.target.click();}});
$('#player-track').addEventListener('click',event=>{if(window.innerWidth<=820&&!event.target.closest('button'))openModal('nowplaying');});
$('#search-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(typingTimer);searchTracks(e.target.value);e.target.blur();}});
let typingTimer;$('#search-input').addEventListener('input',e=>{clearTimeout(typingTimer);const query=e.target.value.trim();if(query.length>=2){typingTimer=setTimeout(()=>searchTracks(query),550);}else if(!query){state.requestId++;state.results=[];state.query='';state.view='search';render();}});
$('#seek').addEventListener('input',e=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(e.target.value)/1000*audio.duration;});
$('#volume').addEventListener('input',e=>{state.volume=Number(e.target.value)/100;audio.volume=state.volume;save();});
document.addEventListener('input',e=>{if(e.target.matches('[data-seek]')&&Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)/1000*audio.duration;});
audio.volume=state.volume;
audio.addEventListener('timeupdate',()=>{updatePlayer(false);if(state.modal==='nowplaying'){const el=$('#now-elapsed'),seek=$('[data-seek]');if(el)el.textContent=fmt(audio.currentTime);if(seek)seek.value=Number.isFinite(audio.duration)&&audio.duration>0?Math.floor(audio.currentTime/audio.duration*1000):0;}});
['loadedmetadata','durationchange','play','pause'].forEach(type=>audio.addEventListener(type,()=>{state.playing=!audio.paused;updatePlayer();if(state.modal==='nowplaying')renderModal();}));
audio.addEventListener('ended',()=>nextTrack(true));
audio.addEventListener('error',()=>{if(state.current)toast('No se pudo cargar este audio. Puede estar restringido o no disponible.');state.playing=false;updatePlayer();});
if('mediaSession' in navigator){try{navigator.mediaSession.setActionHandler('play',()=>togglePlay());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',()=>nextTrack(false));navigator.mediaSession.setActionHandler('nexttrack',()=>nextTrack(true));navigator.mediaSession.setActionHandler('seekto',e=>{if(e.seekTime!==undefined)audio.currentTime=e.seekTime;});}catch{}}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event;});
if('serviceWorker' in navigator && location.protocol==='https:'){const registerWorker=()=>navigator.serviceWorker.register('./sw.js').catch(()=>{});if(document.readyState==='complete')registerWorker();else window.addEventListener('load',registerWorker,{once:true});}
for(const t of [...state.favorites,...state.recent])put(t);
render();loadHome();
})();