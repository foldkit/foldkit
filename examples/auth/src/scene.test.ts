import { Scene } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { LoginBlock } from './blocks/loggedOut/blocks/login'
import {
  SimulateAuthRequest,
  initModel as initLoginModel,
} from './blocks/loggedOut/blocks/login/login'
import { Model as LoggedOutModel } from './blocks/loggedOut/model'
import { RedirectToDashboard, SaveSession } from './command'
import { Session } from './domain/session'
import { ApplicationBlock, layer } from './index'
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
  it.effect(
    'successful login saves the session and lands on the dashboard',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(validModel),
        Scene.submit(Scene.role('form')),
        Scene.Command.expectExact(SimulateAuthRequest),
        Scene.Command.resolve(
          SimulateAuthRequest,
          LoginBlock.Message.SucceededSimulateAuthRequest({
            session: aliceSession,
          }),
        ),
        Scene.Command.expectExact(SaveSession, RedirectToDashboard),
        Scene.Command.resolveAll(
          [SaveSession, Message.SucceededSaveSession()],
          [RedirectToDashboard, Message.CompletedRedirectToDashboard()],
        ),
        Scene.expect(Scene.text('Welcome back, alice!')).toExist(),
      ),
  )
})
