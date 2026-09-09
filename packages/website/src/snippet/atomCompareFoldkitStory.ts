import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

test('loading a user: the Command fires, resolves, the Model lands on Success', () => {
  story(
    update,
    given({ user: AsyncData.Idle() }),
    message(ClickedLoadUser()),
    Command.expectExact(FetchUser),
    Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    model(model => {
      expect(model.user).toStrictEqual(AsyncData.Success({ data: ada }))
    }),
  )
})
