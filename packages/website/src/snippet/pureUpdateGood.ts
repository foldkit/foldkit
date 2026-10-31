// ✅ Run random work in a Command
import { Effect, Random, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const GRID_SIZE = 20

const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number })

const Message = defineMessageUnion({
  RequestedApple: {},
  CompletedGenerateApplePosition: { position: Position },
})

const GenerateApplePosition = Command.define('GenerateApplePosition', {
  messages: [Message.CompletedGenerateApplePosition],
})

export class Snake extends Block<Snake>()('Snake', {
  Model: Schema.Struct({ apple: Position }),
  Message,
  Command: [GenerateApplePosition],
}) {}

export const SnakeLive = Snake.make(
  Effect.fn(function* () {
    return {
      model: { apple: { x: 0, y: 0 } },

      update: {
        RequestedApple: model => ({
          model,
          commands: [GenerateApplePosition()],
        }),
        CompletedGenerateApplePosition: (model, { position }) => ({
          model: modifyFields(model, { apple: () => position }),
        }),
      },

      commands: {
        GenerateApplePosition: () =>
          Effect.gen(function* () {
            const x = yield* Random.nextIntBetween(0, GRID_SIZE, {
              halfOpen: true,
            })
            const y = yield* Random.nextIntBetween(0, GRID_SIZE, {
              halfOpen: true,
            })
            return Message.CompletedGenerateApplePosition({
              position: { x, y },
            })
          }),
      },
    }
  }),
)
