import { Option } from 'effect'
import type { Html } from 'foldkit/html'

import type { ApplicationViewBuilder } from '../composition'
import type { Telemetry } from '../domain'
import { selectedDatumLabel } from '../echarts'
import type { Model } from '../model'
import { CHART_HOST_ID, MountChart } from '../mount'
import { formatInteger } from './format'

export const chartPanelView = (
  model: Model,
  telemetry: Telemetry,
  h: ApplicationViewBuilder,
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
  h: ApplicationViewBuilder,
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

export const chartStatusView = (
  model: Model,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(model.maybeChartError, {
    onNone: () =>
      h.div([h.Class('text-xs font-medium text-emerald-700')], ['Chart ready']),
    onSome: error =>
      h.div([h.Class('max-w-md text-xs font-medium text-rose-700')], [error]),
  })
