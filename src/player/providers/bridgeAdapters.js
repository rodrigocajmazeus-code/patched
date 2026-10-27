import { FACILITOPLAY_ORIGIN, readFacilitoplayMessage } from './facilitoplay.js'
import { moviemaster } from './moviemaster.js'
import { vidcloud } from './vidcloud.js'
import { vidrift } from './vidrift.js'
const adapters = [{ origin: FACILITOPLAY_ORIGIN, commands: false, readEvent: readFacilitoplayMessage }, moviemaster, vidcloud, vidrift]
export function getBridgeAdapter(playerUrl) {
  try { return adapters.find(adapter => adapter.origin === new URL(playerUrl).origin) || null } catch { return null }
}
