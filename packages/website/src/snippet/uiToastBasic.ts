// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
// Wire pointer subscriptions once at the app root so swipe tracking
// continues when the pointer leaves the entry. Without this lift the
// view still sets data-swipe on pointerdown but never receives move/up.
import { Subscription } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Toast as UiToast } from '@foldkit/ui'

// Define the payload shape for your toast. The Toast component owns only
// lifecycle + a11y fields (id, variant, transition, dismiss timer, hover
// state). The payload is yours, whatever you can encode in a Schema:
const ToastPayload = Schema.Struct({
  bodyText: Schema.String,
  maybeLink: Schema.Option(
    Schema.Struct({ href: Schema.String, text: Schema.String }),
  ),
})

// Bind a Toast module to your payload schema. The factory returns Model,
// Message, OutMessage, update, view, show/dismiss/dismissAll, and the
// DismissedToast OutMessage variant:
export const Toast = UiToast.make(ToastPayload)

// Add Toast.Model to your app Model. Track anything you want to lift from
// a toast's lifecycle alongside it. Here, the last dismissed bodyText so
// the UI can show "just dismissed: ..." after a toast goes away:
const Model = Schema.Struct({
  toast: Toast.Model,
  maybeLastDismissedBody: Schema.Option(Schema.String),
  // ...your other fields
})
type Model = typeof Model.Type

// In your init function, initialize it. Tune swipeThreshold for a tighter or looser stack:
const init = () => ({
  model: {
    toast: Toast.init({ id: 'app-toast', swipeThreshold: 80 }),
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
type Message = typeof Message.Type

// At module scope, fold the OutMessage into your own Model, lifting the
// DismissedToast event into domain state. The arm returns an Update.Step over
// the parent Model, which already has the next Toast Model written back:
const foldToastOutMessage = Toast.OutMessage.match<Update.Step<Model, Message>>(
  {
    DismissedToast:
      ({ payload }) =>
      model => ({
        model: evo(model, {
          maybeLastDismissedBody: () => Option.some(payload.bodyText),
        }),
      }),
  },
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

const foldToastShow = Update.foldChild({
  update: Toast.show,
  read: (model: Model) => Option.some(model.toast),
  write: (model, nextToast) => evo(model, { toast: () => nextToast }),
  toParentMessage: message => Message.GotToastMessage({ message }),
  foldOutMessage: foldToastOutMessage,
})

// In the corresponding Message.match handler, call the fold:
GotToastMessage: ({ message }) => foldToast(model, message)

ClickedSave: () =>
  foldToastShow(model, {
    variant: 'Success',
    payload: {
      bodyText: 'Changes saved',
      // Generate the href via your app's router (Foldkit's biparser-based
      // routing builds URLs from typed values, e.g. `changesRouter()`),
      // not a string literal, so renames flow through.
      maybeLink: Option.some({ href: changesRouter(), text: 'View' }),
    },
  })

export const subscriptions = Subscription.lift(Toast.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.toast,
  toParentMessage: message => Message.GotToastMessage({ message }),
})

// Custom renderers (for example a foldcn stack) can read the drag offset
// directly and apply it themselves:
// Toast.swipeOffsetForEntry(model.toast.swipeState, entry.id)

// In your view, embed Toast via h.submodel once at the app root. The
// entryToView callback lays out each entry from its payload. The
// component handles the <li> wrapper, hover-to-pause, swipe-to-dismiss
// (pointerdown + data-swipe="move" + translateX/--toast-swipe-move-x),
// and enter/leave animations.
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
