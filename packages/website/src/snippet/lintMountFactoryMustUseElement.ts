import { Effect } from 'effect'
import { Mount } from 'foldkit'

// ❌ Bad
// The factory never reads its element, so Mount is the wrong primitive here.
const MountAnalytics = Mount.define(
  'MountAnalytics',
  {},
  CompletedMountAnalytics,
)(() => () => Effect.sync(() => startAnalytics()))

// ✅ Good
// The factory reads its element to wire the observer.
const MountResize = Mount.define(
  'MountResize',
  {},
  CompletedMountResize,
)(() => element => Effect.sync(() => resizeObserver.observe(element)))
