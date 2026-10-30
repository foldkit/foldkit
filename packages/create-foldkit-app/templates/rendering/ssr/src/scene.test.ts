import { Command, click, expect, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { ApplicationLive, Flags, Message, PersistCount } from './application'

const flags = Flags.make({
  initialCount: 3,
  renderedAt: '2026-07-26T00:00:00.000Z',
  renderedOn: 'Server',
})

describe('view', () => {
  it.effect('renders the count and provenance line', () =>
    scene(
      ApplicationLive,
      { flags },
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
      ApplicationLive,
      { flags },
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
