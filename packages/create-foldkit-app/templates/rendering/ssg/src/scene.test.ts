import { Effect } from 'effect'
import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { ApplicationBlock, Model } from './application'
import { ApplicationRoute } from './route'

const initialModel = Model.make({
  route: ApplicationRoute.Home(),
  count: 0,
})

describe('view', () => {
  test('renders the statically generated home page', () => {
    return Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(text('Statically generated home')).toExist(),
        expect(role('button', { name: 'Count: 0' })).toExist(),
      ),
    )
  })

  test('clicking the counter increments the count', () => {
    return Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        click(role('button', { name: 'Count: 0' })),
        expect(role('button', { name: 'Count: 1' })).toExist(),
      ),
    )
  })
})
