import { Scene } from 'foldkit'
import { test } from 'vitest'

test('click load, resolve the fetch, see the profile', () => {
  Scene.scene(
    { update, view },
    Scene.with(model),
    Scene.click(Scene.role('button', { name: 'Load user' })),
    Scene.expect(Scene.text('Loading…')).toExist(),
    Scene.Command.expectExact(FetchUser),
    Scene.Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    Scene.inside(
      Scene.role('article'),
      Scene.expect(Scene.text('Ada Lovelace')).toExist(),
    ),
  )
})
