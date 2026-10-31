// ❌ Don't call random directly in update
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const GRID_SIZE = 20

const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number })

export class Snake extends Block<Snake>()('Snake', {
  Model: Schema.Struct({ apple: Position }),
  Message: defineMessageUnion({ RequestedApple: {} }),
}) {}

export const SnakeLive = Snake.make(
  Effect.fn(function* () {
    return {
      model: { apple: { x: 0, y: 0 } },

      update: {
        RequestedApple: model => {
          const x = Math.floor(Math.random() * GRID_SIZE)
          const y = Math.floor(Math.random() * GRID_SIZE)
          return { model: modifyFields(model, { apple: () => ({ x, y }) }) }
        },
      },
    }
  }),
)
