import { Schema } from 'effect'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { Block, Story } from '../../../index.js'
import {
  FamilyBlock,
  FamilyMessage,
  NumberFamily,
  ValueFamily,
} from './familyFields.js'

it.effect(
  'initializes precise generic family Instances through their selected Layer',
  () =>
    Story.withBlock(FamilyBlock, executable => {
      const initial = executable.init()
      const added = executable.update(
        initial.model,
        FamilyMessage.ClickedAddValues({
          key: 'first',
          count: 4,
          label: 'Four',
        }),
      )

      expect(added.model.numbers).toEqual([
        { key: 'first', model: { value: 4 } },
      ])
      expect(added.model.strings).toEqual([
        { key: 'first', model: { value: 'Four' } },
      ])
      expect(added.commands).toBeUndefined()
    }),
)

it('rejects erased family members that replace the declared Instance Schema', () => {
  expect(() =>
    Reflect.apply(Block.makeFamilyContract, undefined, [
      NumberFamily.definition,
      ValueFamily,
      () => NumberFamily.recipe,
      { members: { Instance: Schema.String } },
    ]),
  ).toThrow('reserved')
})
