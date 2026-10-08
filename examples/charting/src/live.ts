import { Layer } from 'effect'
import { Http } from 'foldkit'

import { CommandsLive } from './command'
import { GitHubApiLive } from './githubApi'
import { NpmApiLive } from './npmApi'
import { MountChart, MountChartLive } from './view/chart'

export const mounts = [MountChart]

const TelemetryApisLive = Layer.mergeAll(GitHubApiLive, NpmApiLive).pipe(
  Layer.provide(Http.layer),
)

export const Live = Layer.mergeAll(
  CommandsLive.pipe(Layer.provide(TelemetryApisLive)),
  MountChartLive,
)
