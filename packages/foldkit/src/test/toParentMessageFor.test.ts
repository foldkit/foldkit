import { Effect, Schema } from 'effect'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/public.js'
import * as Story from '../story/public.js'
import { modifyFields } from '../struct/public.js'
import { toParentMessageFor } from './toParentMessageFor.js'

const ChildKey = Symbol('ParentBoundDeliveryChild')
const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('ParentBoundDeliveryChild', {
  key: ChildKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ count: Schema.Number }),
  Message: ChildMessage,
})
const ChildComposition = ChildDefinition.makeComposition()
const Child = ChildDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: ChildDefinition.makeFieldsStep.fromMessage(({ count }) => ({
        count: () => count,
      })),
    }),
  }),
)
const ParentKey = Symbol('ParentBoundDeliveryParent')
const ParentDefinition = Block.makeDefinition('ParentBoundDeliveryParent', {
  key: ParentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    left: ChildDefinition.contract.Model,
    right: ChildDefinition.contract.Model,
    entries: Schema.Record(Schema.String, ChildDefinition.contract.Model),
  }),
  Message: Schema.Never,
})
const LeftBinding = ParentDefinition.makeRequiredFieldBinding(
  ChildDefinition.contract,
  {
    field: 'left',
  },
)
const RightBinding = ParentDefinition.makeRequiredFieldBinding(
  ChildDefinition.contract,
  {
    field: 'right',
  },
)
const EntryBinding = ParentDefinition.makeRecordBinding(
  ChildDefinition.contract,
  {
    field: 'entries',
  },
)
const UnregisteredBinding = ParentDefinition.makeRequiredFieldBinding(
  ChildDefinition.contract,
  { field: 'left', placement: 'Unregistered' },
)
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [LeftBinding, RightBinding, EntryBinding],
})
const Parent = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const left = yield* LeftBinding
    const right = yield* RightBinding
    const entries = yield* EntryBinding

    return {
      children: [left, right, entries],
      init: ParentComposition.makeInit(() => ({ model: { entries: {} } })),
      update: ParentComposition.makeUpdate({}),
    }
  }),
).provide(Child.layer)
const ForeignKey = Symbol('ParentBoundDeliveryForeign')
const ForeignDefinition = Block.makeDefinition('ParentBoundDeliveryForeign', {
  key: ForeignKey,
  InitArgs: Schema.Tuple([]),
  Model: ParentDefinition.Model,
  Message: Schema.Never,
})
const ForeignBinding = ForeignDefinition.makeRequiredFieldBinding(
  ChildDefinition.contract,
  {
    field: 'left',
  },
)
const TopKey = Symbol('ParentBoundDeliveryTop')
const TopDefinition = Block.makeDefinition('ParentBoundDeliveryTop', {
  key: TopKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ group: ParentDefinition.contract.Model }),
  Message: Schema.Never,
})
const GroupBinding = TopDefinition.makeRequiredFieldBinding(
  ParentDefinition.contract,
  {
    field: 'group',
  },
)
const TopComposition = TopDefinition.makeComposition({
  bindings: [GroupBinding],
})
const Top = TopDefinition.makeBlock(
  Effect.gen(function* () {
    const group = yield* GroupBinding

    return {
      children: [group],
      init: TopComposition.makeInit(() => ({ model: {} })),
      update: TopComposition.makeUpdate({}),
    }
  }),
).provide(Parent.layer)

