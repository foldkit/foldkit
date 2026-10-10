import { Layer } from 'effect'

import { LoadUser } from './command'
import {
  AnalyticsLayer,
  ApiClientLayer,
  ComputeWorkerLayer,
} from './environment'
import { managedResources } from './managedResource'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  LoadUser.layer,
  subscriptions.trackPageView.layer,
  managedResources.computePreview.layer,
)

export const ServicesLayer = Layer.mergeAll(
  ApiClientLayer,
  AnalyticsLayer,
  ComputeWorkerLayer,
)

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
