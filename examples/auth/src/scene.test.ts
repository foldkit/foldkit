import { Effect } from 'effect'
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
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { ApplicationBlock } from './block'
import { LoginBlock } from './blocks/loggedOut/blocks/login'
import {
  SimulateAuthRequest,
  initModel as initLoginModel,
} from './blocks/loggedOut/blocks/login/login'
import { Model as LoggedOutModel } from './blocks/loggedOut/model'
import { RedirectToDashboard, SaveSession } from './command'
import { Session } from './domain/session'
import { Message } from './message'
import { ApplicationRoute } from './route'

const validModel = LoggedOutModel({
  route: ApplicationRoute.Login(),
  loginModel: modifyFields(initLoginModel(), {
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
  test('successful login saves the session and lands on the dashboard', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(validModel),
        submit(role('form')),
        Command.expectExact(SimulateAuthRequest),
        Command.resolve(
          SimulateAuthRequest,
          LoginBlock.Message.SucceededSimulateAuthRequest({
            session: aliceSession,
          }),
        ),
        Command.expectExact(SaveSession, RedirectToDashboard),
        Command.resolveAll(
          [SaveSession, Message.SucceededSaveSession()],
          [RedirectToDashboard, Message.CompletedRedirectToDashboard()],
        ),
        expect(text('Welcome back, alice!')).toExist(),
      ),
    )
  })
})
