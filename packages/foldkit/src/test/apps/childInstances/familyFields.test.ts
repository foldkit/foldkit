import { Effect, Schema } from 'effect'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { Block, Story } from '../../../index.js'
import {
  makeFamilyDeclaration,
  resolveFamily,
} from '../../../internal/block/public.js'
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

it('rejects erased layer-family conveniences that replace the ready Instance Schema', () => {
  const LayerFamilyInstanceReviewKey = Symbol('LayerFamilyInstanceReview')
  const Definition = makeFamilyDeclaration('LayerFamilyInstanceReview', {
    key: LayerFamilyInstanceReviewKey,
    Model: Schema.Number,
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  })
  const Composition = Definition.makeComposition()
  const implementation = Definition.makeLayer(
    Effect.succeed({
      children: [],
      init: Composition.makeInit(() => ({ model: 0 })),
      update: Composition.makeUpdate({}),
    }),
  )

  expect(() =>
    Reflect.apply(resolveFamily, undefined, [
      Definition,
      ValueFamily,
      () => implementation,
      { members: { Instance: Schema.String } },
    ]),
  ).toThrow('reserved')
})
