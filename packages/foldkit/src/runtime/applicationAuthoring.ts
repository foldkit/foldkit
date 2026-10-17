import type { Schema } from 'effect'

import type { BindChild } from '../block/bindChild.js'
import type {
  AnyBinding,
  InspectionOfBinding,
  RequirementsOfBindings,
} from '../block/binding.js'
import { define as defineBlock } from '../block/define.js'
import {
  type Definition as BlockDefinition,
  type CompletedForValidation,
  type DefineManagedResources,
  type DefineStep,
  type DefineSubscriptions,
  type DefineView,
  LocalMountsTypeId,
  type ValidateChildBindings,
  makeDefinition,
} from '../block/definition.js'
import type { DefineCompositionUpdate } from '../block/delivery.js'
import type {
  CompositionInit,
  ValidateChildStartup,
} from '../block/initialization.js'
import {
  type DefineCommand,
  type DefineMount,
  type DefineMountStream,
  type DefineResource,
} from '../block/named.js'
import type { Owner } from '../block/owner.js'
import type { HtmlBuilder } from '../html/index.js'
import type * as Mount from '../mount/index.js'
import type { MakeApplication, MakeElement } from './application.js'

type AnySchema = Schema.Codec<any, any, any, any>
type RootOwner = Owner<'Application', true>

type AuthoringHelpers<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
> = Readonly<{
  /**
   * Declares a root Command contract and optional handler constructor.
   * The Runtime builds selected handler Layers once per application start.
   */
  command: DefineCommand<'Application', MessageSchema['Type']>
  /**
   * Declares an element-owned acquisition with cleanup. Register its
   * definition in this root's Composition before using it in a view.
   */
  mount: DefineMount<'Application', MessageSchema['Type']>
  /**
   * Declares an element-owned Stream. Its listener or observer lifetime
   * follows the mounted element, not the application handler constructor.
   */
  mountStream: DefineMountStream<'Application', MessageSchema['Type']>
  /**
   * Declares a handle that Commands can require. Declare its Model-driven
   * acquisition and release separately with managedResources.
   */
  resource: DefineResource<'Application'>
  /**
   * Authors a pure transformation of the root Model with inferred arguments
   * and Command requirements. The Runtime executes returned Commands later.
   */
  step: DefineStep<ModelSchema['Type'], MessageSchema['Type'], never>
  /**
   * Declares named root Streams, their result Messages and Model dependencies.
   * Implementations are handler recipes; the Runtime manages active Streams.
   */
  subscriptions: DefineSubscriptions<
    'Application',
    ModelSchema['Type'],
    MessageSchema['Type']
  >
  /**
   * Declares Model-driven root handle lifetimes. The Runtime acquires and
   * releases handles while shared application Services remain alive.
   */
  managedResources: DefineManagedResources<
    'Application',
    ModelSchema['Type'],
    MessageSchema['Type']
  >
}>

declare const CompositionTypeId: unique symbol

type CompositionEvidence<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Readonly<{
  Model: ModelSchema
  Message: MessageSchema
  Mounts: Mounts
  Children: Children
}>

type CompositionIdentity<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Readonly<{
  [CompositionTypeId]: CompositionEvidence<
    ModelSchema,
    MessageSchema,
    Mounts,
    Children
  >
}>

type CompletionHelpers<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Readonly<{
  /**
   * Completes this Composition as a passive page-owning Application.
   * Supply its implementation and browser inputs; provision ordinary Services
   * on the returned value before passing it to Runtime.run.
   */
  makeApplication: MakeApplication<
    CompositionIdentity<ModelSchema, MessageSchema, Mounts, Children>
  >
  /**
   * Completes this Composition as a passive container-scoped Element.
   * Its view returns Html and it does not own document metadata or URL routing.
   * The Runtime constructs its Layers and starts its lifecycle effects later.
   */
  makeElement: MakeElement<
    CompositionIdentity<ModelSchema, MessageSchema, Mounts, Children>
  >
}>

