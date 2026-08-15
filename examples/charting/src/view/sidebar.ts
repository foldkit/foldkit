import clsx from 'clsx'
import { Array, Option } from 'effect'
import type { Html } from 'foldkit/html'
import { HtmlBuilder } from 'foldkit/html'

import {
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
  GotChartModeRadioGroupMessage,
  GotPackageRadioGroupMessage,
  GotPeriodRadioGroupMessage,
  type Message,
} from '../message'
import { type Model } from '../model'
import {
  ChartModeRadioGroup,
  PackageRadioGroup,
  PeriodRadioGroup,
} from '../radioGroups'
import { formatCompact, formatFetchedAt, formatInteger } from './format'

export const sidebarView = (
  model: Model,
  telemetry: Telemetry,
  maybeBanner: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  h.aside(
    [h.Class('flex flex-col gap-4')],
    [
      Option.match(maybeBanner, {
        onNone: () => h.empty,
        onSome: banner =>
          h.div(
            [
              h.Class(
                'rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950',
              ),
            ],
            [banner],
          ),
      }),
      summaryGridView(telemetry, h),
      controlPanelView(model, h),
      packagePanelView(model, telemetry, h),
      contributorsView(telemetry, h),
    ],
  )

export const summaryGridView = (
  telemetry: Telemetry,
  h: HtmlBuilder<Message>,
): Html => {
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

export const controlPanelView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.section(
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
          h.submodel({
            slotId: model.chartModeRadioGroup.id,
            model: model.chartModeRadioGroup,
            view: ChartModeRadioGroup.view,
            viewInputs: {
              selectedValue: Option.some(model.chartMode),
              options: chartModes,
              ariaLabel: 'Chart mode',
              orientation: 'Horizontal',
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
            },
            toParentMessage: message =>
              GotChartModeRadioGroupMessage({ message }),
          }),
        ],
      ),
      model.chartMode !== 'Ecosystem'
        ? h.div(
            [h.Class('mt-3')],
            [
              h.div(
                [h.Class('mb-1.5 text-xs font-medium text-zinc-500')],
                ['Period'],
              ),
              h.submodel({
                slotId: model.periodRadioGroup.id,
                model: model.periodRadioGroup,
                view: PeriodRadioGroup.view,
                viewInputs: {
                  selectedValue: Option.some(model.period),
                  options: periods,
                  ariaLabel: 'Period',
                  orientation: 'Horizontal',
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
                },
                toParentMessage: message =>
                  GotPeriodRadioGroupMessage({ message }),
              }),
            ],
          )
        : h.empty,
    ],
  )

export const packagePanelView = (
  model: Model,
  telemetry: Telemetry,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('rounded-md border border-zinc-200 bg-white p-3')],
    [
      h.h2([h.Class('text-sm font-semibold text-zinc-950')], ['Package']),
      h.div(
        [h.Class('mt-3')],
        [
          h.submodel({
            slotId: model.packageRadioGroup.id,
            model: model.packageRadioGroup,
            view: PackageRadioGroup.view,
            viewInputs: {
              selectedValue: Option.some(model.selectedPackageId),
              options: packageIds,
              ariaLabel: 'Package',
              orientation: 'Vertical',
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
            },
            toParentMessage: message =>
              GotPackageRadioGroupMessage({ message }),
          }),
        ],
      ),
    ],
  )

export const contributorsView = (
  telemetry: Telemetry,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
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
