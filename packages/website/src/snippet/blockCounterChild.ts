import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  {
    Model: Schema.Struct({ count: Schema.Number }),
    Message: defineMessageUnion({ ClickedIncrement: {}, RequestedReset: {} }),
    OutMessage: defineMessageUnion({ ReachedMax: {} }),
  },
) {}

export const CounterLive = Counter.make(
  Effect.fn(function* (id, { max }) {
    return {
      model: { count: 0 },

      update: {
        ClickedIncrement: model => {
          const nextModel = modifyFields(model, { count: Number.increment })

          if (nextModel.count === max) {
            return {
              model: nextModel,
              outMessage: Counter.OutMessage.ReachedMax(),
            }
          } else {
            return { model: nextModel }
          }
        },
        RequestedReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
      },

      view: (model, h) =>
        h.button(
          [h.OnClick(Counter.Message.ClickedIncrement())],
          [`${id}: ${model.count}/${max}`],
        ),
    }
  }),
)
