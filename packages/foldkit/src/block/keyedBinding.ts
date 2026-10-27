import { Array, Layer, Option, Predicate, Record, Schema } from 'effect'

import { type Command, mapMessages } from '../command/index.js'
import type {
  AnyBlockView,
  BoundBlockConfig,
  BoundBlockFields,
  BoundBlockView,
} from '../html/block.js'
import * as Update from '../update/index.js'
import { makeResultRecipe } from '../update/operationRecipe.js'
import type {
  AnyBinding,
  BindableBlock,
  Binding,
  BindingEvidence,
  BindingInitializer,
  BindingInspection,
  BindingOperationRecipe,
  BindingRequirement,
  BoundExposedOperations,
  HandlerRequirementsOfBinding,
  ParentBindingContract,
  ValidateEmbeddedViewMounts,
  WithoutBindingEvidence,
} from './binding.js'
import { assertValidBindingOperationNames } from './binding.js'
import {
  assertInitializedParentModel,
  registerBinding,
  runtimeBindingsOf,
} from './composition.js'
import { type DefaultViewTypeId, defaultViewOf } from './defaultView.js'
import {
  type BindingDeliveryEvidence,
  type BindingMessagePolicy,
  type RuntimeFromParentMessage,
  registerBindingDelivery,
  trackParentMessageMapper,
} from './delivery.js'
import {
  LocalMountsTypeId,
  ViewScopeTypeId,
  hostIdentitiesOf,
} from './identity.js'
import { makeBindingInitRecipe } from './initRecipe.js'
import type { InstanceKey } from './instanceContext.js'
import {
  assertRegisteredBinding,
  assertRegisteredInitialization,
  isRegisteredBinding,
  withOperationGraph,
} from './operationGraph.js'
import type { ValidateConcreteComposition } from './requirements.js'
import { assertSegment, qualifyCommand, qualifyLayer } from './scope.js'

/** Defines how a parent handles every OutMessage from one occurrence in a
 * keyed child collection. */
export type KeyedOutMessagePolicy<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  Key,
> =
  | Readonly<{
      /** Handles each child OutMessage in the parent. The returned Step receives
       * the parent Model after Foldkit has written the next child Model. */
      fold: (
        key: Key,
        outMessage: ChildOutMessage,
        context: Update.FoldContext<ChildMessage, ParentMessage, ParentModel>,
      ) => (model: ParentModel) => Readonly<{ model: ParentModel }>
      forward?: never
    }>
  | Readonly<{
      /** Maps selected child OutMessages into the parent's OutMessage union.
       * Return `undefined` for a named variant that stops at this parent. */
      forward: (key: Key, outMessage: ChildOutMessage) => unknown | undefined
      /** Also handles child OutMessages locally. A parent OutMessage returned by
       * this Step takes precedence over the value returned by `forward`. */
      fold?: (
        key: Key,
        outMessage: ChildOutMessage,
        context: Update.FoldContext<ChildMessage, ParentMessage, ParentModel>,
      ) => (model: ParentModel) => Readonly<{ model: ParentModel }>
    }>

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? unknown : never

type ValidateKeyedFold<
  Fold,
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  Key,
> = Fold extends (
  key: infer PolicyKey,
  outMessage: infer PolicyOutMessage,
  context: infer PolicyContext,
) => infer Step
  ? Equal<PolicyKey, Key> &
      Equal<PolicyOutMessage, ChildOutMessage> &
      (Update.FoldContext<
        ChildMessage,
        ParentMessage,
        ParentModel
      > extends PolicyContext
        ? unknown
        : never) &
      (Step extends (model: infer StepModel) => infer StepReturn
        ? Equal<StepModel, ParentModel> &
            (StepReturn extends Readonly<{ model: infer ReturnedModel }>
              ? Equal<ReturnedModel, ParentModel>
              : never)
        : never)
  : never

type ValidateKeyedForward<Forward, ChildOutMessage, Key> = Forward extends (
  key: infer PolicyKey,
  outMessage: infer PolicyOutMessage,
) => infer Forwarded
  ? Equal<PolicyKey, Key> &
      Equal<PolicyOutMessage, ChildOutMessage> &
      (IsAny<Forwarded> extends true
        ? never
        : IsUnknown<Forwarded> extends true
          ? never
          : [Forwarded] extends [void]
            ? never
            : [Exclude<Forwarded, undefined>] extends [never]
              ? never
              : unknown)
  : never

