import * as echarts from 'echarts/core'
import { Effect, Option, Queue, Schema, Stream, pipe } from 'effect'
import { Mount } from 'foldkit'
import type { Html } from 'foldkit/html'
import { HtmlBuilder } from 'foldkit/html'

import { removeChart, setChart } from '../chartHost'
import type { Telemetry } from '../domain'
import { selectedDatumLabel } from '../echarts'
import { Message } from '../message'
import type { Model } from '../model'
import { formatInteger } from './format'

export const CHART_HOST_ID = 'charting-chart'

type MountChartMessage =
  | typeof Message.SucceededMountChart.Type
  | typeof Message.FailedMountChart.Type
  | typeof Message.ClickedChartDatum.Type

const toChartMountError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`Failed to mount chart: ${error}`)

const ChartClickEvent = Schema.Struct({
  data: Schema.OptionFromOptional(Schema.Struct({ id: Schema.String })),
})

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

const mountChart = (element: Element, hostId: string) =>
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
        chart => Effect.sync(() => removeChart(hostId, chart)),
      )
      setChart(hostId, chart)

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

export const MountChart = Mount.defineStream('MountChart', {
  args: { hostId: Schema.String },
  messages: [
    Message.SucceededMountChart,
    Message.FailedMountChart,
    Message.ClickedChartDatum,
  ],
  execute: ({ element, hostId }) => mountChart(element, hostId),
})

export const chartPanelView = (
  model: Model,
  telemetry: Telemetry,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [
      h.Class(
        'grid min-h-[32rem] self-start grid-rows-[minmax(0,1fr)_auto] rounded-md border border-zinc-200 bg-white',
      ),
    ],
    [
      h.div([
        h.Class('min-h-[26rem] w-full'),
        h.AriaLabel('Adoption chart'),
        h.OnMount(MountChart({ hostId: CHART_HOST_ID })),
      ]),
      chartFooterView(model, telemetry, h),
    ],
  )

export const chartFooterView = (
  model: Model,
  telemetry: Telemetry,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Class(
        'flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between',
      ),
    ],
    [
      h.div(
        [],
        [
          h.div(
            [h.Class('font-medium text-zinc-900')],
            [chartFooterLabel(model, telemetry)],
          ),
          h.div(
            [h.Class('text-xs text-zinc-500')],
            [`Default branch: ${telemetry.repository.defaultBranch}`],
          ),
        ],
      ),
      chartStatusView(model, h),
    ],
  )

export const chartFooterLabel = (model: Model, telemetry: Telemetry): string =>
  Option.getOrElse(
    selectedDatumLabel(telemetry, model.maybeSelectedDatumId),
    () =>
      `${formatInteger(telemetry.repository.openIssues)} open issues, ${formatInteger(
        telemetry.repository.openPullRequests,
      )} open pull requests`,
  )

export const chartStatusView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Option.match(model.maybeChartError, {
    onNone: () =>
      h.div([h.Class('text-xs font-medium text-emerald-700')], ['Chart ready']),
    onSome: error =>
      h.div([h.Class('max-w-md text-xs font-medium text-rose-700')], [error]),
  })
