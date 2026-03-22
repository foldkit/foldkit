import { Effect, Match, Random } from 'effect'
import { Command } from 'foldkit'

import { GRID_SIZE } from './constants'
import { GeneratedApple, Message, RequestedApple } from './message'
import { Model } from './model'

const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      RequestedApple: () => [model, [generateApplePosition]],
      GeneratedApple: ({ position }) => [{ ...model, apple: position }, []],
    }),
  )

const GenerateApplePosition = Command.define(
  'GenerateApplePosition',
  GeneratedApple,
)

const generateApplePosition = GenerateApplePosition(
  Effect.gen(function* () {
    const x = yield* Random.nextIntBetween(0, GRID_SIZE)
    const y = yield* Random.nextIntBetween(0, GRID_SIZE)
    return GeneratedApple({ position: { x, y } })
  }),
)

const model = { snake: [{ x: 0, y: 0 }], apple: { x: 5, y: 5 } }
const message = RequestedApple()

console.log(update(model, message))
console.log(update(model, message))
console.log(update(model, message))
