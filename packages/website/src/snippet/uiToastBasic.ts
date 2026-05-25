// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Define the payload shape for your toast. The Toast component owns only
// lifecycle + a11y fields (id, variant, transition, dismiss timer, hover
// state). The payload is yours, whatever you can encode in a Schema:
const ToastPayload = S.Struct({
  bodyText: S.String,
  maybeLink: S.Option(S.Struct({ href: S.String, text: S.String })),
})

// Bind a Toast module to your payload schema. The factory returns Model,
// Message, OutMessage, update, view, show/dismiss/dismissAll, and the
// DismissedToast OutMessage variant:
export const Toast = Ui.Toast.make(ToastPayload)

// Add Toast.Model to your app Model. Track anything you want to lift from
// a toast's lifecycle alongside it. Here, the last dismissed bodyText so
// the UI can show "just dismissed: ..." after a toast goes away:
const Model = S.Struct({
  toast: Toast.Model,
  maybeLastDismissedBody: S.Option(S.String),
  // ...your other fields
})

// In your init function, initialize it:
const init = () => [
  {
    toast: Toast.init({ id: 'app-toast' }),
    maybeLastDismissedBody: Option.none(),
    // ...your other fields
  },
  [],
]

// Embed the Toast Message in your parent Message, plus any domain Messages
// that should push a toast:
const GotToastMessage = m('GotToastMessage', { message: Toast.Message })
const ClickedSave = m('ClickedSave')

// Inside your update's M.tagsExhaustive({...}), delegate Toast's own
// Messages. The third tuple element is `Option<OutMessage>`. Pattern-match
// it to lift the DismissedToast event into domain state:
GotToastMessage: ({ message }) => {
  const [nextToast, commands, maybeOutMessage] = Toast.update(
    model.toast,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotToastMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { toast: () => nextToast }), mappedCommands],
    onSome: M.type<typeof Toast.OutMessage.Type>().pipe(
      M.tagsExhaustive({
        DismissedToast: ({ payload }) => [
          evo(model, {
            toast: () => nextToast,
            maybeLastDismissedBody: () => Option.some(payload.bodyText),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

ClickedSave: () => {
  const [nextToast, commands] = Toast.show(model.toast, {
    variant: 'Success',
    payload: {
      bodyText: 'Changes saved',
      // Generate the href via your app's router (Foldkit's biparser-based
      // routing builds URLs from typed values, e.g. `changesRouter()`),
      // not a string literal, so renames flow through.
      maybeLink: Option.some({ href: changesRouter(), text: 'View' }),
    },
  })

  return [
    evo(model, { toast: () => nextToast }),
    Command.mapMessages(commands, message => GotToastMessage({ message })),
  ]
}

// In your view, embed Toast via h.submodel once at the app root. The
// entryToView callback lays out each entry from its payload. The
// component handles the <li> wrapper, hover-to-pause, and enter/leave
// animations.
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'app-toast',
    model: model.toast,
    view: Toast.view,
    viewInputs: {
      position: 'BottomRight',
      entryClassName: 'w-80',
      entryToView: (entry, handlers) =>
        h.div(
          [
            h.Class(
              'flex items-start gap-3 rounded-lg border bg-white p-3 shadow',
            ),
          ],
          [
            h.div(
              [h.Class('flex-1')],
              [
                h.p(
                  [h.Class('font-semibold text-sm')],
                  [entry.payload.bodyText],
                ),
                ...Option.match(entry.payload.maybeLink, {
                  onNone: () => [],
                  onSome: ({ href, text }) => [
                    h.a([h.Class('text-sm underline'), h.Href(href)], [text]),
                  ],
                }),
              ],
            ),
            h.button([...handlers.dismiss], ['Close']),
          ],
        ),
    },
    toParentMessage: message => GotToastMessage({ message }),
  })
}
