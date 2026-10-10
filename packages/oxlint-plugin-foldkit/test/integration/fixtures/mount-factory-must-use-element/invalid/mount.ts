import { Effect } from 'effect'
import { Mount, Mount as Mounts } from 'foldkit'

import { CompletedMountAnalytics } from './message'

const resizeObserver = {
  disconnect: () => undefined,
}

export const MountAnalytics = Mounts.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
})

export const MountAnalyticsLayer = MountAnalytics.toLayer(
  Effect.succeed(() => Effect.sync(() => startAnalytics())),
)

export const ObserveWithoutElement = Mount.define(
  'ObserveWithoutElement',
  {
    messages: [CompletedMountAnalytics],
  },
  Effect.succeed(({ element }) => Effect.sync(() => resizeObserver.disconnect())),
)
