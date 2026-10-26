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
import { LoginComposition } from './composition'
import {
  LoginDefinition,
  Message,
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'

export const initModel = (): typeof Model.Type => ({
  email: NotValidated({ value: '' }),
  password: NotValidated({ value: '' }),
  isSubmitting: false,
})

export const init = LoginComposition.makeInit(() => ({ model: initModel() }))

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email')],
})

const passwordRules = makeRules({
  required: 'Password is required',
})

const validateEmail = validate(emailRules)
const validatePassword = validate(passwordRules)

export const isFormValid = (model: typeof Model.Type): boolean =>
  allValid([
    [model.email, emailRules],
    [model.password, passwordRules],
  ])

export const SimulateAuthRequest = LoginDefinition.makeCommand(
  'SimulateAuthRequest',
  {
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

          const session: typeof Session.Type = { userId: '1', email, name }

          return Message.SucceededSimulateAuthRequest({ session })
        })
    },
  },
)

export const EffectsLayer = SimulateAuthRequest.layer

export const update = LoginComposition.makeUpdate({
  ChangedEmail: makeFieldsStep.fromMessage(({ value }) => ({
    email: () => validateEmail(value),
  })),

  ChangedPassword: makeFieldsStep.fromMessage(({ value }) => ({
    password: () => validatePassword(value),
  })),

  SubmittedForm: model => {
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

  SucceededSimulateAuthRequest: makeOutMessageStep.fromMessage(({ session }) =>
    OutMessage.SucceededLogin({ session }),
  ),

  FailedSimulateAuthRequest: makeFieldsStep((model, { error }) => ({
    password: () =>
      Invalid({
        value: model.password.value,
        errors: [error],
      }),
    isSubmitting: () => false,
  })),
})
