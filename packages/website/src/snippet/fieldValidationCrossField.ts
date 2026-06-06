import { Match as M } from 'effect'
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
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedPassword: ({ value }) => [
        evo(model, {
          password: () => validatePassword(value),
          confirmPassword: confirmPassword =>
            confirmPassword._tag === 'NotValidated'
              ? confirmPassword
              : validateConfirmPassword(value, confirmPassword.value),
        }),
        [],
      ],

      ChangedConfirmPassword: ({ value }) => [
        evo(model, {
          confirmPassword: () =>
            validateConfirmPassword(model.password.value, value),
        }),
        [],
      ],
    }),
  )
