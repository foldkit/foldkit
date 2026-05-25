import { html, keyed } from 'foldkit/html'

import { Disclosure } from './disclosure'
import { GotDisclosureMessage, type Message } from './message'
import type { Model } from './model'

export const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'disclosure',
    model: model.disclosure,
    view: Disclosure.view,
    // Each attribute group published by the child is spread onto the
    // consumer's own element. Click handlers from the child still route
    // through the child's dispatcher because the branding rides along
    // on each attribute.
    viewInputs: {
      toView: attributes =>
        h.div(
          [],
          [
            h.button(
              [...attributes.button, h.Class('px-3 py-2 rounded')],
              ['Toggle'],
            ),
            keyed('div')(
              model.disclosure.isOpen ? 'open' : 'closed',
              model.disclosure.isOpen
                ? h.div(
                    [...attributes.panel, h.Class('mt-2 p-4 bg-gray-50')],
                    ['Panel content'],
                  )
                : h.empty,
            ),
          ],
        ),
    },
    toParentMessage: message => GotDisclosureMessage({ message }),
  })
}
