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
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { SaveSession } from './command'
import { Session } from './domain/session'
import { Message } from './message'
import { LoggedOut } from './model'
import {
  Message as LoginMessage,
  SimulateAuthRequest,
  initModel as initLoginModel,
} from './page/loggedOut/page/login'
import { AppRoute } from './route'
import { RedirectToDashboard, update } from './update'
import { view } from './view'

const validModel = LoggedOut.Model({
  route: AppRoute.Login(),
  loginModel: evo(initLoginModel(), {
    email: () => Valid({ value: 'alice@example.com' }),
    password: () => Valid({ value: 'password' }),
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
        LoginMessage.SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Command.expectExact(SaveSession, RedirectToDashboard),
      Command.resolveAll(
        [SaveSession, Message.SucceededSaveSession()],
        [RedirectToDashboard, Message.CompletedNavigateInternal()],
      ),
      expect(text('Welcome back, alice!')).toExist(),
    )
  })
})
