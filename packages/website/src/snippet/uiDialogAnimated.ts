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

// In your init function, set isAnimated: true to coordinate CSS transitions:
const init = () => [
  {
    dialog: Ui.Dialog.init({ id: 'confirm', isAnimated: true }),
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
          evo(model, { dialog: () => nextDialog }),
          mappedCommands,
        ],
        ClosedPanel: () => [
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

// Inside your view function, use data-[closed] for enter/leave transitions:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    id: model.dialog.id,
    view: Ui.Dialog.view,
    model: model.dialog,
    inputs: {
      toView: ({ dialog, backdrop, panel, isVisible }) =>
        h.dialog(
          [
            ...dialog,
            h.Class(
              'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center',
            ),
          ],
          isVisible
            ? [
                h.div(
                  [
                    ...backdrop,
                    h.Class(
                      'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0',
                    ),
                  ],
                  [],
                ),
                h.div(
                  [
                    ...panel,
                    h.Class(
                      'rounded-lg p-6 max-w-md mx-auto shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
                    ),
                  ],
                  [
                    h.h2(
                      [h.Id(Ui.Dialog.titleId(model.dialog))],
                      ['Confirm Action'],
                    ),
                    h.p([], ['Are you sure you want to proceed?']),
                    h.div(
                      [h.Class('flex gap-2 justify-end mt-4')],
                      [
                        h.button(
                          [
                            h.OnClick(
                              dialogToParentMessage(Ui.Dialog.Closed()),
                            ),
                            h.Class('px-4 py-2 rounded-lg border'),
                          ],
                          ['Cancel'],
                        ),
                        h.button(
                          [
                            h.OnClick(
                              dialogToParentMessage(Ui.Dialog.Closed()),
                            ),
                            h.Class(
                              'px-4 py-2 rounded-lg bg-blue-600 text-white',
                            ),
                          ],
                          ['Confirm'],
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => dialogToParentMessage(message),
  })
}