/** @internal Checks an inferred keyed Binding OutMessage policy. */
export type ValidateKeyedPolicy<
  Policy,
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  Key,
> =
  Policy extends Readonly<{ fold: infer Fold }>
    ? Fold extends (key: any, outMessage: any, context: any) => any
      ? ValidateKeyedFold<
          Fold,
          ParentModel,
          ChildMessage,
          ParentMessage,
          ChildOutMessage,
          Key
        > &
          (Policy extends Readonly<{ forward: infer Forward }>
            ? ValidateKeyedForward<Forward, ChildOutMessage, Key>
            : unknown)
      : never
    : Policy extends Readonly<{ forward: infer Forward }>
      ? ValidateKeyedForward<Forward, ChildOutMessage, Key>
      : never

/** Declares how one child Block is stored and identified in a parent-owned
 * collection. Foldkit uses the same declaration for updates, views, Messages,
 * and occurrence lifecycle work. */
export type KeyedBindingBaseConfig<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  Item,
  Key extends InstanceKey,
  Placement extends string,
> = Readonly<{
  /** Identifies this Binding within the parent's composition graph. Keyed
   * configs default to the child Block ID. It does not identify a DOM position
   * or one dynamic child occurrence. Every occurrence shares the placement,
   * and `key` distinguishes occurrences under it. Supply an override only to
   * avoid a sibling default collision or preserve a deliberate stable
   * identity. */
  placement?: Placement
  /** Enumerates the current collection from the parent Model. The returned keys
   * determine which child occurrences have active Subscription,
   * ManagedResource, and Mount scopes. */
  readAll: (model: ParentModel) => ReadonlyArray<Item>
  /** Returns the stable identity of an item. Keys must be unique in the current
   * collection and must be strings or finite numbers. Removing a key ends that
   * occurrence; reusing it later creates a new occurrence that cannot receive
   * callbacks or Command results captured by the earlier one. */
  key: (item: Item) => Key
  /** Reads the child Model stored by one collection item. */
  read: (item: Item) => BlockValue['Model']['Type']
  /** Writes the next child Model at `key` into the parent Model. The parent owns
   * collection membership and ordering; Foldkit calls this only after the key
   * resolves to a current item. */
  writeAt: (
    model: ParentModel,
    key: Key,
    nextChildModel: BlockValue['Model']['Type'],
  ) => ParentModel
  /** Adds optional activation gates for child Subscriptions while an occurrence
   * remains present. Gates do not disable updates or other lifecycle channels. */
  subscriptions?: Readonly<{
    /** Enables every child Subscription with one predicate, or selected named
     * Subscriptions with a partial record. Unspecified entries default to
     * enabled. */
    when?:
      | ((model: ParentModel, key: Key) => boolean)
      | Readonly<
          Partial<
            Record<
              keyof BlockValue['subscriptions'],
              (model: ParentModel, key: Key) => boolean
            >
          >
        >
  }>
}> &
  BindingMessagePolicy<
    BlockValue,
    ParentModel,
    ParentMessage,
    readonly [key: Key]
  >

/** The complete parent policy for a keyed Binding, including OutMessage
 * handling when the child Block can emit OutMessages. */
export type KeyedBindingConfig<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  Item,
  Key extends InstanceKey,
  Placement extends string,
  Policy = never,
> = KeyedBindingBaseConfig<
  BlockValue,
  ParentModel,
  ParentMessage,
  Item,
  Key,
  Placement
> &
  Readonly<{
    /** Handles every child OutMessage locally, forwards selected variants, or
     * does both. This property is required exactly when the child declares an
     * OutMessage type. */
    outMessage?: Policy
  }> &
  (BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
  }>
    ? Readonly<{ outMessage: Policy }> &
        ([Policy] extends [
          KeyedOutMessagePolicy<
            ParentModel,
            BlockValue['Message']['Type'],
            ParentMessage,
            ChildOutMessage,
            Key
          >,
        ]
          ? unknown
          : never)
    : Readonly<{ outMessage?: never }>)

type BlockId<BlockValue> =
  BlockValue extends Readonly<{
    owner: Readonly<{ id: infer Id extends string }>
  }>
    ? Id
    : never

