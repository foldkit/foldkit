import {
  type Effect,
  type Layer,
  type Schema,
  type Scope,
  type Stream,
} from 'effect'

import * as Command from '../command/index.js'
import * as Interruptible from '../command/interruptible/index.js'
import * as ManagedResource from '../managedResource/index.js'
import * as Mount from '../mount/index.js'
import {
  type DefineBlock,
  type ValidateOwnedMessages,
  makeBaseDefinition,
} from './definition.js'
import { registerDefinition } from './identity.js'
import { type Owner, makeOwner } from './owner.js'
import { type OwnedName, assertBlockId, makeOwnedName } from './ownerName.js'
import type { ValidateConstructionRequirements } from './scope.js'

type LocalName<Name extends string> = Name extends ''
  ? never
  : Name extends `${string}/${string}` | `${string}::${string}`
    ? never
    : Name

type ValidateHandlerConstruction<
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
> = ValidateConstructionRequirements<Effect.Services<Yielded>>

type MountRuntimeInput = Readonly<{
  element: Element
  viewStateChanges: Stream.Stream<Mount.ViewState>
}>

type CommandHandlerLayer<
  Name extends string,
  Args,
  Message,
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements,
> = Readonly<{
  layer: Layer.Layer<
    Command.Handler<Name, Args, Message>,
    Effect.Error<Yielded>,
    Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
  >
}>

type CommandWithArgs<
  Name extends string,
  Fields extends Schema.Struct.Fields,
  Message,
  Interrupt,
> =
  Interrupt extends Readonly<{
    keyFields: readonly [infer KeyField, ...ReadonlyArray<infer KeyField>]
  }>
    ? Interruptible.DefinitionWithArgs<
        Name,
        Fields,
        Pick<
          Schema.Struct.Type<Fields>,
          Extract<KeyField, keyof Schema.Struct.Type<Fields>>
        >,
        Effect.Effect<
          Message,
          never,
          Command.Handler<Name, Schema.Struct.Type<Fields>, Message>
        >
      >
    : Interrupt extends true
      ? Interruptible.DefinitionWithArgsNameKeyed<
          Name,
          Fields,
          Effect.Effect<
            Message,
            never,
            Command.Handler<Name, Schema.Struct.Type<Fields>, Message>
          >
        >
      : Command.LayeredCommandDefinitionWithArgs<Name, Fields, Message>

type CommandNoArgs<
  Name extends string,
  Message,
  Interrupt,
> = Interrupt extends true
  ? Interruptible.DefinitionNoArgs<
      Name,
      Effect.Effect<Message, never, Command.Handler<Name, void, Message>>
    > &
      Readonly<{ toLayer: Command.ToLayer<Name, void, Message> }>
  : Command.LayeredCommandDefinitionNoArgs<Name, Message>

/** Defines Commands whose runtime names and handler identities belong to one
 * Block. Attached handlers become local Layer recipes; defining a Command does
 * not construct its handler or perform its Effect. */
