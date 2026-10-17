import { Duration, Effect, Schema, Stream } from 'effect'
import { AsyncData } from 'foldkit'

import { Application } from './definition'
import { Message } from './message'

const STATS_REFETCH_INTERVAL = Duration.seconds(5)

export const subscriptions = Application.subscriptions(entry => ({
  statsRevalidationTicks: entry(
    'StatsRevalidationTicks',
    { isObservingStats: Schema.Boolean },
    {
      messages: [Message.TickedRevalidateStats],
      modelToDependencies: model => ({
        isObservingStats:
          model.activeTab === 'Stats' && AsyncData.hasData(model.stats),
      }),
      handler: function* () {
        return ({ isObservingStats }) =>
          Stream.when(
            // NOTE: Stream.tick emits once immediately. Drop that first
            // emission so freshly loaded stats are not refetched instantly.
            Stream.tick(STATS_REFETCH_INTERVAL).pipe(
              Stream.drop(1),
              Stream.map(Message.TickedRevalidateStats),
            ),
            Effect.sync(() => isObservingStats),
          )
      },
    },
  ),
}))
