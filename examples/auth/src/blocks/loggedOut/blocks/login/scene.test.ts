import { Scene } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { Message } from './block'
import { LoginBlock, layer } from './index'
import { SimulateAuthRequest, initModel } from './login'

const validModel = modifyFields(initModel(), {
  email: () => Valid({ value: 'alice@example.com' }),
  password: () => Valid({ value: 'password' }),
})

const heading = Scene.role('heading', { name: 'Sign In' })
const emailField = Scene.label('Email')
const passwordField = Scene.label('Password')
const submitButton = Scene.role('button', { name: 'Sign In' })
const submittingButton = Scene.role('button', { name: 'Signing in...' })

describe('login', () => {
  it.effect('renders the heading, both fields, and the submit button', () =>
    Scene.scene(
      { block: LoginBlock, layer },
      Scene.given(initModel()),
      Scene.expect(heading).toExist(),
      Scene.expect(emailField).toExist(),
      Scene.expect(passwordField).toExist(),
      Scene.expect(submitButton).toExist(),
    ),
  )

  it.effect('submit button starts disabled', () =>
    Scene.scene(
      { block: LoginBlock, layer },
      Scene.given(initModel()),
      Scene.expect(submitButton).toBeDisabled(),
    ),
  )

  it.effect('typing a valid email shows the checkmark', () =>
    Scene.scene(
      { block: LoginBlock, layer },
      Scene.given(initModel()),
      Scene.type(emailField, 'alice@example.com'),
      Scene.expect(Scene.text('✓')).toExist(),
    ),
  )

  it.effect('typing an invalid email shows the error message', () =>
    Scene.scene(
      { block: LoginBlock, layer },
      Scene.given(initModel()),
      Scene.type(emailField, 'notanemail'),
      Scene.expect(Scene.text('Please enter a valid email')).toExist(),
    ),
  )

  it.effect(
    'submit button is enabled after typing a valid email and password',
    () =>
      Scene.scene(
        { block: LoginBlock, layer },
        Scene.given(initModel()),
        Scene.type(emailField, 'alice@example.com'),
        Scene.type(passwordField, 'password'),
        Scene.expect(submitButton).toBeEnabled(),
      ),
  )

  it.effect(
    'submitting with valid fields shows the loading state and requests auth',
    () =>
      Scene.scene(
        { block: LoginBlock, layer },
        Scene.given(validModel),
        Scene.submit(Scene.role('form')),
        Scene.expect(submittingButton).toExist(),
        Scene.expect(submittingButton).toBeDisabled(),
        Scene.Command.expectExact(SimulateAuthRequest),
        Scene.Command.resolve(
          SimulateAuthRequest,
          Message.FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
        ),
      ),
  )

  it.effect(
    'failed auth shows the error and leaves submit disabled until the password changes',
    () =>
      Scene.scene(
        { block: LoginBlock, layer },
        Scene.given(validModel),
        Scene.submit(Scene.role('form')),
        Scene.Command.expectExact(SimulateAuthRequest),
        Scene.Command.resolve(
          SimulateAuthRequest,
          Message.FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
        ),
        Scene.expect(
          Scene.within(Scene.role('form'), Scene.text('Invalid credentials')),
        ).toExist(),
        Scene.expect(submitButton).toBeDisabled(),
        Scene.type(passwordField, 'correcthorse'),
        Scene.expect(submitButton).toBeEnabled(),
      ),
  )
})
