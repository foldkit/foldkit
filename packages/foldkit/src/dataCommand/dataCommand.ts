import { Array, Effect, Predicate } from 'effect'

import {
  type MakeRuntimeReturn,
  type ProgramConfig,
  type ProgramConfigWithFlags,
  type RoutingProgramConfig,
  type RoutingProgramConfigWithFlags,
  makeProgram as makeEffectCommandProgram,
} from '../runtime/runtime.js'
import type { Url } from '../url/index.js'

/** A Command expressed as inert tagged data: a Schema tagged struct value
 *  with no Effect attached. The runtime interprets it through the program's
 *  single `execute` function. */
export type DataCommand = Readonly<{ _tag: string }>

/** The single interpreter that turns data Commands into the Effects they
 *  stand for. `execute` is total over the Command union and never fails:
 *  errors must surface as Messages, exactly as with effectful Commands. */
export type Execute<Command extends DataCommand, Message, R = never> = (
  command: Command,
) => Effect.Effect<Message, never, R>

/** The runtime-facing Command record produced by interpreting a data
 *  Command: `_tag` becomes the trace span name and the remaining fields
 *  become the span attributes. */
export type InterpretedCommand<Message, R = never> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<Message, never, R>
}>

const isDataCommand = (value: unknown): value is DataCommand =>
  Predicate.isObject(value) &&
  Predicate.hasProperty(value, '_tag') &&
  Predicate.isString(value._tag)

/** Unwraps Submodel lift wrappers for trace attribution. A lift wrapper is
 *  a data Command whose only field is `command` holding the child Command.
 *  Unwrapping mirrors how `Command.mapMessage` preserves `name` and `args`
 *  through Submodel boundaries: the span and DevTools record attribute to
 *  the leaf Command that describes the actual side effect, not the wrapper
 *  chain the parent built around it.
 *
 *  NOTE: structural convention. A leaf Command whose single declared field
 *  happens to be named `command` and holds tagged data would be unwrapped
 *  incorrectly. A production implementation would register wrapper tags
 *  explicitly instead of guessing from shape. */
const unwrapLifted = (command: DataCommand): DataCommand => {
  const fields = Object.keys(command).filter(key => key !== '_tag')
  const child = Predicate.hasProperty(command, 'command')
    ? command.command
    : undefined

  return fields.length === 1 && isDataCommand(child)
    ? unwrapLifted(child)
    : command
}

/** Interprets one data Command into a runtime Command record using the
 *  given `execute`. The data Command's `_tag` drives the trace span name
 *  and its remaining fields drive the span attributes, preserving the
 *  tracing behavior of effectful Commands. Lift wrappers (single `command`
 *  field) are unwrapped so the span attributes to the originating leaf
 *  Command, mirroring `Command.mapMessage` keeping `name` and `args`. */
export const toCommand =
  <Command extends DataCommand, Message, R = never>(
    execute: Execute<Command, Message, R>,
  ) =>
  (command: Command): InterpretedCommand<Message, R> => {
    const { _tag, ...args } = unwrapLifted(command)
    return { name: _tag, args, effect: execute(command) }
  }

/** Interprets a list of data Commands into runtime Command records. */
export const toCommands =
  <Command extends DataCommand, Message, R = never>(
    execute: Execute<Command, Message, R>,
  ) =>
  (
    commands: ReadonlyArray<Command>,
  ): ReadonlyArray<InterpretedCommand<Message, R>> =>
    Array.map(commands, toCommand(execute))

/** Builds a parent `execute` case from a child Submodel's `execute`,
 *  lifting every result Message through `liftMessage`. The data-Command
 *  counterpart of `Command.mapMessage`: because data Commands carry no
 *  Effect, the Message lift can only happen where the Effect is created,
 *  which is the interpreter.
 *
 *  ```ts
 *  LiftLogin: ({ command }) =>
 *    delegate(Login.execute, message => GotLoginMessage({ message }))(command)
 *  ```
 */
