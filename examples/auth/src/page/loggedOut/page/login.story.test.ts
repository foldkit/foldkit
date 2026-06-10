import { DataCommand, Story } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { describe, expect, test } from 'vitest'

import {
  ChangedEmail,
  ChangedPassword,
  FailedSimulateAuthRequest,
  type Message,
  type Model,
  SimulateAuthRequest,
  SubmittedForm,
  SucceededLogin,
  SucceededSimulateAuthRequest,
  execute,
  initModel,
  update,
} from './login'

const interpret = DataCommand.toCommand(execute)
const interpretAll = DataCommand.toCommands(execute)

const interpretedUpdate = (model: Model, message: Message) => {
  const [nextModel, commands, maybeOutMessage] = update(model, message)
  return [nextModel, interpretAll(commands), maybeOutMessage] as const
}

const validModel: Model = {
  ...initModel(),
  email: Valid({ value: 'alice@example.com' }),
  password: Valid({ value: 'password' }),
}

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

const validAuthRequest = SimulateAuthRequest({
  email: 'alice@example.com',
  password: 'password',
})

describe('login', () => {
  test('typing an email validates the field', () => {
    Story.story(
      interpretedUpdate,
      Story.with(initModel()),
      Story.message(ChangedEmail({ value: '' })),
      Story.model(model => {
        expect(model.email._tag).toBe('Invalid')
      }),
      Story.message(ChangedEmail({ value: 'alice@example.com' })),
      Story.model(model => {
        expect(model.email._tag).toBe('Valid')
        expect(model.email.value).toBe('alice@example.com')
      }),
    )
  })

  test('typing a password validates the field', () => {
    Story.story(
      interpretedUpdate,
      Story.with(initModel()),
      Story.message(ChangedPassword({ value: '' })),
      Story.model(model => {
        expect(model.password._tag).toBe('Invalid')
      }),
      Story.message(ChangedPassword({ value: 'secret' })),
      Story.model(model => {
        expect(model.password._tag).toBe('Valid')
      }),
    )
  })

  test('submitting with invalid fields does nothing', () => {
    Story.story(
      interpretedUpdate,
      Story.with(initModel()),
      Story.message(SubmittedForm()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(false)
      }),
      Story.Command.expectNone(),
    )
  })

  test('submitting with valid fields sends an auth request', () => {
    Story.story(
      interpretedUpdate,
      Story.with(validModel),
      Story.message(SubmittedForm()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Story.Command.expectHas({ name: 'SimulateAuthRequest' }),
      Story.Command.resolve(
        interpret(validAuthRequest),
        SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Story.expectOutMessage(SucceededLogin({ session: aliceSession })),
    )
  })

  test('failed auth marks the password field invalid and stops submitting', () => {
    Story.story(
      interpretedUpdate,
      Story.with(validModel),
      Story.message(SubmittedForm()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Story.Command.resolve(
        interpret(validAuthRequest),
        FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
      ),
      Story.model(model => {
        expect(model.isSubmitting).toBe(false)
        expect(model.password._tag).toBe('Invalid')
      }),
      Story.expectNoOutMessage(),
    )
  })
})
