import { Effect, Tuple } from 'effect'
import { Scene as RootScene, Story as RootStory, Update } from 'foldkit'
import type { InternalExecution, RuntimeCapability } from 'foldkit/block'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'

import {
  ConstructionFailure,
  ConstructionSource,
  ContextBlock,
  CounterBinding,
  CounterBlock,
  CounterMessage,
  CounterOutMessage,
  GrandParentBlock,
  GroupBinding,
  HeadlessBlock,
  ParentBlock,
  rawUpdate,
} from './fixture.js'

export const selectedChildMapper = Story.withBlock(GrandParentBlock, parent =>
  toParentMessageFor(parent, GroupBinding),
)
export const mappedChildMessage = Effect.map(
  selectedChildMapper,
  toChildMessage =>
    toChildMessage(CounterBinding, CounterMessage.UpdatedCount({ value: 5 })),
)
export const mappedTransition = Story.withBlock(GrandParentBlock, parent => {
  const toParentMessage = toParentMessageFor(parent)
  const toChildMessage = toParentMessageFor(parent, GroupBinding)
  if (false) {
    // @ts-expect-error A descriptor has not acquired a test graph.
    toParentMessageFor(GrandParentBlock)
    // @ts-expect-error The selected child must belong to the acquired parent.
    toParentMessageFor(parent, CounterBinding)
    toChildMessage(
      // @ts-expect-error A selected child mapper cannot use the parent's Binding.
      GroupBinding,
      CounterMessage.UpdatedCount({ value: 1 }),
    )
    // @ts-expect-error The selected child's exact local Message payload is retained.
    toChildMessage(CounterBinding, { _tag: 'UpdatedCount', value: 'five' })
  }
  return parent.update(
    parent.init().model,
    toParentMessage(
      GroupBinding,
      toChildMessage(CounterBinding, CounterMessage.UpdatedCount({ value: 5 })),
    ),
  )
})

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value

export const rawStory = Story.story(
  rawUpdate,
  Story.given(0),
  Story.message(CounterMessage.UpdatedCount({ value: 2 })),
  Story.model(model => model.toFixed()),
)
export const rawScene = Scene.scene(
  {
    update: rawUpdate,
    view: (model, h) => h.div([], [`${model}`]),
    routing: { onUrlChange: () => CounterMessage.UpdatedCount({ value: 3 }) },
  },
  Scene.given(0),
  Scene.Navigation.changedUrl('/next'),
  Scene.expect(Scene.text('3')).toExist(),
)
export type SynchronousStory = Assert<Equal<typeof rawStory, void>>
export type SynchronousScene = Assert<Equal<typeof rawScene, void>>
export type NativeStoryUtility = Assert<
  Equal<ReturnType<typeof Story.story>, void>
>
export type NativeSceneUtility = Assert<
  Equal<ReturnType<typeof Scene.scene>, void>
>
export const rootStory = RootStory.story(
  CounterBlock,
  RootStory.init('Root namespace'),
)
export const rootScene = RootScene.scene(
  CounterBlock,
  RootScene.init('Root namespace'),
)
export type RootStoryChannels = Assert<
  Equal<
    [Effect.Error<typeof rootStory>, Effect.Services<typeof rootStory>],
    [ConstructionFailure, ConstructionSource]
  >
>
export type RootSceneChannels = Assert<
  Equal<
    [Effect.Error<typeof rootScene>, Effect.Services<typeof rootScene>],
    [ConstructionFailure, ConstructionSource]
  >
>
export const inspectedInit = Story.withBlock(CounterBlock, block =>
  block.init('Inspected'),
)
export const sceneInspectedModel = Scene.withBlock(
  CounterBlock,
  block => block.init('Inspected').model,
)
export const inspectedUpdate = Story.withBlock(CounterBlock, block =>
  block.update(
    block.init('Inspected').model,
    CounterMessage.UpdatedCount({ value: 4 }),
  ),
)
type InitResult = Effect.Success<typeof inspectedInit>
type UpdateResult = Effect.Success<typeof inspectedUpdate>
type ExecutionRequirements =
  | InternalExecution<typeof CounterBlock.owner>
  | RuntimeCapability<typeof CounterBlock.owner>
export type ExactInitRequirements = Assert<
  Equal<Update.RequirementsOf<() => InitResult>, ExecutionRequirements>
>
export type ExactUpdateRequirements = Assert<
  Equal<Update.RequirementsOf<() => UpdateResult>, ExecutionRequirements>
>
export type NoInitOutMessage = Assert<
  Equal<NonNullable<InitResult['outMessage']>, never>
>
export type ExactUpdateOutMessage = Assert<
  Equal<NonNullable<UpdateResult['outMessage']>, typeof CounterOutMessage.Type>
>
export type ExactRegistration = Assert<
  Equal<Update.RegistrationEvidenceOf<InitResult>, never>
