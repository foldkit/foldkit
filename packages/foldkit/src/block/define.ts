import { Predicate, Schema } from 'effect'

import type * as Mount from '../mount/index.js'
import type { AnyBinding } from './binding.js'
import type { ValidateCompleteMessageSelfContainedCodec } from './childEnvelope.js'
import type { Base, Composition, ValidateChildBindings } from './definition.js'
import type { CompositionDeliveryArguments } from './delivery.js'
import type { ValidateChildInitContext } from './initialization.js'
import {
  type DefineCommand,
  type DefineMount,
  type DefineMountStream,
  type DefineResource,
  makeAuthoringContext,
} from './named.js'
import type { Owner } from './owner.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

type RuntimeDefinitionContracts = Readonly<{
  Model: AnySelfContainedSchema
  Message: AnySelfContainedSchema
  OutMessage?: AnySchema
  ChildInitContext?: AnySchema
}>

const isDefinitionContractField = (field: string): boolean =>
  field === 'Model' ||
  field === 'Message' ||
  field === 'OutMessage' ||
  field === 'ChildInitContext'

const assertOptionalDefinitionSchema = (
  contracts: object,
  field: 'OutMessage' | 'ChildInitContext',
): void => {
  const schema = Reflect.get(contracts, field)
  if (schema !== undefined && !Schema.isSchema(schema)) {
    throw new Error(
      `[foldkit] Block.makeDefinition ${field} must be a Schema when present.`,
    )
  }
}

const assertDefinitionContracts: (
  contracts: unknown,
) => asserts contracts is RuntimeDefinitionContracts = contracts => {
  if (
    !Predicate.isObject(contracts) ||
    !Schema.isSchema(Reflect.get(contracts, 'Model')) ||
    !Schema.isSchema(Reflect.get(contracts, 'Message'))
  ) {
    throw new Error(
      '[foldkit] Block.makeDefinition requires Model and Message Schemas. Use Block.makeNamespace(id) to declare owned effects before generic contracts are available.',
    )
  }

  for (const field of Reflect.ownKeys(contracts)) {
    if (Predicate.isString(field) && !isDefinitionContractField(field)) {
      throw new Error(
        `[foldkit] Block.makeDefinition config field "${field}" is not supported. Expected only Model, Message, OutMessage, and ChildInitContext.`,
      )
    }
  }

  assertOptionalDefinitionSchema(contracts, 'OutMessage')
  assertOptionalDefinitionSchema(contracts, 'ChildInitContext')
}

/** Effect declaration helpers scoped to one Block identity. */
export type Primitives<Id extends string, Message = unknown> = Readonly<{
  /** Defines a Command whose runtime name is owned by this Block. */
  makeCommand: DefineCommand<Id, Message>
  /** Defines a one-shot Mount whose runtime name is owned by this Block. */
  makeMount: DefineMount<Id, Message>
  /** Defines a streaming Mount whose runtime name is owned by this Block. */
  makeMountStream: DefineMountStream<Id, Message>
  /** Defines a ManagedResource service identity owned by this Block. */
  makeResource: DefineResource<Id>
}>

/** Registers the child and Mount graph for init, update and view authoring. This step only records composition; it does not construct Layers or
 * start lifecycle work. */
export interface AuthoringMakeComposition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Concrete extends boolean = true,
  ChildInitContextSchema extends AnySchema | undefined = undefined,
> {
  (
    ...validation: CompositionDeliveryArguments<
      MessageSchema['Type'],
      readonly []
    >
  ): Composition<
    Owner<Id, Concrete>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    readonly [],
    readonly []
  >
  <
    const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition> =
      readonly [],
    const Children extends ReadonlyArray<AnyBinding> = readonly [],
  >(
    config: Readonly<{
      /** Mount definitions owned directly by this Block. Omitted Mounts default
       * to an empty registry. */
      mounts?: Mounts & Mount.PreciseMountRegistry<Mounts>
      /** Child Bindings registered in this Block's composition graph. Omitted
       * bindings default to an empty tuple. */
      bindings?: Children
    }> &
      ValidateChildInitContext<
        Children,
        ChildInitContextSchema extends AnySchema
          ? ChildInitContextSchema['Type']
          : never
      > &
      ValidateChildBindings<
        Children,
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
      > &
      ValidateCompleteMessageSelfContainedCodec<MessageSchema, Children>,
  ): Composition<
    Owner<Id, Concrete>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Mounts,
    Children
  >
}

/** Typed authoring helpers and owned effect declarations before graph
 * registration. */
export type AuthoringDefinition<
  Id extends string,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  Concrete extends boolean = true,
  ChildInitContextSchema extends AnySchema | undefined = undefined,
> = Omit<
  Base<
    Owner<Id, Concrete>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema
  >,
  'makeComposition'
> &
  Primitives<Id, MessageSchema['Type']> &
  Readonly<{
    /** Registers this Definition's child and Mount graph and returns the passive
     * Composition used to author its view and complete its Block. */
    makeComposition: AuthoringMakeComposition<
      Id,
      ModelSchema,
      MessageSchema,
      OutMessageSchema,
      Concrete,
      ChildInitContextSchema
    >
  }>

/** Establishes Model, Message, and optional OutMessage Schemas under an already
 * declared Block identity. */
