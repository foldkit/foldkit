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
import { describe } from 'vitest'

import { it } from '@effect/vitest'

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
  it.effect('renders the heading, both fields, and the submit button', () =>
    scene(
      LoginBlock,
      given(initModel()),
      expect(heading).toExist(),
      expect(emailField).toExist(),
      expect(passwordField).toExist(),
      expect(submitButton).toExist(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('submit button starts disabled', () =>
    scene(
      LoginBlock,
      given(initModel()),
      expect(submitButton).toBeDisabled(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('typing a valid email shows the checkmark', () =>
    scene(
      LoginBlock,
      given(initModel()),
      type(emailField, 'alice@example.com'),
      expect(text('✓')).toExist(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('typing an invalid email shows the error message', () =>
    scene(
      LoginBlock,
      given(initModel()),
      type(emailField, 'notanemail'),
      expect(text('Please enter a valid email')).toExist(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect(
    'submit button is enabled after typing a valid email and password',
    () =>
      scene(
        LoginBlock,
        given(initModel()),
        type(emailField, 'alice@example.com'),
        type(passwordField, 'password'),
        expect(submitButton).toBeEnabled(),
      ).pipe(Effect.provide(layer)),
  )

  it.effect(
    'submitting with valid fields shows the loading state and requests auth',
    () =>
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

  it.effect(
    'failed auth shows the error and leaves submit disabled until the password changes',
    () =>
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
