import { Effect } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { ApplicationBlock } from './application'

test('loading a user: the Command fires, resolves, the Model lands on Success', async () => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given({ user: AsyncData.Idle() }),
      message(ClickedLoadUser()),
      Command.expectExact(FetchUser),
      Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
      model(model => {
        expect(model.user).toStrictEqual(AsyncData.Success({ data: ada }))
      }),
    ),
  )
})
