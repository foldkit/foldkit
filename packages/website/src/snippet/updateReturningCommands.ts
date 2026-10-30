import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedIncrement: {},
  CompletedPersistCount: {},
})

const PersistCount = Command.define('PersistCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedPersistCount],
})

export class Counter extends Block<Counter>()('Counter', {
  Model: Schema.Struct({ count: Schema.Number }),
  Message,
  Command: [PersistCount],
}) {}

export const CounterLive = Counter.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedIncrement: model => {
          const nextCount = model.count + 1

          return {
            model: modifyFields(model, { count: () => nextCount }),
            commands: [PersistCount({ count: nextCount })],
          }
        },
        CompletedPersistCount: model => ({ model }),
      },

      commands: {
        PersistCount: ({ count }) =>
          Effect.sync(() => localStorage.setItem('count', String(count))).pipe(
            Effect.as(Counter.Message.CompletedPersistCount()),
          ),
      },
    }
  }),
)
