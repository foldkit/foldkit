import { Schema } from 'effect'
import { FieldValidation, Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { SaveSession } from '../../../command'
import {
  CompletedNavigateInternal,
  GotLoggedOutMessage,
  SucceededSaveSession,
} from '../../../message'
import { LoggedOut } from '../../../model'
import { LoginRoute } from '../../../route'
import { RedirectToDashboard, update } from '../../../update'
import { view } from '../../../view'
import { GotLoginMessage } from '../message'
import {
  FailedSimulateAuthRequest,
  Message,
  SimulateAuthRequest,
  SucceededSimulateAuthRequest,
  initModel as initLoginModel,
} from './login'

const { Valid } = FieldValidation.makeField(Schema.String)

const toLoginMessage = (message: Message) =>
  GotLoggedOutMessage({ message: GotLoginMessage({ message }) })

const initialModel = LoggedOut.init(LoginRoute())

const validModel = LoggedOut.Model({
  route: LoginRoute(),
  loginModel: {
    ...initLoginModel(),
    email: Valid({ value: 'alice@example.com' }),
    password: Valid({ value: 'password' }),
  },
})

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login scene', () => {
  test('initial view renders form with sign in heading, inputs, and submit button', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'Sign In' })).toExist(),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.label('Password')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toExist(),
    )
  })

  test('typing a valid email shows checkmark', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.text('✓')).toExist(),
    )
  })

  test('typing an invalid email shows error message', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'notanemail'),
      Scene.expect(Scene.text('Please enter a valid email')).toExist(),
    )
  })

  test('submit button is enabled after typing valid email and password', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'password'),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toBeEnabled(),
    )
  })

  test('submitting with valid fields shows loading state', () => {
    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Signing in...' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Signing in...' }),
      ).toBeDisabled(),
      Scene.expectExactCommands(SimulateAuthRequest),
      Scene.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: '' }),
        toLoginMessage,
      ),
    )
  })

  test('failed auth shows error text', () => {
    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.expectExactCommands(SimulateAuthRequest),
      Scene.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
        toLoginMessage,
      ),
      Scene.expect(
        Scene.within(Scene.role('form'), Scene.text('Invalid credentials')),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toExist(),
    )
  })

  test('successful login transitions to dashboard', () => {
    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.expectExactCommands(SimulateAuthRequest),
      Scene.resolve(
        SimulateAuthRequest,
        SucceededSimulateAuthRequest({ session: aliceSession }),
        toLoginMessage,
      ),
      Scene.expectExactCommands(SaveSession, RedirectToDashboard),
      Scene.resolveAll(
        [SaveSession, SucceededSaveSession()],
        [RedirectToDashboard, CompletedNavigateInternal()],
      ),
      Scene.expect(Scene.text('Welcome back, alice!')).toExist(),
    )
  })
})
