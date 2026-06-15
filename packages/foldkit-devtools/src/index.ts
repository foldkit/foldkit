import type { DevToolsOverlay } from 'foldkit/runtime'

import { createOverlay } from './overlay.js'

/**
 * The in-browser DevTools overlay factory. Pass it as `DevToolsConfig.overlay`
 * to mount the panel:
 *
 * ```ts
 * import { overlay } from '@foldkit/devtools'
 *
 * Runtime.makeApplication({
 *   // ...
 *   devTools: { Message, overlay },
 * })
 * ```
 */
export const overlay: DevToolsOverlay = createOverlay