export interface DefineCommand<Id extends string, OwnerMessage = unknown> {
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
    const Interrupt extends true | undefined = undefined,
    HandlerRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler: (() => Generator<
        Yielded,
        (
          args: Schema.Struct.Type<NoInfer<Fields>>,
        ) => Effect.Effect<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
      execute?: never
      interrupt?: Interrupt
    }>,
  ): CommandWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>,
    Interrupt
  > &
    CommandHandlerLayer<
      OwnedName<Id, Name>,
      Schema.Struct.Type<Fields>,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    > &
    Readonly<{
      toLayer: Command.ToLayer<
        OwnedName<Id, Name>,
        Schema.Struct.Type<Fields>,
        Schema.Schema.Type<Messages[number]>
      >
    }>
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
    const Interrupt extends true | undefined = undefined,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
      interrupt?: Interrupt
    }>,
  ): CommandWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>,
    Interrupt
  > &
    Readonly<{
      toLayer: Command.ToLayer<
        OwnedName<Id, Name>,
        Schema.Struct.Type<Fields>,
        Schema.Schema.Type<Messages[number]>
      >
    }>
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
    const KeyFields extends readonly [
      keyof Schema.Struct.Type<Fields> & string,
      ...ReadonlyArray<keyof Schema.Struct.Type<Fields> & string>,
    ],
    HandlerRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler: (() => Generator<
        Yielded,
        (
          args: Schema.Struct.Type<NoInfer<Fields>>,
        ) => Effect.Effect<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
      execute?: never
      interrupt: Readonly<{
        keyFields: KeyFields
        toKey: (
          keyArgs: NoInfer<
            Interruptible.KeyArgs<Schema.Struct.Type<Fields>, KeyFields>
          >,
        ) => string
      }>
    }>,
  ): CommandWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>,
    Readonly<{ keyFields: KeyFields }>
  > &
    CommandHandlerLayer<
      OwnedName<Id, Name>,
      Schema.Struct.Type<Fields>,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    > &
    Readonly<{
      toLayer: Command.ToLayer<
        OwnedName<Id, Name>,
        Schema.Struct.Type<Fields>,
        Schema.Schema.Type<Messages[number]>
      >
    }>
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends ReadonlyArray<Schema.Top>,
    const KeyFields extends readonly [
      keyof Schema.Struct.Type<Fields> & string,
      ...ReadonlyArray<keyof Schema.Struct.Type<Fields> & string>,
    ],
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
      interrupt: Readonly<{
        keyFields: KeyFields
        toKey: (
          keyArgs: NoInfer<
            Interruptible.KeyArgs<Schema.Struct.Type<Fields>, KeyFields>
          >,
        ) => string
      }>
    }>,
  ): CommandWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>,
    Readonly<{ keyFields: KeyFields }>
  > &
    Readonly<{
      toLayer: Command.ToLayer<
        OwnedName<Id, Name>,
        Schema.Struct.Type<Fields>,
        Schema.Schema.Type<Messages[number]>
      >
    }>
  <
    const Name extends string,
    const Messages extends ReadonlyArray<Schema.Top>,
    const Interrupt extends true | undefined,
    HandlerRequirements = never,
    Yielded extends Effect.Effect<unknown, unknown, unknown> = Effect.Effect<
      never,
      never,
      never
    >,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args?: never
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler: (() => Generator<
        Yielded,
        () => Effect.Effect<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
      execute?: never
      interrupt?: Interrupt
    }>,
  ): CommandNoArgs<
    OwnedName<Id, Name>,
    Schema.Schema.Type<Messages[number]>,
    Interrupt
  > &
    CommandHandlerLayer<
      OwnedName<Id, Name>,
      void,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    > &
    Readonly<{
      toLayer: Command.ToLayer<
        OwnedName<Id, Name>,
        void,
        Schema.Schema.Type<Messages[number]>
      >
    }>
  <
    const Name extends string,
    const Messages extends ReadonlyArray<Schema.Top>,
    const Interrupt extends true | undefined,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args?: never
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
      interrupt?: Interrupt
    }>,
  ): CommandNoArgs<
    OwnedName<Id, Name>,
    Schema.Schema.Type<Messages[number]>,
    Interrupt
  > &
    Readonly<{
      toLayer: Command.ToLayer<
        OwnedName<Id, Name>,
        void,
        Schema.Schema.Type<Messages[number]>
      >
    }>
}

type MountHandlerLayer<
  Name extends string,
  Input,
  Message,
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements,
> = Readonly<{
  layer: Layer.Layer<
    Mount.Handler<Name, Input, Message>,
    Effect.Error<Yielded>,
    Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
  >
}>

/** Defines one-shot Mounts whose runtime names and handler identities belong to
 * one Block. A Runtime acquires the Mount when a matching element is mounted. */
export interface DefineMount<Id extends string, OwnerMessage = unknown> {
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
    Yielded extends Effect.Effect<unknown, unknown, unknown>,
    HandlerRequirements = never,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      execute?: never
      handler: (() => Generator<
        Yielded,
        (
          input: MountRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
        ) => Effect.Effect<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Mount.LayeredMountDefinitionWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>
  > &
    MountHandlerLayer<
      OwnedName<Id, Name>,
      MountRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    >
  <
    const Name extends string,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
    Yielded extends Effect.Effect<unknown, unknown, unknown>,
    HandlerRequirements = never,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args?: never
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      execute?: never
      handler: (() => Generator<
        Yielded,
        (
          input: MountRuntimeInput,
        ) => Effect.Effect<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Mount.LayeredMountDefinitionNoArgs<
    OwnedName<Id, Name>,
    Schema.Schema.Type<Messages[number]>
  > &
    MountHandlerLayer<
      OwnedName<Id, Name>,
      MountRuntimeInput,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    >
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
    }>,
  ): Mount.LayeredMountDefinitionWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>
  >
  <
    const Name extends string,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args?: never
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
    }>,
  ): Mount.LayeredMountDefinitionNoArgs<
    OwnedName<Id, Name>,
    Schema.Schema.Type<Messages[number]>
  >
}

type StreamMountHandlerLayer<
  Name extends string,
  Input,
  Message,
  Yielded extends Effect.Effect<unknown, unknown, unknown>,
  HandlerRequirements,
> = Readonly<{
  layer: Layer.Layer<
    Mount.Handler<Name, Input, Message>,
    Effect.Error<Yielded>,
    Exclude<HandlerRequirements | Effect.Services<Yielded>, Scope.Scope>
  >
}>

