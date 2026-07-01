// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

import { Combobox, Dialog } from '@foldkit/ui'

// One Model field for the dialog, one for the overlay it contains:
const Model = S.Struct({
  dialog: Dialog.Model,
  combobox: Combobox.Model,
  // ...your other fields
})

const init = () => [
  {
    dialog: Dialog.init({ id: 'edit-filters' }),
    combobox: Combobox.init({ id: 'city' }),
    // ...your other fields
  },
  [],
]

// Embed each submodel's Message in your parent Message and delegate both to
// their own update (see the Dialog and Combobox examples for the delegation).
const GotDialogMessage = m('GotDialogMessage', { message: Dialog.Message })
const GotComboboxMessage = m('GotComboboxMessage', {
  message: Combobox.Message,
})

// Render the overlay inside the dialog panel. The key is `portal: false` on
// the overlay's anchor. By default the panel portals to the document body,
// where the dialog's high stacking order hides it. With portal: false the
// panel stays inside the dialog and renders above the panel content.
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: model.dialog.id,
    model: model.dialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, title, isVisible }) =>
        h.dialog(
          [...dialog],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')], []),
                h.div(
                  [
                    ...panel,
                    h.Class('rounded-lg p-6 max-w-md mx-auto shadow-xl'),
                  ],
                  [
                    h.h2([...title], ['Edit filters']),
                    h.submodel({
                      slotId: model.combobox.id,
                      model: model.combobox,
                      view: CityCombobox.view,
                      viewInputs: {
                        // ...items, itemToConfig, itemToValue, etc.
                        anchor: { placement: 'bottom-start', portal: false },
                      },
                      toParentMessage: message =>
                        GotComboboxMessage({ message }),
                    }),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => GotDialogMessage({ message }),
  })
}
