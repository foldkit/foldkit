import { Predicate } from 'effect'
import type { Effect, Layer, Schema } from 'effect'

import type { MakeCommandsStep } from '../../block/commandsStep.js'
import type { Primitives } from '../../block/define.js'
import type {
  DefineManagedResources,
  DefineStep,
  DefineSubscriptions,
} from '../../block/definition.js'
import type { DefineStepFields, DefineStepNoop } from '../../block/fieldStep.js'
import type { LocalMountsTypeId } from '../../block/identity.js'
import type { InstanceSchema } from '../../block/instanceSchema.js'
import {
  type NamespaceIdentity,
  namespaceSourceOf,
} from '../../block/namespaceIdentity.js'
import type { MakeOutMessageStep } from '../../block/outMessageStep.js'
import type { Owner } from '../../block/owner.js'
import type { HandlerOfHostDefinition } from '../../block/requirements.js'
import type {
  ConstructorBody,
  MakeDescriptorOutMessageFold,
  MakeDescriptorOutMessageForward,
  SourceOf,
  Validate,
} from '../constructed/authoring.js'
import type {
  DeclaredBlockReaderTypeId,
  DescriptorTypeId,
  PublicFacts,
} from '../constructed/contract.js'
import type { RelationshipConstructors } from '../constructed/relationshipAuthoring.js'
import type {
  ActualFacts,
  Block,
  ContractConfiguration,
  ContractGraph,
  DeclaredFacts,
  DefinitionConfigurationArguments,
  DefinitionFields,
  HostContractValidation,
  HostDefinitions,
  InMessageUpdateBodyValidation,
  MakeComposition,
  NativeBody,
  NominalId,
  OutValue,
  PublishedMountValidation,
  SelectedActualFacts,
  ValidateConstructorBody,
  ValidateFamilyHandlers,
  ValidateHandlerSelection,
  WithoutPendingHandlers,
} from './contract.js'
import type {
  ImplementationFacts,
  SelectedImplementationFacts,
} from './implementationFacts.js'
import type { ExactReadable } from './readableProvider.js'
import {
  type Declaration,
  type IsUnion,
  type LiteralContractId,
  type MessageFreeValidation,
  type OptionalSchema,
  makeDefinitionRuntime,
  snapshotDefinitionConfiguration,
} from './runtime.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

type ValidateLayerHandlerSelectionAlternative<
  LayerValue extends Layer.Any,
  Handlers,
> =
  Extract<
    Layer.Success<LayerValue>,
    ImplementationFacts<any, any, any>
  > extends ImplementationFacts<
    any,
    infer Facts extends PublicFacts,
    infer Pending
  >
    ? [Pending] extends [never]
      ? Readonly<{
          'This Block Layer has no pending host handlers': Handlers
        }>
      : Handlers extends Layer.Any
        ? ValidateFamilyHandlers<Pending, Handlers> &
            ValidateHandlerSelection<Facts, Handlers>
        : Readonly<{
            'Select the original host handlers for this Block Layer': Pending
          }>
    : Readonly<{
        'Select handlers from an original Block implementation Layer': LayerValue
      }>

type InvalidLayerHandlerSelection<
  LayerValue extends Layer.Any,
  Handlers,
> = LayerValue extends unknown
  ? unknown extends ValidateLayerHandlerSelectionAlternative<
      LayerValue,
      Handlers
    >
    ? never
    : ValidateLayerHandlerSelectionAlternative<LayerValue, Handlers>
  : never

/** @internal Validates each selected implementation Layer's original host handlers. */
export type ValidateLayerHandlerSelection<
  LayerValue extends Layer.Any,
  Handlers,
> =
  true extends IsUnion<LayerValue>
    ? [InvalidLayerHandlerSelection<LayerValue, Handlers>] extends [never]
      ? unknown
      : InvalidLayerHandlerSelection<LayerValue, Handlers>
    : ValidateLayerHandlerSelectionAlternative<LayerValue, Handlers>

