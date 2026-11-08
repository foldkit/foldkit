import { Effect, Layer, Schema, Stream } from 'effect'
import { describe, expect, vi } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
import { modifyFields } from '../../../struct/index.js'
import * as CoreStory from '../../../test/story.js'
import * as Scene from './scene.js'
import * as Story from './story.js'

const LeafModel = Schema.Struct({ count: Schema.Number })
const LeafMessage = defineMessageUnion({
  ObservedPulse: { count: Schema.NumberFromString },
})
const LeafOutMessage = defineMessageUnion({
  ObservedPulse: { count: Schema.Number },
})
const LeafKey = Symbol('StorySubscriptionLeaf')
const LeafBlock = Block.make('StorySubscriptionLeaf', {
  key: LeafKey,
  Model: LeafModel,
  Message: LeafMessage,
  OutMessage: LeafOutMessage,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const leafHandlerConstructed = vi.fn()
const leafSubscriptions = LeafBlock.makeSubscriptions(entry => ({
  pulses: entry('Pulses', {
    messages: [LeafMessage.ObservedPulse],
    handler: function* () {
      leafHandlerConstructed()

      return () => Stream.never
    },
  }),
  silent: entry('Silent', {
    messages: [],
    handler: function* () {
      leafHandlerConstructed()

      return () => Stream.never
    },
  }),
}))
const SameNameForeignLeafKey = Symbol('StorySubscriptionSameNameForeignLeaf')
const SameNameForeignLeafBlock = Block.make('StorySubscriptionLeaf', {
  key: SameNameForeignLeafKey,
  Model: LeafModel,
  Message: LeafMessage,
  OutMessage: LeafOutMessage,
  InitArgs: Schema.Tuple([]),
})
const sameNameForeignLeafSubscriptions =
  SameNameForeignLeafBlock.makeSubscriptions(entry => ({
    pulses: entry('ForeignPulses', {
      messages: [LeafMessage.ObservedPulse],
      handler: function* () {
        return () => Stream.never
      },
    }),
  }))
const LeafComposition = LeafBlock.makeComposition()
const leafLayer = LeafBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: LeafComposition.makeInit(() => ({
      model: LeafModel.make({ count: 0 }),
    })),
    update: LeafComposition.makeUpdate({
      ObservedPulse: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
        outMessage: LeafOutMessage.ObservedPulse({ count }),
      }),
    }),
    subscriptions: leafSubscriptions,
    EffectsLayer: leafSubscriptions.layer,
  }),
)

