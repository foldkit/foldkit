import { Duration, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export class Ticker extends Block<
  Ticker,
  Readonly<{ every: Duration.Duration }>
>()('Ticker', {
  Model: Schema.Struct({ every: Schema.Duration }),
  Message: defineMessageUnion({ Ticked: {} }),
  OutMessage: defineMessageUnion({ Ticked: {} }),
}) {}

export const TickerLive = Ticker.toLayer(() => ({
  init: ({ every }) => ({ every }),

  subscriptions: {
    ticks: {
      dependencies: model => model.every,
      stream: (every: Duration.Duration) =>
        Stream.tick(every).pipe(
          Stream.drop(1),
          Stream.as(Ticker.Message.Ticked()),
        ),
    },
  },

  update: {
    Ticked: model => ({ model, outMessage: Ticker.OutMessage.Ticked() }),
  },
}))
