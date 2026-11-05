import {
  Command,
  click,
  expect,
  given,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

it.effect('click load, resolve the fetch, see the profile', () =>
  scene(
    { block: ApplicationBlock, layer },
    given(model),
    click(role('button', { name: 'Load user' })),
    expect(text('Loading…')).toExist(),
    Command.expectExact(FetchUser),
    Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    inside(role('article'), expect(text('Ada Lovelace')).toExist()),
  ),
)
