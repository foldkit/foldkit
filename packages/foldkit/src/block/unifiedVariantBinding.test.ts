import { Effect, Layer, Schema } from 'effect'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import { defineMessageUnion } from '../message/public.js'
import { withBlock } from '../story/public.js'
import * as Block from './public.js'

const Active = Schema.Struct({
  _tag: Schema.Literal('Active'),
  count: Schema.Number,
})
const Inactive = Schema.Struct({
  _tag: Schema.Literal('Inactive'),
  reason: Schema.String,
})
const Model = Schema.Union([Active, Inactive])
const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  RequestedNotify: {},
})
const ChildOutMessage = defineMessageUnion({
  Notified: { count: Schema.Number },
})
const Message = defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  RequestedNotify: {},
})
const OutMessage = defineMessageUnion({
  Notified: { count: Schema.Number },
})
const ChildKey = Symbol('UnifiedActiveVariant')
const ChildBlock = Block.make('UnifiedActiveVariant', {
  key: ChildKey,
  Model: Active,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  InitArgs: Schema.Tuple([Schema.Number]),
  operations: {
    setCount: ChildMessage.UpdatedCount,
    notify: {
      message: ChildMessage.RequestedNotify,
      outMessage: ChildOutMessage.Notified,
    },
  },
})
const ChildComposition = ChildBlock.makeComposition()
const childLayer = ChildBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init: ChildComposition.makeInit(count => ({
        model: Active.make({ _tag: 'Active', count }),
      })),
      update: ChildComposition.makeUpdate({
        UpdatedCount: ChildBlock.makeFieldsStep.fromMessage(({ count }) => ({
          count: () => count,
        })),
        RequestedNotify: ChildBlock.makeOutMessageStep(model =>
          ChildOutMessage.Notified({ count: model.count }),
        ),
      }),
    }
  }),
)
const ParentKey = Symbol('UnifiedVariantParent')
const ParentBlock = Block.make('UnifiedVariantParent', {
  key: ParentKey,
  Model,
  Message,
  OutMessage,
  InitArgs: Schema.Tuple([Schema.Number]),
})
const ActiveBinding = ParentBlock.makeVariantBinding(
  ChildBlock,
).withOutMessagePolicy({
  fold: ParentBlock.makeOutMessageFold(ChildBlock, {
    Notified: ({ count }) =>
      ParentBlock.makeOutMessageStep(() => OutMessage.Notified({ count })),
  }),
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ActiveBinding],
})
const layer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const active = yield* ActiveBinding

    return {
      children: [active],
      init: ParentComposition.makeInit(count =>
        ActiveBinding.init({
          args: [count],
          toParentModel: child => child,
        }),
      ),
      update: ParentComposition.makeUpdate({
        RequestedSetCount: (model, { count }) =>
          ActiveBinding.setCount({ count })(model),
        RequestedNotify: ActiveBinding.notify(),
      }),
    }
  }),
).pipe(Layer.provide(childLayer))

describe('whole-variant storage through a unified Block', () => {
  it.effect('initializes, routes operations and folds the active child', () =>
    withBlock({ block: ParentBlock, layer }, executable => {
      const parentInit = executable.init(2)
      const setCount = executable.update(
        parentInit.model,
        Message.RequestedSetCount({ count: 8 }),
      )
      const notify = executable.update(
        setCount.model,
        Message.RequestedNotify(),
      )

      expect(parentInit.model).toEqual(
        Active.make({ _tag: 'Active', count: 2 }),
      )
      expect(setCount.model).toEqual(Active.make({ _tag: 'Active', count: 8 }))
      expect(notify.model).toBe(setCount.model)
      expect(notify.outMessage).toEqual(OutMessage.Notified({ count: 8 }))
      expectTypeOf(parentInit.model).toEqualTypeOf<typeof Model.Type>()

      const inactive = Inactive.make({ _tag: 'Inactive', reason: 'Signed out' })
      const ignored = executable.update(
        inactive,
        Message.RequestedSetCount({ count: 4 }),
      )

      expect(ignored.model).toBe(inactive)
    }),
  )

  it('preserves exact variant and parent ownership checks', () => {
    const UnrelatedKey = Symbol('UnrelatedVariantParent')
    const UnrelatedBlock = Block.make('UnrelatedVariantParent', {
      key: UnrelatedKey,
      Model,
      Message,
      OutMessage,
      InitArgs: Schema.Tuple([Schema.Number]),
    })
    const NarrowKey = Symbol('NarrowVariantParent')
    const NarrowBlock = Block.make('NarrowVariantParent', {
      key: NarrowKey,
      Model: Schema.Union([
        Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.String }),
        Inactive,
      ]),
      Message,
      InitArgs: Schema.Tuple([]),
    })

    if (false) {
      // @ts-expect-error The relationship belongs to its original parent.
      UnrelatedBlock.makeComposition({ bindings: [ActiveBinding] })
      // @ts-expect-error A child must equal the complete selected parent variant.
      NarrowBlock.makeVariantBinding(ChildBlock)
      // @ts-expect-error Child startup arguments retain their exact tuple.
      ActiveBinding.init({ args: ['2'], toParentModel: child => child })
      // @ts-expect-error The bound operation retains the exact Message payload.
      ActiveBinding.setCount({ count: '8' })
    }

    expectTypeOf(ActiveBinding.setCount)
      .parameter(0)
      .toHaveProperty('count')
      .toEqualTypeOf<number>()
  })
})
