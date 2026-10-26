import { Schema } from 'effect'
import { Runtime } from 'foldkit'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'

import {
  ApplicationDefinition,
  ChildBinding,
  ChildMessage,
  ChildModel,
  GeneratedDispatchChildBlock,
  GeneratedDispatchChildComposition,
  GeneratedDispatchParentBlock,
  GeneratedDispatchParentComposition,
  GeneratedDispatchParentDefinition,
  ParentModel,
  ReadCount,
  childInit,
  childSubscriptions,
  childUpdate,
  childView,
  element,
  init,
  parentInit,
  parentUpdate,
  parentView,
  sceneSubscriptions,
  update,
  view,
} from './generated-dispatch.accepted.js'

Scene.subscriptions(
  ApplicationDefinition.makeComposition({ bindings: [] }),
  // @ts-expect-error Root-local Subscriptions must read the Application Model.
  childSubscriptions,
)
Scene.scene(
  { update, view, subscriptions: sceneSubscriptions },
  Scene.given(init().model),
  Scene.Subscription.emit(
    sceneSubscriptions['parent/child/observations'],
    // @ts-expect-error Generated child emission preserves the exact declared payload.
    ChildMessage.ObservedCount({ count: 'invalid' }),
  ),
)

const ForeignSubscriptionDefinition = Block.makeDefinition(
  'ForeignSubscription',
  {
    Model: ChildModel,
    Message: ChildMessage,
  },
)
const foreignSubscriptions = ForeignSubscriptionDefinition.makeSubscriptions(
  entry => ({
    observations: entry('Observations', {
      messages: [ChildMessage.ObservedCount],
    }),
  }),
)
Scene.scene(
  {
    update: parentUpdate,
    view: parentView,
    subscriptions: GeneratedDispatchParentBlock.subscriptions,
  },
  Scene.given(ParentModel.make({ child: { count: 0 }, title: 'Counts' })),
  // @ts-expect-error The same Message Schema cannot substitute an unrelated Subscription source.
  Scene.Subscription.emit(
    foreignSubscriptions.observations,
    ChildMessage.ObservedCount({ count: 1 }),
  ),
)

// @ts-expect-error Child handler recipes remain required at local assembly.
GeneratedDispatchChildComposition.prepareBlock({
  init: childInit,
  update: childUpdate,
  view: childView,
})

// @ts-expect-error An ordinary Service remains required after nested graph assembly.
Runtime.embed(element)

// @ts-expect-error Registered child operations preserve their exact Message payload.
ChildBinding.requestSetCount({ count: 'invalid' })

GeneratedDispatchParentComposition.makeUpdate({
  ChangedTitle: (model, message) => {
    // @ts-expect-error Authored callbacks see local facts, not generated child wrappers.
    const tag: 'GotChildMessage' = message._tag
    void tag
    return { model }
  },
})

GeneratedDispatchParentComposition.makeInit(() => ({
  model: { title: 'Counts' },
  // @ts-expect-error Child facts cannot be emitted as plain parent Commands.
  commands: [ReadCount()],
}))

const EmptyParentComposition =
  GeneratedDispatchParentDefinition.makeComposition()
EmptyParentComposition.makeUpdate({
  ChangedTitle: model =>
    // @ts-expect-error Generated Binding folds require the exact registered child graph.
    ChildBinding.fold(model, ChildMessage.ClickedIncrement()),
})
EmptyParentComposition.makeUpdate({
  ChangedTitle: model =>
    // @ts-expect-error Generated operations require the exact registered child graph.
    ChildBinding.requestSetCount({ count: 1 })(model),
})
EmptyParentComposition.prepareBlock({
  // @ts-expect-error The child initializer cannot be installed without its registered Binding.
  init: parentInit,
  update: EmptyParentComposition.makeUpdate({
    ChangedTitle: model => ({ model }),
  }),
})
EmptyParentComposition.prepareBlock({
  init: () => ({ model: ParentModel.make({ child: { count: 0 }, title: '' }) }),
  // @ts-expect-error Child update routing retains its Binding registration evidence.
  update: parentUpdate,
})
// @ts-expect-error A view's child capability cannot disappear at completion.
EmptyParentComposition.prepareBlock({
  init: () => ({ model: ParentModel.make({ child: { count: 0 }, title: '' }) }),
  update: EmptyParentComposition.makeUpdate({
    ChangedTitle: model => ({ model }),
  }),
  view: parentView,
})

const EmptyApplicationComposition = ApplicationDefinition.makeComposition()
EmptyApplicationComposition.prepareBlock({
  // @ts-expect-error Nested init keeps root Binding registration evidence.
  init,
  update: EmptyApplicationComposition.makeUpdate({
    ClickedApplication: model => ({ model }),
  }),
  view: EmptyApplicationComposition.makeView((_model, h) => h.empty),
})

const RepeatedModel = Schema.Struct({
  first: GeneratedDispatchChildBlock.Model,
  second: GeneratedDispatchChildBlock.Model,
})
const RepeatedMessage = defineMessageUnion({
  ChangedLabel: { label: Schema.String },
})
const RepeatedDefinition = Block.makeDefinition('Repeated', {
  Model: RepeatedModel,
  Message: RepeatedMessage,
})
const HeaderBinding = RepeatedDefinition.makeBinding(
  GeneratedDispatchChildBlock,
  {
    field: 'first',
    placement: 'header-search',
  },
)
const AliasBinding = RepeatedDefinition.makeBinding(
  GeneratedDispatchChildBlock,
  {
    field: 'second',
    placement: 'headerSearch',
  },
)
// @ts-expect-error Different placements cannot format into the same child delivery tag.
RepeatedDefinition.makeComposition({ bindings: [HeaderBinding, AliasBinding] })