/** Defines streaming Mounts whose runtime names and handler identities belong to
 * one Block. A Runtime runs the Stream only while a matching element is
 * mounted. */
export interface DefineMountStream<Id extends string, OwnerMessage = unknown> {
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
    Yielded extends Effect.Effect<unknown, unknown, unknown>,
    HandlerRequirements = never,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      execute?: never
      handler: (() => Generator<
        Yielded,
        (
          input: MountRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
        ) => Stream.Stream<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Mount.LayeredStreamMountDefinitionWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>
  > &
    StreamMountHandlerLayer<
      OwnedName<Id, Name>,
      MountRuntimeInput & Schema.Struct.Type<NoInfer<Fields>>,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    >
  <
    const Name extends string,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
    Yielded extends Effect.Effect<unknown, unknown, unknown>,
    HandlerRequirements = never,
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args?: never
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      execute?: never
      handler: (() => Generator<
        Yielded,
        (
          input: MountRuntimeInput,
        ) => Stream.Stream<
          NoInfer<Schema.Schema.Type<Messages[number]>>,
          never,
          HandlerRequirements
        >,
        unknown
      >) &
        ValidateHandlerConstruction<Yielded>
    }>,
  ): Mount.LayeredStreamMountDefinitionNoArgs<
    OwnedName<Id, Name>,
    Schema.Schema.Type<Messages[number]>
  > &
    StreamMountHandlerLayer<
      OwnedName<Id, Name>,
      MountRuntimeInput,
      Schema.Schema.Type<Messages[number]>,
      Yielded,
      HandlerRequirements
    >
  <
    const Name extends string,
    Fields extends Schema.Struct.Fields,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args: Fields
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
    }>,
  ): Mount.LayeredStreamMountDefinitionWithArgs<
    OwnedName<Id, Name>,
    Fields,
    Schema.Schema.Type<Messages[number]>
  >
  <
    const Name extends string,
    const Messages extends readonly [Schema.Top, ...ReadonlyArray<Schema.Top>],
  >(
    name: LocalName<Name>,
    config: Readonly<{
      args?: never
      messages: Messages &
        ValidateOwnedMessages<NoInfer<Messages>, OwnerMessage>
      handler?: never
      execute?: never
    }>,
  ): Mount.LayeredStreamMountDefinitionNoArgs<
    OwnedName<Id, Name>,
    Schema.Schema.Type<Messages[number]>
  >
}

/** Defines ManagedResource accessors whose service identities belong to one
 * Block. The accessor declares identity only; a Runtime acquires registered
 * resources for active Block occurrences. */
export interface DefineResource<Id extends string> {
  <Value>(): <const Name extends string>(
    name: LocalName<Name>,
  ) => ManagedResource.ManagedResource<
    Value,
    ManagedResource.ManagedResourceService<OwnedName<Id, Name>>
  >
}

/** The public authoring namespace for one static Block identity. */
export interface Named<Id extends string, Concrete extends boolean = true> {
  readonly define: DefineBlock<Owner<Id, Concrete>>
  readonly makeCommand: DefineCommand<Id>
  readonly makeMount: DefineMount<Id>
  readonly makeMountStream: DefineMountStream<Id>
  readonly makeResource: DefineResource<Id>
}

/** @internal Creates one identity and its owned primitive declarations. */
export function makeAuthoringContext(
  id: '' | `${string}/${string}` | `${string}::${string}`,
): never
export function makeAuthoringContext<const Id extends string>(
  id: Id & (string extends Id ? never : unknown),
): Named<Id, true>
export function makeAuthoringContext<const Id extends string>(
  id: Id,
): Named<Id, false>
export function makeAuthoringContext(id: string): Named<any, any> {
  assertBlockId(id)

  const owner = makeOwner(id)
  const define: DefineBlock<Owner<string, boolean>> = (config: any) =>
    makeBaseDefinition(owner, config)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const command = ((name: string, config: unknown) => {
    const definition = Command.define(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      makeOwnedName(id, name as never),
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      config as never,
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    registerDefinition(owner, definition as object, name)
    return definition
  }) as never
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const mount = ((name: string, config: unknown) => {
    const definition = Mount.define(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      makeOwnedName(id, name as never),
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      config as never,
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    registerDefinition(owner, definition as object, name)
    return definition
  }) as never
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const mountStream = ((name: string, config: unknown) => {
    const definition = Mount.defineStream(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      makeOwnedName(id, name as never),
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      config as never,
    )
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    registerDefinition(owner, definition as object, name)
    return definition
  }) as never
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const resource = (<Value>() =>
    (name: string) =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ManagedResource.tag<Value>()(makeOwnedName(id, name as never))) as never

  return Object.assign(owner, {
    define,
    makeCommand: command,
    makeMount: mount,
    makeMountStream: mountStream,
    makeResource: resource,
  })
}