/**
 * Checks a Block's constructor and returns its ordinary implementation Layer.
 *
 * The constructor acquires registered children and returns portable init, update,
 * optional InMessage update and view plans, together with local handler recipes.
 * Supply child implementation Layers with Effect's `Layer.provide`.
 *
 * Creating this Layer is passive. Building it constructs the executable graph;
 * init creates Model occurrences later, and the Runtime executes Commands and
 * starts Model-driven lifecycles. Request Services belong in handler constructors.
 */
export interface MakeLayer<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> {
  <const Body extends ConstructorBody, Error, Requirements>(
    constructor: Effect.Effect<Body, Error, Requirements> &
      ValidateConstructorBody<Body>,
    ...validation: NoInfer<
      readonly [
        ...Validate<
          NominalId<Id, Config['key']>,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          NativeBody<Body, Config>
        >,
        ...PublishedMountValidation<SourceOf<Body>, Config>,
        ...InMessageUpdateBodyValidation<Body, Config>,
        ...HostContractValidation<
          ActualFacts<MessageSchema, Body, Config>,
          DeclaredFacts<
            MessageSchema,
            OutMessageSchema,
            Config,
            Owner<NominalId<Id, Config['key']>, true>
          >,
          HostDefinitions<Body>
        >,
      ]
    >
  ): Block<
    Owner<NominalId<Id, Config['key']>, true>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    DeclaredFacts<
      MessageSchema,
      OutMessageSchema,
      Config,
      Owner<NominalId<Id, Config['key']>, true>
    >,
    Error,
    Requirements,
    ActualFacts<MessageSchema, NoInfer<Body>, Config>['subscriptions'],
    HostDefinitions<Body>
  >['layer'] extends infer GraphLayer extends Layer.Layer<any, any, any>
    ? LayerWithImplementationFacts<
        GraphLayer,
        Owner<NominalId<Id, Config['key']>, true>,
        SelectedActualFacts<MessageSchema, Body, Config>,
        HostDefinitions<Body>
      >
    : never
}

type LayerWithImplementationFacts<
  GraphLayer extends Layer.Layer<any, any, any>,
  OwnerValue,
  Facts extends PublicFacts,
  Pending,
> = Layer.Layer<
  | Layer.Success<GraphLayer>
  | ExactReadable<Layer.Success<GraphLayer>>
  | SelectedImplementationFacts<
      Layer.Success<GraphLayer>,
      OwnerValue,
      Facts,
      Pending
    >,
  Layer.Error<GraphLayer>,
  Layer.Services<GraphLayer>
>

/** @internal Adds the original host handler recipe to an ordinary Block Layer. */
export interface ProvideLayerHandlers<
  OwnerValue extends Owner<string>,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
> {
  <const Handlers extends Layer.Any>(
    handlers: Handlers,
  ): <const LayerValue extends Layer.Layer<any, any, any>>(
    layer: LayerValue &
      ValidateLayerHandlerSelection<LayerValue, Handlers> &
      (Extract<
        Layer.Success<LayerValue>,
        ImplementationFacts<any, any, any>
      > extends ImplementationFacts<OwnerValue, PublicFacts, any>
        ? unknown
        : Readonly<{ 'Layer belongs to this Block': LayerValue }>) &
      (Extract<
        Layer.Success<LayerValue>,
        ContractGraph<any, any, any, any, any>
      > extends ContractGraph<
        OwnerValue,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        any
      >
        ? unknown
        : Readonly<{ 'Layer belongs to this Block': LayerValue }>),
  ) => Layer.Layer<
    SelectedLayerOutput<Layer.Success<LayerValue>>,
    Layer.Error<LayerValue>,
    Layer.Services<LayerValue>
  >
}

type SelectedLayerPending<Success> =
  Extract<
    Success,
    ImplementationFacts<any, any, any>
  > extends ImplementationFacts<any, any, infer Pending>
    ? Pending
    : never

