import { Effect, Random, Schedule } from 'effect'

import { GAME } from '../constants'
import { Position } from './position'
import * as Snake from './snake'

export const generatePosition = (snake: Snake.Snake) =>
  Effect.gen(function* () {
    const x = yield* Random.nextIntBetween(0, GAME.GRID_SIZE)
    const y = yield* Random.nextIntBetween(0, GAME.GRID_SIZE)
    const pos: Position = { x, y }

    if (Snake.contains(snake, pos)) {
      return yield* Effect.fail('PositionCollision' as const)
    } else {
      return pos
    }
  }).pipe(Effect.retry(Schedule.forever), Effect.orDie)
