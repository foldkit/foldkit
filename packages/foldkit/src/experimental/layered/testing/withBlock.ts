import { Effect, Layer, Predicate, type Schema, type Scope } from 'effect'

import { defaultViewOf } from '../../../block/defaultView.js'
import type { LayerOutputs } from '../../../block/layerOutputs.js'
import type { BlockView, DocumentView } from '../../../html/index.js'
import {
  type DeclaredRootBlock,
  type LayeredContract,
  type LayeredRoot,
  type SelectedBlockLayerFacts,
  type SelectedLayeredRoot,
  type ValidateSelectedLayer,
  rootConstructionOf,
} from '../../../runtime/rootBlock.js'
import {
  type AcquiredTestBlock,
  registerTestGraph,
} from '../../../test/testGraph.js'
import type {
  ConstructorEffectOf,
  DeclaredBlockReaderTypeId,
  DescriptorContract,
  Executable,
  ExecutableOf,
  FactsOf,
  ImplementationSubscriptionsOf,
  SubscriptionsFromFacts,
  ViewContract,
} from '../../constructed/contract.js'
import {
  acquisitionOf,
  descriptorConstructorOf,
} from '../../constructed/symbolic.js'
import type { PendingHostHandlersTypeId } from '../../contracted/contract.js'
import { selectLayerForTesting } from '../../contracted/runtime.js'

type TestSource = Readonly<{
  owner: unknown
  Model: unknown
  Message: unknown
  OutMessage: unknown
  InMessage?: Schema.Top | undefined
  init: (...args: ReadonlyArray<never>) => unknown
  update: (...args: ReadonlyArray<never>) => unknown
  inMessageUpdate?: ((...args: ReadonlyArray<never>) => unknown) | undefined
  operations: unknown
  EffectsLayer: Layer.Any
}>

export type TestContract<Block extends BlockSubject> =
  Block extends BlockLayerSubject<infer Declared, infer SelectedLayer>
    ? LayeredContract<SelectedLayeredRoot<Declared, SelectedLayer>>
    : Block extends DescriptorSubject
      ? Block
      : Block extends LayeredRoot
        ? LayeredContract<Block>
        : never

/** @internal An original descriptor acquired through its getter or default Layer. */
type DescriptorSubject =
  | (DescriptorContract &
      Readonly<{
        get: Effect.Effect<TestSource, unknown, unknown>
      }>)
  | (DescriptorContract &
      Readonly<{
        [DeclaredBlockReaderTypeId]: Effect.Effect<object, unknown, unknown>
      }>)

export type BlockSubject =
  | DescriptorSubject
  | LayeredRoot
  | BlockLayerSubject<DeclaredRootBlock, Layer.Layer<any, any, any>>

/** @internal A test subject pairing one public Block with its selected Layer. */
export type BlockLayerSubject<
  Block extends DeclaredRootBlock,
  LayerValue extends Layer.Layer<any, any, any>,
> = Readonly<{ block: Block; layer: LayerValue }>

/** @internal Ordinary implementation tests require a selected host-provider contract. */
export type ValidateTestBlock<Block> =
  Block extends BlockLayerSubject<infer Declared, infer SelectedLayer>
    ? ValidateSelectedLayer<Declared, SelectedLayer>
    : Block extends Readonly<{
          [PendingHostHandlersTypeId]: infer Pending
        }>
      ? [Pending] extends [never]
        ? unknown
        : Readonly<{
            'Block tests must select the original host handlers with provideHandlers': Pending
          }>
      : unknown

type DispatchMessageOf<Block extends BlockSubject> =
  TestExecutable<Block> extends Readonly<{
    Message: infer MessageSchema extends Schema.Top
  }>
    ? MessageSchema['Type']
    : never

type RenderFunction<View> = View extends (...args: infer Args) => infer Rendered
  ? (...args: Args) => Rendered
  : never

type TestView<Block extends BlockSubject> =
  FactsOf<TestContract<Block>>['view'] extends ViewContract<
    infer Inputs,
    infer Kind
  >
    ? Readonly<{
        view: RenderFunction<
          Kind extends 'Document'
            ? DocumentView<
                TestContract<Block>['Model']['Type'],
                DispatchMessageOf<Block>,
                FactsOf<TestContract<Block>>['mountRequirements']
              >
            : BlockView<
                TestContract<Block>['Model']['Type'],
                DispatchMessageOf<Block>,
                Inputs,
                FactsOf<TestContract<Block>>['mountRequirements']
              >
        >
      }>
    : Readonly<{ view?: never }>

