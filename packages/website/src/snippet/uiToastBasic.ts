import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Toast as UiToast } from '@foldkit/ui'

// Toast owns the entry lifecycle, accessibility role, optional dismiss timer,
// hover state, and swipe state. The payload is yours, whatever you can encode
// in a Schema.
const ToastPayload = Schema.Struct({
  bodyText: Schema.String,
  maybeLink: Schema.Option(
    Schema.Struct({ href: Schema.String, text: Schema.String }),
  ),
})
type ToastPayload = typeof ToastPayload.Type

export const Toast = UiToast.makeBlock(ToastPayload)

const Message = defineMessageUnion({
  ClickedSave: {},
})

declare const changesRouter: () => string

export class Notifications extends Block<Notifications>()('Notifications', {
  Model: Schema.Struct({
    toast: Toast,
    maybeLastDismissedBody: Schema.Option(Schema.String),
  }),
  Message,
}) {}

export const NotificationsLive = Notifications.make(
  Effect.fn(function* () {
    // Swipe is opt-in. Omit swipeToDismiss to leave it disabled, or pass {}
    // for the default rightward 40px gesture.
    const toast = yield* new Toast('toast', {
      id: 'app-toast',
      swipeToDismiss: {},
    })

    return {
      model: { toast, maybeLastDismissedBody: Option.none() },

      update: {
        // `Toast.requestShow` builds the Message that adds an entry
        ClickedSave: model => ({
          model,
          messages: [
            model.toast.send(
              Toast.requestShow({
                variant: 'Success',
                payload: {
                  bodyText: 'Changes saved',
                  maybeLink: Option.some({
                    href: changesRouter(),
                    text: 'View',
                  }),
                },
              }),
            ),
          ],
        }),

        ...toast.on({
          DismissedToast: (model, { payload }) => ({
            model: modifyFields(model, {
              maybeLastDismissedBody: () => Option.some(payload.bodyText),
            }),
          }),
        }),
      },

      // Render the Toast once at the app root. `entryToView` lays out each
      // entry from its payload. The component handles the wrapper element,
      // hover-to-pause, swipe-to-dismiss, and enter and leave animations.
      view: (model, h) =>
        model.toast.view({
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
                        h.a(
                          [h.Class('text-sm underline'), h.Href(href)],
                          [text],
                        ),
                      ],
                    }),
                  ],
                ),
                h.button([...handlers.dismiss], ['Close']),
              ],
            ),
        }),
    }
  }),
).pipe(Layer.provide(Toast.Live))
