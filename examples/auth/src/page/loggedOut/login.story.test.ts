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
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { Login, LoginLive, SimulateAuthRequest, initModel } from './login'

const validModel = modifyFields(initModel(), {
  email: () => Valid({ value: 'alice@example.com' }),
  password: () => Valid({ value: 'password' }),
})

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login', () => {
  it.effect('typing an email validates the field', () =>
    story(
      LoginLive,
      given(initModel()),
      message(Login.Message.ChangedEmail({ value: '' })),
      model(model => {
        expect(model.email._tag).toBe('Invalid')
      }),
      message(Login.Message.ChangedEmail({ value: 'alice@example.com' })),
      model(model => {
        expect(model.email._tag).toBe('Valid')
        expect(model.email.value).toBe('alice@example.com')
      }),
    ),
  )

  it.effect('typing a password validates the field', () =>
    story(
      LoginLive,
      given(initModel()),
      message(Login.Message.ChangedPassword({ value: '' })),
      model(model => {
        expect(model.password._tag).toBe('Invalid')
      }),
      message(Login.Message.ChangedPassword({ value: 'secret' })),
      model(model => {
        expect(model.password._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('submitting with invalid fields does nothing', () =>
    story(
      LoginLive,
      given(initModel()),
      message(Login.Message.SubmittedForm()),
      model(model => {
        expect(model.isSubmitting).toBe(false)
      }),
      Command.expectNone(),
    ),
  )

  it.effect('submitting with valid fields sends an auth request', () =>
    story(
      LoginLive,
      given(validModel),
      message(Login.Message.SubmittedForm()),
      model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Command.expectHas(SimulateAuthRequest),
      Command.resolve(
        SimulateAuthRequest,
        Login.Message.SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      expectOutMessage(
        Login.OutMessage.SucceededLogin({ session: aliceSession }),
      ),
    ),
  )

  it.effect(
    'failed auth marks the password field invalid and stops submitting',
    () =>
      story(
        LoginLive,
        given(validModel),
        message(Login.Message.SubmittedForm()),
        model(model => {
          expect(model.isSubmitting).toBe(true)
        }),
        Command.resolve(
          SimulateAuthRequest,
          Login.Message.FailedSimulateAuthRequest({
            error: 'Invalid credentials',
          }),
        ),
        model(model => {
          expect(model.isSubmitting).toBe(false)
          expect(model.password._tag).toBe('Invalid')
        }),
        expectNoOutMessage(),
      ),
  )
})
