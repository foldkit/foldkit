import { Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

const Message = defineMessageUnion({
  CompletedStartWelcome: {},
})

const StartWelcome = Command.define('StartWelcome', {
  messages: [Message.CompletedStartWelcome],
})

export class Welcome extends Block<Welcome>()('Welcome', {
  Model: Schema.Struct({ dialog: Dialog.Dialog }),
  Message,
  Command: [StartWelcome],
}) {}

export const WelcomeLive = Welcome.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', { id: 'welcome' })

    return {
      model: { dialog },
      start: [StartWelcome()],

      update: {
        CompletedStartWelcome: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
      },

      commands: {
        StartWelcome: () => Effect.succeed(Message.CompletedStartWelcome()),
      },
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
