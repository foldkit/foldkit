import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  Model,
  PersistCount,
  layer,
} from './application'

const initialModel = Model.make({
  count: 3,
  renderedAt: '2026-07-26T00:00:00.000Z',
  renderedOn: 'Server',
})

describe('view', () => {
  it.effect('renders the count and provenance line', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      expect(text('3')).toExist(),
      expect(
        text('Rendered on the Server at 2026-07-26T00:00:00.000Z'),
      ).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
    ),
  )

  it.effect('clicking + increments and persists the count', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      click(role('button', { name: '+' })),
      expect(text('4')).toExist(),
      Command.expectHas(PersistCount({ count: 4 })),
      Command.resolve(
        PersistCount({ count: 4 }),
        Message.CompletedPersistCount(),
      ),
      Command.expectNone(),
    ),
  )
})
