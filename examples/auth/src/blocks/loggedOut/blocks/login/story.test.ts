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
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { LoginBlock, layer } from './block'
import { Message, OutMessage } from './definition'
import { SimulateAuthRequest, initModel } from './login'

const validModel = modifyFields(initModel(), {
  email: () => Valid({ value: 'alice@example.com' }),
  password: () => Valid({ value: 'password' }),
})

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login', () => {
  it.effect('typing an email validates the field', () =>
    story(
      { block: LoginBlock, layer },
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
    ),
  )

  it.effect('typing a password validates the field', () =>
    story(
      { block: LoginBlock, layer },
      given(initModel()),
      message(Message.ChangedPassword({ value: '' })),
      model(model => {
        expect(model.password._tag).toBe('Invalid')
      }),
      message(Message.ChangedPassword({ value: 'secret' })),
      model(model => {
        expect(model.password._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('submitting with invalid fields does nothing', () =>
    story(
      { block: LoginBlock, layer },
      given(initModel()),
      message(Message.SubmittedForm()),
      model(model => {
        expect(model.isSubmitting).toBe(false)
      }),
      Command.expectNone(),
    ),
  )

  it.effect('submitting with valid fields sends an auth request', () =>
    story(
      { block: LoginBlock, layer },
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
    ),
  )

  it.effect(
    'failed auth marks the password field invalid and stops submitting',
    () =>
      story(
        { block: LoginBlock, layer },
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
      ),
  )
})
