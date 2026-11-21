import { Effect, Schema } from 'effect'
import { Update } from 'foldkit'
import { Form } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'

const emailSettingsForm = Form.define({
  name: 'EmailSettings',
  fields: {
    isSubscribed: Form.field({ schema: Schema.Boolean, initial: false }),
    isDigestEnabled: Form.field({ schema: Schema.Boolean, initial: false }),
  },
  submit: { execute: () => Effect.void },
})

const Model = Schema.Struct({ emailSettings: emailSettingsForm.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotEmailSettingsMessage: { message: emailSettingsForm.Message },
  ClickedEmailUpdates: {},
})
type Message = typeof Message.Type

const emailSettings = emailSettingsForm.lift<Model, Message>({
  parentField: 'emailSettings',
  toParentMessage: message => Message.GotEmailSettingsMessage({ message }),
  foldOutMessage: emailSettingsForm.OutMessage.match<
    Update.Step<Model, Message>
  >({
    SucceededSubmit: () => stepModel => ({ model: stepModel }),
    FailedSubmit: () => stepModel => ({ model: stepModel }),
  }),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotEmailSettingsMessage: ({ message }) =>
      emailSettings.fold(model, message),
    ClickedEmailUpdates: () => {
      const { isSubscribed } = emailSettingsForm.inputs(model.emailSettings)

      // Turning off updates also turns off the digest, in one Message
      return emailSettings.fold(
        model,
        isSubscribed
          ? emailSettingsForm.changedFields({
              isSubscribed: false,
              isDigestEnabled: false,
            })
          : emailSettingsForm.changedFields({ isSubscribed: true }),
      )
    },
  })
