import { Layer } from 'effect'
import { Http } from 'foldkit'

import * as UI from '@foldkit/ui'

import { CommandsLayer } from './command'
import { GitHubApiLayer } from './githubApi'
import { NpmApiLayer } from './npmApi'
import { MountChart, MountChartLayer } from './view'

export const mounts = [...UI.mounts, MountChart]

const TelemetryApisLayer = Layer.mergeAll(GitHubApiLayer, NpmApiLayer)

export const EffectsLayer = Layer.mergeAll(
  UI.EffectsLayer,
  CommandsLayer.pipe(Layer.provide(TelemetryApisLayer)),
  MountChartLayer,
)

export const AppLayer = Layer.provide(EffectsLayer, Http.layer)