type EvidenceOf<CompositionValue> =
  CompositionValue extends Readonly<{
    [CompositionTypeId]: infer Evidence
  }>
    ? Evidence
    : never

/** @internal Reads the exact root Model Schema from a composition. */
export type ModelSchemaOf<CompositionValue> =
  EvidenceOf<CompositionValue> extends CompositionEvidence<
    infer ModelSchema,
    AnySchema,
    ReadonlyArray<Mount.LayeredMountDefinition>,
    ReadonlyArray<AnyBinding>
  >
    ? ModelSchema
    : never

/** @internal Reads the exact root Message Schema from a composition. */
export type MessageSchemaOf<CompositionValue> =
  EvidenceOf<CompositionValue> extends CompositionEvidence<
    AnySchema,
    infer MessageSchema,
    ReadonlyArray<Mount.LayeredMountDefinition>,
    ReadonlyArray<AnyBinding>
  >
    ? MessageSchema
    : never

/** @internal Reads the exact registered Mount tuple from a composition. */
export type MountsOf<CompositionValue> =
  EvidenceOf<CompositionValue> extends CompositionEvidence<
    AnySchema,
    AnySchema,
    infer Mounts,
    ReadonlyArray<AnyBinding>
  >
    ? readonly [
        ...Mounts,
        ...ReadonlyArray<
          InspectionOfBinding<
            ChildrenOf<CompositionValue>[number]
          >['mounts'][number]
        >,
      ]
    : never

/** @internal Reads the exact registered child tuple from a composition. */
export type ChildrenOf<CompositionValue> =
  EvidenceOf<CompositionValue> extends CompositionEvidence<
    AnySchema,
    AnySchema,
    ReadonlyArray<Mount.LayeredMountDefinition>,
    infer Children
  >
    ? Children
    : never

/** @internal Reads the Mount requirements available to the root view. */
export type ViewRequirementsOf<CompositionValue> =
  EvidenceOf<CompositionValue> extends CompositionEvidence<
    AnySchema,
    AnySchema,
    infer Mounts,
    infer Children
  >
    ? Mount.RequirementsOf<Mounts> | RequirementsOfBindings<Children>
    : never

/**
 * A passive application root after its child and Mount graph is known. Call
 * its `makeApplication` or `makeElement` method to complete it. It cannot be bound into
 * another composition.
 */
export type Composition<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
> = Readonly<{
  /**
   * The root Model Schema established by defineApplication.
   */
  Model: ModelSchema
  /**
   * The root Message Schema established by defineApplication.
   */
  Message: MessageSchema
  /**
   * Local and lifted child Mount definitions available to the owned view.
   * Local registrations are supplied to makeComposition; child registrations
   * are collected from its Bindings.
   */
  mounts: readonly [
    ...Mounts,
    ...ReadonlyArray<InspectionOfBinding<Children[number]>['mounts'][number]>,
  ]
  [LocalMountsTypeId]: Mounts
  /**
   * The registered child Bindings. Their handlers and lifecycle definitions
   * are included automatically at completion.
   */
  childBindings: Children
  /**
   * Authors root startup. The callback supplies parent-owned fields, optional
   * shared startup inputs, Commands and ordinary Steps. The initializer
   * assembles registered children before applying the Steps.
   */
  makeInit: CompositionInit<
    ModelSchema['Type'],
    MessageSchema['Type'],
    Children
  >
  /**
   * Authors root transitions for Messages not claimed by child delivery
   * policies. The returned update accepts the complete root Message union.
   */
  makeUpdate: DefineCompositionUpdate<
    ModelSchema['Type'],
    MessageSchema['Type'],
    never,
    Children,
    true
  >
  /**
   * Authors the canonical root view with the registered child and Mount
   * capabilities. Application completion requires a view with no extra inputs.
   */
  makeView: DefineView<
    RootOwner,
    ModelSchema['Type'],
    MessageSchema['Type'],
    Mount.RequirementsOf<Mounts> | RequirementsOfBindings<Children>
  >
  [CompositionTypeId]: CompositionEvidence<
    ModelSchema,
    MessageSchema,
    Mounts,
    Children
  >
}> &
  CompletionHelpers<ModelSchema, MessageSchema, Mounts, Children>

