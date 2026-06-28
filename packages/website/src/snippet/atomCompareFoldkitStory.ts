import { AsyncData, Story } from 'foldkit'
import { expect, test } from 'vitest'

test('loading a user: the Command fires, resolves, the Model lands on Success', () => {
  Story.story(
    update,
    Story.with({ user: AsyncData.Idle() }),
    Story.message(ClickedLoadUser()),
    Story.Command.expectExact(FetchUser),
    Story.Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    Story.model(model => {
      expect(model.user).toStrictEqual(AsyncData.Success({ data: ada }))
    }),
  )
})
