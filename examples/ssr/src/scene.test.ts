import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import {
  CompletedPersistCount,
  Model,
  PersistCount,
  update,
  view,
} from './main'

const initialModel = Model.make({
  count: 3,
  renderedAt: '2026-07-26T00:00:00.000Z',
  renderedOn: 'Server',
})

describe('view', () => {
  test('renders the count and provenance line', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(text('3')).toExist(),
      expect(
        text('Rendered on the Server at 2026-07-26T00:00:00.000Z'),
      ).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
    )
  })

  test('clicking + increments and persists the count', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: '+' })),
      expect(text('4')).toExist(),
      Command.expectHas(PersistCount({ count: 4 })),
      Command.resolve(PersistCount({ count: 4 }), CompletedPersistCount()),
      Command.expectNone(),
    )
  })
})
