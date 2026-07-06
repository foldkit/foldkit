import { Effect, Layer, Option, Schema as S } from 'effect'
import { Command, Http } from 'foldkit'

import { getChart } from './chartHost'
import { ChartMode, PackageId, Period, Telemetry } from './domain'
import { makeChartOption } from './echarts'
import { GitHubApiLive } from './githubApi'
import {
  CompletedSyncChart,
  FailedFetchTelemetry,
  FailedSyncChart,
  SucceededFetchTelemetry,
} from './message'
import { NpmApiLive } from './npmApi'
import { fetchRawTelemetry, transformTelemetry } from './telemetry'

// COMMAND

export const FetchTelemetry = Command.define(
  'FetchTelemetry',
  SucceededFetchTelemetry,
  FailedFetchTelemetry,
)(
  fetchRawTelemetry.pipe(
    Effect.map(transformTelemetry),
    Effect.map(telemetry => SucceededFetchTelemetry({ telemetry })),
    Effect.catch(error =>
      Effect.succeed(
        FailedFetchTelemetry({
          error: error instanceof Error ? error.message : `${error}`,
        }),
      ),
    ),
    Effect.provide(
      Layer.mergeAll(GitHubApiLive, NpmApiLive).pipe(Layer.provide(Http.layer)),
    ),
  ),
)

export const SyncChart = Command.define(
  'SyncChart',
  {
    hostId: S.String,
    telemetry: Telemetry,
    chartMode: ChartMode,
    selectedPackageId: PackageId,
    period: Period,
    maybeSelectedDatumId: S.Option(S.String),
  },
  CompletedSyncChart,
  FailedSyncChart,
)(args =>
  Option.match(getChart(args.hostId), {
    onNone: () =>
      Effect.succeed(
        FailedSyncChart({
          reason: `Could not find a live chart for hostId ${args.hostId}.`,
        }),
      ),
    onSome: chart =>
      Effect.sync(() => {
        try {
          chart.setOption(makeChartOption(args), true)
          return CompletedSyncChart()
        } catch (error) {
          return FailedSyncChart({
            reason: error instanceof Error ? error.message : `${error}`,
          })
        }
      }),
  }),
)
