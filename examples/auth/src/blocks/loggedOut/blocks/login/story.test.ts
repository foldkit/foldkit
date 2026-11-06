import { Story } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message, OutMessage } from './block'
import { LoginBlock, layer } from './index'
import { SimulateAuthRequest, initModel } from './login'

const validModel = modifyFields(initModel(), {
  email: () => Valid({ value: 'alice@example.com' }),
  password: () => Valid({ value: 'password' }),
})

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login', () => {
  it.effect('typing an email validates the field', () =>
    Story.story(
      { block: LoginBlock, layer },
      Story.given(initModel()),
      Story.message(Message.ChangedEmail({ value: '' })),
      Story.model(model => {
        expect(model.email._tag).toBe('Invalid')
      }),
      Story.message(Message.ChangedEmail({ value: 'alice@example.com' })),
      Story.model(model => {
        expect(model.email._tag).toBe('Valid')
        expect(model.email.value).toBe('alice@example.com')
      }),
    ),
  )

  it.effect('typing a password validates the field', () =>
    Story.story(
      { block: LoginBlock, layer },
      Story.given(initModel()),
      Story.message(Message.ChangedPassword({ value: '' })),
      Story.model(model => {
        expect(model.password._tag).toBe('Invalid')
      }),
      Story.message(Message.ChangedPassword({ value: 'secret' })),
      Story.model(model => {
        expect(model.password._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('submitting with invalid fields does nothing', () =>
    Story.story(
      { block: LoginBlock, layer },
      Story.given(initModel()),
      Story.message(Message.SubmittedForm()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(false)
      }),
      Story.Command.expectNone(),
    ),
  )

  it.effect('submitting with valid fields sends an auth request', () =>
    Story.story(
      { block: LoginBlock, layer },
      Story.given(validModel),
      Story.message(Message.SubmittedForm()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Story.Command.expectHas(SimulateAuthRequest),
      Story.Command.resolve(
        SimulateAuthRequest,
        Message.SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Story.expectOutMessage(
        OutMessage.SucceededLogin({ session: aliceSession }),
      ),
    ),
  )

  it.effect(
    'failed auth marks the password field invalid and stops submitting',
    () =>
      Story.story(
        { block: LoginBlock, layer },
        Story.given(validModel),
        Story.message(Message.SubmittedForm()),
        Story.model(model => {
          expect(model.isSubmitting).toBe(true)
        }),
        Story.Command.resolve(
          SimulateAuthRequest,
          Message.FailedSimulateAuthRequest({
            error: 'Invalid credentials',
          }),
        ),
        Story.model(model => {
          expect(model.isSubmitting).toBe(false)
          expect(model.password._tag).toBe('Invalid')
        }),
        Story.expectNoOutMessage(),
      ),
  )
})
