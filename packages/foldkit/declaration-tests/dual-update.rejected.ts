import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { run } from 'foldkit/runtime'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import * as Update from 'foldkit/update'

import {
  ChildBlock,
  CounterComposition,
  GraphFullComposition,
  GraphFullModel,
  Model as CounterModel,
  OutMessage,
  ParentDefinition,
  PersistLayer,
  RequiredRestBlock,
  RequiredRestParentDefinition,
  RootComposition,
  SaveClient,
  earlyReturnUpdate,
  makePendingApplication,
  parentMessage,
  parentModel,
  parentUpdate,
  rootInit,
  rootUpdate,
  rootView,
  ternaryUpdate,
  graphFullUpdate,
} from './dual-update.accepted.js'

const rejectMissingBranchHandlers = () => {
  // @ts-expect-error A Command in one ternary branch still requires its handler.
  CounterComposition.prepareBlock({
    init: () => ({ model: CounterModel.make({ count: 0 }) }),
    update: ternaryUpdate,
  })
  // @ts-expect-error A Command before an early return still requires its handler.
  CounterComposition.prepareBlock({
    init: () => ({ model: CounterModel.make({ count: 0 }) }),
    update: earlyReturnUpdate,
  })
}
void rejectMissingBranchHandlers

// @ts-expect-error A local Command branch remains required beside a connected Binding operation.
GraphFullComposition.prepareBlock({
  init: () => ({
    model: GraphFullModel.make({ child: { count: 0 }, count: 0 }),
  }),
  update: graphFullUpdate,
})

type GraphFullUpdateOutMessage =
  ReturnType<typeof graphFullUpdate> extends Readonly<{
    outMessage?: infer OutMessage
  }>
    ? Exclude<OutMessage, undefined>
    : never

// @ts-expect-error The mixed connected update retains its exact local OutMessage.
const invalidGraphFullOutMessage: GraphFullUpdateOutMessage =
  OutMessage.RequestedReset()
void invalidGraphFullOutMessage

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ChangedCount: { amount: Schema.Number } })
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct Block or Application identity for type coverage.

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture deliberately uses a distinct Block or Application identity for type coverage.
const Composition = Block.makeDefinition('DualUpdateRejectedCounter', {
  Model,
  Message,
}).makeComposition()
const update = Composition.makeUpdate.withContext(
  (
    _context: Readonly<{
      multiplier: number
    }>,
  ) => ({
    ChangedCount: (model, _message) => ({ model }),
  }),
)
const message = Message.ChangedCount({ amount: 1 })
const model = Model.make({ count: 0 })
const step = update(message)
const view = (
  current: typeof Model.Type,
  h: HtmlBuilder<typeof Message.Type>,
) => h.div([], [globalThis.String(current.count)])
const missingModelUpdate = (
  _model: typeof Model.Type,
  _message: typeof Message.Type,
) => ({ status: 'Done' })
const wrongModelUpdate = (
  _model: typeof Model.Type,
  _message: typeof Message.Type,
) => ({ model: { status: 'Done' } })

Story.story(
  // @ts-expect-error Story updates must return their Model.
  missingModelUpdate,
  Story.given(model),
)
Story.story(
  // @ts-expect-error Story updates must return the same Model type they accept.
  wrongModelUpdate,
  Story.given(model),
)
Story.story(
  // @ts-expect-error Story cannot supply required update context.
  requiredContextUpdate,
  Story.given(model),
)
Story.story(
  // @ts-expect-error Story cannot supply required rest update context.
  requiredRestContextUpdate,
  Story.given(model),
)
Scene.scene(
  {
    // @ts-expect-error Scene updates must return their Model.
    update: missingModelUpdate,
    view,
  },
  Scene.given(model),
)
Scene.scene(
  {
    // @ts-expect-error Scene updates must return the same Model type they accept.
    update: wrongModelUpdate,
    view,
  },
  Scene.given(model),
)
Scene.scene(
  {
    // @ts-expect-error Scene cannot supply required update context.
    update: requiredContextUpdate,
    view,
  },
  Scene.given(model),
)

// @ts-expect-error Required context is supplied after the curried Step's Model.
step(model)

// @ts-expect-error A context-bearing curried update is not a unary Step.
Update.combineSteps(model, [step])

// @ts-expect-error The two-argument form is the canonical data-first call.
update(message, { multiplier: 2 })

// @ts-expect-error The data-first form retains the required context.
update(model, message)

RequiredRestParentDefinition.makeBinding(RequiredRestBlock, {
  // @ts-expect-error A required-rest contextual child must provide generated delivery context.
  field: 'child',
  // @ts-expect-error A required-rest contextual child must provide generated delivery context.
  delivery: {},
})

const AlternativeChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
  placement: 'alternative',
})
const OmittedComposition = ParentDefinition.makeComposition({
  bindings: [AlternativeChildBinding],
})
const omittedDirectUpdate = OmittedComposition.makeUpdate({
  // @ts-expect-error An update from another child graph carries that graph's generated dispatch Schema.
  ChangedLabel: (current, _message) => parentUpdate(parentMessage)(current),
})
const omittedComposedUpdate = OmittedComposition.makeUpdate({
  // @ts-expect-error Update.combineSteps preserves the originating graph's generated dispatch Schema.
  ChangedLabel: (current, _message) =>
    Update.combineSteps(current, [parentUpdate(parentMessage)]),
})

void omittedDirectUpdate
void omittedComposedUpdate

OmittedComposition.prepareBlock({
  init: () => ({ model: parentModel }),
  update: OmittedComposition.makeUpdate({
    ChangedLabel: (current, _message) => ({
      model: current,
    }),
  }),
  // @ts-expect-error Exposed operations produce local Message tuples, not Model-first Steps.
  operations: { handleChild: parentUpdate(parentMessage) },
  EffectsLayer: Layer.empty,
})

// @ts-expect-error Block completion requires the update's Command handler Layer.
RootComposition.prepareBlock({
  init: rootInit,
  update: rootUpdate,
  view: rootView,
})

// @ts-expect-error A completed Application cannot run before its ordinary Service is provided.
run(makePendingApplication())

run(
  makePendingApplication().provide(
    Layer.succeed(SaveClient, { save: Effect.void }),
  ),
)

void PersistLayer
