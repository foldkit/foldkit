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
import { describe, test } from 'vitest'

import {
  FailedSimulateAuthRequest,
  Model,
  SimulateAuthRequest,
  initModel,
  update,
  view,
} from './login'

const validModel = Model.make({
  ...initModel(),
  email: Valid({ value: 'alice@example.com' }),
  password: Valid({ value: 'password' }),
})

const heading = role('heading', { name: 'Sign In' })
const emailField = label('Email')
const passwordField = label('Password')
const submitButton = role('button', { name: 'Sign In' })
const submittingButton = role('button', { name: 'Signing in...' })

describe('login', () => {
  test('renders the heading, both fields, and the submit button', () => {
    scene(
      { update, view },
      given(initModel()),
      expect(heading).toExist(),
      expect(emailField).toExist(),
      expect(passwordField).toExist(),
      expect(submitButton).toExist(),
    )
  })

  test('submit button starts disabled', () => {
    scene(
      { update, view },
      given(initModel()),
      expect(submitButton).toBeDisabled(),
    )
  })

  test('typing a valid email shows the checkmark', () => {
    scene(
      { update, view },
      given(initModel()),
      type(emailField, 'alice@example.com'),
      expect(text('✓')).toExist(),
    )
  })

  test('typing an invalid email shows the error message', () => {
    scene(
      { update, view },
      given(initModel()),
      type(emailField, 'notanemail'),
      expect(text('Please enter a valid email')).toExist(),
    )
  })

  test('submit button is enabled after typing a valid email and password', () => {
    scene(
      { update, view },
      given(initModel()),
      type(emailField, 'alice@example.com'),
      type(passwordField, 'password'),
      expect(submitButton).toBeEnabled(),
    )
  })

  test('submitting with valid fields shows the loading state and requests auth', () => {
    scene(
      { update, view },
      given(validModel),
      submit(role('form')),
      expect(submittingButton).toExist(),
      expect(submittingButton).toBeDisabled(),
      Command.expectExact(SimulateAuthRequest),
      Command.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
      ),
    )
  })

  test('failed auth shows the error and leaves submit disabled until the password changes', () => {
    scene(
      { update, view },
      given(validModel),
      submit(role('form')),
      Command.expectExact(SimulateAuthRequest),
      Command.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
      ),
      expect(within(role('form'), text('Invalid credentials'))).toExist(),
      expect(submitButton).toBeDisabled(),
      type(passwordField, 'correcthorse'),
      expect(submitButton).toBeEnabled(),
    )
  })
})
