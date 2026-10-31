import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

const Message = defineMessageUnion({
  ToggledFaq: { isOpen: Schema.Boolean },
})
type Message = typeof Message.Type

export class FrequentlyAskedQuestions extends Block<FrequentlyAskedQuestions>()(
  'FrequentlyAskedQuestions',
  {
    Model: Schema.Struct({
      isFaqOpen: Schema.Boolean,
    }),
    Message,
  },
) {}

export const FrequentlyAskedQuestionsLive = FrequentlyAskedQuestions.make(
  Effect.fn(function* () {
    return {
      model: { isFaqOpen: false },

      update: {
        // Store the value. Return Commands to persist the open state, load
        // panel content, or record analytics.
        ToggledFaq: (model, { isOpen }) => ({
          model: modifyFields(model, { isFaqOpen: () => isOpen }),
        }),
      },

      // Render the panel unconditionally and pass it through animatePanel: the
      // panel stays mounted while collapsed, so the height transition animates
      // the open and close. When the toggle is icon-only, name it with
      // `ariaLabel` or `ariaLabelledBy`.
      view: (model, h) => {
        const disclosureView = ({
          button,
          panel,
          animatePanel,
        }: Disclosure.DisclosureAttributes<Message>) =>
          h.div(
            [h.Class('border rounded-lg overflow-hidden')],
            [
              h.button(
                [
                  ...button,
                  h.Class('flex items-center justify-between w-full p-4'),
                ],
                [h.span([], ['What is Foldkit?'])],
              ),
              animatePanel(
                h.div(
                  [...panel, h.Class('p-4 border-t')],
                  [h.p([], ['A functional UI framework built on Effect-TS.'])],
                ),
              ),
            ],
          )

        return Disclosure.view(
          {
            id: 'faq-1',
            isOpen: model.isFaqOpen,
            onToggle: isOpen => Message.ToggledFaq({ isOpen }),
            toView: disclosureView,
          },
          h,
        )
      },
    }
  }),
)