type KeyedEmbed<
  BlockValue extends BindableBlock,
  ParentMessage,
  Placement extends string,
  Key,
  GeneratedSchema extends Schema.Top = never,
> = {
  <View extends AnyBlockView>(
    config: Omit<BoundBlockFields<View, ParentMessage>, 'toParentMessage'> &
      Readonly<{ key: Key }> &
      ValidateEmbeddedViewMounts<BlockValue, View> &
      ([Parameters<View>[0], BlockValue['Model']['Type']] extends [
        BlockValue['Model']['Type'],
        Parameters<View>[0],
      ]
        ? [
            Parameters<
              BoundBlockFields<View, ParentMessage>['toParentMessage']
            >[0],
            BlockValue['Message']['Type'],
          ] extends [
            BlockValue['Message']['Type'],
            Parameters<
              BoundBlockFields<View, ParentMessage>['toParentMessage']
            >[0],
          ]
          ? unknown
          : never
        : never),
  ): BoundBlockConfig<
    BoundBlockView<
      View,
      BindingRequirement<Placement, BlockValue, GeneratedSchema>
    >,
    ParentMessage
  >
} & (BlockValue extends Readonly<{
  [DefaultViewTypeId]: infer View extends AnyBlockView
}>
  ? {
      (
        config: Omit<
          BoundBlockFields<View, ParentMessage>,
          'toParentMessage' | 'view'
        > &
          Readonly<{ key: Key; view?: View }>,
      ): BoundBlockConfig<
        BoundBlockView<
          View,
          BindingRequirement<Placement, BlockValue, GeneratedSchema>
        >,
        ParentMessage
      >
    }
  : unknown)

type KeyedBoundExposedOperations<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  Key extends InstanceKey,
  Placement extends string,
  Policy,
  GeneratedSchema extends Schema.Top = never,
> = Readonly<{
  [Name in keyof BlockValue['operations']]: BoundExposedOperations<
    BlockValue,
    ParentModel,
    ParentMessage,
    Placement,
    Policy,
    GeneratedSchema
  >[Name] extends (...args: infer Args) => infer Output
    ? (key: Key, ...args: Args) => Output
    : never
}>

/** A registered child collection whose active keys receive independent
 * lifecycle scopes. The Binding is passive until a Runtime starts the composed
 * application. */
export type KeyedBinding<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  Key extends InstanceKey,
  Placement extends string,
  Policy,
  ContractModel = never,
  ContractMessage = never,
  ContractOutMessage = never,
  OutgoingMessage = ParentMessage,
  IncomingMessage = never,
  InitializerMessage = ContractMessage,
  GeneratedSchema extends Schema.Top = never,
> = WithoutBindingEvidence<
  Omit<
    Binding<BlockValue, ParentModel, ParentMessage, Placement, Policy>,
    | 'placement'
    | 'init'
    | 'fold'
    | 'embedView'
    | 'withOutMessagePolicy'
    | keyof BlockValue['operations']
  >
