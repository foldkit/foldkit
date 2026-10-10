import { Effect } from 'effect'
import { Mount } from 'foldkit'

// ❌ Bad
// The handler never reads its element, so Mount is the wrong primitive here.
const MountAnalytics = Mount.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
})
const MountAnalyticsLayer = MountAnalytics.toLayer(
  Effect.succeed(() => Effect.sync(() => startAnalytics())),
)

// ✅ Good
// The handler reads its element to wire the observer.
const MountResize = Mount.define('MountResize', {
  messages: [CompletedMountResize],
})
const MountResizeLayer = MountResize.toLayer(
  Effect.succeed(({ element }) =>
    Effect.sync(() => resizeObserver.observe(element)),
  ),
)
