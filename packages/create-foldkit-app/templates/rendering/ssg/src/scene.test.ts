import { Option } from 'effect'
import { click, expect, role, scene, text } from 'foldkit/scene'
import { fromString } from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'

const homeUrl = Option.getOrThrow(fromString('http://localhost/'))

describe('view', () => {
  it.effect('renders the statically generated home page', () =>
    scene(
      ApplicationLive,
      { url: homeUrl },
      expect(text('Statically generated home')).toExist(),
      expect(role('button', { name: 'Count: 0' })).toExist(),
    ),
  )

  it.effect('clicking the counter increments the count', () =>
    scene(
      ApplicationLive,
      { url: homeUrl },
      click(role('button', { name: 'Count: 0' })),
      expect(role('button', { name: 'Count: 1' })).toExist(),
    ),
  )
})
