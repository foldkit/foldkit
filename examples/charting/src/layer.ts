import { Layer } from 'effect'
import { Http } from 'foldkit'

import * as UI from '@foldkit/ui'

import { FetchTelemetry, SyncChart } from './command'
import { GitHubApiLayer } from './githubApi'
import { NpmApiLayer } from './npmApi'
import { MountChart } from './view'

export const mounts = [...UI.mounts, MountChart]

const TelemetryApisLayer = Layer.mergeAll(GitHubApiLayer, NpmApiLayer)

export const EffectsLayer = Layer.mergeAll(
  UI.EffectsLayer,
  FetchTelemetry.layer.pipe(Layer.provide(TelemetryApisLayer)),
  SyncChart.layer,
  MountChart.layer,
)

export const AppLayer = Layer.provide(EffectsLayer, Http.layer)
