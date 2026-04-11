import { Duration, Effect, Schedule, Stream } from 'effect'

import { ReceivedStatusBannerUpdate } from '../message'
import { NowClient } from './rpc'

export const statusBannerStream = () =>
  Effect.gen(function* () {
    const client = yield* NowClient
    return client.subscribeStatusBanner({}).pipe(
      Stream.map(banner => ReceivedStatusBannerUpdate({ banner })),
      Stream.retry(
        Schedule.exponential('1 second', 2).pipe(
          Schedule.either(Schedule.spaced('30 seconds')),
          Schedule.compose(Schedule.recurs(20)),
          Schedule.modifyDelay(delay =>
            Duration.min(delay, Duration.seconds(30)),
          ),
        ),
      ),
      Stream.catchAll(() => Stream.empty),
    )
  }).pipe(Stream.unwrap, Stream.provideLayer(NowClient.Default))
