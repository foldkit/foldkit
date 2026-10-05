import {
  type DevToolsOverlay,
  __setDevToolsOverlay as setDevToolsOverlay,
} from '../runtime/devToolsConfig.js'
import { makeDevToolsIntegration } from '../runtime/devToolsIntegration.js'
import { __registerDevToolsIntegration } from '../runtime/devToolsRegistry.js'

/** Enables DevTools recording and registers the optional overlay. */
export const __setDevToolsOverlay = (
  overlay: DevToolsOverlay | undefined,
): void => {
  __registerDevToolsIntegration(makeDevToolsIntegration)
  setDevToolsOverlay(overlay)
}

export { DEVTOOLS_HOST_ID } from '../html/index.js'
export type { DevToolsOverlay } from '../runtime/devToolsConfig.js'

export { INIT_INDEX, latestEntryIndex } from './store.js'

export type {
  CommandRecord,
  DevToolsStore,
  MountRecord,
  StoreState,
} from './store.js'

export { toInspectableValue } from './serialize.js'

export {
  GOT_MESSAGE_PATTERN,
  extractSubmodelInfo,
  isTagged,
} from './submodelPath.js'