> &
  BindingEvidence<
    BlockValue,
    HandlerRequirementsOfBinding<
      Binding<BlockValue, ParentModel, ParentMessage, Placement, Policy>
    >,
    BindingInspection<
      Readonly<Record<never, never>>,
      Readonly<Record<never, never>>,
      BlockValue['mounts'],
      Layer.Layer<
        import('./scope.js').Qualify<
          Placement,
          Layer.Success<BlockValue['EffectsLayer']>
        >,
        Layer.Error<BlockValue['EffectsLayer']>,
        import('./scope.js').Qualify<
          Placement,
          Layer.Services<BlockValue['EffectsLayer']>
        >
      >
    >,
    true
  > &
  BindingDeliveryEvidence<OutgoingMessage, IncomingMessage, GeneratedSchema> &
  Readonly<{
    /** The stable identity of this child Binding in the parent Block's
     * composition graph. It is independent of DOM position. Every keyed
     * occurrence shares this placement; `key` distinguishes the occurrence
     * within it. */
    placement: Placement
    /** Creates a passive initialization recipe for one child occurrence. The
     * registered Composition later initializes the child, constructs the
     * complete parent Model, and lifts Commands to the parent Message type.
     * Additional parent Commands run after the initialized child's Commands. */
    init: BindingInitializer<
      BlockValue,
      ParentModel,
      ContractMessage,
      Placement,
      Key,
      true,
      InitializerMessage,
      GeneratedSchema
    >
    /** Produces an opaque connected result for the child update at `key`,
     * `writeAt`, lifted Commands, and OutMessage policy. Its Model input requires
     * this exact registered Binding graph. Checked execution leaves the parent
     * Model unchanged when the key is absent. */
    fold: (
      model: Update.GraphInput<
        ParentModel,
        BindingRequirement<Placement, BlockValue, GeneratedSchema>
      >,
      key: Key,
      ...args: Parameters<
        Binding<
          BlockValue,
          ParentModel,
          ParentMessage,
          Placement,
          Policy
        >['fold']
      > extends readonly [unknown, ...infer Args]
        ? Args
        : never
    ) => BindingOperationRecipe<
      ParentModel,
      ParentMessage,
      BlockValue['update'],
      Policy,
      Placement,
      BlockId<BlockValue>,
      BindingRequirement<Placement, BlockValue, GeneratedSchema>
    >
    /** Builds the `h.block` config for one keyed occurrence. The config carries
     * the key, placement identity, Message mapping, and Mount evidence. */
    embedView: KeyedEmbed<
      BlockValue,
      ParentMessage,
      Placement,
      Key,
      GeneratedSchema
    >
  }> &
  KeyedBoundExposedOperations<
    BlockValue,
    ParentModel,
    ParentMessage,
    Key,
    Placement,
    Policy,
    GeneratedSchema
  > &
  ([ContractModel] extends [never]
    ? unknown
    : ParentBindingContract<ContractModel, ContractMessage, ContractOutMessage>)

/** Creates one keyed Binding for every occurrence of a Block in a
 * parent-owned collection. */
export type BindEach<BlockValue extends BindableBlock> =
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
  }>
    ? <
        ParentModel,
        Item,
        const KeyFunction extends (...args: ReadonlyArray<any>) => any,
        const ToParentMessage extends (...args: ReadonlyArray<any>) => any,
        const Policy,
        const Placement extends string = BlockId<BlockValue>,
      >(
        config: KeyedBindingBaseConfig<
          BlockValue,
          ParentModel,
          ReturnType<ToParentMessage>,
          Item,
          Extract<ReturnType<KeyFunction>, InstanceKey>,
          Placement
        > &
          Readonly<{
            key: KeyFunction
            toParentMessage: ToParentMessage
            outMessage: Policy
          }> &
          ValidateKeyedPolicy<
            Policy,
            NoInfer<ParentModel>,
            NoInfer<BlockValue['Message']['Type']>,
            NoInfer<ReturnType<ToParentMessage>>,
            NoInfer<ChildOutMessage>,
            NoInfer<Extract<ReturnType<KeyFunction>, InstanceKey>>
          > &
          ValidateConcreteComposition<BlockValue>,
      ) => KeyedBinding<
        BlockValue,
        ParentModel,
        ReturnType<ToParentMessage>,
        Extract<ReturnType<KeyFunction>, InstanceKey>,
        Placement,
        Policy
      >
    : <
        ParentModel,
        ParentMessage,
        Item,
        Key extends InstanceKey,
        const Placement extends string = BlockId<BlockValue>,
      >(
        config: KeyedBindingConfig<
          BlockValue,
          ParentModel,
          ParentMessage,
          Item,
          Key,
          Placement
        > &
          ValidateConcreteComposition<BlockValue>,
      ) => KeyedBinding<
        BlockValue,
        ParentModel,
        ParentMessage,
        Key,
        Placement,
        never
      >

type AnyUpdateReturn = Readonly<{
  model: any
  commands?: ReadonlyArray<Command<any, never, any>> | undefined
  outMessage?: any
}>

type AnyProducer = (model: any, ...args: ReadonlyArray<any>) => AnyUpdateReturn

type RuntimeKeyedBindingInitConfig = Readonly<{
  key: InstanceKey
  args: ReadonlyArray<unknown>
  toParentModel: (childModel: unknown) => unknown
  commands?: ReadonlyArray<unknown> | undefined
}>

