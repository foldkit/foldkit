import { Clock, Effect, Option, Schema } from 'effect'

import { ChartRegistry } from './chartRegistry'
import { Application } from './definition'
import { ChartMode, PackageId, Period, Telemetry } from './domain'
import { makeChartOption } from './echarts'
import { GitHubApi } from './githubApi'
import { Message } from './message'
import { NpmApi } from './npmApi'
import { fetchRawTelemetry, transformTelemetry } from './telemetry'

export const FetchTelemetry = Application.command('FetchTelemetry', {
  messages: [Message.SucceededFetchTelemetry, Message.FailedFetchTelemetry],
  handler: function* () {
    const github = yield* GitHubApi
    const npm = yield* NpmApi
    const clock = yield* Clock.Clock

    return () =>
      Effect.gen(function* () {
        const rawTelemetry = yield* fetchRawTelemetry({ github, npm, clock })
        const telemetry = transformTelemetry(rawTelemetry)

        return Message.SucceededFetchTelemetry({ telemetry })
      }).pipe(
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedFetchTelemetry({
              error: error instanceof Error ? error.message : `${error}`,
            }),
          ),
        ),
      )
  },
})

export const SyncChart = Application.command('SyncChart', {
  args: {
    hostId: Schema.String,
    telemetry: Telemetry,
    chartMode: ChartMode,
    selectedPackageId: PackageId,
    period: Period,
    maybeSelectedDatumId: Schema.Option(Schema.String),
  },
  messages: [Message.SucceededSyncChart, Message.FailedSyncChart],
  handler: function* () {
    const charts = yield* ChartRegistry

    return args =>
      Effect.gen(function* () {
        const maybeChart = yield* charts.get(args.hostId)

        return yield* Option.match(maybeChart, {
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
        })
      })
  },
})