/**
 * The acquired pure operations and default view available inside `withBlock`.
 * This fixture is for Story and Scene; it is not a child connection handle.
 */
type TestExecutable<Block extends BlockSubject> =
  Block extends BlockLayerSubject<infer Declared, infer SelectedLayer>
    ? Executable<
        Declared['owner'],
        Declared['Model'],
        Declared['Message'],
        Declared['OutMessage'],
        SelectedBlockLayerFacts<Declared, SelectedLayer>
      >
    : Block extends DescriptorSubject
      ? ExecutableOf<Block>
      : TestContract<Block>

export type TestBlock<Block extends BlockSubject> = Pick<
  TestExecutable<Block>,
  Exclude<keyof TestSource, 'InMessage' | 'inMessageUpdate'>
> &
  Pick<
    TestExecutable<Block>,
    Extract<'InMessage' | 'inMessageUpdate', keyof TestExecutable<Block>>
  > &
  TestView<Block> &
  AcquiredTestBlock<TestContract<Block>['owner']> &
  Readonly<{
    subscriptions: SubscriptionsFromFacts<
      TestContract<Block>['Model']['Type'],
      DispatchMessageOf<Block>,
      ImplementationSubscriptionsOf<TestContract<Block>>
    >
  }>

type CallbackValue<Output> =
  Output extends Effect.Effect<infer Value, unknown, unknown> ? Value : Output

type CallbackError<Output> =
  Output extends Effect.Effect<unknown, infer Error, unknown> ? Error : never

type CallbackRequirements<Output> =
  Output extends Effect.Effect<unknown, unknown, infer Requirements>
    ? Requirements
    : never

type SynchronousOrEffect<Output> = [
  Extract<Output, PromiseLike<unknown>>,
] extends [never]
  ? unknown
  : Readonly<{
      'withBlock callbacks return a synchronous value or an Effect': never
    }>

type DefaultLayer<Block> =
  Block extends Readonly<{
    layer: infer GraphLayer extends Layer.Any
  }>
    ? GraphLayer
    : never

type TestConstruction<Block> =
  Block extends Readonly<{ get: Effect.Effect<object, any, any> }>
    ? Block['get']
    : ConstructorEffectOf<Block>

/** @internal The construction and callback channels retained by a scoped test. */
export type TestEffect<Block extends BlockSubject, Output> = Effect.Effect<
  CallbackValue<Output>,
  | Layer.Error<DefaultLayer<Block>>
  | (Block extends DescriptorSubject
      ? Effect.Error<TestConstruction<Block>>
      : never)
  | CallbackError<Output>,
  Exclude<
    | Layer.Services<DefaultLayer<Block>>
    | Exclude<
        | (Block extends DescriptorSubject
            ? Effect.Services<TestConstruction<Block>>
            : never)
        | CallbackRequirements<Output>,
        LayerOutputs<DefaultLayer<Block>>
      >,
    Scope.Scope
  >
>

const toTestBlock = (executable: unknown): object => {
  if (!Predicate.isObject(executable)) {
    throw new Error('[foldkit] A test fixture requires an acquired Block.')
  }

  const view = defaultViewOf(executable)
  const { managedResources, subscriptions } = acquisitionOf(executable).block

  const facade = Object.freeze({
    owner: Reflect.get(executable, 'owner'),
    Model: Reflect.get(executable, 'Model'),
    Message: Reflect.get(executable, 'Message'),
    OutMessage: Reflect.get(executable, 'OutMessage'),
    InMessage: Reflect.get(executable, 'InMessage'),
    init: Reflect.get(executable, 'init'),
    update: Reflect.get(executable, 'update'),
    inMessageUpdate: Reflect.get(executable, 'inMessageUpdate'),
    operations: Reflect.get(executable, 'operations'),
    EffectsLayer: Reflect.get(executable, 'EffectsLayer'),
    managedResources,
    subscriptions,
    ...(view === undefined ? {} : { view }),
  })

  registerTestGraph(facade, acquisitionOf(executable).block)

  return facade
}

