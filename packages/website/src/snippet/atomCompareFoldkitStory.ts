import { AsyncData, Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

it.effect(
  'loading a user: the Command fires, resolves, the Model lands on Success',
  () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given({ user: AsyncData.Idle() }),
      Story.message(ClickedLoadUser()),
      Story.Command.expectExact(FetchUser),
      Story.Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
      Story.model(model => {
        expect(model.user).toStrictEqual(AsyncData.Success({ data: ada }))
      }),
    ),
)
