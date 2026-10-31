import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Counter } from './blockCounterChild'

export class LinkedCounters extends Block<LinkedCounters>()('LinkedCounters', {
  Model: Schema.Struct({ left: Counter, right: Counter }),
}) {}

export const LinkedCountersLive = LinkedCounters.make(
  Effect.fn(function* () {
    const left = yield* new Counter('left', { max: 10 })
    const right = yield* new Counter('right', { max: 3 })

    return {
      model: { left, right },

      update: {
        ...left.on({
          ReachedMax: model => ({
            model,
            messages: [model.right.send(Counter.Message.RequestedReset())],
          }),
        }),
      },

      view: (model, h) =>
        h.div([h.Class('flex gap-4')], [model.left.view(), model.right.view()]),
    }
  }),
)
