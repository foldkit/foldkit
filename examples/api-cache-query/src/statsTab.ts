import { Clock, Effect, Layer, Option, Schema } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { Query } from 'foldkit/experimental'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Button from '@foldkit/ui/button'

import { Stats, fetchStats } from './domain/data'
import {
  errorPanel,
  formatFetchedAt,
  loadingPanel,
  toolbarButtonClassName,
} from './domain/panel'

const StatsData = Schema.Struct({ stats: Stats, fetchedAt: Schema.Number })
type StatsData = typeof StatsData.Type

export const StatsQuery = Query.define({
  name: 'Stats',
  data: StatsData,
  error: Schema.String,
  handler: function* () {
    const clock = yield* Clock.Clock

    return () =>
      Effect.gen(function* () {
        const stats = yield* fetchStats
        const fetchedAt = yield* clock.currentTimeMillis

        return { stats, fetchedAt }
      })
  },
})

const Model = Schema.Struct({
  stats: StatsQuery,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  RequestedLoadIfMissing: {},
  RequestedRevalidation: {},
  ClickedRefreshStats: {},
  ClickedRetryStats: {},
})
type Message = typeof Message.Type

export class StatsTab extends Block<StatsTab>()('StatsTab', {
  Model,
  Message,
}) {}

export const StatsTabLive = StatsTab.make(
  Effect.fn(function* () {
    const stats = yield* new StatsQuery('stats', {})

    return {
      model: { stats },

      update: {
        RequestedLoadIfMissing: model => ({
          model,
          messages: [
            model.stats.send(StatsQuery.Message.RequestedLoadIfMissing()),
          ],
        }),
        RequestedRevalidation: model => ({
          model,
          messages: [
            model.stats.send(StatsQuery.Message.RequestedRevalidation()),
          ],
        }),
        ClickedRefreshStats: model => ({
          model,
          messages: [
            model.stats.send(StatsQuery.Message.RequestedRevalidationOrLoad()),
          ],
        }),
        ClickedRetryStats: model => ({
          model,
          messages: [
            model.stats.send(StatsQuery.Message.RequestedRevalidationOrLoad()),
          ],
        }),
      },

      view: (model, h) => {
        const statsAsyncData = StatsQuery.read(model.stats.model)
        const isPending = AsyncData.isPending(statsAsyncData)

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
                        [isPending ? 'Refreshing…' : 'Refresh'],
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
            AsyncData.matchData(statsAsyncData, {
              onEmpty: () => loadingPanel('Loading stats…', h),
              onFailure: error =>
                errorPanel(
                  { error, retryMessage: Message.ClickedRetryStats() },
                  h,
                ),
              onData: ({ stats, fetchedAt }) =>
                h.div(
                  [h.Class('flex flex-col gap-4')],
                  [
                    ...Option.match(AsyncData.getError(statsAsyncData), {
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
                        isRefreshing: AsyncData.isRefreshing(statsAsyncData),
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
).pipe(Layer.provide(StatsQuery.Live))

type StatsTabViewBuilder = HtmlBuilder<Message>

export const hasStatsData = (model: Model): boolean =>
  AsyncData.hasData(StatsQuery.read(model.stats.model))

const statCard = (
  { label, value }: Readonly<{ label: string; value: string }>,
  h: StatsTabViewBuilder,
) =>
  h.div(
    [h.Class('bg-white rounded-xl shadow p-4 flex flex-col gap-1')],
    [
      h.div([h.Class('text-sm text-slate-500')], [label]),
      h.div([h.Class('text-2xl font-bold text-slate-900')], [value]),
    ],
  )

const statsCards = (
  {
    stats,
    fetchedAt,
    isRefreshing,
  }: Readonly<{
    stats: Stats
    fetchedAt: number
    isRefreshing: boolean
  }>,
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
            { label: 'Cache hit rate', value: `${stats.cacheHitRatePercent}%` },
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
