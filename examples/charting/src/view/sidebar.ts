import clsx from 'clsx'
import { Array, Option } from 'effect'
import type { Html } from 'foldkit/html'
import { html } from 'foldkit/html'

import { RadioGroup } from '@foldkit/ui'

import {
  type ChartMode,
  type PackageId,
  type Period,
  type Telemetry,
  chartModes,
  findPackageSnapshot,
  packageIdToSpec,
  packageIds,
  periodLabels,
  periods,
  totalCommits,
  totalDownloads,
} from '../domain'
import {
  type Message,
  SelectedChartMode,
  SelectedPackage,
  SelectedPeriod,
} from '../message'
import { type Model } from '../model'
import {
  CHART_MODE_RADIO_GROUP_ID,
  PACKAGE_RADIO_GROUP_ID,
  PERIOD_RADIO_GROUP_ID,
} from '../radioGroups'
import { formatCompact, formatFetchedAt, formatInteger } from './format'

export const sidebarView = (
  model: Model,
  telemetry: Telemetry,
  maybeBanner: Option.Option<string>,
): Html => {
  const h = html<Message>()

  return h.aside(
    [h.Class('flex flex-col gap-4')],
    [
      Option.match(maybeBanner, {
        onNone: () => h.empty,
        onSome: banner =>
          h.keyed('div')(
            'TelemetryBanner',
            [
              h.Class(
                'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950',
              ),
            ],
            [banner],
          ),
      }),
      summaryGridView(telemetry),
      controlPanelView(model),
      packagePanelView(model, telemetry),
      contributorsView(telemetry),
    ],
  )
}

export const summaryGridView = (telemetry: Telemetry): Html => {
  const h = html<Message>()

  const summaries = [
    {
      id: 'stars',
      label: 'Stars',
      value: formatCompact(telemetry.repository.stars),
    },
    {
      id: 'downloads',
      label: 'Downloads',
      value: formatCompact(totalDownloads(telemetry)),
    },
    {
      id: 'contributors',
      label: 'Contributors',
      value: formatInteger(telemetry.repository.visibleContributors),
    },
    {
      id: 'commits',
      label: 'Commits',
      value: formatInteger(totalCommits(telemetry)),
    },
  ]

  return h.div(
    [h.Class('grid grid-cols-2 gap-3')],
    Array.map(summaries, summary =>
      h.keyed('div')(
        summary.id,
        [h.Class('rounded-md border border-zinc-200 bg-white p-3')],
        [
          h.div(
            [h.Class('text-xs font-medium text-zinc-500')],
            [summary.label],
          ),
          h.div(
            [h.Class('mt-1 text-xl font-semibold text-zinc-950')],
            [summary.value],
          ),
        ],
      ),
    ),
  )
}

const radioGroupClassName =
  'grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-100 p-1'

const radioOptionClassName = (isSelected: boolean): string =>
  clsx(
    'flex min-h-9 cursor-pointer items-center justify-center rounded px-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
    isSelected
      ? 'bg-white text-zinc-950 shadow-sm'
      : 'text-zinc-600 hover:text-zinc-950',
  )

