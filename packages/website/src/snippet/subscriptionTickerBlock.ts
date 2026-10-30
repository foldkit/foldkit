import { Duration, Effect, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export class Ticker extends Block<
  Ticker,
  Readonly<{ every: Duration.Input }>
>()('Ticker', {
  Message: defineMessageUnion({ Ticked: {} }),
  OutMessage: defineMessageUnion({ Ticked: {} }),
}) {}

export const TickerLive = Ticker.make(
  Effect.fn(function* (_id, { every }) {
    return {
      stream: Stream.tick(every).pipe(
        Stream.drop(1),
        Stream.as(Ticker.Message.Ticked()),
      ),

      update: {
        Ticked: model => ({ model, outMessage: Ticker.OutMessage.Ticked() }),
      },
    }
  }),
)