/**
 * The `HtmlBuilder` type supplied by an Application Composition. Pass
 * `typeof ApplicationComposition` to retain its Message, registered child,
 * and Mount capabilities when authoring extracted root view helpers.
 *
 * Declare an owner-specific alias such as `ApplicationViewBuilder` immediately
 * after the Composition. This type constructs nothing at runtime; the primary
 * Composition view infers its builder parameter.
 *
 * @typeParam CompositionValue - The type of the Composition returned by an
 * Application Definition's `makeComposition` method.
 */
export type ViewBuilderFor<CompositionValue> =
  CompositionValue extends AnyComposition
    ? HtmlBuilder<
        MessageSchemaOf<CompositionValue>['Type'],
        ViewRequirementsOf<CompositionValue>
      >
    : CompositionValue extends Readonly<{
          Message: Readonly<{ Type: infer Message }>
          makeComposition: (...args: ReadonlyArray<any>) => unknown
        }>
      ? HtmlBuilder<Message, never>
      : never

/** @internal Structural bound for a staged application composition. */
export type AnyComposition = Readonly<{
  [CompositionTypeId]: CompositionEvidence<any, any, any, any>
}>

/** @internal Recovers the private Block definition behind a composition. */
export type DefinitionOf<CompositionValue> =
  EvidenceOf<CompositionValue> extends CompositionEvidence<
    infer ModelSchema,
    infer MessageSchema,
    infer Mounts,
    infer Children
  >
    ? BlockDefinition<
        RootOwner,
        ModelSchema,
        MessageSchema,
        undefined,
        Mounts,
        Children
      >
    : never

/** @internal Forms the checked Block shape used only at the runtime boundary. */
export type CompletedComposition<CompositionValue, Implementation> =
  CompletedForValidation<DefinitionOf<CompositionValue>, Implementation>

