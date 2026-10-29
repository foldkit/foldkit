import * as echarts from 'echarts/core'
import { Effect, Option, Queue, Schema, Stream, pipe } from 'effect'

import { ChartRegistry } from './chartRegistry'
import { ApplicationDefinition } from './definition'
import { Message } from './message'
import type {
  ClickedChartDatum,
  FailedMountChart,
  SucceededMountChart,
} from './message'

export const CHART_HOST_ID = 'charting-chart'

type MountChartMessage =
  | SucceededMountChart
  | FailedMountChart
  | ClickedChartDatum

const toChartMountError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`Failed to mount chart: ${error}`)

const ChartClickEvent = Schema.Struct({
  data: Schema.OptionFromOptional(Schema.Struct({ id: Schema.String })),
})
type ChartClickEvent = typeof ChartClickEvent.Type

const datumIdFromChartClickEvent = (event: unknown): Option.Option<string> =>
  pipe(
    event,
    Schema.decodeUnknownOption(ChartClickEvent),
    Option.flatMap(({ data }) => data),
    Option.map(({ id }) => id),
  )

const observeChartResizeAndClickEvents = (
  element: HTMLElement,
  chart: ReturnType<typeof echarts.init>,
  queue: Queue.Enqueue<MountChartMessage>,
) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => {
        const resizeObserver = new ResizeObserver(() => chart.resize())
        const onWindowResize = () => chart.resize()
        const onClick = (event: unknown) => {
          const maybeDatumId = datumIdFromChartClickEvent(event)

          if (Option.isSome(maybeDatumId)) {
            Queue.offerUnsafe(
              queue,
              Message.ClickedChartDatum({ datumId: maybeDatumId.value }),
            )
          }
        }

        try {
          resizeObserver.observe(element)
          window.addEventListener('resize', onWindowResize)
          chart.on('click', onClick)
          return { resizeObserver, onWindowResize, onClick }
        } catch (error) {
          chart.off('click', onClick)
          window.removeEventListener('resize', onWindowResize)
          resizeObserver.disconnect()
          throw error
        }
      },
      catch: toChartMountError,
    }),
    ({ resizeObserver, onWindowResize, onClick }) =>
      Effect.sync(() => {
        chart.off('click', onClick)
        window.removeEventListener('resize', onWindowResize)
        resizeObserver.disconnect()
      }),
  )

const mountChart = (
  charts: typeof ChartRegistry.Service,
  element: Element,
  hostId: string,
) =>
  Stream.callback<MountChartMessage>(queue =>
    Effect.gen(function* () {
      if (!(element instanceof HTMLElement)) {
        Queue.offerUnsafe(
          queue,
          Message.FailedMountChart({
            reason: 'Chart host is not an HTMLElement.',
          }),
        )
        return yield* Effect.never
      }

      const chart = yield* Effect.acquireRelease(
        Effect.try({
          try: () => echarts.init(element, undefined, { renderer: 'canvas' }),
          catch: toChartMountError,
        }),
        chart =>
          Effect.sync(() => chart.dispose()).pipe(
            Effect.ensuring(charts.remove(hostId, chart)),
          ),
      )
      yield* charts.set(hostId, chart)

      yield* observeChartResizeAndClickEvents(element, chart, queue)

      Queue.offerUnsafe(queue, Message.SucceededMountChart({ hostId }))
      return yield* Effect.never
    }).pipe(
      Effect.catch(error =>
        Effect.sync(() =>
          Queue.offerUnsafe(
            queue,
            Message.FailedMountChart({ reason: error.message }),
          ),
        ),
      ),
    ),
  )

export const MountChart = ApplicationDefinition.makeMountStream('MountChart', {
  args: { hostId: Schema.String },
  messages: [
    Message.SucceededMountChart,
    Message.FailedMountChart,
    Message.ClickedChartDatum,
  ],
  handler: function* () {
    const charts = yield* ChartRegistry

    return ({ element, hostId }) => mountChart(charts, element, hostId)
  },
})
