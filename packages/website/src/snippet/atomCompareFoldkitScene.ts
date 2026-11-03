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

import { ApplicationBlock } from './application'

it.effect('click load, resolve the fetch, see the profile', () =>
  scene(
    ApplicationBlock,
    given(model),
    click(role('button', { name: 'Load user' })),
    expect(text('Loading…')).toExist(),
    Command.expectExact(FetchUser),
    Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    inside(role('article'), expect(text('Ada Lovelace')).toExist()),
  ),
)
