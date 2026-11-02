import { Effect, Layer } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import {
  Api,
  ApplicationLive,
  FetchUser,
  Message,
  type User,
} from './atomCompareFoldkitAsync'

const ada: User = { id: 'ada', name: 'Ada Lovelace' }

const TestApi = Layer.succeed(Api, { getUser: () => Effect.succeed(ada) })

it.effect(
  'loading a user: the Command fires, resolves, the Model lands on Success',
  () =>
    story(
      ApplicationLive.pipe(Layer.provide(TestApi)),
      message(Message.ClickedLoadUser()),
      Command.expectExact(FetchUser),
      Command.resolve(FetchUser, Message.SucceededLoadUser({ user: ada })),
      model(model => {
        expect(model.user).toStrictEqual(AsyncData.Success({ data: ada }))
      }),
    ),
)
