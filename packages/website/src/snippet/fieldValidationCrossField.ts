import { Update } from 'foldkit'
import {
  type Field,
  Invalid,
  Rule,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'

const passwordRules = makeRules({
  required: 'Password is required',
  rules: [Rule.minLength(8, 'Must be at least 8 characters')],
})

const validatePassword = validate(passwordRules)

type UpdateReturn = Update.Return<Model, Message>

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

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedPassword: ({ value }) => ({
      model: evo(model, {
        password: () => validatePassword(value),
        confirmPassword: confirmPassword =>
          confirmPassword._tag === 'NotValidated'
            ? confirmPassword
            : validateConfirmPassword(value, confirmPassword.value),
      }),
    }),

    ChangedConfirmPassword: ({ value }) => ({
      model: evo(model, {
        confirmPassword: () =>
          validateConfirmPassword(model.password.value, value),
      }),
    }),
  })
