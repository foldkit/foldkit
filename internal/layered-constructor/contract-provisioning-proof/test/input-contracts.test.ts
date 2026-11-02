import { Effect, Option } from 'effect'
import { Scene, withBlock } from 'foldkit/experimental/layered/testing'
import { expect, test } from 'vitest'

import { FormattedBlock, StringItemBlock } from '../src/input-contracts'

test('mapped operation defaults remain passive and apply when invoked', () =>
  Effect.runPromise(
    withBlock(StringItemBlock, block => {
      const initial = block.init({ initialCount: 2 })
      const incremented = block.operations.increment(initial.model)
      const incrementedAgain = block.operations.increment(incremented.model, 4)
      const selected = block.operations.select(
        incrementedAgain.model,
        'alpha',
        item => item.toUpperCase(),
      )

      expect(initial.model.count).toBe(2)
      expect(incremented.model.count).toBe(3)
      expect(incrementedAgain.model.count).toBe(7)
      expect(selected.model.maybeSelectedKey).toEqual(Option.some('ALPHA'))
    }),
  ))

test('callback-rich inputs render through the declared generic contract', () =>
  Effect.runPromise(
    Scene.scene(
      {
        block: StringItemBlock,
        viewInputs: {
          items: ['alpha'],
          itemToKey: item => item,
          itemToText: item => item.toUpperCase(),
        },
      },
      Scene.init({ initialCount: 2 }),
      Scene.expect(Scene.role('status')).toHaveText('ALPHA'),
    ),
  ))

test('tuple operations map positional inputs to exact dispatch Context', () =>
  Effect.runPromise(
    withBlock(FormattedBlock, block => {
      const initial = block.init()
      const formatted = block.operations.format(initial.model, 5, {
        format: count => `Count: ${count}`,
      })

      expect(formatted.model.text).toBe('Count: 5')
    }),
  ))
