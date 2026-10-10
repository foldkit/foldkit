import { Effect } from 'effect'
import { Mount } from 'foldkit'

// ❌ Bad
// The handler never reads its element, so Mount is the wrong primitive here.
const MountAnalytics = Mount.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
  handler: function* () {
    return () =>
      Effect.sync(() => startAnalytics()).pipe(
        Effect.as(CompletedMountAnalytics()),
      )
  },
})

// ✅ Good
// The handler reads its element to wire the observer.
const MountResize = Mount.define('MountResize', {
  messages: [CompletedMountResize],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() => resizeObserver.observe(element)).pipe(
        Effect.as(CompletedMountResize()),
      )
  },
})
