import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

it.effect(
  'loading a user: the Command fires, resolves, the Model lands on Success',
  () =>
    story(
      { block: ApplicationBlock, layer },
      given({ user: AsyncData.Idle() }),
      message(ClickedLoadUser()),
      Command.expectExact(FetchUser),
      Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
      model(model => {
        expect(model.user).toStrictEqual(AsyncData.Success({ data: ada }))
      }),
    ),
)
