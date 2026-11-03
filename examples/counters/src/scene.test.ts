import {
  all,
  click,
  expect,
  expectAll,
  first,
  given,
  nth,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model as ModelSchema } from './application'
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
    scene(
      ApplicationBlock,
      given(initialModel),
      expectAll(all.role('button', { name: '+' })).toHaveCount(2),
      expectAll(all.role('button', { name: '-' })).toHaveCount(2),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(2),
    ),
  )

  it.effect(
    'clicking + on a Counter dispatches through h.block back to the right instance',
    () =>
      scene(
        ApplicationBlock,
        given(initialModel),
        expectAll(all.text('0')).toHaveCount(2),
        click(nth(all.role('button', { name: '+' }), 1)),
        expect(text('0')).toExist(),
        expect(text('1')).toExist(),
      ),
  )

  it.effect(
    'clicking - on a Counter dispatches through h.block and decrements',
    () =>
      scene(
        ApplicationBlock,
        given({
          counters: [
            CounterBlock.Instance.make({
              key: 'counter-0',
              model: { count: 3 },
            }),
          ],
          nextCounterId: 1,
        }),
        expect(text('3')).toExist(),
        click(role('button', { name: '-' })),
        expect(text('2')).toExist(),
      ),
  )

  it.effect('Add Counter creates a new instance with a fresh Counter', () =>
    scene(
      ApplicationBlock,
      given(initialModel),
      click(role('button', { name: '+ Add Counter' })),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(3),
      expectAll(all.text('0')).toHaveCount(3),
    ),
  )

  it.effect(
    'Remove deletes an instance and routes future events to surviving counters',
    () =>
      scene(
        ApplicationBlock,
        given({
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
        expect(text('5')).toExist(),
        expect(text('10')).toExist(),
        click(first(all.role('button', { name: 'Remove' }))),
        expectAll(all.role('button', { name: 'Remove' })).toHaveCount(1),
        expect(text('5')).not.toExist(),
        expect(text('10')).toExist(),
        click(role('button', { name: '+' })),
        expect(text('11')).toExist(),
      ),
  )
})
