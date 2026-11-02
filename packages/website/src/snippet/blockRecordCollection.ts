import { Array, Record, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Counter } from './blockCounterChild'

export class Scoreboard extends Block<Scoreboard>()('Scoreboard', {
  Model: Schema.Struct({
    scoresByPlayerId: Schema.Record(Schema.String, Counter),
  }),
  Message: defineMessageUnion({ JoinedPlayer: { playerId: Schema.String } }),
}) {}

export const ScoreboardLive = Scoreboard.toLayer(() => ({
  init: () => ({ scoresByPlayerId: {} }),

  update: {
    JoinedPlayer: (model, { playerId }) => ({
      model: modifyFields(model, {
        scoresByPlayerId: Record.set(
          playerId,
          new Counter(playerId, { max: 21 }),
        ),
      }),
    }),
  },

  view: (model, h) =>
    h.ul(
      [],
      Array.map(
        Record.toEntries(model.scoresByPlayerId),
        ([playerId, counter]) => h.keyed('li')(playerId, [], [counter.view()]),
      ),
    ),
}))
