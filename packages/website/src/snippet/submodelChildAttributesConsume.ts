// Parent's view, threading published attribute groups onto its own
// elements. Each group is spread (`...button`, `...panel`) alongside
// the consumer's own `h.Class`. Click handlers from the child still
// route through the child's dispatcher because the branding rides
// along on each attribute.
import { type ChildAttribute, type Html, html, keyed } from 'foldkit/html'

import { GotDisclosureMessage, type Message } from './message'
import type { Model } from './model'

declare const Disclosure: {
  view: (
    model: Model['disclosure'],
    viewInputs: {
      toView: (attributes: {
        readonly button: ReadonlyArray<ChildAttribute>
        readonly panel: ReadonlyArray<ChildAttribute>
      }) => Html
    },
  ) => Html
}

export const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    id: 'disclosure',
    model: model.disclosure,
    view: Disclosure.view,
    viewInputs: {
      toView: ({ button, panel }) =>
        h.div(
          [],
          [
            h.button([...button, h.Class('px-3 py-2 rounded')], ['Toggle']),
            keyed('div')(
              model.disclosure.isOpen ? 'open' : 'closed',
              model.disclosure.isOpen
                ? h.div(
                    [...panel, h.Class('mt-2 p-4 bg-gray-50')],
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
