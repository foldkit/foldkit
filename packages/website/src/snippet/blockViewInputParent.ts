import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Disclosure } from './blockViewInput'

export class Faq extends Block<Faq>()('Faq', {
  Model: Schema.Struct({ shipping: Disclosure }),
  Message: defineMessageUnion({ ClickedContactSupport: {} }),
}) {}

export const FaqLive = Faq.make(
  Effect.fn(function* () {
    const shipping = yield* new Disclosure('shipping')

    return {
      model: { shipping },

      update: {
        ClickedContactSupport: model => ({ model }),
      },

      view: (model, h) =>
        model.shipping.view({
          toView: (attributes, isOpen) =>
            h.div(
              [],
              [
                h.button(
                  [...attributes.button],
                  ['How long does shipping take?'],
                ),
                isOpen
                  ? h.div(
                      [...attributes.panel],
                      [
                        h.p([], ['Most orders arrive within five days.']),
                        h.button(
                          [h.OnClick(Faq.Message.ClickedContactSupport())],
                          ['Contact support'],
                        ),
                      ],
                    )
                  : h.empty,
              ],
            ),
        }),
    }
  }),
)
