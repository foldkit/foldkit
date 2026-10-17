import { Array, Duration, Effect, Option, Schema, String, pipe } from 'effect'
import {
  Invalid,
  NotValidated,
  Rule,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { type Session } from '../../../../domain/session'
import {
  Login,
  LoginComposition,
  Message,
  type Model,
  OutMessage,
} from './definition'

export const initModel = (): Model => ({
  email: NotValidated({ value: '' }),
  password: NotValidated({ value: '' }),
  isSubmitting: false,
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email')],
})

const passwordRules = makeRules({
  required: 'Password is required',
})

const validateEmail = validate(emailRules)
const validatePassword = validate(passwordRules)

export const isFormValid = (model: Model): boolean =>
  allValid([
    [model.email, emailRules],
    [model.password, passwordRules],
  ])

export const SimulateAuthRequest = Login.command('SimulateAuthRequest', {
  args: { email: Schema.String, password: Schema.String },
  messages: [
    Message.SucceededSimulateAuthRequest,
    Message.FailedSimulateAuthRequest,
  ],
  handler: function* () {
    return ({ email, password }) =>
      Effect.gen(function* () {
        yield* Effect.sleep(Duration.seconds(1))

        if (password !== 'password') {
          return Message.FailedSimulateAuthRequest({
            error: 'Invalid credentials',
          })
        }

        const name = pipe(
          email,
          String.split('@'),
          Array.head,
          Option.getOrElse(() => email),
        )

        const session: Session = { userId: '1', email, name }

        return Message.SucceededSimulateAuthRequest({ session })
      })
  },
})

export const EffectsLayer = SimulateAuthRequest.layer

export const update = LoginComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ChangedEmail: ({ value }) => ({
      model: modifyFields(model, { email: () => validateEmail(value) }),
    }),

    ChangedPassword: ({ value }) => ({
      model: modifyFields(model, { password: () => validatePassword(value) }),
    }),

    SubmittedForm: () => {
      if (model.isSubmitting) {
        return { model }
      }

      if (!isFormValid(model)) {
        return { model }
      }

      return {
        model: modifyFields(model, { isSubmitting: () => true }),
        commands: [
          SimulateAuthRequest({
            email: model.email.value,
            password: model.password.value,
          }),
        ],
      }
    },

    SucceededSimulateAuthRequest: ({ session }) => ({
      model,
      outMessage: OutMessage.SucceededLogin({ session }),
    }),

    FailedSimulateAuthRequest: ({ error }) => ({
      model: modifyFields(model, {
        password: () =>
          Invalid({
            value: model.password.value,
            errors: [error],
          }),
        isSubmitting: () => false,
      }),
    }),
  }),
)
