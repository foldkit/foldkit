import { Effect, Match, Random } from 'effect'
import { Command } from 'foldkit'

import { GRID_SIZE } from './constants'
import { GeneratedApple, Message, RequestedApple } from './message'
import { Model } from './model'

// ✅ Do this - request the value via a Command
const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      RequestedApple: () => [model, [generateApplePosition]],
      GeneratedApple: ({ position }) => [{ ...model, apple: position }, []],
    }),
  )

// The Command that performs the side effect
const generateApplePosition: Command.Command<Message> = Effect.gen(
  function* () {
    const x = yield* Random.nextIntBetween(0, GRID_SIZE)
    const y = yield* Random.nextIntBetween(0, GRID_SIZE)
    return GeneratedApple({ position: { x, y } })
  },
).pipe(Command.make('GenerateApplePosition'))

// Same inputs always produce the same outputs - purity preserved!
const model = { snake: [{ x: 0, y: 0 }], apple: { x: 5, y: 5 } }
const message = RequestedApple()

console.log(update(model, message)) // [model, [generateApplePosition]]
console.log(update(model, message)) // [model, [generateApplePosition]]
console.log(update(model, message)) // [model, [generateApplePosition]]
