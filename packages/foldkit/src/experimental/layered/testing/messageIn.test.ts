import { Effect, Layer, Schema } from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
import { modifyFields } from '../../../struct/index.js'
import * as Story from './story.js'

const LeafModel = Schema.Struct({ count: Schema.Number })
const LeafMessage = defineMessageUnion({
  RequestedIncrement: {},
  CompletedRememberCount: {},
})
const LeafOutMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
const LeafKey = Symbol('StoryMessageInPathLeaf')
const LeafBlock = Block.make('StoryMessageInPathLeaf', {
  key: LeafKey,
  Model: LeafModel,
  Message: LeafMessage,
  OutMessage: LeafOutMessage,
  InitArgs: Schema.Tuple([]),
})
const RememberCount = LeafBlock.makeCommand('RememberCount', {
  args: { count: Schema.Number },
  messages: [LeafMessage.CompletedRememberCount],
  handler: function* () {
    return () => Effect.succeed(LeafMessage.CompletedRememberCount())
  },
})
const LeafComposition = LeafBlock.makeComposition()
const makeLeafLayer = (incrementBy: number) =>
  LeafBlock.makeLayer(
    Effect.succeed({
      children: [],
      init: LeafComposition.makeInit(() => ({
        model: LeafModel.make({ count: 0 }),
      })),
      update: LeafComposition.makeUpdate({
        RequestedIncrement: model => {
          const nextCount = model.count + incrementBy

          return {
            model: modifyFields(model, { count: () => nextCount }),
            commands: [RememberCount({ count: nextCount })],
            outMessage: LeafOutMessage.ChangedCount({ count: nextCount }),
          }
        },
        CompletedRememberCount: model => ({ model }),
      }),
      EffectsLayer: RememberCount.layer,
    }),
  )

const MiddleModel = Schema.Struct({
  leaves: Schema.Record(Schema.String, LeafModel),
  foldedCount: Schema.Number,
})
const MiddleKey = Symbol('StoryMessageInPathMiddle')
const MiddleBlock = Block.make('StoryMessageInPathMiddle', {
  key: MiddleKey,
  Model: MiddleModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const foldLeafOutMessage = MiddleBlock.makeOutMessageFold(LeafBlock, {
  ChangedCount: ({ count }) =>
    MiddleBlock.makeFieldsStep(() => ({ foldedCount: () => count })),
})
const LeavesBinding = MiddleBlock.makeRecordBinding(LeafBlock, {
  field: 'leaves',
}).withOutMessagePolicy({ fold: foldLeafOutMessage })
const MiddleComposition = MiddleBlock.makeComposition({
  bindings: [LeavesBinding],
})
const makeMiddleLayer = (leafLayer: ReturnType<typeof makeLeafLayer>) =>
  MiddleBlock.makeLayer(
    Effect.gen(function* () {
      const leaves = yield* LeavesBinding

      return {
        children: [leaves],
        init: MiddleComposition.makeInit(() => ({
          model: MiddleModel.make({
            leaves: { first: LeafModel.make({ count: 0 }) },
            foldedCount: 0,
          }),
        })),
        update: MiddleComposition.makeUpdate({}),
      }
    }),
  ).pipe(Layer.provide(leafLayer))

const RootModel = Schema.Struct({
  middle: MiddleModel,
  isMiddleActive: Schema.Boolean,
})
const RootKey = Symbol('StoryMessageInPathRoot')
const RootBlock = Block.make('StoryMessageInPathRoot', {
  key: RootKey,
  Model: RootModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Schema.Boolean]),
})
const MiddleBinding = RootBlock.makeRequiredFieldBinding(MiddleBlock, {
  field: 'middle',
  activeWhen: model => model.isMiddleActive,
})
const RootComposition = RootBlock.makeComposition({
  bindings: [MiddleBinding],
})
const makeRootLayer = (leafLayer: ReturnType<typeof makeLeafLayer>) =>
  RootBlock.makeLayer(
    Effect.gen(function* () {
      const middle = yield* MiddleBinding

      return {
        children: [middle],
        init: RootComposition.makeInit((isMiddleActive: boolean) => ({
          model: { isMiddleActive },
        })),
        update: RootComposition.makeUpdate({}),
      }
    }),
  ).pipe(Layer.provide(makeMiddleLayer(leafLayer)))

