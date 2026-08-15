import { Valid } from 'foldkit/fieldValidation'
import {
  Command,
  expect,
  given,
  role,
  scene,
  submit,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { SaveSession } from './command'
import { Session } from './domain/session'
import { CompletedNavigateInternal, SucceededSaveSession } from './message'
import { LoggedOut } from './model'
import {
  Model as LoginModel,
  SimulateAuthRequest,
  SucceededSimulateAuthRequest,
  initModel as initLoginModel,
} from './page/loggedOut/page/login'
import { LoginRoute } from './route'
import { RedirectToDashboard, update } from './update'
import { view } from './view'

const validModel = LoggedOut.Model({
  route: LoginRoute(),
  loginModel: LoginModel.make({
    ...initLoginModel(),
    email: Valid({ value: 'alice@example.com' }),
    password: Valid({ value: 'password' }),
  }),
})

const aliceSession = Session.make({
  userId: '1',
  email: 'alice@example.com',
  name: 'alice',
})

describe('login flow', () => {
  test('successful login saves the session and lands on the dashboard', () => {
    scene(
      { update, view },
      given(validModel),
      submit(role('form')),
      Command.expectExact(SimulateAuthRequest),
      Command.resolve(
        SimulateAuthRequest,
        SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Command.expectExact(SaveSession, RedirectToDashboard),
      Command.resolveAll(
        [SaveSession, SucceededSaveSession()],
        [RedirectToDashboard, CompletedNavigateInternal()],
      ),
      expect(text('Welcome back, alice!')).toExist(),
    )
  })
})
