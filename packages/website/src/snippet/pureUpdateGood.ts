import { Effect, Random } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { GRID_SIZE } from './constants'
import { Message } from './message'
import type { Model } from './model'

// ✅ Run random work in a Command
const GenerateApplePosition = ApplicationDefinition.makeCommand(
  'GenerateApplePosition',
  {
    messages: [Message.CompletedGenerateApplePosition],
    handler: function* () {
      return () =>
        Effect.gen(function* () {
          const x = yield* Random.nextIntBetween(0, GRID_SIZE, {
            halfOpen: true,
          })
          const y = yield* Random.nextIntBetween(0, GRID_SIZE, {
            halfOpen: true,
          })
          return Message.CompletedGenerateApplePosition({ position: { x, y } })
        })
    },
  },
)

const update = ApplicationComposition.makeUpdate({
  RequestedApple: model => ({ model, commands: [GenerateApplePosition()] }),
  CompletedGenerateApplePosition: (model, { position }) => ({
    model: modifyFields(model, { apple: () => position }),
  }),
})
