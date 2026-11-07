import { Effect, Layer, Schema } from 'effect'
import { expect, it } from 'vitest'

import * as Block from '../../block/public.js'
import { resolveProgramRoot } from '../../runtime/rootBlock.js'
import { selectLayer } from './runtime.js'

const LegacyChildKey = Symbol('MixedLegacyChild')
const LegacyChildDefinition = Block.makeDefinition('MixedLegacyChild', {
  key: LegacyChildKey,
  Model: Schema.Number,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const LegacyChild = LegacyChildDefinition.contract
const LegacyChildComposition = LegacyChildDefinition.makeComposition()
const legacyChildLayer = LegacyChildDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: LegacyChildComposition.makeInit(() => ({ model: 7 })),
    update: LegacyChildComposition.makeUpdate({}),
  }),
).layer

const UnifiedParentKey = Symbol('MixedUnifiedParent')
const UnifiedParent = Block.make('MixedUnifiedParent', {
  key: UnifiedParentKey,
  Model: Schema.Struct({ child: LegacyChild.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const LegacyChildBinding = UnifiedParent.makeRequiredFieldBinding(LegacyChild, {
  field: 'child',
})
const UnifiedParentComposition = UnifiedParent.makeComposition({
  bindings: [LegacyChildBinding],
})
const unifiedParentLayer = UnifiedParent.makeLayer(
  Effect.gen(function* () {
    const child = yield* LegacyChildBinding
    return {
      children: [child],
      init: UnifiedParentComposition.makeInit(() => ({ model: {} })),
      update: UnifiedParentComposition.makeUpdate({}),
    }
  }),
).pipe(Layer.provide(legacyChildLayer))

const UnifiedChildKey = Symbol('MixedUnifiedChild')
const UnifiedChild = Block.make('MixedUnifiedChild', {
  key: UnifiedChildKey,
  Model: Schema.Number,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const UnifiedChildComposition = UnifiedChild.makeComposition()
const unifiedChildLayer = UnifiedChild.makeLayer(
  Effect.succeed({
    children: [],
    init: UnifiedChildComposition.makeInit(() => ({ model: 9 })),
    update: UnifiedChildComposition.makeUpdate({}),
  }),
)
const LegacyParentKey = Symbol('MixedLegacyParent')
const LegacyParent = Block.makeDefinition('MixedLegacyParent', {
  key: LegacyParentKey,
  Model: Schema.Struct({ child: UnifiedChild.Model }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const UnifiedChildBinding = LegacyParent.makeRequiredFieldBinding(
  UnifiedChild,
  {
    field: 'child',
  },
)
const LegacyParentComposition = LegacyParent.makeComposition({
  bindings: [UnifiedChildBinding],
})
const legacyParent = LegacyParent.makeBlock(
  Effect.gen(function* () {
    const child = yield* UnifiedChildBinding
    return {
      children: [child],
      init: LegacyParentComposition.makeInit(() => ({ model: {} })),
      update: LegacyParentComposition.makeUpdate({}),
    }
  }),
).provide(unifiedChildLayer)

it('unified parent consumes the exact legacy public contract', async () => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const parent = yield* resolveProgramRoot(
          selectLayer(UnifiedParent, unifiedParentLayer),
        )
        expect(parent.init().model).toEqual({ child: 7 })
      }),
    ),
  )
})

it('legacy parent consumes the exact unified public Block', async () => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const parent = yield* legacyParent.get
        expect(parent.init().model).toEqual({ child: 9 })
      }),
    ).pipe(Effect.provide(legacyParent.layer)),
  )
})

import * as Story from '../../story/public.js'
import { makeDefinition as makeLayeredDefinition } from '../layered/runtime.js'

it('retains the wrapped executable when a legacy Layered root enters a pure runner', async () => {
  const Definition = makeLayeredDefinition('MixedLayeredPureRoot', {
    Model: Schema.Number,
    Message: Schema.Never,
  })
  const Composition = Definition.makeComposition()
  const block = Definition.makeBlock(
    Effect.succeed({
      children: [],
      init: Composition.makeInit(() => ({ model: 12 })),
      update: Composition.makeUpdate({}),
    }),
  )
  await Effect.runPromise(
    Story.withBlock(block, executable => {
      expect(executable.init().model).toBe(12)
    }),
  )
})
