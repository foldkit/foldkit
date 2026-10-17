import { Layer } from 'effect'
import { Http } from 'foldkit'

import { ChartRegistryLayer } from './chartRegistry'
import { GitHubApiLayer } from './githubApi'
import { NpmApiLayer } from './npmApi'

const TelemetryApisLayer = Layer.mergeAll(GitHubApiLayer, NpmApiLayer).pipe(
  Layer.provide(Http.layer),
)

export const ApplicationLayer = Layer.mergeAll(
  ChartRegistryLayer,
  TelemetryApisLayer,
)
