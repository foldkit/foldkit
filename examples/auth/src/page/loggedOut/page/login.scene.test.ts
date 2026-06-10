import { DataCommand, Scene } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { describe, test } from 'vitest'

import { execute } from '../../../command'
import type { Message as RootMessage } from '../../../message'
import {
  CompletedNavigateInternal,
  GotLoggedOutMessage,
  SucceededSaveSession,
} from '../../../message'
import { LoggedOut, type Model as RootModel } from '../../../model'
import { LoginRoute } from '../../../route'
import { update } from '../../../update'
import { view } from '../../../view'
import { GotLoginMessage } from '../message'
import {
  FailedSimulateAuthRequest,
  Message,
  SimulateAuthRequest,
  SucceededSimulateAuthRequest,
  execute as executeLogin,
  initModel as initLoginModel,
} from './login'

const interpretAll = DataCommand.toCommands(execute)
const interpretLogin = DataCommand.toCommand(executeLogin)

const interpretedUpdate = (model: RootModel, message: RootMessage) => {
  const [nextModel, commands] = update(model, message)
  return [nextModel, interpretAll(commands)] as const
}

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

const validAuthRequest = SimulateAuthRequest({
  email: 'alice@example.com',
  password: 'password',
})

describe('login scene', () => {
  test('initial view renders form with sign in heading, inputs, and submit button', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('heading', { name: 'Sign In' })).toExist(),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.label('Password')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toExist(),
    )
  })

  test('typing a valid email shows checkmark', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.expect(Scene.text('✓')).toExist(),
    )
  })

  test('typing an invalid email shows error message', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'notanemail'),
      Scene.expect(Scene.text('Please enter a valid email')).toExist(),
    )
  })

  test('submit button is enabled after typing valid email and password', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(initialModel),
      Scene.type(Scene.label('Email'), 'alice@example.com'),
      Scene.type(Scene.label('Password'), 'password'),
      Scene.expect(Scene.role('button', { name: 'Sign In' })).toBeEnabled(),
    )
  })

  test('submitting with valid fields shows loading state', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(Scene.role('button', { name: 'Signing in...' })).toExist(),
      Scene.expect(
        Scene.role('button', { name: 'Signing in...' }),
      ).toBeDisabled(),
      Scene.Command.expectExact({ name: 'SimulateAuthRequest' }),
      Scene.Command.resolve(
        interpretLogin(validAuthRequest),
        FailedSimulateAuthRequest({ error: '' }),
        toLoginMessage,
      ),
    )
  })

  test('failed auth shows error text', () => {
    Scene.scene(
      { update: interpretedUpdate, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact({ name: 'SimulateAuthRequest' }),
      Scene.Command.resolve(
        interpretLogin(validAuthRequest),
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
      { update: interpretedUpdate, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact({ name: 'SimulateAuthRequest' }),
      Scene.Command.resolve(
        interpretLogin(validAuthRequest),
        SucceededSimulateAuthRequest({ session: aliceSession }),
        toLoginMessage,
      ),
      Scene.Command.expectExact(
        { name: 'SaveSession' },
        { name: 'RedirectToDashboard' },
      ),
      Scene.Command.resolveAll(
        [{ name: 'SaveSession' }, SucceededSaveSession()],
        [{ name: 'RedirectToDashboard' }, CompletedNavigateInternal()],
      ),
      Scene.expect(Scene.text('Welcome back, alice!')).toExist(),
    )
  })
})
