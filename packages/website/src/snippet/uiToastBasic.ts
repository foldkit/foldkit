// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option, Schema as S } from 'effect'
import { Command, Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Toast as UiToast } from '@foldkit/ui'

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
export const Toast = UiToast.make(ToastPayload)

// Add Toast.Model to your app Model. Track anything you want to lift from
// a toast's lifecycle alongside it. Here, the last dismissed bodyText so
// the UI can show "just dismissed: ..." after a toast goes away:
const Model = S.Struct({
  toast: Toast.Model,
  maybeLastDismissedBody: S.Option(S.String),
  // ...your other fields
})

// In your init function, initialize it:
const init = () => ({
  model: {
    toast: Toast.init({ id: 'app-toast' }),
    maybeLastDismissedBody: Option.none(),
    // ...your other fields
  },
})

// Embed the Toast Message in your parent Message, plus any domain Messages
// that should push a toast:
const Message = defineMessageUnion({
  GotToastMessage: { message: Toast.Message },
  ClickedSave: {},
})

// At module scope, fold the OutMessage into your own Model, lifting the
// DismissedToast event into domain state. The arm returns an Update.Step over
// the parent Model, which already has the next Toast Model written back:
const foldToastOutMessage = M.type<typeof Toast.OutMessage.Type>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    DismissedToast:
      ({ payload }) =>
      model => ({
        model: evo(model, {
          maybeLastDismissedBody: () => Option.some(payload.bodyText),
        }),
      }),
  }),
)

// Update.foldChild wires the child into the parent: it delegates Toast's own
// Messages to Toast.update, writes the next Toast Model back, maps the
// Submodel's Commands into your Message type, and hands any OutMessage to
// foldOutMessage.
const foldToast = Update.foldChild({
  update: Toast.update,
  read: (model: Model) => Option.some(model.toast),
  write: (model, nextToast) => evo(model, { toast: () => nextToast }),
  toParentMessage: message => Message.GotToastMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

// Inside your update's Message.match({...}), call the fold:
GotToastMessage: ({ message }) => foldToast(model, message)

ClickedSave: () => {
  const toastShow = Toast.show(model.toast, {
    variant: 'Success',
    payload: {
      bodyText: 'Changes saved',
      // Generate the href via your app's router (Foldkit's biparser-based
      // routing builds URLs from typed values, e.g. `changesRouter()`),
      // not a string literal, so renames flow through.
      maybeLink: Option.some({ href: changesRouter(), text: 'View' }),
    },
  })

  return {
    model: evo(model, { toast: () => toastShow.model }),
    commands: Command.mapMessages(toastShow.commands ?? [], message =>
      Message.GotToastMessage({ message }),
    ),
  }
}

// In your view, embed Toast via h.submodel once at the app root. The
// entryToView callback lays out each entry from its payload. The
// component handles the <li> wrapper, hover-to-pause, and enter/leave
// animations.
const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
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
    toParentMessage: message => Message.GotToastMessage({ message }),
  })
