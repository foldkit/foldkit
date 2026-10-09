import { Layer } from 'effect'

import { LoadUserLive } from './command'
import { AnalyticsLive, ApiClientLive, ComputeWorkerLive } from './environment'
import { ComputePreviewLive } from './managedResource'
import { TrackPageViewLive } from './subscription'

export const HandlersLive = Layer.mergeAll(
  LoadUserLive,
  TrackPageViewLive,
  ComputePreviewLive,
)

const ServicesLive = Layer.mergeAll(
  ApiClientLive,
  AnalyticsLive,
  ComputeWorkerLive,
)

export const Live = Layer.provideMerge(HandlersLive, ServicesLive)
