import { Effect } from 'effect'
import { Mount as Mounts } from 'foldkit'

import { CompletedMountAnalytics } from './message'

export const MountAnalytics = Mounts.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
})

export const MountAnalyticsLayer = MountAnalytics.toLayer(
  Effect.succeed(() => Effect.sync(() => startAnalytics())),
)
