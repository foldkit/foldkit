import { Effect } from 'effect'
import { Valid } from 'foldkit/fieldValidation'
import {
  Command,
  expect,
  given,
  label,
  role,
  scene,
  submit,
  text,
  type,
  within,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { LoginBlock, layer } from './block'
import { Message } from './definition'
import { SimulateAuthRequest, initModel } from './login'

const validModel = modifyFields(initModel(), {
  email: () => Valid({ value: 'alice@example.com' }),
  password: () => Valid({ value: 'password' }),
})

const heading = role('heading', { name: 'Sign In' })
const emailField = label('Email')
const passwordField = label('Password')
const submitButton = role('button', { name: 'Sign In' })
const submittingButton = role('button', { name: 'Signing in...' })

describe('login', () => {
  test('renders the heading, both fields, and the submit button', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(initModel()),
        expect(heading).toExist(),
        expect(emailField).toExist(),
        expect(passwordField).toExist(),
        expect(submitButton).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('submit button starts disabled', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(initModel()),
        expect(submitButton).toBeDisabled(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('typing a valid email shows the checkmark', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(initModel()),
        type(emailField, 'alice@example.com'),
        expect(text('✓')).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('typing an invalid email shows the error message', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(initModel()),
        type(emailField, 'notanemail'),
        expect(text('Please enter a valid email')).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('submit button is enabled after typing a valid email and password', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(initModel()),
        type(emailField, 'alice@example.com'),
        type(passwordField, 'password'),
        expect(submitButton).toBeEnabled(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('submitting with valid fields shows the loading state and requests auth', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(validModel),
        submit(role('form')),
        expect(submittingButton).toExist(),
        expect(submittingButton).toBeDisabled(),
        Command.expectExact(SimulateAuthRequest),
        Command.resolve(
          SimulateAuthRequest,
          Message.FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
        ),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('failed auth shows the error and leaves submit disabled until the password changes', async () => {
    await Effect.runPromise(
      scene(
        LoginBlock,
        given(validModel),
        submit(role('form')),
        Command.expectExact(SimulateAuthRequest),
        Command.resolve(
          SimulateAuthRequest,
          Message.FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
        ),
        expect(within(role('form'), text('Invalid credentials'))).toExist(),
        expect(submitButton).toBeDisabled(),
        type(passwordField, 'correcthorse'),
        expect(submitButton).toBeEnabled(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
