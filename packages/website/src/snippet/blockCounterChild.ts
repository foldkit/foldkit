import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  {
    Model: Schema.Struct({
      label: Schema.String,
      count: Schema.Number,
      max: Schema.Number,
    }),
    Message: defineMessageUnion({ ClickedIncrement: {}, RequestedReset: {} }),
    OutMessage: defineMessageUnion({ ReachedMax: {} }),
  },
) {}

export const CounterLive = Counter.toLayer(() => ({
  init: ({ max }, { id }) => ({ label: id, count: 0, max }),

  update: {
    ClickedIncrement: model => {
      const nextModel = modifyFields(model, { count: Number.increment })

      if (nextModel.count === nextModel.max) {
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
      [`${model.label}: ${model.count}/${model.max}`],
    ),
}))
