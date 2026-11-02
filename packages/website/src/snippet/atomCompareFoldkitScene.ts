import { Effect, Layer } from 'effect'
import {
  Command,
  click,
  expect,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'

import { it } from '@effect/vitest'

import {
  Api,
  ApplicationLive,
  FetchUser,
  Message,
  type User,
} from './atomCompareFoldkitAsync'

const ada: User = { id: 'ada', name: 'Ada Lovelace' }

const TestApi = Layer.succeed(Api, { getUser: () => Effect.succeed(ada) })

it.effect('click load, resolve the fetch, see the profile', () =>
  scene(
    ApplicationLive.pipe(Layer.provide(TestApi)),
    click(role('button', { name: 'Load user' })),
    expect(text('Loading…')).toExist(),
    Command.expectExact(FetchUser),
    Command.resolve(FetchUser, Message.SucceededLoadUser({ user: ada })),
    inside(role('article'), expect(text('Ada Lovelace')).toExist()),
  ),
)