export const controlPanelView = (model: Model): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('rounded-md border border-zinc-200 bg-white p-3')],
    [
      h.h2([h.Class('text-sm font-semibold text-zinc-950')], ['View']),
      h.div(
        [h.Class('mt-3')],
        [
          h.div(
            [h.Class('mb-1.5 text-xs font-medium text-zinc-500')],
            ['Chart mode'],
          ),
          RadioGroup.view<ChartMode, Message>({
            id: CHART_MODE_RADIO_GROUP_ID,
            selectedValue: Option.some(model.chartMode),
            options: chartModes,
            ariaLabel: 'Chart mode',
            orientation: 'Horizontal',
            onSelect: chartMode => SelectedChartMode({ chartMode }),
            toView: ({ group, options }) =>
              h.div(
                [...group, h.Class(radioGroupClassName)],
                Array.map(options, option =>
                  h.div(
                    [
                      ...option.option,
                      h.Key(option.value),
                      h.Class(radioOptionClassName(option.isSelected)),
                    ],
                    [h.span([...option.label], [option.value])],
                  ),
                ),
              ),
          }),
        ],
      ),
      model.chartMode !== 'Ecosystem'
        ? h.keyed('div')(
            'period-control',
            [h.Class('mt-3')],
            [
              h.div(
                [h.Class('mb-1.5 text-xs font-medium text-zinc-500')],
                ['Period'],
              ),
              RadioGroup.view<Period, Message>({
                id: PERIOD_RADIO_GROUP_ID,
                selectedValue: Option.some(model.period),
                options: periods,
                ariaLabel: 'Period',
                orientation: 'Horizontal',
                onSelect: period => SelectedPeriod({ period }),
                toView: ({ group, options }) =>
                  h.div(
                    [...group, h.Class(radioGroupClassName)],
                    Array.map(options, option =>
                      h.div(
                        [
                          ...option.option,
                          h.Key(option.value),
                          h.Class(radioOptionClassName(option.isSelected)),
                        ],
                        [periodLabels[option.value]],
                      ),
                    ),
                  ),
              }),
            ],
          )
        : h.empty,
    ],
  )
}

export const packagePanelView = (model: Model, telemetry: Telemetry): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('rounded-md border border-zinc-200 bg-white p-3')],
    [
      h.h2([h.Class('text-sm font-semibold text-zinc-950')], ['Package']),
      h.div(
        [h.Class('mt-3')],
        [
          RadioGroup.view<PackageId, Message>({
            id: PACKAGE_RADIO_GROUP_ID,
            selectedValue: Option.some(model.selectedPackageId),
            options: packageIds,
            ariaLabel: 'Package',
            orientation: 'Vertical',
            onSelect: packageId => SelectedPackage({ packageId }),
            toView: ({ group, options }) =>
              h.div(
                [...group, h.Class('grid gap-2')],
                Array.map(options, option => {
                  const spec = packageIdToSpec(option.value)
                  const maybeSnapshot = findPackageSnapshot(
                    telemetry,
                    option.value,
                  )

                  return h.div(
                    [
                      ...option.option,
                      h.Key(option.value),
                      h.Class(
                        clsx(
                          'cursor-pointer min-h-14 rounded-md border px-3 py-2 text-left',
                          option.isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                            : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50',
                        ),
                      ),
                    ],
                    [
                      h.div(
                        [h.Class('text-sm font-medium')],
                        [spec.displayName],
                      ),
                      h.div(
                        [h.Class('mt-0.5 text-xs text-zinc-500')],
                        [
                          Option.match(maybeSnapshot, {
                            onNone: () => spec.role,
                            onSome: snapshot =>
                              `${formatCompact(snapshot.lastWeekDownloads)} last week, v${snapshot.latestVersion}`,
                          }),
                        ],
                      ),
                    ],
                  )
                }),
              ),
          }),
        ],
      ),
    ],
  )
}

export const contributorsView = (telemetry: Telemetry): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('rounded-md border border-zinc-200 bg-white p-3')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-3')],
        [
          h.h2(
            [h.Class('text-sm font-semibold text-zinc-950')],
            ['Contributors'],
          ),
          h.span(
            [h.Class('text-xs text-zinc-500')],
            [`Updated ${formatFetchedAt(telemetry.fetchedAt)}`],
          ),
        ],
      ),
      h.ul(
        [h.Class('mt-3 grid gap-2')],
        Array.map(telemetry.topContributors, contributor =>
          h.li(
            [
              h.Key(contributor.login),
              h.Class('flex items-center justify-between gap-3 text-sm'),
            ],
            [
              h.span(
                [h.Class('font-medium text-zinc-800')],
                [contributor.login],
              ),
              h.span(
                [h.Class('text-zinc-500')],
                [`${formatInteger(contributor.contributions)} commits`],
              ),
            ],
          ),
        ),
      ),
    ],
  )
}