type SelectedLayerOutput<Success> = SelectedLayerOutputForPending<
  Success,
  SelectedLayerPending<Success>
>

type SelectedLayerOutputForPending<Success, Pending> =
  Success extends SelectedImplementationFacts<
    infer SelectedResult,
    infer OwnerValue,
    infer Facts extends PublicFacts,
    infer OriginalPending
  >
    ? SelectedImplementationFacts<
        SelectedLayerOutputForPending<SelectedResult, OriginalPending>,
        OwnerValue,
        WithoutPendingHandlers<Facts, HandlerOfHostDefinition<OriginalPending>>,
        never
      >
    : Success extends ContractGraph<
          infer OwnerValue,
          infer ModelSchema,
          infer MessageSchema,
          infer OutMessageSchema,
          infer Facts extends PublicFacts
        >
      ? ContractGraph<
          OwnerValue,
          ModelSchema,
          MessageSchema,
          OutMessageSchema,
          WithoutPendingHandlers<Facts, HandlerOfHostDefinition<Pending>>
        >
      : Success

type DeclaredGraph<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
> = ContractGraph<
  Owner<NominalId<Id, Config['key']>, true>,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  DeclaredFacts<
    MessageSchema,
    OutMessageSchema,
    Config,
    Owner<NominalId<Id, Config['key']>, true>
  >
>

/** @internal Names the unified authoring surface in consumer declarations. */
export interface UnifiedBlockFields<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  IncomingMessage,
  Acquisition,
  Readable,
>
  extends
    Pick<
      DefinitionFields<
        Id,
        ModelSchema,
        MessageSchema,
        OutMessageSchema,
        ChildInitContextSchema,
        Config
      >,
      typeof DescriptorTypeId
    >,
    Primitives<NominalId<Id, Config['key']>, MessageSchema['Type']>,
    RelationshipConstructors<
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      ChildInitContextSchema,
      'Provided',
      Owner<NominalId<Id, Config['key']>, true>
    > {
  readonly [DeclaredBlockReaderTypeId]: Effect.Effect<
    object,
    never,
    [Readable] extends [never] ? Acquisition : Readable
  >
  readonly owner: Owner<NominalId<Id, Config['key']>, true>
  readonly Model: ModelSchema
  readonly Instance: InstanceSchema<
    Owner<NominalId<Id, Config['key']>, true>,
    ModelSchema
  >
  readonly Message: MessageSchema
  readonly OutMessage: OutMessageSchema
  readonly mounts: ReadonlyArray<never>
  readonly bindings: readonly []
  readonly [LocalMountsTypeId]: readonly []
  readonly makeStep: DefineStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutValue<OutMessageSchema>,
    IncomingMessage
  >
  readonly makeFieldsStep: DefineStepFields<
    ModelSchema['Type'],
    MessageSchema['Type'],
    IncomingMessage,
    Owner<NominalId<Id, Config['key']>, true>
  >
  readonly makeCommandsStep: MakeCommandsStep<
    ModelSchema['Type'],
    MessageSchema['Type'],
    IncomingMessage
  >
  readonly makeNoopStep: DefineStepNoop<ModelSchema['Type']>
  readonly makeSubscriptions: DefineSubscriptions<
    NominalId<Id, Config['key']>,
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  readonly makeManagedResources: DefineManagedResources<
    NominalId<Id, Config['key']>,
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  readonly makeOutMessageFold: MakeDescriptorOutMessageFold<
    ModelSchema['Type'],
    MessageSchema['Type'],
    OutValue<OutMessageSchema>
  >
  readonly makeOutMessageForward: MakeDescriptorOutMessageForward<
    OutValue<OutMessageSchema>
  >
  readonly makeComposition: MakeComposition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Config
  >
  readonly makeLayer: MakeLayer<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Config
  >
  readonly provideHandlers: ProvideLayerHandlers<
    Owner<NominalId<Id, Config['key']>, true>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema
  >
}

