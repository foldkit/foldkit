import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Counter } from './blockCounterChild'

export class LinkedCounters extends Block<LinkedCounters>()('LinkedCounters', {
  Model: Schema.Struct({ left: Counter, right: Counter }),
}) {}

export const LinkedCountersLive = LinkedCounters.toLayer(() => ({
  init: () => ({
    left: new Counter('left', { max: 10 }),
    right: new Counter('right', { max: 3 }),
  }),

  update: {
    ...Counter.on({
      ReachedMax: (model, _outMessage, counter) => {
        if (counter.id === 'left') {
          return {
            model,
            messages: [model.right.send(Counter.Message.RequestedReset())],
          }
        } else {
          return { model }
        }
      },
    }),
  },

  view: (model, h) =>
    h.div([h.Class('flex gap-4')], [model.left.view(), model.right.view()]),
}))
