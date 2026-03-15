import { Match } from 'effect'

import { GRID_SIZE } from './constants'
import { Message, RequestedApple } from './message'
import { Model } from './model'

// ❌ Don't do this - calling random directly in update
const update = (model: Model, message: Message) =>
  Match.value(message).pipe(
    Match.tagsExhaustive({
      RequestedApple: () => {
        const x = Math.floor(Math.random() * GRID_SIZE)
        const y = Math.floor(Math.random() * GRID_SIZE)
        return [{ ...model, apple: { x, y } }, []]
      },
    }),
  )

// Same inputs produce different outputs - this breaks purity!
const model = { snake: [{ x: 0, y: 0 }], apple: { x: 5, y: 5 } }
const message = RequestedApple()

console.log(update(model, message)[0].apple) // { x: 12, y: 7 }
console.log(update(model, message)[0].apple) // { x: 3, y: 19 }
console.log(update(model, message)[0].apple) // { x: 8, y: 2 }
