import { Layer } from 'effect'

import {
  AnalyticsLayer,
  ApiClientLayer,
  ComputeWorkerLayer,
} from './environment'

export const ApplicationLayer = Layer.mergeAll(
  ApiClientLayer,
  AnalyticsLayer,
  ComputeWorkerLayer,
)
