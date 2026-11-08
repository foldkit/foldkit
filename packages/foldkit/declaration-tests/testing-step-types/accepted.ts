import { Layer, Schema, Stream, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import type { Url } from 'foldkit/url'

export const ChildModel = Schema.Struct({ count: Schema.Number })
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = defineMessageUnion({
  ObservedCount: { count: Schema.Number },
})
export type ChildMessage = typeof ChildMessage.Type
export const ChildOutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
export type ChildOutMessage = typeof ChildOutMessage.Type
const ChildKey = Symbol('TestingStepTypesChild')
export const ChildBlock = Block.make('TestingStepTypesChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const childSubscriptions = ChildBlock.makeSubscriptions(entry => ({
  counts: entry('Counts', {
    messages: [ChildMessage.ObservedCount],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const ChildComposition = ChildBlock.makeComposition()
export const childLayer = ChildBlock.makeLayer({
  init: ChildComposition.makeInit(() => ({
    model: ChildModel.make({ count: 0 }),
  })),
  update: ChildComposition.makeUpdate({
    ObservedCount: (_model, { count }) => ({
      model: ChildModel.make({ count }),
      outMessage: ChildOutMessage.ReportedCount({ count }),
    }),
  }),
  view: ChildComposition.makeView((model, h) =>
    h.span([], [globalThis.String(model.count)]),
  ),
  subscriptions: childSubscriptions,
  EffectsLayer: childSubscriptions.layer,
})

export const RootModel = Schema.Struct({
  children: Schema.Record(Schema.String, ChildModel),
  recordedCount: Schema.Number,
})
export type RootModel = typeof RootModel.Type
export const RootMessage = defineMessageUnion({
  Navigated: { path: Schema.String },
})
export type RootMessage = typeof RootMessage.Type
export const RootOutMessage = defineMessageUnion({
  Recorded: { count: Schema.Number },
})
export type RootOutMessage = typeof RootOutMessage.Type
export const RootInMessage = defineInMessageUnion({
  RequestedRecord: { count: Schema.Number },
})
export type RootInMessage = typeof RootInMessage.Type
const RootKey = Symbol('TestingStepTypesRoot')
export const RootBlock = Block.make('TestingStepTypesRoot', {
  key: RootKey,
  Model: RootModel,
  Message: RootMessage,
  OutMessage: RootOutMessage,
  InMessage: RootInMessage,
  InitArgs: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.String]),
  InMessageContext: Schema.Tuple([Schema.Number]),
  view: { kind: 'Element' },
})
const BaseChildrenBinding = RootBlock.makeRecordBinding(ChildBlock, {
  field: 'children',
})
export const ChildrenBinding = BaseChildrenBinding.withOutMessagePolicy({
  fold: RootBlock.makeOutMessageFold(ChildBlock, {
    ReportedCount: RootBlock.makeNoopStep,
  }),
})
const RootComposition = RootBlock.makeComposition({
  bindings: [ChildrenBinding],
})
export const rootSubscriptions = RootBlock.makeSubscriptions(entry => ({
  navigation: entry('Navigation', {
    messages: [RootMessage.Navigated],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
export const rootLayer = RootBlock.makeLayer({
  init: RootComposition.makeInit(() => ({
    model: RootModel.make({ children: {}, recordedCount: 0 }),
  })),
  update: RootComposition.makeUpdate.withContext(prefix => ({
    Navigated: (model, { path }) => ({
      model,
      outMessage: RootOutMessage.Recorded({
        count: prefix.length + path.length,
      }),
    }),
  })),
  inMessageUpdate: RootComposition.makeInMessageUpdate.withContext(offset => ({
    RequestedRecord: (model, { count }) => ({
      model: RootModel.make({
        children: model.children,
        recordedCount: count + offset,
      }),
    }),
  })),
  view: RootComposition.makeView((model, h) =>
    h.button(
      [h.OnClick(RootMessage.Navigated({ path: '/next' }))],
      [globalThis.String(model.recordedCount)],
    ),
  ),
  subscriptions: rootSubscriptions,
  EffectsLayer: rootSubscriptions.layer,
}).pipe(Layer.provide(childLayer))

export const subject = {
  block: RootBlock,
  layer: rootLayer,
  updateContext: Tuple.make('route:'),
  inMessageContext: Tuple.make(1),
  routing: {
    onUrlChange: (url: Url) => RootMessage.Navigated({ path: url.pathname }),
  },
}

export const storyMessage: Story.Step<typeof subject> = Story.message(
  RootMessage.Navigated({ path: '/story' }),
)
export const storyInput: Story.Step<typeof subject> = Story.inMessage(
  RootInMessage.RequestedRecord({ count: 1 }),
)
export const storyOutMessage: Story.Step<typeof subject> =
  Story.expectOutMessage(RootOutMessage.Recorded({ count: 12 }))
export const storySubscription: Story.Step<typeof subject> =
  Story.Subscription.emit(
    Story.Subscription.at(ChildrenBinding, 'first', childSubscriptions.counts),
    ChildMessage.ObservedCount({ count: 2 }),
  )
export const storySelectedRootSubscription: Story.Step<typeof subject> =
  Story.Subscription.emit(
    rootSubscriptions.navigation,
    RootMessage.Navigated({ path: '/subscription' }),
  )
export const storySubscriptionGroup: Story.Step<typeof subject> = Story.steps(
  Story.steps(storySelectedRootSubscription),
)

export const sceneInput: Scene.Step<typeof subject> = Scene.inMessage(
  RootInMessage.RequestedRecord({ count: 3 }),
)
export const sceneNavigation: Scene.Step<typeof subject> =
  Scene.Navigation.changedUrl('/scene')
export const sceneOutMessage: Scene.Step<typeof subject> =
  Scene.expectOutMessage(RootOutMessage.Recorded({ count: 13 }))
export const sceneSubscription: Scene.Step<typeof subject> =
  Scene.Subscription.emit(
    Scene.Subscription.at(ChildrenBinding, 'first', childSubscriptions.counts),
    ChildMessage.ObservedCount({ count: 4 }),
  )
export const sceneSelectedRootSubscription: Scene.Step<typeof subject> =
  Scene.Subscription.emit(
    rootSubscriptions.navigation,
    RootMessage.Navigated({ path: '/subscription' }),
  )
export const sceneSubscriptionGroup: Scene.Step<typeof subject> = Scene.inside(
  Scene.role('region'),
  sceneSelectedRootSubscription,
)
