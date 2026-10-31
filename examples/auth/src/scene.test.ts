import { Effect, Layer, Option } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import type { Resolved } from 'foldkit/block'
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
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import {
  ApplicationLive,
  Message,
  type Model,
  RedirectToDashboard,
  SaveSession,
} from './application'
import { Session } from './domain/session'
import { LoggedOutLive } from './page/loggedOut/loggedOut'
import {
  Login,
  LoginLive,
  SimulateAuthRequest,
  initModel as initLoginModel,
} from './page/loggedOut/login'
import { ApplicationRoute } from './route'

const application = ApplicationLive.pipe(
  Layer.provide(LoggedOutLive.pipe(Layer.provide(LoginLive))),
)

const startArgs = {
  flags: { maybeSession: Option.none() },
  url: Option.getOrThrow(fromString('http://localhost/login')),
}

const validModel: Resolved<Model> = {
  _tag: 'LoggedOut',
  route: ApplicationRoute.Login(),
  loggedOut: {
    login: modifyFields(initLoginModel(), {
      email: () => Valid({ value: 'alice@example.com' }),
      password: () => Valid({ value: 'password' }),
    }),
  },
}

const aliceSession = Session.make({
  userId: '1',
  email: 'alice@example.com',
  name: 'alice',
})

describe('login flow', () => {
  it.effect(
    'successful login saves the session and lands on the dashboard',
    () =>
      scene(
        application,
        startArgs,
        given(validModel),
        submit(role('form')),
        Command.expectExact(SimulateAuthRequest),
        Command.resolve(
          SimulateAuthRequest,
          Login.Message.SucceededSimulateAuthRequest({
            session: aliceSession,
          }),
        ),
        Command.expectExact(SaveSession, RedirectToDashboard),
        Command.resolveAll(
          [SaveSession, Message.SucceededSaveSession()],
          [RedirectToDashboard, Message.CompletedRedirectToDashboard()],
        ),
        expect(text('Welcome back, alice!')).toExist(),
      ).pipe(Effect.provide(KeyValueStore.layerMemory)),
  )
})
