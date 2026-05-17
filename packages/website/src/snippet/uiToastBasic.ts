// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Define the payload shape for your toast. The Toast component owns only
// lifecycle + a11y fields (id, variant, transition, dismiss timer, hover
// state). The payload is yours — whatever you can encode in a Schema:
const ToastPayload = S.Struct({
  bodyText: S.String,
  maybeLink: S.Option(S.Struct({ href: S.String, text: S.String })),
})

// Bind a Toast module to your payload schema:
export const Toast = Ui.Toast.make(ToastPayload)

// Add Toast.Model to your app Model:
const Model = S.Struct({
  toast: Toast.Model,
  // ...your other fields
})

// In your init function, initialize it:
const init = () => [
  {
    toast: Toast.init({ id: 'app-toast' }),
    // ...your other fields
  },
  [],
]

// Embed the Toast Message in your parent Message, plus any domain Messages
// that should push a toast:
const GotToastMessage = m('GotToastMessage', { message: Toast.Message })
const ClickedSave = m('ClickedSave')

// Inside your update's M.tagsExhaustive({...}), delegate Toast's own Messages
// and call Toast.show from any domain branch that should surface a notification:
GotToastMessage: ({ message }) => {
  const [nextToasts, commands] = Toast.update(model.toast, message)

  return [
    evo(model, { toast: () => nextToasts }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotToastMessage({ message }))),
    ),
  ]
}

ClickedSave: () => {
  const [nextToasts, commands] = Toast.show(model.toast, {
    variant: 'Success',
    payload: {
      bodyText: 'Changes saved',
      maybeLink: Option.some({ href: '/changes', text: 'View' }),
    },
  })

  return [
    evo(model, { toast: () => nextToasts }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotToastMessage({ message }))),
    ),
  ]
}

// In your view, render the Toast container once at the app root. Provide a
// renderEntry callback that lays out each entry from its payload — the
// component handles the <li> wrapper, hover-to-pause, and enter/leave
// animations.
const view = () => {
  const h = html<Message>()

  return Toast.view({
    model: model.toast,
    position: 'BottomRight',
    toParentMessage: message => GotToastMessage({ message }),
    renderEntry: (entry, handlers) =>
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
              h.p([h.Class('font-semibold text-sm')], [entry.payload.bodyText]),
              ...Option.match(entry.payload.maybeLink, {
                onNone: () => [],
                onSome: ({ href, text }) => [
                  h.a([h.Class('text-sm underline'), h.Href(href)], [text]),
                ],
              }),
            ],
          ),
          h.button([h.OnClick(handlers.dismiss)], ['Close']),
        ],
      ),
    entryClassName: 'w-80',
  })
}
