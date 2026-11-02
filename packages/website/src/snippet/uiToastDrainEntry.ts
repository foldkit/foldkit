import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Command, message, story } from 'foldkit/story'

import { it } from '@effect/vitest'
import { Animation, Toast } from '@foldkit/ui'

const ToastPayload = Schema.Struct({ body: Schema.String })

const Notifications = Toast.make(ToastPayload)

const Message = defineMessageUnion({ ClickedSave: {} })

class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ toast: Notifications }),
  Message,
}) {}

const ApplicationLive = Application.toLayer(() => ({
  init: () => ({
    toast: new Notifications('toast', { id: 'notifications' }),
  }),
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
})).pipe(Layer.provide(Notifications), Layer.provide(Animation.AnimationLive))

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
