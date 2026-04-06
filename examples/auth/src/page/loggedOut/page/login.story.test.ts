import { Schema } from 'effect'
import { FieldValidation, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ChangedEmail,
  ChangedPassword,
  ClickedSubmit,
  FailedSimulateAuthRequest,
  type Model,
  SimulateAuthRequest,
  SucceededLogin,
  SucceededSimulateAuthRequest,
  initModel,
  update,
} from './login'

const { Valid } = FieldValidation.makeField(Schema.String)

const validModel: Model = {
  ...initModel(),
  email: Valid({ value: 'alice@example.com' }),
  password: Valid({ value: 'password' }),
}

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login', () => {
  test('typing an email validates the field', () => {
    Story.story(
      update,
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
      update,
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
      update,
      Story.with(initModel()),
      Story.message(ClickedSubmit()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(false)
      }),
      Story.expectNoCommands(),
    )
  })

  test('submitting with valid fields sends an auth request', () => {
    Story.story(
      update,
      Story.with(validModel),
      Story.message(ClickedSubmit()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Story.expectHasCommands(SimulateAuthRequest),
      Story.resolve(
        SimulateAuthRequest,
        SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Story.expectOutMessage(SucceededLogin({ session: aliceSession })),
    )
  })

  test('failed auth marks the password field invalid and stops submitting', () => {
    Story.story(
      update,
      Story.with(validModel),
      Story.message(ClickedSubmit()),
      Story.model(model => {
        expect(model.isSubmitting).toBe(true)
      }),
      Story.resolve(
        SimulateAuthRequest,
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
