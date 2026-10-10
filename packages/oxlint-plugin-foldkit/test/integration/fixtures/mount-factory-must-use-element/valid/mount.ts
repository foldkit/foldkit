import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { CompletedMountResize } from './message'

export const MountResize = Mount.define('MountResize', {
  messages: [CompletedMountResize],
})

export const MountResizeLayer = MountResize.toLayer(
  Effect.succeed(({ element }) =>
    Effect.sync(() => resizeObserver.observe(element)),
  ),
)

export const defineLocal = (Mount: { define: (name: string) => string }) =>
  Mount.define('LocalMount')

export const MeasureResize = Mount.define('MeasureResize', {
  messages: [CompletedMountResize],
handler: function* () { return ({ element }) => Effect.sync(() => resizeObserver.observe(element)) },
})
