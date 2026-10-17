import { Option } from 'effect'
import { AsyncData } from 'foldkit'

import * as Button from '@foldkit/ui/button'

import type { ApplicationViewBuilder } from '../composition'
import type { Stats } from '../data'
import { Message } from '../message'
import type { Model } from '../model'
import { errorPanel, loadingPanel, toolbarButtonClassName } from './shared'

const formatFetchedAt = (fetchedAt: number): string =>
  new Date(fetchedAt).toLocaleTimeString()

export const statsTabView = (model: Model, h: ApplicationViewBuilder) => {
  const isPending = AsyncData.isPending(model.stats)

  return h.div(
    [h.Class('flex flex-col gap-4')],
    [
      h.div(
        [h.Class('flex items-center justify-between')],
        [
          h.h2([h.Class('text-xl font-bold text-slate-800')], ['Stats']),
          Button.view(
            {
              onClick: Message.ClickedRefreshStats(),
              isDisabled: isPending,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(toolbarButtonClassName)],
                  [isPending ? 'Refreshing...' : 'Refresh'],
                ),
            },
            h,
          ),
        ],
      ),
      h.p(
        [h.Class('text-sm text-slate-500')],
        [
          'Stats refetch every 5 seconds while this tab is open. The old numbers stay on screen while the new ones load.',
        ],
      ),
      AsyncData.matchDataSplitEmpty(model.stats, {
        onIdle: () => loadingPanel('Loading stats...', h),
        onLoading: () => loadingPanel('Loading stats...', h),
        onFailure: error =>
          errorPanel({ error, retryMessage: Message.ClickedRetryStats() }, h),
        onData: ({ stats, fetchedAt }) =>
          h.div(
            [h.Class('flex flex-col gap-4')],
            [
              ...Option.match(AsyncData.getError(model.stats), {
                onNone: () => [],
                onSome: error => [
                  errorPanel(
                    { error, retryMessage: Message.ClickedRetryStats() },
                    h,
                  ),
                ],
              }),
              statsCards(
                {
                  stats,
                  fetchedAt,
                  isRefreshing: AsyncData.isRefreshing(model.stats),
                },
                h,
              ),
            ],
          ),
      }),
    ],
  )
}

type StatsCardsInput = Readonly<{
  stats: Stats
  fetchedAt: number
  isRefreshing: boolean
}>

const statsCards = (
  { stats, fetchedAt, isRefreshing }: StatsCardsInput,
  h: ApplicationViewBuilder,
) =>
  h.div(
    [h.Class('flex flex-col gap-3')],
    [
      h.div(
        [h.Class('grid grid-cols-3 gap-4')],
        [
          statCard({ label: 'Active users', value: `${stats.activeUsers}` }, h),
          statCard(
            {
              label: 'Requests per second',
              value: `${stats.requestsPerSecond}`,
            },
            h,
          ),
          statCard(
            {
              label: 'Cache hit rate',
              value: `${stats.cacheHitRatePercent}%`,
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-3 text-sm text-slate-500')],
        [
          h.span([], [`Updated at ${formatFetchedAt(fetchedAt)}`]),
          ...(isRefreshing
            ? [
                h.span(
                  [h.Class('text-indigo-600 font-semibold')],
                  ['Refreshing'],
                ),
              ]
            : []),
        ],
      ),
    ],
  )

type StatCardInput = Readonly<{ label: string; value: string }>

const statCard = ({ label, value }: StatCardInput, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('bg-white rounded-xl shadow p-4 flex flex-col gap-1')],
    [
      h.div([h.Class('text-sm text-slate-500')], [label]),
      h.div([h.Class('text-2xl font-bold text-slate-900')], [value]),
    ],
  )