const assertKeyedBindingInitConfig: (
  value: unknown,
  placement: string,
) => asserts value is RuntimeKeyedBindingInitConfig = (value, placement) => {
  if (!Predicate.isObject(value)) {
    throw new Error(
      `[foldkit] Keyed child Binding "${placement}" init requires a configuration object with key, args, and toParentModel.`,
    )
  }
  const key = Reflect.get(value, 'key')
  if (
    !Predicate.isString(key) &&
    (typeof key !== 'number' || !globalThis.Number.isFinite(key))
  ) {
    throw new Error(
      `[foldkit] Keyed child Binding "${placement}" init.key must be a string or finite number.`,
    )
  }
  if (!globalThis.Array.isArray(Reflect.get(value, 'args'))) {
    throw new Error(
      `[foldkit] Keyed child Binding "${placement}" init.args must be an argument tuple.`,
    )
  }
  if (!Predicate.isFunction(Reflect.get(value, 'toParentModel'))) {
    throw new Error(
      `[foldkit] Keyed child Binding "${placement}" init.toParentModel must be a function that stores the initialized child in the parent Model.`,
    )
  }
  const commands = Reflect.get(value, 'commands')
  if (commands !== undefined && !globalThis.Array.isArray(commands)) {
    throw new Error(
      `[foldkit] Keyed child Binding "${placement}" init.commands must be a Commands collection when provided.`,
    )
  }
}

type RuntimeKeyedFoldContext = Readonly<{
  modelBeforeUpdate: any
  liftCommand: (command: Command<any, any, any>) => Command<any, any, any>
  liftCommands: (
    commands: ReadonlyArray<Command<any, any, any>>,
  ) => ReadonlyArray<Command<any, any, any>>
}>

type RuntimeKeyedOutMessagePolicy = Readonly<{
  fold?: (
    key: InstanceKey,
    outMessage: any,
    context: RuntimeKeyedFoldContext,
  ) => (model: any) => AnyUpdateReturn
  forward?: (key: InstanceKey, outMessage: any) => any | undefined
}>

type RuntimeKeyedSubscriptionWhen =
  | ((model: any, key: InstanceKey) => boolean)
  | Readonly<
      globalThis.Record<
        string,
        ((model: any, key: InstanceKey) => boolean) | undefined
      >
    >

type RuntimeKeyedBindingConfig = Readonly<{
  placement?: string
  readAll: (model: any) => ReadonlyArray<any>
  key: (item: any) => InstanceKey
  read: (item: any) => any
  writeAt: (model: any, key: InstanceKey, nextChildModel: any) => any
  toParentMessage: (key: InstanceKey, message: any) => any
  subscriptions?: Readonly<{ when?: RuntimeKeyedSubscriptionWhen }>
  outMessage?: RuntimeKeyedOutMessagePolicy
  validateChildKey?: (key: InstanceKey, childModel: any) => void
  validateSelectedKey?: (key: unknown) => void
  outgoingParentMessage?: Schema.Top
  fromParentMessage?: RuntimeFromParentMessage
}>

type RuntimeKeyedOperation = Readonly<{
  key: InstanceKey
  args: ReadonlyArray<any>
}>

type RuntimeKeyedChildFold = Readonly<{
  update: (childModel: any, operation: RuntimeKeyedOperation) => AnyUpdateReturn
  readAt: (model: any, key: InstanceKey) => Option.Option<any>
  writeAt: RuntimeKeyedBindingConfig['writeAt']
  toParentMessage: RuntimeKeyedBindingConfig['toParentMessage']
  foldOutMessage?: (
    key: InstanceKey,
    context: Update.FoldContext<any, any>,
  ) => (outMessage: any) => (model: any) => AnyUpdateReturn
  toParentOutMessage?: (
    key: InstanceKey,
  ) => (outMessage: any) => any | undefined
}>

type RuntimeKeyedFold = (
  model: any,
  key: InstanceKey,
  operation: RuntimeKeyedOperation,
) => AnyUpdateReturn

type RuntimeBoundKeyedFold = (
  model: any,
  key: InstanceKey,
  ...args: ReadonlyArray<any>
) => AnyUpdateReturn | Update.AnyResultRecipe