const ForeignMiddleKey = Symbol('StoryMessageInPathForeignMiddle')
const ForeignMiddleBlock = Block.make('StoryMessageInPathForeignMiddle', {
  key: ForeignMiddleKey,
  Model: MiddleModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const ForeignLeavesBinding = ForeignMiddleBlock.makeRecordBinding(LeafBlock, {
  field: 'leaves',
})

const rootModel = (isMiddleActive: boolean): typeof RootModel.Type =>
  RootModel.make({
    middle: MiddleModel.make({
      leaves: { first: LeafModel.make({ count: 0 }) },
      foldedCount: 0,
    }),
    isMiddleActive,
  })

describe('Story.messageIn Binding paths', () => {
  it.effect(
    'routes through the selected graph and retains child Commands and OutMessage folds',
    () =>
      Story.story(
        { block: RootBlock, layer: makeRootLayer(makeLeafLayer(5)) },
        Story.given(rootModel(true)),
        Story.messageIn(
          [MiddleBinding, { binding: LeavesBinding, key: 'first' }],
          LeafMessage.RequestedIncrement(),
        ),
        Story.Command.expectExact(RememberCount({ count: 5 })),
        Story.model(model => {
          expect(model.middle.leaves).toEqual({ first: { count: 5 } })
          expect(model.middle.foldedCount).toBe(5)
        }),
        Story.Command.resolve(
          RememberCount({ count: 5 }),
          LeafMessage.CompletedRememberCount(),
        ),
      ),
  )

  it.effect('keeps a missing keyed occurrence as an ordinary no-op', () =>
    Story.story(
      { block: RootBlock, layer: makeRootLayer(makeLeafLayer(5)) },
      Story.given(rootModel(true)),
      Story.messageIn(
        [MiddleBinding, { binding: LeavesBinding, key: 'missing' }],
        LeafMessage.RequestedIncrement(),
      ),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.middle.leaves).toEqual({ first: { count: 0 } })
        expect(model.middle.foldedCount).toBe(0)
      }),
    ),
  )

  it.effect(
    'keeps an inactive intermediate occurrence as an ordinary no-op',
    () =>
      Story.story(
        { block: RootBlock, layer: makeRootLayer(makeLeafLayer(5)) },
        Story.given(rootModel(false)),
        Story.messageIn(
          [MiddleBinding, { binding: LeavesBinding, key: 'first' }],
          LeafMessage.RequestedIncrement(),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.middle.leaves).toEqual({ first: { count: 0 } })
          expect(model.middle.foldedCount).toBe(0)
        }),
      ),
  )

  it('rejects a path whose nested Binding is absent from the selected graph', async () => {
    const step = Reflect.apply(Story.messageIn, undefined, [
      [MiddleBinding, { binding: ForeignLeavesBinding, key: 'first' }],
      LeafMessage.RequestedIncrement(),
    ])

    await expect(
      Effect.runPromise(
        Reflect.apply(Story.story, undefined, [
          { block: RootBlock, layer: makeRootLayer(makeLeafLayer(5)) },
          Story.given(rootModel(true)),
          step,
        ]),
      ),
    ).rejects.toThrow('path element 2')
  })

  it('rejects erased invalid keys and leaf Messages', async () => {
    const invalidKey = Reflect.apply(Story.messageIn, undefined, [
      [MiddleBinding, { binding: LeavesBinding, key: 1 }],
      LeafMessage.RequestedIncrement(),
    ])
    const invalidMessage = Reflect.apply(Story.messageIn, undefined, [
      [MiddleBinding, { binding: LeavesBinding, key: 'first' }],
      { _tag: 'Wrong' },
    ])
    const run = (step: unknown) =>
      Effect.runPromise(
        Reflect.apply(Story.story, undefined, [
          { block: RootBlock, layer: makeRootLayer(makeLeafLayer(5)) },
          Story.given(rootModel(true)),
          step,
        ]),
      )

    await expect(run(invalidKey)).rejects.toThrow('key must be a decoded value')
    await expect(run(invalidMessage)).rejects.toThrow(
      'child Message must be a decoded value',
    )
  })
})
