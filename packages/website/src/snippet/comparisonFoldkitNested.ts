import { Array, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Counter } from './blockCounterChild'

export class Counters extends Block<Counters>()('Counters', {
  Model: Schema.Struct({
    counters: Schema.Array(Counter),
    nextCounterId: Schema.Number,
    completedCount: Schema.Number,
  }),
  Message: defineMessageUnion({ ClickedAddCounter: {} }),
}) {}

export const CountersLive = Counters.toLayer(() => ({
  init: () => ({ counters: [], nextCounterId: 0, completedCount: 0 }),

  update: {
    // The new instance is plain data. Foldkit runs its init, start
    // Commands, and Subscriptions once it appears in the Model.
    ClickedAddCounter: model => ({
      model: modifyFields(model, {
        counters: Array.append(
          new Counter(`counter-${model.nextCounterId}`, { max: 10 }),
        ),
        nextCounterId: Number.increment,
      }),
    }),

    // One entry handles the OutMessages of every Counter in the Model.
    ...Counter.onAll({
      ReachedMax: model => ({
        model: modifyFields(model, { completedCount: Number.increment }),
      }),
    }),
  },

  view: (model, h) =>
    h.div(
      [],
      [
        ...Array.map(model.counters, counter => counter.view()),
        h.button(
          [h.OnClick(Counters.Message.ClickedAddCounter())],
          ['Add counter'],
        ),
      ],
    ),
}))