type UnifiedIncomingMessage<
  MessageSchema extends AnySelfContainedSchema,
  Config,
> =
  | MessageSchema['Type']
  | (Config extends Readonly<{ InMessage: infer In extends AnySchema }>
      ? In['Type']
      : never)

/** @internal One unified Block with ordinary Layer completion helpers. */
export type UnifiedBlock<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Config extends ContractConfiguration,
  Acquisition = DeclaredGraph<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Config
  >,
  Readable = never,
> = UnifiedBlockFields<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  ChildInitContextSchema,
  Config,
  UnifiedIncomingMessage<MessageSchema, Config>,
  Acquisition,
  Readable
> &
  (ChildInitContextSchema extends AnySchema
    ? Readonly<{ ChildInitContext: ChildInitContextSchema }>
    : unknown) &
  (Config extends Readonly<{ InMessage: infer In extends AnySchema }>
    ? Readonly<{ InMessage: In }>
    : unknown) &
  (OutMessageSchema extends AnySchema
    ? Readonly<{
        makeOutMessageStep: MakeOutMessageStep<
          ModelSchema['Type'],
          MessageSchema['Type'],
          OutMessageSchema['Type'],
          UnifiedIncomingMessage<MessageSchema, Config>
        >
      }>
    : unknown)

/**
 * Declares a Block's Schemas and binds its typed authoring helpers once.
 *
 * Use this same value for parent Bindings, feature-local Commands and Steps,
 * and `makeComposition`. Composition registers relationships for independently
 * authored init, update, InMessage update and view plans. Complete an implementation
 * through the Block's `makeLayer` helper and give hosts its Block/Layer pair.
 *
 * The declaration is passive and its public type is independent of the inferred
 * implementation graph. Its unique symbol key preserves registration identity;
 * its display name does not replace that identity.
 */
export function makeUnifiedBlock<
  const Id extends string,
  const Key extends symbol,
  const Config extends Omit<Declaration, 'key'>,
>(
  id: (Id & LiteralContractId<Id>) | NamespaceIdentity<Id>,
  config: Config &
    Readonly<{ key: Key }> &
    (symbol extends Key ? never : true extends IsUnion<Key> ? never : unknown),
  ...validation: readonly [
    ...MessageFreeValidation<NoInfer<Config & Readonly<{ key: Key }>>>,
    ...DefinitionConfigurationArguments<
      NoInfer<Config & Readonly<{ key: Key }>>
    >,
  ]
): UnifiedBlock<
  Id,
  Config['Model'],
  Config['Message'],
  OptionalSchema<Config, 'OutMessage'>,
  OptionalSchema<Config, 'ChildInitContext'>,
  Config & Readonly<{ key: Key }>
>
export function makeUnifiedBlock(
  id: string | object,
  config: Declaration,
  ..._validation: ReadonlyArray<unknown>
): object {
  const snapshot = snapshotDefinitionConfiguration(config)
  const source = Predicate.isString(id) ? undefined : namespaceSourceOf(id)
  const block =
    source === undefined
      ? makeDefinitionRuntime(
          globalThis.String(id),
          snapshot,
          true,
          undefined,
          'Block',
        )
      : makeDefinitionRuntime(
          source.id,
          snapshot,
          true,
          source.makeDefinition({
            Model: snapshot.Model,
            Message: snapshot.Message,
            ...(snapshot.OutMessage === undefined
              ? {}
              : { OutMessage: snapshot.OutMessage }),
            ...(snapshot.ChildInitContext === undefined
              ? {}
              : { ChildInitContext: snapshot.ChildInitContext }),
          }),
          'Block',
        )

  Reflect.deleteProperty(block, 'contract')
  Reflect.deleteProperty(block, 'makeBlock')

  return block
}
