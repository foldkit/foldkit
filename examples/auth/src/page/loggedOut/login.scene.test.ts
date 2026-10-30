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

import { describe, it } from '@effect/vitest'

import { Login, LoginLive, SimulateAuthRequest, initModel } from './login'

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
      LoginLive,
      given(initModel()),
      expect(heading).toExist(),
      expect(emailField).toExist(),
      expect(passwordField).toExist(),
      expect(submitButton).toExist(),
    ),
  )

  it.effect('submit button starts disabled', () =>
    scene(LoginLive, given(initModel()), expect(submitButton).toBeDisabled()),
  )

  it.effect('typing a valid email shows the checkmark', () =>
    scene(
      LoginLive,
      given(initModel()),
      type(emailField, 'alice@example.com'),
      expect(text('✓')).toExist(),
    ),
  )

  it.effect('typing an invalid email shows the error message', () =>
    scene(
      LoginLive,
      given(initModel()),
      type(emailField, 'notanemail'),
      expect(text('Please enter a valid email')).toExist(),
    ),
  )

  it.effect(
    'submit button is enabled after typing a valid email and password',
    () =>
      scene(
        LoginLive,
        given(initModel()),
        type(emailField, 'alice@example.com'),
        type(passwordField, 'password'),
        expect(submitButton).toBeEnabled(),
      ),
  )

  it.effect(
    'submitting with valid fields shows the loading state and requests auth',
    () =>
      scene(
        LoginLive,
        given(validModel),
        submit(role('form')),
        expect(submittingButton).toExist(),
        expect(submittingButton).toBeDisabled(),
        Command.expectExact(SimulateAuthRequest),
        Command.resolve(
          SimulateAuthRequest,
          Login.Message.FailedSimulateAuthRequest({
            error: 'Invalid credentials',
          }),
        ),
      ),
  )

  it.effect(
    'failed auth shows the error and leaves submit disabled until the password changes',
    () =>
      scene(
        LoginLive,
        given(validModel),
        submit(role('form')),
        Command.expectExact(SimulateAuthRequest),
        Command.resolve(
          SimulateAuthRequest,
          Login.Message.FailedSimulateAuthRequest({
            error: 'Invalid credentials',
          }),
        ),
        expect(within(role('form'), text('Invalid credentials'))).toExist(),
        expect(submitButton).toBeDisabled(),
        type(passwordField, 'correcthorse'),
        expect(submitButton).toBeEnabled(),
      ),
  )
})