export interface NamespaceMakeDefinition<
  Id extends string,
  Concrete extends boolean = true,
> {
  <
    const ModelSchema extends AnySelfContainedSchema,
    const MessageSchema extends AnySelfContainedSchema,
    const OutMessageSchema extends AnySchema,
    const ChildInitContextSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Schema for facts the Block can report to a parent. */
      OutMessage: OutMessageSchema
      /** Schema for the parent-prepared context shared with its child Binding init policies. */
      ChildInitContext?: ChildInitContextSchema
      key?: never
      InitArgs?: never
      mounts?: never
      bindings?: never
    }>,
  ): AuthoringDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Concrete,
    ChildInitContextSchema
  >
  <
    const ModelSchema extends AnySelfContainedSchema,
    const MessageSchema extends AnySelfContainedSchema,
    const ChildInitContextSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Schema for the parent-prepared context shared with its child Binding init policies. */
      ChildInitContext?: ChildInitContextSchema
      OutMessage?: never
      key?: never
      InitArgs?: never
      mounts?: never
      bindings?: never
    }>,
  ): AuthoringDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    undefined,
    Concrete,
    ChildInitContextSchema
  >
}

/** A Block namespace whose owned effects can be declared before a generic
 * factory establishes its Model and Message contracts. */
export type Namespace<
  Id extends string,
  Concrete extends boolean = true,
> = Primitives<Id> &
  Readonly<{
    /** Establishes typed contracts sharing this namespace's identity and owned effects. */
    makeDefinition: NamespaceMakeDefinition<Id, Concrete>
  }>

/** Creates a shared Block namespace before a generic factory establishes its Model and
 * Message contracts. The returned authoring value is passive configuration. */
export function makeNamespace(
  id: '' | `${string}/${string}` | `${string}::${string}`,
): never
export function makeNamespace<const Id extends string>(
  id: Id & (string extends Id ? never : unknown),
): Namespace<Id, true>
export function makeNamespace<const Id extends string>(
  id: Id,
): Namespace<Id, false>
export function makeNamespace(id: string): any {
  const authoring = makeAuthoringContext(id)
  const primitives = {
    makeCommand: authoring.makeCommand,
    makeMount: authoring.makeMount,
    makeMountStream: authoring.makeMountStream,
    makeResource: authoring.makeResource,
  }
  const makeDefinition = (contracts: unknown) => {
    assertDefinitionContracts(contracts)

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const base = authoring.define(contracts as never)
    const makeComposition = (
      graph: Readonly<{
        mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
        bindings?: ReadonlyArray<AnyBinding>
      }> = {},
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ) => base.makeComposition(graph as never)

    return { ...base, ...primitives, makeComposition }
  }

  return { ...primitives, makeDefinition }
}

/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function makeDefinition<
  const Id extends string,
  const ModelSchema extends AnySelfContainedSchema,
  const MessageSchema extends AnySelfContainedSchema,
  const OutMessageSchema extends AnySchema,
  const ChildInitContextSchema extends AnySchema | undefined = undefined,
>(
  id: (Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id) &
    (string extends Id ? never : unknown),
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    OutMessage: OutMessageSchema
    /** Schema for the parent-prepared context shared with its child Binding init policies. */
    ChildInitContext?: ChildInitContextSchema
    key?: never
    InitArgs?: never
    mounts?: never
    bindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  true,
  ChildInitContextSchema
>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function makeDefinition<
  const Id extends string,
  const ModelSchema extends AnySelfContainedSchema,
  const MessageSchema extends AnySelfContainedSchema,
  const ChildInitContextSchema extends AnySchema | undefined = undefined,
>(
  id: (Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id) &
    (string extends Id ? never : unknown),
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    /** Schema for the parent-prepared context shared with its child Binding init policies. */
    ChildInitContext?: ChildInitContextSchema
    OutMessage?: never
    key?: never
    InitArgs?: never
    mounts?: never
    bindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  undefined,
  true,
  ChildInitContextSchema
>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function makeDefinition<
  const Id extends string,
  const ModelSchema extends AnySelfContainedSchema,
  const MessageSchema extends AnySelfContainedSchema,
  const OutMessageSchema extends AnySchema,
  const ChildInitContextSchema extends AnySchema | undefined = undefined,
>(
  id: Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id,
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    OutMessage: OutMessageSchema
    /** Schema for the parent-prepared context shared with its child Binding init policies. */
    ChildInitContext?: ChildInitContextSchema
    key?: never
    InitArgs?: never
    mounts?: never
    bindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  false,
  ChildInitContextSchema
>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function makeDefinition<
  const Id extends string,
  const ModelSchema extends AnySelfContainedSchema,
  const MessageSchema extends AnySelfContainedSchema,
  const ChildInitContextSchema extends AnySchema | undefined = undefined,
>(
  id: Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id,
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    /** Schema for the parent-prepared context shared with its child Binding init policies. */
    ChildInitContext?: ChildInitContextSchema
    OutMessage?: never
    key?: never
    InitArgs?: never
    mounts?: never
    bindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  undefined,
  false,
  ChildInitContextSchema
>
export function makeDefinition(
  id: string,
  config: Readonly<{
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema
    ChildInitContext?: AnySchema
  }>,
): any {
  const blockNamespace = makeNamespace(id)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return blockNamespace.makeDefinition(config as never)
}
