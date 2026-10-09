import { Layer } from 'effect'
import { Http } from 'foldkit'

import { CommandsLayer } from './command'
import { GitHubApiLayer } from './githubApi'
import { NpmApiLayer } from './npmApi'
import { MountChart, MountChartLayer } from './view/chart'

export const mounts = [MountChart]

const TelemetryApisLayer = Layer.mergeAll(GitHubApiLayer, NpmApiLayer)

export const HandlersLayer = Layer.mergeAll(
  CommandsLayer.pipe(Layer.provide(TelemetryApisLayer)),
  MountChartLayer,
)

export const AppLayer = Layer.provide(HandlersLayer, Http.layer)
