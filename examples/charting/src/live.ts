import { Layer } from 'effect'
import { Http } from 'foldkit'

import { CommandsLive } from './command'
import { GitHubApiLive } from './githubApi'
import { NpmApiLive } from './npmApi'
import { MountChart, MountChartLive } from './view/chart'

export const mounts = [MountChart]

const TelemetryApisLive = Layer.mergeAll(GitHubApiLive, NpmApiLive)

export const HandlersLive = Layer.mergeAll(
  CommandsLive.pipe(Layer.provide(TelemetryApisLive)),
  MountChartLive,
)

export const Live = HandlersLive.pipe(Layer.provideMerge(Http.layer))
