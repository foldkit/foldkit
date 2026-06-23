import { Effect, Option, Queue, Schema as S, Stream, pipe } from 'effect'
import { Subscription } from 'foldkit'

import { getChart } from './chartHost'
import { ClickedChartDatum } from './message'
import type { Message } from './message'
import type { Model } from './model'

const ChartClickPayload = S.Struct({
  data: S.OptionFromOptional(S.Struct({ id: S.String })),
})

const chartClickToDatumId = (event: unknown): Option.Option<string> =>
  pipe(
    event,
    S.decodeUnknownOption(ChartClickPayload),
    Option.flatMap(({ data }) => data),
    Option.map(({ id }) => id),
  )

const chartEvents = (hostId: string): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const maybeChart = getChart(hostId)

        if (Option.isSome(maybeChart)) {
          const chart = maybeChart.value

          const onClick = (event: unknown) => {
            const maybeDatumId = chartClickToDatumId(event)

            if (Option.isSome(maybeDatumId)) {
              Queue.offerUnsafe(
                queue,
                ClickedChartDatum({ datumId: maybeDatumId.value }),
              )
            }
          }

          chart.on('click', onClick)

          return Option.some({ chart, onClick })
        }

        return Option.none()
      }),
      maybeHandle =>
        Effect.sync(() => {
          if (Option.isSome(maybeHandle)) {
            maybeHandle.value.chart.off('click', maybeHandle.value.onClick)
          }
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  chartEvents: entry(
    { maybeChartHostId: S.Option(S.String) },
    {
      modelToDependencies: model => ({
        maybeChartHostId: model.maybeChartHostId,
      }),
      dependenciesToStream: ({ maybeChartHostId }) =>
        Option.match(maybeChartHostId, {
          onNone: () => Stream.empty,
          onSome: chartEvents,
        }),
    },
  ),
}))