/** Establishes the child and Mount graph for an application Definition. */
export interface MakeComposition<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  StartupSchema extends AnySchema | undefined = undefined,
> {
  (): Composition<ModelSchema, MessageSchema, readonly [], readonly []>
  <
    const Mounts extends ReadonlyArray<Mount.LayeredMountDefinition> =
      readonly [],
    const Children extends ReadonlyArray<AnyBinding> = readonly [],
  >(
    config: Readonly<{
      /**
       * Local Mount definitions permitted in owned views. Defaults to an empty
       * registry; child Mounts are collected from childBindings automatically.
       */
      mounts?: Mounts & Mount.PreciseMountRegistry<Mounts>
      /**
       * Child Bindings used by updates, operations, init or views. Defaults to
       * an empty tuple. The Composition snapshots this graph and includes its
       * handler recipes and occurrence lifecycle registrations at completion.
       */
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
        never
      >,
  ): Composition<ModelSchema, MessageSchema, Mounts, Children>
}

/**
 * Root application authoring available as soon as its Model and Message are
 * known. Primitive identities are private to this application root.
 */
export type Definition<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  StartupSchema extends AnySchema | undefined = undefined,
> = Readonly<{
  /**
   * The root Model Schema, shared by its authoring helpers.
   */
  Model: ModelSchema
  /**
   * The root Message Schema, shared by its authoring helpers.
   */
  Message: MessageSchema
  /**
   * An empty local registry before makeComposition establishes Mount capabilities.
   */
  mounts: readonly []
  /**
   * An empty child graph before makeComposition registers Bindings.
   */
  childBindings: readonly []
  /**
   * Creates a passive Binding with contextual root Model and Message types.
   * The parent selects storage, Message mapping and OutMessage policy.
   */
  bindChild: BindChild<
    ModelSchema,
    MessageSchema,
    undefined,
    StartupSchema extends AnySchema ? StartupSchema['Type'] : never
  >
  /**
   * Establishes the child and Mount graph and returns the root Composition.
   * Omitted registries are empty. This step validates passive configuration;
   * it neither constructs Layers nor starts lifecycle work.
   */
  makeComposition: MakeComposition<ModelSchema, MessageSchema, StartupSchema>
}> &
  (StartupSchema extends AnySchema
    ? Readonly<{
        /** Schema establishing the shared input type for Binding startup selectors. */
        Startup: StartupSchema
      }>
    : unknown) &
  AuthoringHelpers<ModelSchema, MessageSchema>

/**
 * Defines a passive root authoring value from its Model and Message Schemas.
 * Establish its graph with makeComposition, then complete that Composition with
 * makeApplication or makeElement. The Runtime constructs Layers and runs effects.
 */
export interface Define {
  <
    const ModelSchema extends AnySchema,
    const MessageSchema extends AnySchema,
    const StartupSchema extends AnySchema | undefined = undefined,
  >(
    config: Readonly<{
      /** The root Model Schema used to type init, update, views and bindings. */
      Model: ModelSchema
      /** The root Message Schema used by Commands, lifecycle work and dispatch. */
      Message: MessageSchema
      /** Shared input Schema for Binding startup selectors, separate from Model state. */
      Startup?: StartupSchema
    }>,
  ): Definition<ModelSchema, MessageSchema, StartupSchema>
}

const definitions = new WeakMap<
  object,
  globalThis.ReturnType<typeof makeDefinition>
>()

type Completion = Readonly<{
  makeApplication: (composition: AnyComposition, config: any) => any
  makeElement: (composition: AnyComposition, config: any) => any
}>

const makeApplicationComposition = (
  definition: globalThis.ReturnType<typeof makeDefinition>,
  completion: Completion,
) => {
  const composition = {
    Model: definition.Model,
    Message: definition.Message,
    mounts: definition.mounts,
    [LocalMountsTypeId]: definition[LocalMountsTypeId],
    childBindings: definition.childBindings,
    makeInit: definition.makeInit,
    makeUpdate: definition.makeUpdate,
    makeView: definition.makeView,
    makeApplication: (config: any) =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      completion.makeApplication(composition as never, config),
    makeElement: (config: any) =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      completion.makeElement(composition as never, config),
  }
  definitions.set(composition, definition)
  return composition
}

/** @internal Returns the private Block definition for root completion. */
export const definitionOf = (
  composition: object,
): globalThis.ReturnType<typeof makeDefinition> => {
  const definition = definitions.get(composition)
  if (definition === undefined) {
    throw new Error(
      '[foldkit] Application composition must come from defineApplication(...).makeComposition(...).',
    )
  }
  return definition
}

/** @internal Completes a passive application root without reading browser state. */
export const complete = <
  CompositionValue extends AnyComposition,
  Implementation,
>(
  composition: CompositionValue,
  implementation: Implementation,
): CompletedComposition<CompositionValue, Implementation> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  definitionOf(composition).makeBlock(implementation as never)

/** @internal Creates the public staged application definition function. */
export const makeDefine =
  (completion: Completion): Define =>
  config => {
    const base = defineBlock('Application', config)
    const primitives = {
      command: base.command,
      mount: base.mount,
      mountStream: base.mountStream,
      resource: base.resource,
    }

    const makeComposition = (
      graph: Readonly<{
        mounts?: ReadonlyArray<Mount.LayeredMountDefinition>
        childBindings?: ReadonlyArray<AnyBinding>
      }> = {},
    ) => {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const definition = base.makeComposition(graph as never)
      return makeApplicationComposition(definition, completion)
    }

    const definition = {
      Model: base.Model,
      Message: base.Message,
      ...(config.Startup === undefined ? {} : { Startup: config.Startup }),
      mounts: base.mounts,
      childBindings: base.childBindings,
      bindChild: base.bindChild,
      command: primitives.command,
      mount: primitives.mount,
      mountStream: primitives.mountStream,
      resource: primitives.resource,
      step: base.step,
      subscriptions: base.subscriptions,
      managedResources: base.managedResources,
      makeComposition,
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return definition as never
  }
