import { Option } from 'effect'
import { deliver, expect, role, scene } from 'foldkit/scene'
import { fromString } from 'foldkit/url'

import { it } from '@effect/vitest'

import { ApplicationLive, Message } from './search'

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(fromString(raw), () => new Error(`Invalid URL: ${raw}`))

it.effect('shows results for the query in a new URL', () =>
  scene(
    ApplicationLive,
    { url: urlOrThrow('http://localhost/') },
    deliver(
      Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=foldkit') }),
    ),
    expect(role('status')).toHaveText('Results for foldkit'),
  ),
)
