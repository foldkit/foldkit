import * as echarts from 'echarts/core'
import { Effect, Option, Schema as S } from 'effect'
import { Mount } from 'foldkit'
import type { Html } from 'foldkit/html'
import { html } from 'foldkit/html'

import { removeChart, setChart } from '../chartHost'
import type { Telemetry } from '../domain'
import { selectedDatumLabel } from '../echarts'
import type { Message } from '../message'
import { FailedMountChart, SucceededMountChart } from '../message'
import type { Model } from '../model'
import { formatInteger } from './format'

export const CHART_HOST_ID = 'charting-chart'

export const MountChart = Mount.define(
  'MountChart',
  { hostId: S.String },
  SucceededMountChart,
  FailedMountChart,
)(
  ({ hostId }) =>
    element =>
      Effect.gen(function* () {
        if (!(element instanceof HTMLElement)) {
          return FailedMountChart({
            reason: 'Chart host is not an HTMLElement.',
          })
        }

        return yield* Effect.acquireRelease(
          Effect.try({
            try: () => {
              const chart = echarts.init(element, undefined, {
                renderer: 'canvas',
              })
              const resizeObserver = new ResizeObserver(() => chart.resize())
              resizeObserver.observe(element)
              const onWindowResize = () => chart.resize()
              window.addEventListener('resize', onWindowResize)
              setChart(hostId, chart)
              return { resizeObserver, onWindowResize }
            },
            catch: error =>
              error instanceof Error
                ? error
                : new Error(`Failed to mount chart: ${error}`),
          }),
          ({ resizeObserver, onWindowResize }) =>
            Effect.sync(() => {
              resizeObserver.disconnect()
              window.removeEventListener('resize', onWindowResize)
              removeChart(hostId)
            }),
        ).pipe(
          Effect.map(() => SucceededMountChart({ hostId })),
          Effect.catch(error =>
            Effect.succeed(FailedMountChart({ reason: error.message })),
          ),
        )
      }),
)

export const chartPanelView = (model: Model, telemetry: Telemetry): Html => {
  const h = html<Message>()

  return h.section(
    [
      h.Class(
        'grid min-h-[32rem] self-start grid-rows-[minmax(0,1fr)_auto] rounded-md border border-zinc-200 bg-white',
      ),
    ],
    [
      h.div(
        [
          h.Class('min-h-[26rem] w-full'),
          h.AriaLabel('Adoption chart'),
          h.OnMount(MountChart({ hostId: CHART_HOST_ID })),
        ],
        [],
      ),
      chartFooterView(model, telemetry),
    ],
  )
}

export const chartFooterView = (model: Model, telemetry: Telemetry): Html => {
  const h = html<Message>()

  return h.div(
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
      chartStatusView(model),
    ],
  )
}

export const chartFooterLabel = (model: Model, telemetry: Telemetry): string =>
  Option.getOrElse(
    selectedDatumLabel(telemetry, model.maybeSelectedDatumId),
    () =>
      `${formatInteger(telemetry.repository.openIssues)} open issues, ${formatInteger(
        telemetry.repository.openPullRequests,
      )} open pull requests`,
  )

export const chartStatusView = (model: Model): Html => {
  const h = html<Message>()

  return Option.match(model.maybeChartError, {
    onNone: () =>
      h.keyed('div')(
        'ChartReady',
        [h.Class('text-xs font-medium text-emerald-700')],
        ['Chart ready'],
      ),
    onSome: error =>
      h.keyed('div')(
        'ChartError',
        [h.Class('max-w-md text-xs font-medium text-rose-700')],
        [error],
      ),
  })
}
