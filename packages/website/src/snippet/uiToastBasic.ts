// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Toast as UiToast } from '@foldkit/ui'

// Define the payload shape for your toast. Toast owns the entry lifecycle,
// accessibility role, optional dismiss timer, hover state, and swipe state.
// The payload is yours, whatever you can encode in a Schema:
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

// Declare the parent-owned domain facts that should push a Toast. The
// Composition derives Toast delivery from the Binding.
const Message = defineMessageUnion({
  ClickedSave: {},
})

const NotificationsDefinition = Block.makeDefinition('Notifications', {
  Model,
  Message,
})

// At module scope, fold the OutMessage into your own Model, lifting the
// DismissedToast event into domain state. The arm returns an Update.Step over
// the parent Model, which already has the next Toast Model written back. The
// parent Definition infers the factory-refined payload from the whole Block:
const foldToastOutMessage = NotificationsDefinition.makeOutMessageFold(Toast, {
  DismissedToast: ({ payload }) =>
    NotificationsDefinition.makeFieldsStep(() => ({
      maybeLastDismissedBody: () => Option.some(payload.bodyText),
    })),
})

// The Binding delegates Toast Messages, writes the next Toast Model, maps its
// Commands, handles its OutMessages, and collects its Subscriptions.
const ToastBinding = NotificationsDefinition.makeBinding(Toast, {
  field: 'toast',
  init: {
    contextToArgs: () => Tuple.make({ id: 'app-toast', swipeToDismiss: {} }),
  },
}).withOutMessagePolicy({ fold: foldToastOutMessage })

const NotificationsComposition = NotificationsDefinition.makeComposition({
  bindings: [ToastBinding],
})

// In your Composition init function, configure the fields the parent owns.
// Swipe is opt-in: omit
// swipeToDismiss to leave it disabled, or pass {} for the default rightward
// 40px gesture. Set threshold to customize the dismissal distance:
const init = NotificationsComposition.makeInit(() => ({
  model: {
    maybeLastDismissedBody: Option.none(),
    // ...your other fields
  },
}))

declare const changesRouter: () => string

const update = NotificationsComposition.makeUpdate({
  ClickedSave: model =>
    ToastBinding.requestShow({
      variant: 'Success',
      payload: {
        bodyText: 'Changes saved',
        maybeLink: Option.some({ href: changesRouter(), text: 'View' }),
      },
    })(model),
})

// Registering `ToastBinding` in `bindings` collects the instance's pointer Subscriptions.

// In your view, embed Toast via h.block once at the app root. The
// entryToView callback lays out each entry from its payload. The
// component handles the <div> wrapper, hover-to-pause, swipe-to-dismiss
// (pointerdown + data-swipe="move"/"settling"/"end" +
// translate/--toast-swipe-move-x), and enter/leave animations.
const view = NotificationsComposition.makeView((model, h) =>
  h.block(
    ToastBinding.embedView({
      slotId: 'app-toast',
      model: model.toast,
      viewInputs: {
        position: 'BottomRight',
        entryClassName: 'toast-entry w-80',
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
                    [
                      h.span(
                        [h.DataAttribute('toast-swipe-ignore', '')],
                        [entry.payload.bodyText],
                      ),
                    ],
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
    }),
  ),
)
