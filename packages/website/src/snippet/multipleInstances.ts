import { Array, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const AccordionMessage = defineMessageUnion({
  ClickedToggle: {},
})

export class Accordion extends Block<Accordion>()('Accordion', {
  Model: Schema.Struct({ isOpen: Schema.Boolean }),
  Message: AccordionMessage,
}) {}

export const AccordionLive = Accordion.make(
  Effect.fn(function* () {
    return {
      model: { isOpen: false },
      update: {
        ClickedToggle: model => ({
          model: modifyFields(model, { isOpen: isOpen => !isOpen }),
        }),
      },
      view: (model, h) =>
        h.button(
          [h.OnClick(AccordionMessage.ClickedToggle())],
          [model.isOpen ? 'Hide' : 'Show'],
        ),
    }
  }),
)

const Message = defineMessageUnion({
  ClickedAddAccordion: {},
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    // Fixed number of instances: one field each
    shipping: Accordion,
    billing: Accordion,
    // Dynamic number of instances: a collection keyed by instance id
    faqs: Schema.Array(Accordion),
    nextFaqId: Schema.Number,
  }),
  Message,
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const shipping = yield* new Accordion('shipping')
    const billing = yield* new Accordion('billing')
    const faq = yield* Accordion.each('faqs')

    return {
      model: { shipping, billing, faqs: [], nextFaqId: 0 },

      update: {
        ClickedAddAccordion: model => ({
          model: modifyFields(model, {
            faqs: Array.append(faq(`faq-${model.nextFaqId}`)),
            nextFaqId: nextFaqId => nextFaqId + 1,
          }),
        }),
      },

      // Each instance renders itself, and its Messages route back to it
      view: (model, h) => ({
        title: 'Accordions',
        body: h.div(
          [],
          [
            model.shipping.view(),
            model.billing.view(),
            ...Array.map(model.faqs, faqInstance =>
              h.keyed('div')(faqInstance.id, [], [faqInstance.view()]),
            ),
            h.button(
              [h.OnClick(Message.ClickedAddAccordion())],
              ['Add question'],
            ),
          ],
        ),
      }),
    }
  }),
)