describe('toParentMessageFor', () => {
  it.effect(
    'resolves nested child delivery inside a Model comparison group',
    () =>
      Effect.gen(function* () {
        const finalModel = yield* Story.story(
          Parent,
          Story.init(),
          Story.models(
            Story.steps(
              Story.messageIn(
                LeftBinding,
                ChildMessage.UpdatedCount({ count: 3 }),
              ),
            ),
            (before, after) => {
              expectTypeOf(before).toEqualTypeOf<typeof Parent.Model.Type>()
              expectTypeOf(after).toEqualTypeOf<typeof Parent.Model.Type>()
              expect(before.left.count).toBe(0)
              expect(after.left.count).toBe(3)
              expect(after.right).toBe(before.right)
            },
          ),
        )

        expectTypeOf(finalModel).toEqualTypeOf<typeof Parent.Model.Type>()
        expect(finalModel.left.count).toBe(3)
      }),
  )

  it.effect(
    'maps nested delivery against the selected child graph and retains provenance',
    () =>
      Effect.gen(function* () {
        const independentMessage = yield* Story.withBlock(Parent, parent =>
          toParentMessageFor(parent)(
            LeftBinding,
            ChildMessage.UpdatedCount({ count: 11 }),
          ),
        )

        yield* Story.withBlock(Top, top => {
          const toTopMessage = toParentMessageFor(top)
          const toGroupMessage = toParentMessageFor(top, GroupBinding)
          const topInit = top.init()
          const groupUpdate = top.update(
            topInit.model,
            toTopMessage(
              GroupBinding,
              toGroupMessage(
                LeftBinding,
                ChildMessage.UpdatedCount({ count: 5 }),
              ),
            ),
          )
          expect(groupUpdate.model.group.left.count).toBe(5)
          expect(groupUpdate.model.group.right.count).toBe(0)
          expect(() =>
            top.update(
              topInit.model,
              toTopMessage(GroupBinding, independentMessage),
            ),
          ).toThrow('another child Binding')
          expect(() =>
            Reflect.apply(toParentMessageFor, undefined, [top, LeftBinding]),
          ).toThrow()

          if (false) {
            // @ts-expect-error The selected child must belong to the acquired parent.
            toParentMessageFor(top, LeftBinding)
            toGroupMessage(
              // @ts-expect-error A child mapper cannot use its parent's Binding.
              GroupBinding,
              independentMessage,
            )
          }
        })
      }),
  )

  it.effect(
    'dispatches exact direct and keyed Messages into an acquired parent',
    () =>
      Story.withBlock(Parent, parent => {
        const toParentMessage = toParentMessageFor(parent)
        const parentInit = parent.init()
        const leftUpdate = parent.update(
          parentInit.model,
          toParentMessage(LeftBinding, ChildMessage.UpdatedCount({ count: 3 })),
        )
        expect(leftUpdate.model.left.count).toBe(3)
        expect(leftUpdate.model.right.count).toBe(0)

        const entriesModel = modifyFields(leftUpdate.model, {
          entries: () => ({ first: parentInit.model.left }),
        })
        const entryUpdate = parent.update(
          entriesModel,
          toParentMessage(
            EntryBinding,
            'first',
            ChildMessage.UpdatedCount({ count: 7 }),
          ),
        )
        expect(entryUpdate.model.entries['first']?.count).toBe(7)
        expect(entryUpdate.model.left.count).toBe(3)

        if (false) {
          // @ts-expect-error Only acquired test facades may bind private parent delivery.
          toParentMessageFor(Parent)
          toParentMessage(
            // @ts-expect-error A different parent's Binding cannot target this dispatch contract.
            ForeignBinding,
            ChildMessage.UpdatedCount({ count: 1 }),
          )
          // @ts-expect-error A keyed Binding requires its decoded key.
          toParentMessage(EntryBinding, ChildMessage.UpdatedCount({ count: 1 }))
          toParentMessage(
            EntryBinding,
            // @ts-expect-error A key must satisfy the original Record key contract.
            1,
            ChildMessage.UpdatedCount({ count: 1 }),
          )
          // @ts-expect-error A child Message retains its exact decoded payload.
          toParentMessage(LeftBinding, { _tag: 'UpdatedCount', count: 'one' })
        }
      }),
  )

  it.effect(
    'rejects erased foreign and unregistered Bindings and unacquired facades',
    () =>
      Story.withBlock(Parent, parent => {
        const toParentMessage = toParentMessageFor(parent)
        for (const binding of [ForeignBinding, UnregisteredBinding]) {
          expect(() =>
            Reflect.apply(toParentMessage, undefined, [
              binding,
              ChildMessage.UpdatedCount({ count: 1 }),
            ]),
          ).toThrow()
        }

        for (const facade of [Parent, { ...parent }]) {
          expect(() =>
            Reflect.apply(toParentMessageFor, undefined, [facade]),
          ).toThrow('requires an original acquired test Block')
        }

        expect(() =>
          Reflect.apply(toParentMessage, undefined, [
            EntryBinding,
            1,
            ChildMessage.UpdatedCount({ count: 1 }),
          ]),
        ).toThrow('key must be a decoded value')
      }),
  )
})
