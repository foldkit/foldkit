import { Clock, Effect, Option, Schema, pipe } from 'effect'
import { AsyncData, Block, Command } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Button from '@foldkit/ui/button'

import { Stats, fetchStats } from './domain/data'
import {
  errorPanel,
  formatFetchedAt,
  loadingPanel,
  toolbarButtonClassName,
} from './domain/panel'

const FetchedStats = Schema.Struct({
  stats: Stats,
  fetchedAt: Schema.Number,
})

export const StatsData = AsyncData.Schema(FetchedStats, Schema.String)

const Model = Schema.Struct({
  stats: StatsData.schema,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedLoadIfMissing: {},
  RequestedRevalidation: {},
  ClickedRefreshStats: {},
  ClickedRetryStats: {},
  CompletedFetchStats: { result: Schema.Result(FetchedStats, Schema.String) },
})
type Message = typeof Message.Type

export const FetchStats = Command.define('FetchStats', {
  messages: [Message.CompletedFetchStats],
})

export class StatsTab extends Block<StatsTab>()('StatsTab', {
  Model,
  Message,
  Command: [FetchStats],
}) {}

type StatsTabViewBuilder = HtmlBuilder<Message>

export const hasStatsData = (model: Model): boolean =>
  AsyncData.hasData(model.stats)

const applyStatsTransition = (
  model: Model,
  maybeNextStats: Option.Option<typeof StatsData.schema.Type>,
) =>
  Option.match(maybeNextStats, {
    onNone: () => ({ model }),
    onSome: nextStats => ({
      model: modifyFields(model, { stats: () => nextStats }),
      commands: [FetchStats()],
    }),
  })

type StatsCardsInput = Readonly<{
  stats: Stats
  fetchedAt: number
  isRefreshing: boolean
}>

const statsCards = (
  { stats, fetchedAt, isRefreshing }: StatsCardsInput,
  h: StatsTabViewBuilder,
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

const statCard = ({ label, value }: StatCardInput, h: StatsTabViewBuilder) =>
  h.div(
    [h.Class('bg-white rounded-xl shadow p-4 flex flex-col gap-1')],
    [
      h.div([h.Class('text-sm text-slate-500')], [label]),
      h.div([h.Class('text-2xl font-bold text-slate-900')], [value]),
    ],
  )

export const StatsTabLive = StatsTab.make(
  Effect.fn(function* () {
    const clock = yield* Clock.Clock

    return {
      model: { stats: StatsData.Idle() },

      update: {
        RequestedLoadIfMissing: model =>
          applyStatsTransition(model, AsyncData.loadIfMissing(model.stats)),

        RequestedRevalidation: model =>
          applyStatsTransition(model, AsyncData.revalidate(model.stats)),

        ClickedRefreshStats: model =>
          applyStatsTransition(model, AsyncData.revalidateOrLoad(model.stats)),

        ClickedRetryStats: model =>
          applyStatsTransition(model, AsyncData.revalidateOrLoad(model.stats)),

        CompletedFetchStats: (model, { result }) => ({
          model: modifyFields(model, { stats: AsyncData.settle(result) }),
        }),
      },

      commands: {
        FetchStats: () =>
          pipe(
            Effect.gen(function* () {
              const stats = yield* fetchStats
              const fetchedAt = yield* clock.currentTimeMillis

              return FetchedStats.make({ stats, fetchedAt })
            }),
            Effect.result,
            Effect.map(result => Message.CompletedFetchStats({ result })),
          ),
      },

      view: (model, h) => {
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
                errorPanel(
                  { error, retryMessage: Message.ClickedRetryStats() },
                  h,
                ),
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
      },
    }
  }),
)
