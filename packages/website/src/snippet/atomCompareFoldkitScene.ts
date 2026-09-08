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
import { test } from 'vitest'

test('click load, resolve the fetch, see the profile', () => {
  scene(
    { update, view },
    given(model),
    click(role('button', { name: 'Load user' })),
    expect(text('Loading…')).toExist(),
    Command.expectExact(FetchUser),
    Command.resolve(FetchUser, SucceededLoadUser({ user: ada })),
    inside(role('article'), expect(text('Ada Lovelace')).toExist()),
  )
})
