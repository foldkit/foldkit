import { Valid } from 'foldkit/fieldValidation'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import {
  Message,
  OutMessage,
  SimulateAuthRequest,
  initModel,
  update,
} from './login'

const validModel = evo(initModel(), {
  email: () => Valid({ value: 'alice@example.com' }),
  password: () => Valid({ value: 'password' }),
})

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login', () => {
  test('typing an email validates the field', () => {
    story(
      update,
      given(initModel()),
      message(Message.ChangedEmail({ value: '' })),
      model(model => {
        expect(model.email._tag).toBe('Invalid')
      }),
      message(Message.ChangedEmail({ value: 'alice@example.com' })),
      model(model => {
        expect(model.email._tag).toBe('Valid')
        expect(model.email.value).toBe('alice@example.com')
      }),
    )
  })

  test('typing a password validates the field', () => {
    story(
      update,
      given(initModel()),
      message(Message.ChangedPassword({ value: '' })),
      model(model => {
        expect(model.password._tag).toBe('Invalid')
      }),
      message(Message.ChangedPassword({ value: 'secret' })),
      model(model => {
        expect(model.password._tag).toBe('Valid')
      }),
    )
  })

  test('submitting with invalid fields does nothing', () => {
    story(
      update,
      given(initModel()),
      message(Message.SubmittedForm()),
      model(model => {
        expect(model.isSubmitting).toBe(false)
      }),
      Command.expectNone(),
    )
  })

  test('submitting with valid fields sends an auth request', () => {
    story(
      update,
      given(validModel),
      message(Message.SubmittedForm()),
      model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Command.expectHas(SimulateAuthRequest),
      Command.resolve(
        SimulateAuthRequest,
        Message.SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      expectOutMessage(OutMessage.SucceededLogin({ session: aliceSession })),
    )
  })

  test('failed auth marks the password field invalid and stops submitting', () => {
    story(
      update,
      given(validModel),
      message(Message.SubmittedForm()),
      model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Command.resolve(
        SimulateAuthRequest,
        Message.FailedSimulateAuthRequest({
          error: 'Invalid credentials',
        }),
      ),
      model(model => {
        expect(model.isSubmitting).toBe(false)
        expect(model.password._tag).toBe('Invalid')
      }),
      expectNoOutMessage(),
    )
  })
})
