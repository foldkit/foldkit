import { Duration, Effect, Schema, Stream } from 'effect'
import { AsyncData } from 'foldkit'

import { ApplicationDefinition } from './definition'
import { Message } from './message'
import { statsQuery } from './query'

const STATS_REFETCH_INTERVAL = Duration.seconds(5)

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  statsRefreshTicks: entry(
    'StatsRefreshTicks',
    { isStatsRefreshActive: Schema.Boolean },
    {
      messages: [Message.TickedStatsRefreshInterval],
      modelToDependencies: model => ({
        isStatsRefreshActive:
          model.activeTab === 'Stats' &&
          AsyncData.hasData(statsQuery.read(model.stats)),
      }),
      handler: function* () {
        return ({ isStatsRefreshActive }) =>
          Stream.when(
            Stream.tick(STATS_REFETCH_INTERVAL).pipe(
              Stream.drop(1),
              Stream.map(Message.TickedStatsRefreshInterval),
            ),
            Effect.sync(() => isStatsRefreshActive),
          )
      },
    },
  ),
}))
