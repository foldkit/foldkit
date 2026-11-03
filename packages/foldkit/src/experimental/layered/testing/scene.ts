import { type Effect, Predicate } from 'effect'

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
} from './subject.js'
import {
  initialStep,
  subjectBlock,
  subjectInMessageUpdate,
  subjectUpdate,
} from './subject.js'
import {
  type BlockSubject,
  type TestBlock,
  type TestEffect,
  withBlock,
} from './withBlock.js'

export * from '../../../test/scene.js'
export { type InitStep, init } from './initialState.js'
export { type InMessageStep, inMessage } from './inMessage.js'

type ViewInputs<Block extends BlockSubject> =
  FactsOf<Block>['view'] extends ViewContract<
    infer Inputs,
    'Element' | 'Document'
  >
    ? [Inputs] extends [void]
      ? Readonly<{ viewInputs?: never }>
      : Readonly<{ viewInputs: Inputs }>
    : Readonly<{ 'A Scene requires a Block with a view': never }>

type DefaultView<Block extends BlockSubject> =
  FactsOf<Block>['view'] extends ViewContract<void, 'Element' | 'Document'>
    ? unknown
    : Readonly<{ 'Supply required viewInputs in the Scene config': never }>

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
  return withBlock(subjectBlock(subject), block => {
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
        subscriptions: block.subscriptions,
        ...('block' in subject
          ? { routing: Reflect.get(subject, 'routing') }
          : {}),
      },
      initialStep(block, initial, CoreScene.__givenInit),
      ...resolveInMessageSteps(steps, subjectInMessageUpdate(subject, block)),
    ])
  })
}