/**
 * Acquires one private graph and scopes the test callback. Default Layers stay
 * alive through the callback; provided implementation Layers retain their
 * ordinary sharing and lifetime.
 * Ordinary Story and Scene callbacks stay synchronous. Return an Effect when
 * the test needs Services, typed failure, interruption, or scoped resources.
 * Promise callbacks are unsupported because they escape Effect's scope.
 * Handler Layers are not built, so pure tests need no handler Service mocks.
 * Descriptors with a default Layer build it automatically. Supply a declared
 * contract's implementation through ordinary `Effect.provide`.
 *
 * @example
 * ```ts
 * await Effect.runPromise(
 *   withBlock({ block: ApplicationBlock, layer }, block => {
 *     story(block.update, given(block.init().model), message(Message.ClickedIncrement()))
 *   }),
 * )
 * ```
 */
export function withBlock<
  Block extends DescriptorSubject | LayeredRoot,
  Output,
>(
  block: Block & ValidateTestBlock<NoInfer<Block>>,
  use: (
    block: TestBlock<NoInfer<Block>>,
  ) => Output & SynchronousOrEffect<Output>,
): Effect.Effect<
  Effect.Success<TestEffect<Block, Output>>,
  Effect.Error<TestEffect<Block, Output>>,
  Effect.Services<TestEffect<Block, Output>>
>
export function withBlock<
  const Block extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
  Output,
>(
  selection: BlockLayerSubject<Block, LayerValue> &
    Readonly<{
      layer: NoInfer<ValidateSelectedLayer<Block, LayerValue>>
    }>,
  use: (
    block: TestBlock<SelectedLayeredRoot<Block, LayerValue>>,
  ) => Output & SynchronousOrEffect<Output>,
): Effect.Effect<
  Effect.Success<TestEffect<SelectedLayeredRoot<Block, LayerValue>, Output>>,
  Effect.Error<TestEffect<SelectedLayeredRoot<Block, LayerValue>, Output>>,
  Effect.Services<TestEffect<SelectedLayeredRoot<Block, LayerValue>, Output>>
>
export function withBlock(
  blockOrSelection:
    | BlockSubject
    | BlockLayerSubject<DeclaredRootBlock, Layer.Layer<any, any, any>>,
  use: (block: never) => unknown,
): Effect.Effect<unknown, unknown, unknown> {
  const isLayerSelection = (
    value: typeof blockOrSelection,
  ): value is BlockLayerSubject<
    DeclaredRootBlock,
    Layer.Layer<any, any, any>
  > =>
    'block' in value &&
    'layer' in value &&
    rootConstructionOf(value) === undefined

  const block = isLayerSelection(blockOrSelection)
    ? selectTestLayer(blockOrSelection)
    : blockOrSelection

  return Effect.suspend(() => {
    const construction = rootConstructionOf(block)
    const construct = descriptorConstructorOf(block)
    const useAcquired = (executable: object) =>
      Effect.suspend(() => {
        if (
          construction === undefined &&
          acquisitionOf(executable).descriptor !== block
        ) {
          return Effect.die(
            new Error(
              "[foldkit] The test acquired another Block descriptor's implementation.",
            ),
          )
        }

        const output: unknown = Reflect.apply(use, undefined, [
          toTestBlock(executable),
        ])

        if (Effect.isEffect(output)) {
          return output
        }

        if (Predicate.isPromiseLike(output)) {
          return Effect.die(
            new Error(
              '[foldkit] withBlock callbacks must return a synchronous value or an Effect.',
            ),
          )
        }

        return Effect.succeed(output)
      })

    if (construction !== undefined) {
      return Effect.scoped(
        Effect.flatMap(
          construction.readForTesting ?? construction.read,
          useAcquired,
        ).pipe(
          Effect.scoped,
          Effect.provide([construction.layer], { local: true }),
        ),
      )
    }

    if (construct !== undefined) {
      return Effect.scoped(
        Effect.flatMap(Effect.suspend(construct), useAcquired),
      )
    }

    return Effect.die(
      new Error(
        '[foldkit] withBlock requires an original registered Block implementation or contract.',
      ),
    )
  })
}

const selectTestLayer = <
  const Block extends DeclaredRootBlock,
  const LayerValue extends Layer.Layer<any, any, any>,
>(
  selection: BlockLayerSubject<Block, LayerValue>,
) => selectLayerForTesting(selection.block, selection.layer)
