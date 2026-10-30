import { Array, Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Counter } from './blockCounterChild'

const Player = Schema.Struct({ id: Schema.String, maxScore: Schema.Number })
type Player = typeof Player.Type

export class Scoreboard extends Block<
  Scoreboard,
  Readonly<{ players: ReadonlyArray<Player> }>
>()('Scoreboard', {
  Model: Schema.Struct({ scores: Schema.Array(Counter) }),
}) {}

export const ScoreboardLive = Scoreboard.make(
  Effect.fn(function* (_id, { players }) {
    const score = yield* Counter.each('scores', { max: 21 })

    return {
      model: {
        scores: Array.map(players, player =>
          score(player.id, { max: player.maxScore }),
        ),
      },

      view: (model, h) =>
        h.ul(
          [],
          Array.map(model.scores, counter =>
            h.keyed('li')(counter.id, [], [counter.view()]),
          ),
        ),
    }
  }),
)
