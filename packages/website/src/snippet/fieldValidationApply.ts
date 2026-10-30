import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Field,
  NotValidated,
  Rule,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const usernameRules = makeRules({
  rules: [Rule.minLength(3, 'Must be at least 3 characters')],
})

const validateUsername = validate(usernameRules)

const Model = Schema.Struct({ username: Field(Schema.String) })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedUsername: { value: Schema.String },
})
type Message = typeof Message.Type

class SignupForm extends Block<SignupForm>()('SignupForm', {
  Model,
  Message,
}) {}

const SignupFormLive = SignupForm.make(
  Effect.fn(function* () {
    return {
      model: { username: NotValidated({ value: '' }) },

      update: {
        ChangedUsername: (model, { value }) => ({
          model: modifyFields(model, {
            username: () => validateUsername(value),
          }),
        }),
      },

      view: (model, h) =>
        h.input([
          h.Value(model.username.value),
          h.OnInput(value => Message.ChangedUsername({ value })),
        ]),
    }
  }),
)
