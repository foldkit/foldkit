import { Layer } from 'effect'

import { LoadUserLayer } from './command'
import {
  AnalyticsLayer,
  ApiClientLayer,
  ComputeWorkerLayer,
} from './environment'
import { ComputePreviewLayer } from './managedResource'
import { TrackPageViewLayer } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  LoadUserLayer,
  TrackPageViewLayer,
  ComputePreviewLayer,
)

export const ServicesLayer = Layer.mergeAll(
  ApiClientLayer,
  AnalyticsLayer,
  ComputeWorkerLayer,
)

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
