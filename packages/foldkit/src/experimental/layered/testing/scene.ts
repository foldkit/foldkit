import { type Effect, Predicate, type Layer } from 'effect'

import type {
  DeclaredRootBlock,
  SelectedBlockLayerFacts,
  SelectedLayeredRoot,
} from '../../../runtime/rootBlock.js'
import * as CoreScene from '../../../test/scene.js'
import type { Url } from '../../../url/index.js'
import type { FactsOf, ViewContract } from '../../constructed/contract.js'
import { resolveInMessageSteps } from './inMessage.js'
import type {
  DirectSubject,
  TestConfig,
  TestInMessage,
  TestInit,
  TestMessage,
  TestModel,
  TestOutMessage,
  TestSubject,
  SelectedTestConfig,
} from './subject.js'
import {
  initialStep,
  subjectInMessageUpdate,
  subjectUpdate,
} from './subject.js'
import {
  type BlockSubject,
  type TestBlock,
  type TestEffect,
  TestContract,
  withBlock,
} from './withBlock.js'

export * from '../../../test/scene.js'
export { type InitStep, init } from './initialState.js'
export { type InMessageStep, inMessage } from './inMessage.js'

type ViewInputs<Block extends BlockSubject> =
  FactsOf<TestContract<Block>>['view'] extends ViewContract<
    infer Inputs,
    'Element' | 'Document'
  >
    ? [Inputs] extends [void]
      ? Readonly<{ viewInputs?: never }>
      : Readonly<{ viewInputs: Inputs }>
    : Readonly<{ 'A Scene requires a Block with a view': never }>

type DefaultView<Block extends BlockSubject> =
  FactsOf<TestContract<Block>>['view'] extends ViewContract<
    void,
    'Element' | 'Document'
  >
    ? unknown
    : Readonly<{ 'Supply required viewInputs in the Scene config': never }>

type SelectedViewInputs<
  BlockValue extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> =
  SelectedBlockLayerFacts<BlockValue, LayerValue>['view'] extends ViewContract<
    infer Inputs,
    'Element' | 'Document'
  >
    ? [Inputs] extends [void]
      ? Readonly<{ viewInputs?: never }>
      : Readonly<{ viewInputs: Inputs }>
    : Readonly<{ 'A Scene requires a Block with a view': never }>

type InitialState<Block extends BlockSubject> =
  | TestInit<Block>
  | ReturnType<typeof CoreScene.given<TestModel<Block>>>

type Step<Block extends BlockSubject, Routing> = CoreScene.SceneStep<
  TestModel<Block>,
  TestMessage<Block>,
  TestOutMessage<Block>,
  TestBlock<Block>['subscriptions'],
  Routing,
  TestInMessage<Block>
>

/**
 * Acquires a Block graph and drives its default view with ordinary Scene
 * steps. Default Layers are scoped to the test; supplied implementation Layers
 * retain their ordinary sharing and lifetime. Handlers and Subscription Streams
 * are not executed. Supply required `viewInputs`, routing,
 * or dispatch context in a `{ block, ... }` config.
 */
export function scene<const Block extends BlockSubject>(
  block: DirectSubject<Block> & DefaultView<NoInfer<Block>>,
  initial: InitialState<NoInfer<Block>>,
  ...steps: ReadonlyArray<Step<NoInfer<Block>, undefined>>
): Effect.Effect<
  void,
  Effect.Error<TestEffect<Block, void>>,
  Effect.Services<TestEffect<Block, void>>
>
export function scene<
  const Block extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  config: Omit<
    SelectedTestConfig<Block, LayerValue>,
    'viewInputs' | 'routing'
  > &
    SelectedViewInputs<Block, LayerValue> &
    Readonly<{ routing?: undefined }>,
  initial: InitialState<SelectedLayeredRoot<Block, LayerValue>>,
  ...steps: ReadonlyArray<
    Step<SelectedLayeredRoot<Block, LayerValue>, undefined>
  >
): Effect.Effect<void, Layer.Error<LayerValue>, Layer.Services<LayerValue>>
export function scene<
  const Block extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  config: Omit<
    SelectedTestConfig<Block, LayerValue>,
    'viewInputs' | 'routing'
  > &
    SelectedViewInputs<Block, LayerValue> &
    Readonly<{
      routing: Readonly<{
        onUrlChange: (
          url: Url,
        ) => TestMessage<SelectedLayeredRoot<Block, LayerValue>>
        origin?: string
      }>
    }>,
  initial: InitialState<SelectedLayeredRoot<Block, LayerValue>>,
  ...steps: ReadonlyArray<
    Step<
      SelectedLayeredRoot<Block, LayerValue>,
      CoreScene.SceneRouting<
        TestMessage<SelectedLayeredRoot<Block, LayerValue>>
      >
    >
  >
): Effect.Effect<void, Layer.Error<LayerValue>, Layer.Services<LayerValue>>
export function scene<const Block extends BlockSubject>(
  config: TestConfig<Block> &
    ViewInputs<NoInfer<Block>> &
    Readonly<{
      routing: Readonly<{
        onUrlChange: (url: Url) => TestMessage<NoInfer<Block>>
        origin?: string
      }>
    }>,
  initial: InitialState<NoInfer<Block>>,
  ...steps: ReadonlyArray<
    Step<NoInfer<Block>, CoreScene.SceneRouting<TestMessage<NoInfer<Block>>>>
  >
): Effect.Effect<
  void,
  Effect.Error<TestEffect<Block, void>>,
  Effect.Services<TestEffect<Block, void>>
>
export function scene<
  const Block extends BlockSubject,
  const Routing extends
    | CoreScene.SceneRouting<TestMessage<NoInfer<Block>>>
    | undefined = undefined,
>(
  config: TestConfig<Block> &
    ViewInputs<NoInfer<Block>> &
    Readonly<{ routing?: Routing }>,
  initial: InitialState<NoInfer<Block>>,
  ...steps: ReadonlyArray<Step<NoInfer<Block>, NoInfer<Routing>>>
): Effect.Effect<
  void,
  Effect.Error<TestEffect<Block, void>>,
  Effect.Services<TestEffect<Block, void>>
>
export function scene(
  subject: TestSubject,
  initial: unknown,
  ...steps: ReadonlyArray<unknown>
): Effect.Effect<unknown, unknown, unknown> {
  const run = (block: object) => {
    const view = Reflect.get(block, 'view')

    if (!Predicate.isFunction(view)) {
      throw new Error('[foldkit] A Scene requires a Block with a default view.')
    }

    const inputs: unknown =
      'block' in subject ? Reflect.get(subject, 'viewInputs') : undefined
    const isViewInputsSupplied = 'block' in subject && 'viewInputs' in subject
    const render = isViewInputsSupplied
      ? (model: unknown, html: unknown): unknown =>
          Reflect.apply(view, undefined, [model, inputs, html])
      : view

    Reflect.apply(CoreScene.scene, undefined, [
      {
        update: subjectUpdate(subject, block),
        view: render,
        subscriptions: Reflect.get(block, 'subscriptions'),
        ...('block' in subject
          ? { routing: Reflect.get(subject, 'routing') }
          : {}),
      },
      initialStep(block, initial, CoreScene.__givenInit),
      ...resolveInMessageSteps(steps, subjectInMessageUpdate(subject, block)),
    ])
  }

  if ('layer' in subject) {
    return withBlock(subject, run)
  }

  return withBlock('block' in subject ? subject.block : subject, run)
}
