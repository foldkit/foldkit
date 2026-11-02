import { Context, Effect, Layer, Schema } from 'effect'
import { expect, it } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import { withBlock } from '../layered/testing/withBlock.js'

const Model = Schema.Struct({ value: Schema.Number })
const InMessage = defineMessageUnion({ RequestedSet: { value: Schema.Number } })
const OtherInMessage = defineMessageUnion({ RequestedOther: {} })
const FamilyInputKey = Symbol('FamilyInputReview')
const Definition = Block.makeFamilyDefinition('FamilyInputReview', {
  key: FamilyInputKey,
  Model,
  Message: Schema.Never,
  InMessage,
  isMessageFree: true,
  Init: Schema.Tuple([]),
})
const Composition = Definition.makeComposition()
const recipe = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit(() => ({ model: { value: 0 } })),
    update: Composition.makeUpdate({}),
    receive: Composition.makeReceive({
      RequestedSet: Definition.makeFieldsStep.fromMessage(({ value }) => ({
        value: () => value,
      })),
    }),
  }),
)

class InputFamily extends Context.Service<InputFamily, Block.FamilyLifetime>()(
  'FamilyInputReview/Family',
) {}

const FamilyLayer = Layer.effect(InputFamily)(Block.familyLifetime)
const InputBlock = Block.makeFamilyContract(
  Definition,
  InputFamily,
  () => recipe,
)

it('retains the declared InMessage Schema on a passive family contract', async () => {
  expect(InputBlock.InMessage).toBe(InMessage)

  await Effect.runPromise(
    withBlock(InputBlock, block => {
      const initialized = block.init()
      const requested = InputBlock.InMessage.RequestedSet({ value: 4 })

      expect(block.InMessage).toBe(InputBlock.InMessage)
      expect(block.receive(initialized.model, requested).model.value).toBe(4)
    }).pipe(Effect.provide(FamilyLayer)),
  )
})

it('rejects family members that override the declared input protocol', () => {
  expect(() =>
    Reflect.apply(Block.makeFamilyContract, undefined, [
      Definition,
      InputFamily,
      () => recipe,
      { members: { InMessage: OtherInMessage } },
    ]),
  ).toThrow('reserved')

  if (false) {
    Block.makeFamilyContract(
      Definition,
      InputFamily,
      // @ts-expect-error The input Schema is owned by the family Definition.
      () => recipe,
      { members: { InMessage: OtherInMessage } },
    )
  }
})
