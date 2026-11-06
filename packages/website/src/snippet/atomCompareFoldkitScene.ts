import { Scene } from 'foldkit'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

it.effect('click load, resolve the fetch, see the profile', () =>
  Scene.scene(
    { block: ApplicationBlock, layer },
    Scene.given(model),
    Scene.click(Scene.role('button', { name: 'Load user' })),
    Scene.expect(Scene.text('Loading…')).toExist(),
    Scene.Command.expectExact(FetchUser),
    Scene.Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    Scene.inside(
      Scene.role('article'),
      Scene.expect(Scene.text('Ada Lovelace')).toExist(),
    ),
  ),
)
