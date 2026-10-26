import { Array, Effect, Layer, Option, Schema, Stream } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as SubscriptionDefinition from '../subscription/subscription.js'
import { __bindCommandMatcher } from './bindingMatcher.js'
import * as Scene from './scene.js'
import * as Story from './story.js'
import { toParentMessage } from './toParentMessage.js'

const ChildModel = Schema.Struct({
  id: Schema.String,
  notes: Schema.Number,
  saves: Schema.Number,
})
const ChildMessage = defineMessageUnion({
  ClickedSave: {},
  ClickedSaveTwice: {},
  ClickedNote: {},
  CompletedSave: { id: Schema.String },
  ReceivedReading: { count: Schema.NumberFromString },
})
const ChildDefinition = Block.makeDefinition('TestingFollowupsChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Save = ChildDefinition.makeCommand('Save', {
  args: { id: Schema.String },
  messages: [ChildMessage.CompletedSave],
  handler: function* () {
    return ({ id }) => Effect.succeed(ChildMessage.CompletedSave({ id }))
  },
})
const childSubscriptions = ChildDefinition.makeSubscriptions(entry => ({
  readings: entry('Readings', {
    messages: [ChildMessage.ReceivedReading],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
const ChildComposition = ChildDefinition.makeComposition()
const childInit = ChildComposition.makeInit((id: string) => ({
  model: ChildModel.make({ id, notes: 0, saves: 0 }),
}))
const childUpdate = ChildComposition.makeUpdate({
  ClickedSave: model => ({ model, commands: [Save({ id: model.id })] }),
  ClickedSaveTwice: model => ({
    model,
    commands: [Save({ id: model.id }), Save({ id: model.id })],
  }),
  ClickedNote: model => ({
    model: modifyFields(model, { notes: count => count + 1 }),
  }),
  CompletedSave: model => ({
    model: modifyFields(model, { saves: count => count + 1 }),
  }),
  ReceivedReading: (model, { count }) => ({
    model: modifyFields(model, { notes: () => count }),
  }),
})
const childView = ChildComposition.makeView((model, h) =>
  h.section(
    [h.AriaLabel(`Item ${model.id}`)],
    [
      h.button([h.OnClick(ChildMessage.ClickedSave())], ['Save']),
      h.button([h.OnClick(ChildMessage.ClickedSaveTwice())], ['Save twice']),
      h.button([h.OnClick(ChildMessage.ClickedNote())], ['Note']),
      h.output([], [`${model.notes}/${model.saves}`]),
    ],
  ),
)
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: childInit,
    update: childUpdate,
    view: childView,
    subscriptions: childSubscriptions,
    EffectsLayer: Layer.merge(Save.layer, childSubscriptions.readings.layer),
  })
const ChildBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ChildInstance = Schema.Struct({ id: Schema.String, child: ChildModel })
const ParentModel = Schema.Struct({
  children: Schema.Array(ChildInstance),
  activityCount: Schema.Number,
})
const ParentMessage = defineMessageUnion({ ReceivedActivity: {} })
const ParentDefinition = Block.makeDefinition('TestingFollowupsParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
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
const parentView = ParentComposition.makeView((model, h) =>
  h.main(
    [],
    [
      ...Array.map(model.children, instance =>
        h.block(
          ChildBinding.embedView({
            slotId: `child-${instance.id}`,
            key: instance.id,
            model: instance.child,
          }),
        ),
      ),
      h.output(
        [h.AriaLabel('Activity count')],
        [globalThis.String(model.activityCount)],
      ),
    ],
  ),
)
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({
      model: ParentModel.make({ children: [], activityCount: 0 }),
    })),
    update: parentUpdate,
    view: parentView,
    subscriptions: parentSubscriptions,
    EffectsLayer: parentSubscriptions.activity.layer,
  })
const ParentBlock: Block.FromAssemblyWithView<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

const initialModel = ParentModel.make({
  children: [
    ChildInstance.make({ id: 'first', child: childInit('first').model }),
    ChildInstance.make({ id: 'second', child: childInit('second').model }),
  ],
  activityCount: 0,
})
const secondSave = __bindCommandMatcher(
  ChildBlock,
  ChildBinding,
  Save({ id: 'second' }),
  'second',
)
const sceneConfig = {
  update: ParentBlock.update,
  view: parentView,
  subscriptions: ParentBlock.subscriptions,
}

const SubscriptionHostModel = Schema.Struct({
  leftCount: Schema.Number,
  rightCount: Schema.Number,
})
const SubscriptionHostMessage = defineMessageUnion({
  ReceivedLeftReading: { message: ChildMessage },
  ReceivedRightReading: { message: ChildMessage },
})
const SubscriptionHostDefinition = Block.makeDefinition(
  'TestingFollowupsSubscriptionHost',
  {
    Model: SubscriptionHostModel,
    Message: SubscriptionHostMessage,
  },
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
      ClickedSaveTwice: () => ({ model }),
      ClickedNote: () => ({ model }),
      CompletedSave: () => ({ model }),
    }),
  ReceivedRightReading: (model, { message }) =>
    ChildMessage.match(message, {
      ReceivedReading: ({ count }) => ({
        model: modifyFields(model, { rightCount: () => count }),
      }),
      ClickedSave: () => ({ model }),
      ClickedSaveTwice: () => ({ model }),
      ClickedNote: () => ({ model }),
      CompletedSave: () => ({ model }),
    }),
})
const prepareSubscriptionHostBlock = () =>
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
const SubscriptionHostBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof SubscriptionHostModel,
  typeof prepareSubscriptionHostBlock
