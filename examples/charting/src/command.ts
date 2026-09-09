import { Effect, Layer, Option, Schema } from 'effect'
import { Command, Http } from 'foldkit'

import { getChart } from './chartHost'
import { ChartMode, PackageId, Period, Telemetry } from './domain'
import { makeChartOption } from './echarts'
import { GitHubApiLive } from './githubApi'
import { Message } from './message'
import { NpmApiLive } from './npmApi'
import { fetchRawTelemetry, transformTelemetry } from './telemetry'

// COMMAND

export const FetchTelemetry = Command.define('FetchTelemetry', {
  messages: [Message.SucceededFetchTelemetry, Message.FailedFetchTelemetry],
  execute: fetchRawTelemetry.pipe(
    Effect.map(transformTelemetry),
    Effect.map(telemetry => Message.SucceededFetchTelemetry({ telemetry })),
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedFetchTelemetry({
          error: error instanceof Error ? error.message : `${error}`,
        }),
      ),
    ),
    Effect.provide(
      Layer.mergeAll(GitHubApiLive, NpmApiLive).pipe(Layer.provide(Http.layer)),
    ),
  ),
})

export const SyncChart = Command.define('SyncChart', {
  args: {
    hostId: Schema.String,
    telemetry: Telemetry,
    chartMode: ChartMode,
    selectedPackageId: PackageId,
    period: Period,
    maybeSelectedDatumId: Schema.Option(Schema.String),
  },
  messages: [Message.SucceededSyncChart, Message.FailedSyncChart],
  execute: args =>
    Option.match(getChart(args.hostId), {
      onNone: () =>
        Effect.succeed(
          Message.FailedSyncChart({
            reason: `Could not find a live chart for hostId ${args.hostId}.`,
          }),
        ),
      onSome: chart =>
        Effect.try(() => chart.setOption(makeChartOption(args), true)).pipe(
          Effect.as(Message.SucceededSyncChart()),
          Effect.catch(error =>
            Effect.succeed(
              Message.FailedSyncChart({
                reason: error instanceof Error ? error.message : `${error}`,
              }),
            ),
          ),
        ),
    }),
})
