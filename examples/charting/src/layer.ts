import { Layer } from 'effect'
import { Http } from 'foldkit'

import { RadioGroup } from '@foldkit/ui'

import { ChartRegistryLayer } from './chartRegistry'
import { FetchTelemetry, SyncChart } from './command'
import { GitHubApiLayer } from './githubApi'
import { NpmApiLayer } from './npmApi'
import { MountChart } from './view'

export { mounts } from './view'

const TelemetryApisLayer = Layer.mergeAll(GitHubApiLayer, NpmApiLayer)

export const EffectsLayer = Layer.mergeAll(
  RadioGroup.EffectsLayer,
  FetchTelemetry.layer.pipe(Layer.provide(TelemetryApisLayer)),
  SyncChart.layer,
  MountChart.layer,
).pipe(Layer.provide(ChartRegistryLayer))

export const AppLayer = Layer.provide(EffectsLayer, Http.layer)
