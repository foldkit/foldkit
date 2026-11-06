import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model as ModelSchema, layer } from './block'
import { CounterBlock } from './blocks/counter'

const initialModel: ModelSchema = {
  counters: [
    CounterBlock.Instance.make({ key: 'counter-0', model: { count: 0 } }),
    CounterBlock.Instance.make({ key: 'counter-1', model: { count: 0 } }),
  ],
  nextCounterId: 2,
}

describe('view', () => {
  it.effect('renders one Counter instance per entry', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.expectAll(Scene.all.role('button', { name: '+' })).toHaveCount(2),
      Scene.expectAll(Scene.all.role('button', { name: '-' })).toHaveCount(2),
      Scene.expectAll(Scene.all.role('button', { name: 'Remove' })).toHaveCount(
        2,
      ),
    ),
  )

  it.effect(
    'clicking + on a Counter dispatches through h.block back to the right instance',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(initialModel),
        Scene.expectAll(Scene.all.text('0')).toHaveCount(2),
        Scene.click(Scene.nth(Scene.all.role('button', { name: '+' }), 1)),
        Scene.expect(Scene.text('0')).toExist(),
        Scene.expect(Scene.text('1')).toExist(),
      ),
  )

  it.effect(
    'clicking - on a Counter dispatches through h.block and decrements',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given({
          counters: [
            CounterBlock.Instance.make({
              key: 'counter-0',
              model: { count: 3 },
            }),
          ],
          nextCounterId: 1,
        }),
        Scene.expect(Scene.text('3')).toExist(),
        Scene.click(Scene.role('button', { name: '-' })),
        Scene.expect(Scene.text('2')).toExist(),
      ),
  )

  it.effect('Add Counter creates a new instance with a fresh Counter', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: '+ Add Counter' })),
      Scene.expectAll(Scene.all.role('button', { name: 'Remove' })).toHaveCount(
        3,
      ),
      Scene.expectAll(Scene.all.text('0')).toHaveCount(3),
    ),
  )

  it.effect(
    'Remove deletes an instance and routes future events to surviving counters',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given({
          counters: [
            CounterBlock.Instance.make({
              key: 'counter-0',
              model: { count: 5 },
            }),
            CounterBlock.Instance.make({
              key: 'counter-1',
              model: { count: 10 },
            }),
          ],
          nextCounterId: 2,
        }),
        Scene.expect(Scene.text('5')).toExist(),
        Scene.expect(Scene.text('10')).toExist(),
        Scene.click(Scene.first(Scene.all.role('button', { name: 'Remove' }))),
        Scene.expectAll(
          Scene.all.role('button', { name: 'Remove' }),
        ).toHaveCount(1),
        Scene.expect(Scene.text('5')).not.toExist(),
        Scene.expect(Scene.text('10')).toExist(),
        Scene.click(Scene.role('button', { name: '+' })),
        Scene.expect(Scene.text('11')).toExist(),
      ),
  )
})
