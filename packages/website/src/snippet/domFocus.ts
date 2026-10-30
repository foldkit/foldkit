import { Effect, Schema } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSignUp: {},
  CompletedFocusEmailInput: {},
})

const FocusEmailInput = Command.define('FocusEmailInput', {
  messages: [Message.CompletedFocusEmailInput],
})

export class SignUp extends Block<SignUp>()('SignUp', {
  Model: Schema.Struct({ isFormVisible: Schema.Boolean }),
  Message,
  Command: [FocusEmailInput],
}) {}

export const SignUpLive = SignUp.make(
  Effect.fn(function* () {
    return {
      model: { isFormVisible: false },

      update: {
        ClickedSignUp: () => ({
          model: { isFormVisible: true },
          commands: [FocusEmailInput()],
        }),
        CompletedFocusEmailInput: model => ({ model }),
      },

      commands: {
        FocusEmailInput: () =>
          Dom.focus('#email-input').pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusEmailInput()),
          ),
      },
    }
  }),
)
