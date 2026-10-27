import test from 'node:test'
import assert from 'node:assert/strict'
import { EMBED_LOAD_TIMEOUT_MS, shouldAttemptFallback, nextUntriedProvider, portalMessage } from '../src/player/fallbackPolicy.js'
const url = 'https://example.com/embed/1'
const candidates = ['moviemaster','facilitoplay','vidrift'].map(providerId=>({providerId,available:true}))
const order = candidates.map(c=>c.providerId)
test('error verificado del iframe activo activa fallback',()=>{
  assert.equal(shouldAttemptFallback({status:'error',statusUrl:url,currentUrl:url,frameLoaded:true}),true)
  assert.equal(shouldAttemptFallback({status:'content-mismatch',statusUrl:url,currentUrl:url,frameLoaded:true}),true)
})
test('rechaza fallo viejo de otro iframe y telemetría silenciosa',()=>{
  assert.equal(shouldAttemptFallback({status:'error',statusUrl:'https://otro.test',currentUrl:url,frameLoaded:true,elapsedMs:120000}),false)
  assert.equal(shouldAttemptFallback({currentUrl:url,frameLoaded:true,elapsedMs:120000}),false)
})
test('timeout sólo cuando iframe nunca terminó de cargar',()=>{
  assert.equal(shouldAttemptFallback({currentUrl:url,frameLoaded:false,elapsedMs:EMBED_LOAD_TIMEOUT_MS-1}),false)
  assert.equal(shouldAttemptFallback({currentUrl:url,frameLoaded:false,elapsedMs:EMBED_LOAD_TIMEOUT_MS}),true)
})
test('onError del iframe activo activa fallback',()=>{
  assert.equal(shouldAttemptFallback({currentUrl:url,frameErrorUrl:url,frameLoaded:false}),true)
})
test('proveedor siguiente en orden sin ciclos ni excluidos',()=>{
  assert.equal(nextUntriedProvider({providerId:'moviemaster',candidates,order,attempted:['moviemaster']}),'facilitoplay')
  assert.equal(nextUntriedProvider({providerId:'facilitoplay',candidates,order,attempted:['moviemaster','facilitoplay']}),'vidrift')
  assert.equal(nextUntriedProvider({providerId:'vidrift',candidates,order,attempted:['moviemaster','facilitoplay','vidrift']}),null)
  assert.equal(nextUntriedProvider({providerId:'moviemaster',candidates:candidates.map(c=>c.providerId==='facilitoplay'?{...c,available:false}:c),order,attempted:['moviemaster']}),'vidrift')
})
test('mensajes de portal no afirman reproducción confirmada',()=>{
  assert.match(portalMessage({kind:'opening',sourceNumber:1,mediaType:'tv'}),/episodio/)
  assert.match(portalMessage({kind:'fallback',sourceNumber:3}),/opción 3/)
  assert.doesNotMatch(portalMessage({kind:'fallback',sourceNumber:2}),/reproduciendo|1080p|verificado/)
})