> = Block.assemble(prepareSubscriptionHostBlock)

describe('Scene.Command.keepPending', () => {
  test('retains one keyed child invocation through an interaction and Subscription delivery', () => {
    Scene.scene(
      sceneConfig,
      Scene.given(initialModel),
      Scene.click(Scene.nth(Scene.all.role('button', { name: 'Save' }), 1)),
      Scene.Command.keepPending(secondSave),
      Scene.Command.expectExact(secondSave),
      Scene.click(Scene.nth(Scene.all.role('button', { name: 'Note' }), 1)),
      Scene.Subscription.emit(
        ParentBlock.subscriptions.activity,
        ParentMessage.ReceivedActivity(),
      ),
      Scene.expect(Scene.label('Activity count')).toHaveText('1'),
      Scene.Command.resolve(
        secondSave,
        ChildMessage.CompletedSave({ id: 'second' }),
      ),
      Scene.expect(Scene.nth(Scene.all.selector('output'), 1)).toHaveText(
        '1/1',
      ),
    )
  })

  test('requires one exact pending invocation', () => {
    expect(() =>
      Scene.scene(
        sceneConfig,
        Scene.given(initialModel),
        Scene.click(
          Scene.nth(Scene.all.role('button', { name: 'Save twice' }), 1),
        ),
        Scene.Command.keepPending(Save),
      ),
    ).toThrow('multiple pending Commands match')
  })

  test('resolveAllExact and final completeness still include a kept Command', () => {
    const steps = [
      Scene.given(initialModel),
      Scene.click(Scene.nth(Scene.all.role('button', { name: 'Save' }), 1)),
      Scene.Command.keepPending(secondSave),
    ] as const

    expect(() =>
      Scene.scene(sceneConfig, ...steps, Scene.Command.resolveAllExact()),
    ).toThrow('I found Commands without resolvers')
    expect(() => Scene.scene(sceneConfig, ...steps)).toThrow(
      'I found Commands without resolvers',
    )
  })
})

const StoryModel = Schema.Struct({ generation: Schema.Number })
const StoryMessage = defineMessageUnion({
  Advanced: {},
  ReceivedGeneration: { generation: Schema.Number },
})
const storyUpdate = (
  model: typeof StoryModel.Type,
  message: typeof StoryMessage.Type,
) =>
  StoryMessage.match<Readonly<{ model: typeof StoryModel.Type }>>(message, {
    Advanced: () => ({
      model: modifyFields(model, { generation: count => count + 1 }),
    }),
    ReceivedGeneration: ({ generation }) => ({
      model: StoryModel.make({ generation }),
    }),
  })

describe('Story.messageWith', () => {
  test('reads the Model held when an inline or extracted step runs', () => {
    const receiveCurrentGeneration = Story.steps(
      Story.messageWith((model: typeof StoryModel.Type) =>
        StoryMessage.ReceivedGeneration({ generation: model.generation }),
      ),
    )

    Story.story(
      storyUpdate,
      Story.given(StoryModel.make({ generation: 1 })),
      Story.message(StoryMessage.Advanced()),
      Story.messageWith(model =>
        StoryMessage.ReceivedGeneration({ generation: model.generation + 1 }),
      ),
      receiveCurrentGeneration,
      Story.model(model => {
        expect(model.generation).toBe(3)
      }),
    )
  })
})

describe('Story.Subscription.from', () => {
  test('delivers while an existing Story Command remains pending', () => {
    Story.story(
      ParentBlock.update,
      Story.given(initialModel),
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
      Story.model(model => {
        expect(model.activityCount).toBe(1)
        expect(
          Option.getOrThrow(
            Array.findFirst(model.children, child => child.id === 'second'),
          ).child.saves,
        ).toBe(1)
      }),
    )
  })

  test('rejects an ambiguous raw child entry and selects one bound placement', () => {
    const emitter = Story.Subscription.from(SubscriptionHostBlock.subscriptions)

    expect(() =>
      Story.story(
        SubscriptionHostBlock.update,
        Story.given(SubscriptionHostBlock.init().model),
        emitter.emit(
          childSubscriptions.readings,
          ChildMessage.ReceivedReading({ count: 3 }),
        ),
      ),
    ).toThrow('registered under multiple keys')

    expect(() =>
      Story.story(
        SubscriptionHostBlock.update,
        Story.given(SubscriptionHostBlock.init().model),
        Reflect.apply(emitter.emit, undefined, [
          SubscriptionHostBlock.subscriptions.rightReadings,
          { _tag: 'ReceivedReading', count: '4' },
        ]),
      ),
    ).toThrow('Message that is not declared')

    Story.story(
      SubscriptionHostBlock.update,
      Story.given(SubscriptionHostBlock.init().model),
      emitter.emit(
        SubscriptionHostBlock.subscriptions.rightReadings,
        ChildMessage.ReceivedReading({ count: 4 }),
      ),
      Story.model(model => {
        expect(model.leftCount).toBe(0)
        expect(model.rightCount).toBe(4)
      }),
    )
  })
})
