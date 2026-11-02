import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Counter } from './blockCounterChild'

const Mode = defineTaggedUnion({
  Practice: { counter: Counter },
  Match: { home: Counter, away: Counter },
})

export class Game extends Block<Game>()('Game', {
  Model: Schema.Struct({ mode: Mode }),
  Message: defineMessageUnion({ ClickedStartMatch: {}, ClickedEndMatch: {} }),
}) {}

export const GameLive = Game.toLayer(() => ({
  init: () => ({
    mode: Mode.Practice({ counter: new Counter('practice', { max: 100 }) }),
  }),

  update: {
    ClickedStartMatch: model => ({
      model: modifyFields(model, {
        mode: () =>
          Mode.Match({
            home: new Counter('home', { max: 21 }),
            away: new Counter('away', { max: 21 }),
          }),
      }),
    }),
    ClickedEndMatch: model => ({
      model: modifyFields(model, {
        mode: () =>
          Mode.Practice({ counter: new Counter('practice', { max: 100 }) }),
      }),
    }),
  },

  view: (model, h) =>
    Mode.match(model.mode, {
      Practice: ({ counter }) =>
        h.div(
          [],
          [
            counter.view(),
            h.button(
              [h.OnClick(Game.Message.ClickedStartMatch())],
              ['Start match'],
            ),
          ],
        ),
      Match: ({ home, away }) =>
        h.div(
          [],
          [
            home.view(),
            away.view(),
            h.button(
              [h.OnClick(Game.Message.ClickedEndMatch())],
              ['End match'],
            ),
          ],
        ),
    }),
}))
