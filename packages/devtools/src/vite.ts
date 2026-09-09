import type { DevToolsOverlay } from 'foldkit/devtools-host'

import { createOverlay } from './overlay.js'

/** The in-browser DevTools overlay factory consumed by the Foldkit Vite plugin. */
export const overlay: DevToolsOverlay = createOverlay
