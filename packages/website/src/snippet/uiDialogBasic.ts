// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Dialog Submodel:
const Model = S.Struct({
  dialog: Ui.Dialog.Model,
  // ...your other fields
})

// In your init function, initialize the Dialog Submodel with a unique id:
const init = () => [
  {
    dialog: Ui.Dialog.init({ id: 'confirm' }),
    // ...your other fields
  },
  [],
]

// Embed the Dialog Message in your parent Message:
const GotDialogMessage = m('GotDialogMessage', {
  message: Ui.Dialog.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Dialog.update. The OutMessages `OpenedPanel` and `ClosedPanel` mark
// the transition moments — fire analytics, reset embedded form state, or
// kick off side effects from the parent.
GotDialogMessage: ({ message }) => {
  const [nextDialog, commands, maybeOut] = Ui.Dialog.update(
    model.dialog,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotDialogMessage({ message }),
  )

  return Option.match(maybeOut, {
    onNone: () => [evo(model, { dialog: () => nextDialog }), mappedCommands],
    onSome: M.type<Ui.Dialog.OutMessage>().pipe(
      M.tagsExhaustive({
        OpenedPanel: () => [
          // React to the open transition — analytics, focus management,
          // initial data fetch.
          evo(model, { dialog: () => nextDialog }),
          mappedCommands,
        ],
        ClosedPanel: () => [
          // React to the close transition — clear ephemeral state,
          // resolve a pending domain action.
          evo(model, { dialog: () => nextDialog }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Helper to convert Dialog Messages to your parent Message:
const dialogToParentMessage = (message: Ui.Dialog.Message): Message =>
  GotDialogMessage({ message })

// Inside your view function, open the dialog by dispatching Ui.Dialog.Opened()
// and render the dialog — backed by native <dialog> with showModal():
const view = () => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button(
        [h.OnClick(dialogToParentMessage(Ui.Dialog.Opened()))],
        ['Open Dialog'],
      ),
      h.submodel({
        id: model.dialog.id,
        view: Ui.Dialog.view,
        model: model.dialog,
        inputs: {
          toView: ({ dialog, backdrop, panel, isVisible }) =>
            h.dialog(
              [...dialog],
              isVisible
                ? [
                    h.div(
                      [...backdrop, h.Class('fixed inset-0 bg-black/50')],
                      [],
                    ),
                    h.div(
                      [
                        ...panel,
                        h.Class('rounded-lg p-6 max-w-md mx-auto shadow-xl'),
                      ],
                      [
                        h.h2(
                          [h.Id(Ui.Dialog.titleId(model.dialog))],
                          ['Confirm Action'],
                        ),
                        h.p([], ['Are you sure you want to proceed?']),
                        h.button(
                          [
                            h.OnClick(
                              dialogToParentMessage(Ui.Dialog.Closed()),
                            ),
                            h.Class('px-4 py-2 rounded-lg border'),
                          ],
                          ['Close'],
                        ),
                      ],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => dialogToParentMessage(message),
      }),
    ],
  )
}
