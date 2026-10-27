import test from 'node:test'
import assert from 'node:assert/strict'
import {readVidRiftTelemetry as read,VIDRIFT_EMBED_ORIGIN,vidriftStateRequest} from '../src/player/vidriftTelemetry.js'
const frame = {}
const exp = {mediaType:'tv',id:1429,season:1,episode:1}
const mk = (data,props={})=>({origin:VIDRIFT_EMBED_ORIGIN,source:frame,data:{tmdbId:1429,mediaType:'tv',season:1,episode:1,...data},...props})

test('forged origins are ignored',()=>{
 assert.equal(read(mk({type:'vidrift:progress',currentTime:5,duration:100},{origin:'https://evil.invalid'}),frame,exp),null)
 assert.equal(read(mk({type:'vidrift:progress',currentTime:5,duration:100},{source:{}}),frame,exp),null)
})
test('wrong title or episode does not contaminate records',()=>{
 assert.equal(read(mk({type:'vidrift:progress',currentTime:5,duration:100,tmdbId:27205}),frame,exp),null)
 assert.equal(read(mk({type:'vidrift:progress',currentTime:5,duration:100,episode:2}),frame,exp),null)
})
test('progress is telemetry only, not verified content or audio',()=>{
 const p = read(mk({type:'vidrift:progress',currentTime:5,duration:100}),frame,exp)
 assert.equal(p.kind,'progress')
 assert.equal(p.playbackTelemetry,true)
 assert.equal(p.playbackVerified,false)
 assert.equal(p.heardAudioVerified,false)
})
test('invalid timing is rejected',()=>{
 assert.equal(read(mk({type:'vidrift:progress',currentTime:-1,duration:100}),frame,exp),null)
 assert.equal(read(mk({type:'vidrift:progress',currentTime:1000,duration:100}),frame,exp),null)
})
test('state options are labels not independent resolution or audio tests',()=>{
 const state=read(mk({type:'vidrift:state',currentTime:5,duration:100,qualities:[{value:'720',label:'720p'}],audios:[{value:'0',label:'Español latino'}],subtitle:'es'}),frame,exp)
 assert.equal(state.kind,'state')
 assert.equal(state.qualities[0].label,'720p')
 assert.equal(state.heardAudioVerified,false)
 assert.equal(state.bitrateMeasured,false)
})
test('iframe-provided episode switch is only a hint',()=>{
 const d=read(mk({type:'vidrift:episode',season:1,episode:2}),frame,exp)
 assert.deepEqual(d,{kind:'episode-hint',season:1,episode:2,needsUserConfirmation:true,confirmedAudiovisualIdentity:false})
})
test('command errors are safe, bounded strings',()=>{
 const d=read(mk({type:'vidrift:command-error',reason:'x'.repeat(300)}),frame,exp)
 assert.equal(d.reason.length,90)
})
test('messages are not fetched or sent implicitly',()=>{
 assert.deepEqual(vidriftStateRequest(),{type:'vidrift:get-state'})
 assert.equal(read(mk({type:'vidrift:set'}),frame,exp),null)
})
