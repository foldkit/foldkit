import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Counter } from './blockCounterChild'

export class BonusPanel extends Block<BonusPanel>()('BonusPanel', {
  Model: Schema.Struct({ maybeBonus: Schema.Option(Counter) }),
  Message: defineMessageUnion({ ClickedShowBonus: {}, ClickedHideBonus: {} }),
}) {}

export const BonusPanelLive = BonusPanel.make(
  Effect.fn(function* () {
    const bonus = yield* new Counter('bonus', { max: 5 })

    return {
      model: { maybeBonus: Option.none() },

      update: {
        ClickedShowBonus: model => ({
          model: modifyFields(model, { maybeBonus: () => Option.some(bonus) }),
        }),
        ClickedHideBonus: model => ({
          model: modifyFields(model, { maybeBonus: () => Option.none() }),
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            Option.match(model.maybeBonus, {
              onNone: () =>
                h.button(
                  [h.OnClick(BonusPanel.Message.ClickedShowBonus())],
                  ['Show bonus'],
                ),
              onSome: bonusCounter =>
                h.div(
                  [],
                  [
                    bonusCounter.view(),
                    h.button(
                      [h.OnClick(BonusPanel.Message.ClickedHideBonus())],
                      ['Hide bonus'],
                    ),
                  ],
                ),
            }),
          ],
        ),
    }
  }),
)