>
declare const registeredInit: Update.WithRegistrationEvidence<
  InitResult,
  typeof CounterBinding
>
export type InspectedModel = Assert<
  Equal<
    Effect.Success<typeof inspectedInit>['model'],
    typeof CounterBlock.Model.Type
  >
>
export type InspectedChannels = Assert<
  Equal<
    [Effect.Error<typeof inspectedInit>, Effect.Services<typeof inspectedInit>],
    [ConstructionFailure, ConstructionSource]
  >
>
export type SceneInspectedModel = Assert<
  Equal<
    Effect.Success<typeof sceneInspectedModel>,
    typeof CounterBlock.Model.Type
  >
>

export const nativeContextConfig: Scene.SceneConfig<
  typeof ContextBlock.Model.Type,
  typeof CounterMessage.Type
> = {
  update: model => ({ model }),
  view: (model, h) => h.div([], [`${model.count}`]),
}
const mixedScene = {
  ...nativeContextConfig,
  block: ContextBlock,
  updateContext: Tuple.make(2),
}
const nativeWithBlock = { ...nativeContextConfig, block: 3 }

export const scopedStory = Story.story(
  CounterBlock,
  Story.init('Counter'),
  Story.message(CounterMessage.UpdatedCount({ value: 2 })),
  Story.expectOutMessage(CounterOutMessage.ChangedCount({ value: 2 })),
  Story.model(model => model.count.toFixed()),
)
export type ConstructorServices = Assert<
  Equal<Effect.Services<typeof scopedStory>, ConstructionSource>
>
export type ConstructorErrors = Assert<
  Equal<Effect.Error<typeof scopedStory>, ConstructionFailure>
>
export type ScopedReturn = Assert<
  Equal<Effect.Success<typeof scopedStory>, void>
>
export const suppliedState = Story.story(
  CounterBlock,
  Story.given({ label: 'Given', count: 3 }),
  Story.model(model => model.label.toUpperCase()),
)
export const parentStory = Story.story(
  ParentBlock,
  Story.init(),
  Story.messageIn(CounterBinding, CounterMessage.UpdatedCount({ value: 7 })),
  Story.model(model => model.lastCount.toFixed()),
)
export const scopedScene = Scene.scene(
  CounterBlock,
  Scene.init('Counter'),
  Scene.click(Scene.role('button', { name: 'Counter: 0' })),
  Scene.expectOutMessage(CounterOutMessage.ChangedCount({ value: 1 })),
)
export const contextualStory = Story.story(
  { block: ContextBlock, updateContext: [2] },
  Story.init(),
  Story.message(CounterMessage.UpdatedCount({ value: 4 })),
  Story.model(model => model.count.toFixed()),
)
export const contextualScene = Scene.scene(
  {
    block: ContextBlock,
    updateContext: [2],
    routing: { onUrlChange: () => CounterMessage.UpdatedCount({ value: 4 }) },
  },
  Scene.init(),
  Scene.Navigation.changedUrl('/next'),
  Scene.expect(Scene.text('Count: 8')).toExist(),
)

if (false) {
  // @ts-expect-error A registered result cannot be mistaken for a completed public result.
  const noRegistration: InitResult = registeredInit
  void noRegistration
  // @ts-expect-error Scoped and synchronous Scene configuration modes are disjoint.
  Scene.scene(mixedScene, Scene.given({ count: 0 }))
  // @ts-expect-error Synchronous Scene configuration reserves the new block selector.
  Scene.scene(nativeWithBlock, Scene.given({ count: 0 }))
  // @ts-expect-error Scoped Story retains its construction Service requirement.
  Effect.runPromise(scopedStory)
  // @ts-expect-error Initializer arguments are checked against the selected Block.
  Story.story(CounterBlock, Story.init(1))
  Story.story(
    // @ts-expect-error Message payloads remain exact under the scoped overloads.
    CounterBlock,
    Story.init('Counter'),
    Story.message({ _tag: 'UpdatedCount', value: 'wrong' }),
  )
  // @ts-expect-error Child delivery validates its exact child Message payload.
  Story.messageIn(CounterBinding, { _tag: 'UpdatedCount', value: 'wrong' })
  // @ts-expect-error A required dispatch Context cannot be omitted.
  Story.story(ContextBlock, Story.init())
  // @ts-expect-error Context arguments retain their exact type.
  Story.story({ block: ContextBlock, updateContext: ['wrong'] }, Story.init())
  // @ts-expect-error Headless Blocks cannot be rendered by a Scene.
  Scene.scene(HeadlessBlock, Scene.init())
  // @ts-expect-error Scene routing delivery needs routing registration.
  Scene.scene(ContextBlock, Scene.init(), Scene.Navigation.changedUrl('/next'))
  Story.story(
    rawUpdate,
    Story.given(0),
    // @ts-expect-error Native runner Message checking is unchanged.
    Story.message({ _tag: 'UpdatedCount', value: 'wrong' }),
  )
}
