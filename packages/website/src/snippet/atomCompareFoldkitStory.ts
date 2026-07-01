import { Story } from 'foldkit'
import { expect, test } from 'vitest'

test('loading a user: the Command fires, resolves, the Model lands on Loaded', () => {
  Story.story(
    update,
    Story.with({ user: NotAsked() }),

    Story.message(ClickedLoadUser()),
    Story.Command.expectExact(FetchUser),
    Story.Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),

    Story.model(model => {
      expect(model.user).toStrictEqual(Loaded({ user: ada }))
    }),
  )
})
