import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { CompletedMountResize } from './message'

export const MountResize = Mount.define('MountResize', {
  messages: [CompletedMountResize],
  execute: ({ element }) => Effect.sync(() => resizeObserver.observe(element)),
})

export const defineLocal = (Mount: { define: (name: string) => string }) =>
  Mount.define('LocalMount')
