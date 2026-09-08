import { Effect } from 'effect'
import { Mount } from 'foldkit'

// ❌ Bad
// execute never reads its element, so Mount is the wrong primitive here.
const MountAnalytics = Mount.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
  execute: () => Effect.sync(() => startAnalytics()),
})

// ✅ Good
// execute reads its element to wire the observer.
const MountResize = Mount.define('MountResize', {
  messages: [CompletedMountResize],
  execute: ({ element }) => Effect.sync(() => resizeObserver.observe(element)),
})