const RootModel = Schema.Struct({
  left: LeafModel,
  right: LeafModel,
  rootPulses: Schema.Number,
  childPulses: Schema.Number,
  workCompletions: Schema.Number,
})
type RootModel = typeof RootModel.Type
const RootMessage = defineMessageUnion({
  ObservedRootPulse: {},
  StartedWork: {},
  CompletedWork: {},
})
const RootKey = Symbol('StorySubscriptionRoot')
const RootBlock = Block.make('StorySubscriptionRoot', {
  key: RootKey,
  Model: RootModel,
  Message: RootMessage,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const Work = RootBlock.makeCommand('Work', {
  messages: [RootMessage.CompletedWork],
  handler: function* () {
    return () => Effect.succeed(RootMessage.CompletedWork())
  },
})
const rootHandlerConstructed = vi.fn()
const rootSubscriptions = RootBlock.makeSubscriptions(entry => ({
  pulses: entry('RootPulses', {
    messages: [RootMessage.ObservedRootPulse],
    handler: function* () {
      rootHandlerConstructed()

      return () => Stream.never
    },
  }),
}))
const foldLeafOutMessage = RootBlock.makeOutMessageFold(LeafBlock, {
  ObservedPulse: () =>
    RootBlock.makeFieldsStep(() => ({
      childPulses: count => count + 1,
    })),
})
const LeftBinding = RootBlock.makeRequiredFieldBinding(LeafBlock, {
  field: 'left',
}).withOutMessagePolicy({ fold: foldLeafOutMessage })
const RightBinding = RootBlock.makeRequiredFieldBinding(LeafBlock, {
  field: 'right',
}).withOutMessagePolicy({ fold: foldLeafOutMessage })
const RootComposition = RootBlock.makeComposition({
  bindings: [LeftBinding, RightBinding],
})
const rootInit = RootComposition.makeInit(() => ({
  model: {
    rootPulses: 0,
    childPulses: 0,
    workCompletions: 0,
  },
}))
const rootUpdate = RootComposition.makeUpdate({
  ObservedRootPulse: model => ({
    model: modifyFields(model, {
      rootPulses: count => count + 1,
    }),
  }),
  StartedWork: model => ({ model, commands: [Work()] }),
  CompletedWork: model => ({
    model: modifyFields(model, {
      workCompletions: count => count + 1,
    }),
  }),
})
const RootEffectsLayer = Layer.merge(rootSubscriptions.layer, Work.layer)
const rootLayer = RootBlock.makeLayer({
  init: rootInit,
  update: rootUpdate,
  subscriptions: rootSubscriptions,
  EffectsLayer: RootEffectsLayer,
}).pipe(Layer.provide(leafLayer))

const initialModel = RootModel.make({
  left: LeafModel.make({ count: 0 }),
  right: LeafModel.make({ count: 10 }),
  rootPulses: 0,
  childPulses: 0,
  workCompletions: 0,
})

const ShellModel = Schema.Struct({ root: RootModel })
const ShellKey = Symbol('StorySubscriptionShell')
const ShellBlock = Block.make('StorySubscriptionShell', {
  key: ShellKey,
  Model: ShellModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: false,
})
const RootBinding = ShellBlock.makeRequiredFieldBinding(RootBlock, {
  field: 'root',
})
const ShellComposition = ShellBlock.makeComposition({
  bindings: [RootBinding],
})
const shellLayer = ShellBlock.makeLayer(
  Effect.gen(function* () {
    const root = yield* RootBinding

    return {
      children: [root],
      init: ShellComposition.makeInit(() => ({ model: {} })),
      update: ShellComposition.makeUpdate({}),
    }
  }),
).pipe(Layer.provide(rootLayer))

describe('Story Subscription delivery through a Block graph', () => {
  it.effect(
    'delivers a root Subscription source without executing its handler',
    () =>
      Effect.gen(function* () {
        yield* Story.story(
          { block: RootBlock, layer: rootLayer },
          Story.given(initialModel),
          Story.Subscription.emit(
            rootSubscriptions.pulses,
            RootMessage.ObservedRootPulse(),
          ),
          Story.model(model => {
            expect(model.rootPulses).toBe(1)
          }),
        )

        expect(rootHandlerConstructed).not.toHaveBeenCalled()
      }),
  )

  it.effect(
    'selects one reused child placement, retains its OutMessage fold, and leaves unrelated Commands pending',
    () =>
      Effect.gen(function* () {
        const rightPulses = Story.Subscription.at(
          [RightBinding],
          leafSubscriptions.pulses,
        )

        yield* Story.story(
          { block: RootBlock, layer: rootLayer },
          Story.given(initialModel),
          Story.message(RootMessage.StartedWork()),
          Story.steps(
            Story.steps(
              Story.Subscription.emit(
                rightPulses,
                LeafMessage.ObservedPulse({ count: 12 }),
              ),
            ),
          ),
          Story.Command.expectExact(Work),
          Story.model(model => {
            expect(model.left.count).toBe(0)
            expect(model.right.count).toBe(12)
            expect(model.childPulses).toBe(1)
            expect(model.workCompletions).toBe(0)
          }),
          Story.Command.resolve(Work, RootMessage.CompletedWork()),
          Story.model(model => {
            expect(model.workCompletions).toBe(1)
          }),
        )

        expect(leafHandlerConstructed).not.toHaveBeenCalled()
      }),
  )

  it.effect('accepts the concise static Binding selector', () =>
    Story.story(
      { block: RootBlock, layer: rootLayer },
      Story.given(initialModel),
      Story.Subscription.emit(
        Story.Subscription.at(LeftBinding, leafSubscriptions.pulses),
        LeafMessage.ObservedPulse({ count: 3 }),
      ),
      Story.model(model => {
        expect(model.left.count).toBe(3)
        expect(model.right.count).toBe(10)
      }),
    ),
  )

  it.effect('routes through a checked nested Binding path', () =>
    Story.story(
      { block: ShellBlock, layer: shellLayer },
      Story.given(ShellModel.make({ root: initialModel })),
      Story.Subscription.emit(
        Story.Subscription.at(
          [RootBinding, RightBinding],
          leafSubscriptions.pulses,
        ),
        LeafMessage.ObservedPulse({ count: 14 }),
      ),
      Story.model(model => {
        expect(model.root.left.count).toBe(0)
        expect(model.root.right.count).toBe(14)
        expect(model.root.childPulses).toBe(1)
      }),
    ),
  )

  it('requires explicit placement when one original source is reused', async () => {
    const ambiguous = Reflect.apply(Story.Subscription.emit, undefined, [
      leafSubscriptions.pulses,
      LeafMessage.ObservedPulse({ count: 1 }),
    ])

    await expect(
      Effect.runPromise(
        Reflect.apply(Story.story, undefined, [
          { block: RootBlock, layer: rootLayer },
          Story.given(initialModel),
          ambiguous,
        ]),
      ),
    ).rejects.toThrow('registered under multiple keys')
  })

  it('rejects an erased same-named foreign owner and invalid payloads', async () => {
    const run = (step: unknown) =>
      Effect.runPromise(
        Reflect.apply(Story.story, undefined, [
          { block: RootBlock, layer: rootLayer },
          Story.given(initialModel),
          step,
        ]),
      )
    const sameNameForeign = Reflect.apply(Story.Subscription.at, undefined, [
      LeftBinding,
      sameNameForeignLeafSubscriptions.pulses,
    ])
    const foreign = Reflect.apply(Story.Subscription.emit, undefined, [
      sameNameForeign,
      LeafMessage.ObservedPulse({ count: 1 }),
    ])
    const invalidPayload = Reflect.apply(Story.Subscription.emit, undefined, [
      Story.Subscription.at(LeftBinding, leafSubscriptions.pulses),
      { _tag: 'ObservedPulse', count: 'wrong' },
    ])

    await expect(run(foreign)).rejects.toThrow(
      'Message that is not declared by the selected Subscription',
    )
    await expect(run(invalidPayload)).rejects.toThrow(
      'Message that is not declared by the selected Subscription',
    )
  })

  it('requires the explicit registry route in an update-only Story', () => {
    const graphBacked = Story.Subscription.emit(
      rootSubscriptions.pulses,
      RootMessage.ObservedRootPulse(),
    )

    expect(() =>
      Reflect.apply(CoreStory.story, undefined, [
        (model: RootModel) => ({ model }),
        CoreStory.given(initialModel),
        graphBacked,
      ]),
    ).toThrow('requires a Block-aware Story')
  })
})

if (false) {
  const rootSubject = { block: RootBlock, layer: rootLayer }
  const selectedStoryStep: Story.Step<typeof rootSubject> =
    Story.Subscription.emit(
      Story.Subscription.at(RightBinding, leafSubscriptions.pulses),
      LeafMessage.ObservedPulse({ count: 1 }),
    )
  const selectedSceneStep: Scene.Step<typeof rootSubject> =
    Scene.Subscription.emit(
      rootSubscriptions.pulses,
      RootMessage.ObservedRootPulse(),
    )
  void selectedStoryStep
  void selectedSceneStep

  // @ts-expect-error The reusable Story step retains the selected Layer's Subscription graph.
  const unselectedStoryStep: Story.Step<typeof RootBlock> = selectedStoryStep
  // @ts-expect-error The reusable Scene step retains the selected Layer's Subscription graph.
  const unselectedSceneStep: Scene.Step<typeof RootBlock> = selectedSceneStep
  void unselectedStoryStep
  void unselectedSceneStep

  const shellEmission = Story.steps(
    Story.steps(
      Story.Subscription.emit(
        Story.Subscription.at(
          [RootBinding, RightBinding],
          leafSubscriptions.pulses,
        ),
        LeafMessage.ObservedPulse({ count: 1 }),
      ),
    ),
  )

  // @ts-expect-error Grouping retains the selected Binding path's parent owner.
  // oxfmt-ignore
  const wrongParentStory = Story.story({ block: RootBlock, layer: rootLayer }, Story.given(initialModel), shellEmission)
  void wrongParentStory

  // @ts-expect-error An extracted helper retains the selected Binding path's parent owner.
  const wrongParentStep: Story.Step<typeof rootSubject> = shellEmission
  void wrongParentStep

  // @ts-expect-error Grouping cannot introduce graph-backed steps into an update-only Story.
  // oxfmt-ignore
  CoreStory.story((model: RootModel) => ({ model }), CoreStory.given(initialModel), shellEmission)
}
