import { Layer } from 'effect'

import { FetchTelemetry, SyncChart } from './command'
import { MountChart } from './mount'

export const EffectsLayer = Layer.mergeAll(
  FetchTelemetry.layer,
  SyncChart.layer,
  MountChart.layer,
)
