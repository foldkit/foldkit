import { Effect } from 'effect'
import { Mount as Mounts } from 'foldkit'

import { CompletedMountAnalytics } from './message'

export const MountAnalytics = Mounts.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
  execute: () => Effect.sync(() => startAnalytics()),
})
