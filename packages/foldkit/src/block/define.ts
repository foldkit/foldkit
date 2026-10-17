import type { Schema } from 'effect'

import type * as Mount from '../mount/index.js'
import type { AnyBinding } from './binding.js'
import type { Base, Composition, ValidateChildBindings } from './definition.js'
import type { ValidateChildStartup } from './initialization.js'
import {
  type DefineCommand,
  type DefineMount,
  type DefineMountStream,
  type DefineResource,
  makeAuthoringContext,
} from './named.js'
import type { Owner } from './owner.js'

type AnySchema = Schema.Codec<any, any, any, any>

/** Effect declaration helpers scoped to one Block identity. */
export type Primitives<Id extends string, Message = unknown> = Readonly<{
  /** Defines a Command whose runtime name is owned by this Block. */
  command: DefineCommand<Id, Message>
  /** Defines a one-shot Mount whose runtime name is owned by this Block. */
  mount: DefineMount<Id, Message>
  /** Defines a streaming Mount whose runtime name is owned by this Block. */
  mountStream: DefineMountStream<Id, Message>
  /** Defines a ManagedResource service identity owned by this Block. */
  resource: DefineResource<Id>
}>

/** Registers the child and Mount graph for init, update and view authoring. This step only records composition; it does not construct Layers or
 * start lifecycle work. */
export interface AuthoringMakeComposition<
  Id extends string,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Concrete extends boolean = true,
  StartupSchema extends AnySchema | undefined = undefined,
> {
  (): Composition<
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
       * childBindings default to an empty tuple. */
      childBindings?: Children
    }> &
      ValidateChildStartup<
        Children,
        StartupSchema extends AnySchema ? StartupSchema['Type'] : never
      > &
      ValidateChildBindings<
        Children,
        ModelSchema['Type'],
        MessageSchema['Type'],
        OutMessageSchema extends AnySchema ? OutMessageSchema['Type'] : never
      >,
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  Concrete extends boolean = true,
  StartupSchema extends AnySchema | undefined = undefined,
> = Omit<
  Base<
    Owner<Id, Concrete>,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    StartupSchema
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
      StartupSchema
    >
  }>

/** Establishes Model, Message, and optional OutMessage Schemas under an already
 * declared Block identity. */
export interface DefineContracts<
  Id extends string,
  Concrete extends boolean = true,
> {
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const OutMessageSchema extends AnySchema,
    const StartupSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Schema for facts the Block can report to a parent. */
      OutMessage: OutMessageSchema
      /** Shared input Schema for Binding startup selectors, separate from Model state. */
      Startup?: StartupSchema
      mounts?: never
      childBindings?: never
    }>,
  ): AuthoringDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    Concrete,
    StartupSchema
  >
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const StartupSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** Schema for the Block's Model. */
      Model: ModelSchema
      /** Schema for facts the Block's update function handles. */
      Message: MessageSchema
      /** Shared input Schema for Binding startup selectors, separate from Model state. */
      Startup?: StartupSchema
      OutMessage?: never
      mounts?: never
      childBindings?: never
    }>,
  ): AuthoringDefinition<
    Id,
    ModelSchema,
    MessageSchema,
    undefined,
    Concrete,
    StartupSchema
  >
}

/** A Block identity whose owned effects can be declared before a generic
 * factory establishes its Model and Message contracts. */
export type Authoring<
  Id extends string,
  Concrete extends boolean = true,
> = Primitives<Id> &
  Readonly<{
    /** Establishes a typed Definition under this existing Block identity. */
    define: DefineContracts<Id, Concrete>
  }>

/** Defines a Block identity before a generic factory establishes its Model and
 * Message contracts. The returned authoring value is passive configuration. */
export function define(
  id: '' | `${string}/${string}` | `${string}::${string}`,
): never
export function define<const Id extends string>(
  id: Id & (string extends Id ? never : unknown),
): Authoring<Id, true>
export function define<const Id extends string>(id: Id): Authoring<Id, false>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function define<
  const Id extends string,
  const ModelSchema extends AnySchema,
  const MessageSchema extends AnySchema,
  const OutMessageSchema extends AnySchema,
  const StartupSchema extends AnySchema | undefined = undefined,
>(
  id: (Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id) &
    (string extends Id ? never : unknown),
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    OutMessage: OutMessageSchema
    /** Shared input Schema for Binding startup selectors, separate from Model state. */
    Startup?: StartupSchema
    mounts?: never
    childBindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  true,
  StartupSchema
>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function define<
  const Id extends string,
  const ModelSchema extends AnySchema,
  const MessageSchema extends AnySchema,
  const StartupSchema extends AnySchema | undefined = undefined,
>(
  id: (Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id) &
    (string extends Id ? never : unknown),
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    /** Shared input Schema for Binding startup selectors, separate from Model state. */
    Startup?: StartupSchema
    OutMessage?: never
    mounts?: never
    childBindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  undefined,
  true,
  StartupSchema
>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function define<
  const Id extends string,
  const ModelSchema extends AnySchema,
  const MessageSchema extends AnySchema,
  const OutMessageSchema extends AnySchema,
  const StartupSchema extends AnySchema | undefined = undefined,
>(
  id: Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id,
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    OutMessage: OutMessageSchema
    /** Shared input Schema for Binding startup selectors, separate from Model state. */
    Startup?: StartupSchema
    mounts?: never
    childBindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  OutMessageSchema,
  false,
  StartupSchema
>
/** Defines one Block's identity, Schemas, typed authoring helpers, and owned
 * effect declarations. The returned Definition is passive configuration. */
export function define<
  const Id extends string,
  const ModelSchema extends AnySchema,
  const MessageSchema extends AnySchema,
  const StartupSchema extends AnySchema | undefined = undefined,
>(
  id: Id extends '' | `${string}/${string}` | `${string}::${string}`
    ? never
    : Id,
  config: Readonly<{
    Model: ModelSchema
    Message: MessageSchema
    /** Shared input Schema for Binding startup selectors, separate from Model state. */
    Startup?: StartupSchema
    OutMessage?: never
    mounts?: never
    childBindings?: never
  }>,
): AuthoringDefinition<
  Id,
  ModelSchema,
  MessageSchema,
  undefined,
  false,
  StartupSchema
>
export function define(
  id: string,
  config?: Readonly<{
    Model: AnySchema
    Message: AnySchema
    OutMessage?: AnySchema
    Startup?: AnySchema
  }>,
): any {
  const authoring = makeAuthoringContext(id)
  const primitives = {
    command: authoring.command,
    mount: authoring.mount,
    mountStream: authoring.mountStream,
    resource: authoring.resource,
  }
  const defineContracts = (
    contracts: Readonly<{
      Model: AnySchema
      Message: AnySchema
      OutMessage?: AnySchema
      Startup?: AnySchema
    }>,
  ) => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const base = authoring.define(contracts as never)
    const makeComposition = (
      graph: Readonly<{
        mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
        childBindings?: ReadonlyArray<AnyBinding>
      }> = {},
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    ) => base.makeComposition(graph as never)

    return { ...base, ...primitives, makeComposition }
  }

  if (config === undefined) {
    return { ...primitives, define: defineContracts }
  } else {
    return defineContracts(config)
  }
}