export const delegate =
  <ChildCommand extends DataCommand, ChildMessage, ParentMessage, R = never>(
    execute: Execute<ChildCommand, ChildMessage, R>,
    liftMessage: (message: ChildMessage) => ParentMessage,
  ): Execute<ChildCommand, ParentMessage, R> =>
  command =>
    Effect.map(execute(command), liftMessage)

type DataUpdate<Model, Message, Command extends DataCommand> = (
  model: Model,
  message: Message,
) => readonly [Model, ReadonlyArray<Command>]

/** Configuration for `DataCommand.makeProgram` without flags or URL routing. */
export type DataProgramConfig<
  Model,
  Message,
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
> = Omit<
  ProgramConfig<Model, Message, Resources, ManagedResourceServices>,
  'init' | 'update'
> &
  Readonly<{
    init: () => readonly [Model, ReadonlyArray<Command>]
    update: DataUpdate<Model, Message, Command>
    execute: Execute<Command, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `DataCommand.makeProgram` with flags but no URL routing. */
export type DataProgramConfigWithFlags<
  Model,
  Message,
  Flags,
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
> = Omit<
  ProgramConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices
  >,
  'init' | 'update'
> &
  Readonly<{
    init: (flags: Flags) => readonly [Model, ReadonlyArray<Command>]
    update: DataUpdate<Model, Message, Command>
    execute: Execute<Command, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `DataCommand.makeProgram` with URL routing but no flags. */
export type RoutingDataProgramConfig<
  Model,
  Message,
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
> = Omit<
  RoutingProgramConfig<Model, Message, Resources, ManagedResourceServices>,
  'init' | 'update'
> &
  Readonly<{
    init: (url: Url) => readonly [Model, ReadonlyArray<Command>]
    update: DataUpdate<Model, Message, Command>
    execute: Execute<Command, Message, Resources | ManagedResourceServices>
  }>

/** Configuration for `DataCommand.makeProgram` with flags and URL routing. */
export type RoutingDataProgramConfigWithFlags<
  Model,
  Message,
  Flags,
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
> = Omit<
  RoutingProgramConfigWithFlags<
    Model,
    Message,
    Flags,
    Resources,
    ManagedResourceServices
  >,
  'init' | 'update'
> &
  Readonly<{
    init: (flags: Flags, url: Url) => readonly [Model, ReadonlyArray<Command>]
    update: DataUpdate<Model, Message, Command>
    execute: Execute<Command, Message, Resources | ManagedResourceServices>
  }>

/**
 * Creates a Foldkit program whose Commands are inert tagged data interpreted
 * by a single `execute` function. `init` and `update` return data Commands;
 * the runtime boundary calls `execute` once per Command and provides every
 * requirement in `Resources | ManagedResourceServices` in one place, via the
 * `resources` Layer and Managed Resource services.
 *
 * Tracing matches effectful Commands: each Command runs inside a span named
 * by its `_tag` with the remaining fields as attributes.
 */
export function makeProgram<
  Model,
  Message extends { _tag: string },
  Flags,
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: RoutingDataProgramConfigWithFlags<
    Model,
    Message,
    Flags,
    Command,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: RoutingDataProgramConfig<
    Model,
    Message,
    Command,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  Flags,
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: DataProgramConfigWithFlags<
    Model,
    Message,
    Flags,
    Command,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram<
  Model,
  Message extends { _tag: string },
  Command extends DataCommand,
  Resources = never,
  ManagedResourceServices = never,
>(
  config: DataProgramConfig<
    Model,
    Message,
    Command,
    Resources,
    ManagedResourceServices
  >,
): MakeRuntimeReturn

export function makeProgram(config: any): MakeRuntimeReturn {
  const { execute, init, update, ...rest } = config
  const interpretAll = toCommands(execute)

  return makeEffectCommandProgram({
    ...rest,
    init: (...args: ReadonlyArray<any>) => {
      const [model, commands] = init(...args)
      return [model, interpretAll(commands)]
    },
    update: (model: any, message: any) => {
      const [nextModel, commands] = update(model, message)
      return [nextModel, interpretAll(commands)]
    },
  })
}
