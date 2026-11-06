import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, Model, PersistCount, layer } from './block'

const initialModel = Model.make({
  count: 3,
  renderedAt: '2026-07-26T00:00:00.000Z',
  renderedOn: 'Server',
})

describe('view', () => {
  it.effect('renders the count and provenance line', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expect(Scene.text('3')).toExist(),
      Scene.expect(
        Scene.text('Rendered on the Server at 2026-07-26T00:00:00.000Z'),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: '+' })).toExist(),
      Scene.expect(Scene.role('button', { name: '-' })).toExist(),
    ),
  )

  it.effect('clicking + increments and persists the count', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: '+' })),
      Scene.expect(Scene.text('4')).toExist(),
      Scene.Command.expectHas(PersistCount({ count: 4 })),
      Scene.Command.resolve(
        PersistCount({ count: 4 }),
        Message.CompletedPersistCount(),
      ),
      Scene.Command.expectNone(),
    ),
  )
})
