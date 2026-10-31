import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const passwordRules = makeRules({
  required: 'Password is required',
  rules: [Rule.minLength(8, 'Must be at least 8 characters')],
})

const validatePassword = validate(passwordRules)

const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): Field<string> => {
  const result = validatePassword(confirmPassword)
  if (result._tag === 'Valid' && result.value !== password) {
    return Invalid({
      value: confirmPassword,
      errors: ['Passwords must match'],
    })
  }
  return result
}

const Model = Schema.Struct({
  password: Field(Schema.String),
  confirmPassword: Field(Schema.String),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ChangedPassword: { value: Schema.String },
  ChangedConfirmPassword: { value: Schema.String },
})
type Message = typeof Message.Type

class PasswordForm extends Block<PasswordForm>()('PasswordForm', {
  Model,
  Message,
}) {}

const PasswordFormLive = PasswordForm.make(
  Effect.fn(function* () {
    return {
      model: {
        password: NotValidated({ value: '' }),
        confirmPassword: NotValidated({ value: '' }),
      },

      update: {
        ChangedPassword: (model, { value }) => ({
          model: modifyFields(model, {
            password: () => validatePassword(value),
            confirmPassword: confirmPassword =>
              confirmPassword._tag === 'NotValidated'
                ? confirmPassword
                : validateConfirmPassword(value, confirmPassword.value),
          }),
        }),

        ChangedConfirmPassword: (model, { value }) => ({
          model: modifyFields(model, {
            confirmPassword: () =>
              validateConfirmPassword(model.password.value, value),
          }),
        }),
      },

      view: (model, h) =>
        h.form(
          [],
          [
            h.input([
              h.Type('password'),
              h.Value(model.password.value),
              h.OnInput(value => Message.ChangedPassword({ value })),
            ]),
            h.input([
              h.Type('password'),
              h.Value(model.confirmPassword.value),
              h.OnInput(value => Message.ChangedConfirmPassword({ value })),
            ]),
          ],
        ),
    }
  }),
)
