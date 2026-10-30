import { Effect, Schema } from 'effect'
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

export const GameLive = Game.make(
  Effect.fn(function* () {
    const practice = yield* new Counter('practice', { max: 100 })
    const home = yield* new Counter('home', { max: 21 })
    const away = yield* new Counter('away', { max: 21 })

    return {
      model: { mode: Mode.Practice({ counter: practice }) },

      update: {
        ClickedStartMatch: model => ({
          model: modifyFields(model, {
            mode: () => Mode.Match({ home, away }),
          }),
        }),
        ClickedEndMatch: model => ({
          model: modifyFields(model, {
            mode: () => Mode.Practice({ counter: practice }),
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
    }
  }),
)