/** @internal Implements collection folding and embedding without constructing Layers. */
export const bindEach = <const BlockValue extends BindableBlock>(
  block: BlockValue,
  bindingConfig: RuntimeKeyedBindingConfig,
): AnyBinding => {
  const trackedMapper = trackParentMessageMapper(bindingConfig.toParentMessage)
  const config = {
    ...bindingConfig,
    toParentMessage: trackedMapper.toParentMessage,
  }
  const placement = config.placement ?? block.owner.id
  const readAll = (model: any): ReadonlyArray<any> => {
    const items = config.readAll(model)
    if (!globalThis.Array.isArray(items)) {
      throw new Error(
        `[foldkit] Keyed child Binding "${placement}" readAll must return an array.`,
      )
    }

    return items
  }
  const isChildModel = Reflect.apply(Schema.is, undefined, [block.Model])
  const equivalentChildModel = Reflect.apply(Schema.toEquivalence, undefined, [
    block.Model,
  ])
  assertSegment(placement)
  assertValidBindingOperationNames(block.operations)
  const allowedIdentities = hostIdentitiesOf(block)
  const keyOf = (item: any): InstanceKey => {
    const key = config.key(item)
    config.validateSelectedKey?.(key)
    return key
  }
  const readAt = (model: any, key: InstanceKey): Option.Option<any> =>
    Option.map(
      Array.findFirst(readAll(model), item => keyOf(item) === key),
      config.read,
    )
  const scopeReturn = (
    output: AnyUpdateReturn,
    key: InstanceKey,
    isInitialization = false,
  ): AnyUpdateReturn =>
    output.commands === undefined
      ? output
      : Update.withOutMessage(
          {
            model: output.model,
            commands: output.commands.map(command =>
              qualifyCommand(
                placement,
                command,
                block.owner,
                {
                  binding,
                  key,
                  isInitialization,
                },
                allowedIdentities,
              ),
            ),
          },
          output.outMessage,
        )
  const liftContext = (
    key: InstanceKey,
    context: Update.FoldContext<any, any>,
    modelBeforeUpdate: any,
  ): RuntimeKeyedFoldContext => ({
    modelBeforeUpdate,
    liftCommand: (command: Command<any, any, any>) =>
      context.liftCommand(
        qualifyCommand(
          placement,
          command,
          block.owner,
          { binding, key },
          allowedIdentities,
        ),
      ),
    liftCommands: (commands: ReadonlyArray<Command<any, any, any>>) =>
      context.liftCommands(
        commands.map(command =>
          qualifyCommand(
            placement,
            command,
            block.owner,
            { binding, key },
            allowedIdentities,
          ),
        ),
      ),
  })
  const toChildFoldAt = (
    producer: AnyProducer,
    modelBeforeUpdate: any,
  ): RuntimeKeyedChildFold => ({
    update: (childModel, operation) =>
      scopeReturn(
        withOperationGraph(runtimeBindingsOf(block), () =>
          producer(childModel, ...operation.args),
        ),
        operation.key,
      ),
    readAt,
    writeAt: config.writeAt,
    toParentMessage: config.toParentMessage,
    ...(config.outMessage?.fold === undefined
      ? {}
      : {
          foldOutMessage:
            (key: InstanceKey, context: Update.FoldContext<any, any>) =>
            (outMessage: any) =>
              config.outMessage!.fold!(
                key,
                outMessage,
                liftContext(key, context, modelBeforeUpdate),
              ),
        }),
    ...(config.outMessage?.forward === undefined
      ? {}
      : {
          toParentOutMessage: (key: InstanceKey) => (outMessage: any) =>
            config.outMessage!.forward!(key, outMessage),
        }),
  })
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const makeChildFoldAt = Update.foldChildAt as unknown as (
    childFold: RuntimeKeyedChildFold,
  ) => RuntimeKeyedFold
  const makeFold = (producer: AnyProducer): RuntimeBoundKeyedFold => {
    const execute = (
      model: any,
      key: InstanceKey,
      args: ReadonlyArray<any>,
    ) => {
      return makeChildFoldAt(toChildFoldAt(producer, model))(model, key, {
        key,
        args,
      })
    }

    return (model, key, ...args) =>
      isRegisteredBinding(binding)
        ? execute(model, key, args)
        : makeResultRecipe(activeModel => {
            assertRegisteredBinding(binding, placement)
            return execute(activeModel, key, args)
          })
  }
  const fold = makeFold(block.update)
  const exposedOperations = Record.map(block.operations, producer => {
    const foldStep = makeFold(producer)
    return (key: InstanceKey, ...args: ReadonlyArray<any>) =>
      (model: any) =>
        foldStep(model, key, ...args)
  })
  const requireKey = (key: InstanceKey | undefined): InstanceKey => {
    if (key === undefined) {
      throw new Error('[foldkit] Keyed Block bindings require an instance key.')
    }

    return key
  }
  const EffectsLayer = qualifyLayer(
    placement,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    block.EffectsLayer as Layer.Layer<
      Layer.Success<BlockValue['EffectsLayer']>,
      Layer.Error<BlockValue['EffectsLayer']>,
      Layer.Services<BlockValue['EffectsLayer']>
    >,
  )
  const initChild = (key: InstanceKey, ...args: ReadonlyArray<any>) => {
    assertRegisteredInitialization(binding, placement)
    const initialChild = withOperationGraph(runtimeBindingsOf(block), () =>
      block.init(...args),
    )
    config.validateChildKey?.(key, initialChild.model)
    const childInit = scopeReturn(initialChild, key, true)
    return {
      model: childInit.model,
      commands: mapMessages(childInit.commands, message =>
        config.toParentMessage(key, message),
      ),
    }
  }
  const binding = {
    placement,
    init: (initial: unknown) => {
      assertKeyedBindingInitConfig(initial, placement)
      const { key, toParentModel } = initial
      const args = [...initial.args]
      const commands = [...(initial.commands ?? [])]

      return makeBindingInitRecipe(binding, () => {
        const childInit = initChild(key, ...args)
        const model = toParentModel(childInit.model)
        assertInitializedParentModel(binding, placement, model)
        let matchingKeyCount = 0
        let selectedChild: unknown
        try {
          for (const item of readAll(model)) {
            if (keyOf(item) === key) {
              matchingKeyCount += 1
              selectedChild = config.read(item)
            }
          }
        } catch (cause) {
          throw new Error(
            `[foldkit] Keyed child Binding "${placement}" init.toParentModel returned a parent Model that its collection accessors could not inspect at key "${globalThis.String(key)}".`,
            { cause },
          )
        }
        if (
          matchingKeyCount !== 1 ||
          !isChildModel(selectedChild) ||
          !equivalentChildModel(selectedChild, childInit.model)
        ) {
          throw new Error(
            `[foldkit] Keyed child Binding "${placement}" init.toParentModel must store exactly one occurrence at key "${globalThis.String(key)}" and preserve the initialized child Model through the parent Model Schema.`,
          )
        }
        return {
          model,
          commands: [...(childInit.commands ?? []), ...commands],
        }
      })
    },
    fold,
    embedView: <View extends AnyBlockView>(
      embedConfig: Omit<
        BoundBlockFields<View, any>,
        'toParentMessage' | 'view'
      > &
        Readonly<{ key: InstanceKey; view?: View }>,
    ): BoundBlockConfig<View, any> => {
      const { key, ...fields } = embedConfig
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const boundConfig = {
        ...fields,
        view: fields.view ?? defaultViewOf(block),
        toParentMessage: (message: any) => config.toParentMessage(key, message),
        [ViewScopeTypeId]: {
          placement,
          binding,
          key,
          identity: {
            owner: block.owner,
            mounts: block[LocalMountsTypeId],
            bindings: runtimeBindingsOf(block),
          },
        },
      } as unknown as BoundBlockConfig<View, any>
      return boundConfig
    },
    ...exposedOperations,
  }
  registerBinding(binding, {
    block,
    init: (key, args) => initChild(requireKey(key), ...args),
    select: model =>
      readAll(model).map(item => ({
        key: keyOf(item),
        model: config.read(item),
      })),
    toParentMessage: (key, message) =>
      config.toParentMessage(requireKey(key), message),
    subscriptionWhen: (model, key, name) => {
      const instanceKey = requireKey(key)
      const when = config.subscriptions?.when
      if (typeof when === 'function') {
        return when(model, instanceKey)
      }
      return when?.[name]?.(model, instanceKey) ?? true
    },
    inspection: {
      subscriptions: {},
      managedResources: {},
      mounts: block.mounts,
      EffectsLayer,
    },
  })
  registerBindingDelivery(binding, trackedMapper, {
    ...(config.outgoingParentMessage === undefined
      ? {}
      : { outgoingParentMessage: config.outgoingParentMessage }),
    ...(config.fromParentMessage === undefined
      ? {}
      : { fromParentMessage: config.fromParentMessage }),
  })
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return binding as unknown as AnyBinding
}
