import { Option, Schema } from 'effect'
import { FieldValidation, Test } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ChangedEmail,
  ChangedPassword,
  ClickedSubmit,
  FailedAuth,
  type Model,
  SimulateAuthRequest,
  SucceededAuth,
  SucceededLogin,
  initModel,
  update,
} from './login'

const { Valid } = FieldValidation.makeField(Schema.String)

const validModel: Model = {
  ...initModel(),
  email: Valid({ value: 'alice@example.com' }),
  password: Valid({ value: 'password' }),
}

const alice = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login', () => {
  test('typing an email validates the field', () => {
    Test.story(
      update,
      Test.with(initModel()),
      Test.message(ChangedEmail({ value: '' })),
      Test.tap(({ model }) => {
        expect(model.email._tag).toBe('Invalid')
      }),
      Test.message(ChangedEmail({ value: 'alice@example.com' })),
      Test.tap(({ model }) => {
        expect(model.email._tag).toBe('Valid')
        expect(model.email.value).toBe('alice@example.com')
      }),
    )
  })

  test('typing a password validates the field', () => {
    Test.story(
      update,
      Test.with(initModel()),
      Test.message(ChangedPassword({ value: '' })),
      Test.tap(({ model }) => {
        expect(model.password._tag).toBe('Invalid')
      }),
      Test.message(ChangedPassword({ value: 'secret' })),
      Test.tap(({ model }) => {
        expect(model.password._tag).toBe('Valid')
      }),
    )
  })

  test('submitting with invalid fields does nothing', () => {
    Test.story(
      update,
      Test.with(initModel()),
      Test.message(ClickedSubmit()),
      Test.tap(({ model, commands }) => {
        expect(model.isSubmitting).toBe(false)
        expect(commands).toHaveLength(0)
      }),
    )
  })

  test('submitting with valid fields sends an auth request', () => {
    Test.story(
      update,
      Test.with(validModel),
      Test.message(ClickedSubmit()),
      Test.tap(({ model, commands }) => {
        expect(model.isSubmitting).toBe(true)
        expect(commands[0]?.name).toBe(SimulateAuthRequest.name)
      }),
      Test.resolve(SimulateAuthRequest, SucceededAuth({ session: alice })),
      Test.tap(({ outMessage }) => {
        expect(outMessage).toEqual(
          Option.some(SucceededLogin({ session: alice })),
        )
      }),
    )
  })

  test('failed auth marks the password field invalid and stops submitting', () => {
    Test.story(
      update,
      Test.with(validModel),
      Test.message(ClickedSubmit()),
      Test.tap(({ model }) => {
        expect(model.isSubmitting).toBe(true)
      }),
      Test.resolve(
        SimulateAuthRequest,
        FailedAuth({ error: 'Invalid credentials' }),
      ),
      Test.tap(({ model, outMessage }) => {
        expect(model.isSubmitting).toBe(false)
        expect(model.password._tag).toBe('Invalid')
        expect(outMessage).toEqual(Option.none())
      }),
    )
  })
})
