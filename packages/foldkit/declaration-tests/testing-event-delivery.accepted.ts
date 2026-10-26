import { Array, Effect, Layer, Option, Schema, Stream } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import * as SubscriptionDefinition from 'foldkit/subscription'
import { __bindCommandMatcher, toParentMessage } from 'foldkit/test'

export const ChildModel = Schema.Struct({
  id: Schema.String,
  saves: Schema.Number,
})
export const ChildMessage = defineMessageUnion({
  ClickedSave: {},
  CompletedSave: { id: Schema.String },
  ReceivedReading: { count: Schema.NumberFromString },
})
const ChildDefinition = Block.makeDefinition('TestingFixtureChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
export const Save = ChildDefinition.makeCommand('Save', {
  args: { id: Schema.String },
  messages: [ChildMessage.CompletedSave],
  handler: function* () {
    return ({ id }) => Effect.succeed(ChildMessage.CompletedSave({ id }))
  },
})
export const childSubscriptions = ChildDefinition.makeSubscriptions(entry => ({
  readings: entry('Readings', {
    messages: [ChildMessage.ReceivedReading],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const ChildComposition = ChildDefinition.makeComposition()
const childUpdate = ChildComposition.makeUpdate({
  ClickedSave: model => ({ model, commands: [Save({ id: model.id })] }),
  CompletedSave: model => ({
    model: modifyFields(model, { saves: count => count + 1 }),
  }),
  ReceivedReading: (model, { count }) => ({
    model: modifyFields(model, { saves: () => count }),
  }),
})
const childView = ChildComposition.makeView((model, h) =>
  h.button([h.OnClick(ChildMessage.ClickedSave())], [model.id]),
)
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((id: string) => ({
      model: ChildModel.make({ id, saves: 0 }),
    })),
    update: childUpdate,
    view: childView,
    subscriptions: childSubscriptions,
    EffectsLayer: Layer.merge(Save.layer, childSubscriptions.readings.layer),
  })
export const ChildBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const ChildInstance = Schema.Struct({ id: Schema.String, child: ChildModel })
export const ParentModel = Schema.Struct({
  children: Schema.Array(ChildInstance),
  activityCount: Schema.Number,
})
export const ParentMessage = defineMessageUnion({ ReceivedActivity: {} })
const ParentDefinition = Block.makeDefinition('TestingFixtureParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'Children',
  readAll: model => model.children,
  key: instance => instance.id,
  read: instance => instance.child,
  writeAt: (model, id, nextChild) =>
    modifyFields(model, {
      children: Array.map(instance =>
        instance.id === id
          ? modifyFields(instance, { child: () => nextChild })
          : instance,
      ),
    }),
  keySchema: Schema.String,
})
const parentSubscriptions = ParentDefinition.makeSubscriptions(entry => ({
  activity: entry('Activity', {
    messages: [ParentMessage.ReceivedActivity],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const parentUpdate = ParentComposition.makeUpdate({
  ReceivedActivity: model => ({
    model: modifyFields(model, { activityCount: count => count + 1 }),
  }),
})
export const parentView = ParentComposition.makeView((model, h) =>
  h.main(
    [],
    Array.map(model.children, instance =>
      h.block(
        ChildBinding.embedView({
          slotId: `child-${instance.id}`,
          key: instance.id,
          model: instance.child,
        }),
      ),
    ),
  ),
)
const prepareParent = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({
      model: ParentModel.make({ children: [], activityCount: 0 }),
    })),
    update: parentUpdate,
    view: parentView,
    subscriptions: parentSubscriptions,
    EffectsLayer: parentSubscriptions.activity.layer,
  })
export const ParentBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

export const initialParentModel = ParentModel.make({
  children: [
    ChildInstance.make({
      id: 'first',
      child: ChildModel.make({ id: 'first', saves: 0 }),
    }),
    ChildInstance.make({
      id: 'second',
      child: ChildModel.make({ id: 'second', saves: 0 }),
    }),
  ],
  activityCount: 0,
})
const secondSave = __bindCommandMatcher(
  ChildBlock,
  ChildBinding,
  Save({ id: 'second' }),
  'second',
)

Scene.scene(
  {
    update: ParentBlock.update,
    view: parentView,
    subscriptions: ParentBlock.subscriptions,
  },
  Scene.given(initialParentModel),
  Scene.click(Scene.nth(Scene.all.role('button'), 1)),
  Scene.Command.keepPending(secondSave),
  Scene.Command.expectExact(secondSave),
  Scene.Subscription.emit(
    ParentBlock.subscriptions.activity,
    ParentMessage.ReceivedActivity(),
  ),
  Scene.Command.resolve(
    secondSave,
    ChildMessage.CompletedSave({ id: 'second' }),
  ),
)

export const SubscriptionHostModel = Schema.Struct({
  leftCount: Schema.Number,
  rightCount: Schema.Number,
})
export const SubscriptionHostMessage = defineMessageUnion({
  ReceivedLeftReading: { message: ChildMessage },
  ReceivedRightReading: { message: ChildMessage },
})
const SubscriptionHostDefinition = Block.makeDefinition(
  'TestingFixtureSubscriptionHost',
  { Model: SubscriptionHostModel, Message: SubscriptionHostMessage },
)
const leftSubscriptions = SubscriptionDefinition.lift({
  leftReadings: childSubscriptions.readings,
})<typeof SubscriptionHostModel.Type, typeof SubscriptionHostMessage.Type>({
  read: () => Option.none(),
  toParentMessage: message =>
    SubscriptionHostMessage.ReceivedLeftReading({ message }),
})
const rightSubscriptions = SubscriptionDefinition.lift({
  rightReadings: childSubscriptions.readings,
})<typeof SubscriptionHostModel.Type, typeof SubscriptionHostMessage.Type>({
  read: () => Option.none(),
  toParentMessage: message =>
    SubscriptionHostMessage.ReceivedRightReading({ message }),
})
const hostSubscriptions = SubscriptionDefinition.aggregate(
  leftSubscriptions,
  rightSubscriptions,
)
const SubscriptionHostComposition = SubscriptionHostDefinition.makeComposition()
const subscriptionHostUpdate = SubscriptionHostComposition.makeUpdate({
  ReceivedLeftReading: (model, { message }) =>
    ChildMessage.match(message, {
      ReceivedReading: ({ count }) => ({
        model: modifyFields(model, { leftCount: () => count }),
      }),
      ClickedSave: () => ({ model }),
      CompletedSave: () => ({ model }),
    }),
  ReceivedRightReading: (model, { message }) =>
    ChildMessage.match(message, {
      ReceivedReading: ({ count }) => ({
        model: modifyFields(model, { rightCount: () => count }),
      }),
      ClickedSave: () => ({ model }),
      CompletedSave: () => ({ model }),
    }),
})
const prepareSubscriptionHost = () =>
  SubscriptionHostComposition.prepareBlock({
    init: SubscriptionHostComposition.makeInit(() => ({
      model: SubscriptionHostModel.make({ leftCount: 0, rightCount: 0 }),
    })),
    update: subscriptionHostUpdate,
    subscriptions: hostSubscriptions,
    EffectsLayer: Layer.merge(
      hostSubscriptions.leftReadings.layer,
      hostSubscriptions.rightReadings.layer,
    ),
  })
export const SubscriptionHostBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SubscriptionHostModel,
  typeof prepareSubscriptionHost
> = Block.assemble(prepareSubscriptionHost)
type SubscriptionHostEmissionSource =
  | typeof childSubscriptions.readings
  | typeof SubscriptionHostBlock.subscriptions.leftReadings
  | typeof SubscriptionHostBlock.subscriptions.rightReadings
export const subscriptionEmitter: Story.SubscriptionEmitter<
  typeof SubscriptionHostMessage.Type,
  SubscriptionHostEmissionSource
> = Story.Subscription.from(SubscriptionHostBlock.subscriptions)

export const receiveCurrentRightCount = Story.steps(
  Story.messageWith((model: typeof SubscriptionHostModel.Type) =>
    SubscriptionHostMessage.ReceivedRightReading({
      message: ChildMessage.ReceivedReading({ count: model.rightCount }),
    }),
  ),
)

Story.story(
  SubscriptionHostBlock.update,
  Story.given(SubscriptionHostBlock.init().model),
  subscriptionEmitter.emit(
    SubscriptionHostBlock.subscriptions.rightReadings,
    ChildMessage.ReceivedReading({ count: 4 }),
  ),
  Story.messageWith(model =>
    SubscriptionHostMessage.ReceivedLeftReading({
      message: ChildMessage.ReceivedReading({ count: model.rightCount }),
    }),
  ),
  receiveCurrentRightCount,
)

Story.story(
  ParentBlock.update,
  Story.given(initialParentModel),
  Story.message(
    toParentMessage(ChildBinding, 'second', ChildMessage.ClickedSave()),
  ),
  Story.Subscription.from(ParentBlock.subscriptions).emit(
    ParentBlock.subscriptions.activity,
    ParentMessage.ReceivedActivity(),
  ),
  Story.Command.resolve(
    secondSave,
    ChildMessage.CompletedSave({ id: 'second' }),
  ),
)
