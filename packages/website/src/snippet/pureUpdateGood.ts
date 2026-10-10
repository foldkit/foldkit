import { Effect, Random } from 'effect'
import { Command, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { GRID_SIZE } from './constants'
import { Message } from './message'
import type { Model } from './model'

// ✅ Run random work in a Command
const GenerateApplePosition = Command.define('GenerateApplePosition', {
  messages: [Message.CompletedGenerateApplePosition],
})

const GenerateApplePositionLayer = GenerateApplePosition.toLayer(
  Effect.succeed(() =>
    Effect.gen(function* () {
      const x = yield* Random.nextIntBetween(0, GRID_SIZE, { halfOpen: true })
      const y = yield* Random.nextIntBetween(0, GRID_SIZE, { halfOpen: true })
      return Message.CompletedGenerateApplePosition({ position: { x, y } })
    }),
  ),
)

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    RequestedApple: () => ({ model, commands: [GenerateApplePosition()] }),
    CompletedGenerateApplePosition: ({ position }) => ({
      model: modifyFields(model, { apple: () => position }),
    }),
  }),
)
