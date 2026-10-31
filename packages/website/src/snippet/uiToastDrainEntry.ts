import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Command, message, story } from 'foldkit/story'

import { it } from '@effect/vitest'
import { Toast } from '@foldkit/ui'

const ToastPayload = Schema.Struct({ body: Schema.String })

const Notifications = Toast.makeBlock(ToastPayload)

const Message = defineMessageUnion({ ClickedSave: {} })

class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ toast: Notifications }),
  Message,
}) {}

const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const toast = yield* new Notifications('toast', { id: 'notifications' })

    return {
      model: { toast },
      update: {
        ClickedSave: model => ({
          model,
          messages: [
            model.toast.send(
              Notifications.requestShow({ payload: { body: 'Saved' } }),
            ),
          ],
        }),
      },
    }
  }),
).pipe(Layer.provide(Notifications.Live))

it.effect('shows and drains a toast', () =>
  story(
    ApplicationLive,
    message(Message.ClickedSave()),
    // `path` is the Toast instance's path from the root, as in Block.deliver
    Notifications.test.drainEntry({
      path: 'toast',
      entryId: 'notifications-entry-0',
    }),
    Command.expectNone(),
  ),
)
