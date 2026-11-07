import { Effect, Layer, Option, Schema } from 'effect'
import { beforeEach, describe, expect, vi } from 'vitest'

import { it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import { withBlock } from '../story/public.js'
import { makeInitIfMissingStep } from './mapInitialization.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({
  source: Schema.String,
  count: Schema.Number,
})
const ChildKey = Symbol('ProducedInitializationLayerChild')
const ChildBlock = Block.make('ProducedInitializationLayerChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([Schema.Number]),
})
const ChildComposition = ChildBlock.makeComposition()
const defaultInitialized = vi.fn<(count: number) => void>()
const alternativeInitialized = vi.fn<(count: number) => void>()
const makeChildLayer = (source: string, initialized: (count: number) => void) =>
  ChildBlock.makeLayer(
    Effect.succeed({
      children: [],
      init: ChildComposition.makeInit(count => {
        initialized(count)
        return { model: { source, count } }
      }),
      update: ChildComposition.makeUpdate({}),
    }),
  )
const defaultChildLayer = makeChildLayer('default', defaultInitialized)
const alternativeChildLayer = makeChildLayer(
  'alternative',
  alternativeInitialized,
)

const ParentModel = Schema.Struct({
  children: Schema.Record(Schema.String, ChildModel),
  nextKey: Schema.String,
  nextCount: Schema.Number,
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({ RequestedInitChild: {} })
const ParentKey = Symbol('ProducedInitializationLayerParent')
const ParentBlock = Block.make('ProducedInitializationLayerParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  InitArgs: Schema.Tuple([Schema.String, Schema.Number]),
})
const ChildrenBinding = ParentBlock.makeRecordBinding(ChildBlock, {
  field: 'children',
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildrenBinding],
})
const produced = vi.fn<(model: ParentModel) => void>()
const initChild = makeInitIfMissingStep(ChildrenBinding, model => {
  produced(model)

  return Option.some({ key: model.nextKey, args: [model.nextCount] })
})
const parentLayer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ChildrenBinding

    return {
      children: [children],
      init: ParentComposition.makeInit((nextKey, nextCount) => ({
        model: { children: {}, nextKey, nextCount },
      })),
      update: ParentComposition.makeUpdate({
        RequestedInitChild: initChild,
      }),
    }
  }),
)
const defaultLayer = parentLayer.pipe(Layer.provide(defaultChildLayer))
const alternativeLayer = parentLayer.pipe(Layer.provide(alternativeChildLayer))

beforeEach(() => {
  defaultInitialized.mockClear()
  alternativeInitialized.mockClear()
  produced.mockClear()
})

describe('produced map initialization through Block Layers', () => {
  it.effect(
    'resolves the constructor-owned Binding against each selected child implementation',
    () =>
      Effect.gen(function* () {
        yield* withBlock(
          { block: ParentBlock, layer: defaultLayer },
          executable => {
            const initial = executable.init('first', 3).model

            expect(produced).not.toHaveBeenCalled()
            expect(defaultInitialized).not.toHaveBeenCalled()

            const inserted = executable.update(
              initial,
              ParentMessage.RequestedInitChild(),
            )

            expect(Reflect.get(inserted.model.children, 'first')).toEqual({
              source: 'default',
              count: 3,
            })
            expect(produced).toHaveBeenCalledExactlyOnceWith(initial)
          },
        )

        produced.mockClear()

        yield* withBlock(
          { block: ParentBlock, layer: alternativeLayer },
          executable => {
            const initial = executable.init('second', 7).model

            expect(produced).not.toHaveBeenCalled()
            expect(alternativeInitialized).not.toHaveBeenCalled()

            const inserted = executable.update(
              initial,
              ParentMessage.RequestedInitChild(),
            )

            expect(Reflect.get(inserted.model.children, 'second')).toEqual({
              source: 'alternative',
              count: 7,
            })
            expect(produced).toHaveBeenCalledExactlyOnceWith(initial)
          },
        )

        expect(defaultInitialized).toHaveBeenCalledExactlyOnceWith(3)
        expect(alternativeInitialized).toHaveBeenCalledExactlyOnceWith(7)
      }),
  )
})
