import { Layer } from 'effect'
import { Http } from 'foldkit'

import { ChartRegistryLayer } from './domain/chartRegistry'
import { GitHubApiLayer } from './domain/githubApi'
import { NpmApiLayer } from './domain/npmApi'

const TelemetryApisLayer = Layer.mergeAll(GitHubApiLayer, NpmApiLayer).pipe(
  Layer.provide(Http.layer),
)

export const ApplicationLayer = Layer.mergeAll(
  ChartRegistryLayer,
  TelemetryApisLayer,
)
