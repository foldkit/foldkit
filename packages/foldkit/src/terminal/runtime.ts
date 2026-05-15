import { NodeRuntime } from '@effect/platform-node'
import {
  Cause,
  Effect,
  Layer,
  PubSub,
  Queue,
  Record,
  Ref,
  Schema,
  Stream,
  pipe,
} from 'effect'
import type * as Ansi from 'effect-boxes/Ansi'
import type * as Box from 'effect-boxes/Box'
import * as Renderer from 'effect-boxes/Renderer'

import type { Command } from '../command/index.js'
import type { Subscriptions } from '../runtime/subscription.js'

/**
 * The view type for terminal programs. An effect-boxes Box annotated with
 * Ansi styles. Compose with `Box.text`, `Box.vcat`, `Box.annotate`, the
 * `Layout` combinators, etc.
 */
export type TerminalView = Box.Box<Ansi.AnsiStyle>

type AnyCommand<T, E = never, R = never> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<T, E, R>
}>

/** Configuration for a terminal program without flags. */
export type TerminalProgramConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
> = Readonly<{
  Model: Schema.Codec<Model, any, unknown, unknown>
  init: () => readonly [
    Model,
    ReadonlyArray<Command<Message, never, Resources>>,
  ]
  update: (
    model: Model,
    message: Message,
  ) => readonly [Model, ReadonlyArray<Command<Message, never, Resources>>]
  view: (model: Model) => TerminalView
  subscriptions?: Subscriptions<Model, Message, StreamDepsMap, Resources>
  title?: (model: Model) => string
  resources?: Layer.Layer<Resources>
}>

/** Configuration for a terminal program with flags. */
export type TerminalProgramConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
> = Omit<
  TerminalProgramConfig<Model, Message, StreamDepsMap, Resources>,
  'init'
> &
  Readonly<{
    Flags: Schema.Codec<Flags, any, unknown, unknown>
    flags: Effect.Effect<Flags>
    init: (
      flags: Flags,
    ) => readonly [Model, ReadonlyArray<Command<Message, never, Resources>>]
  }>

/** A configured terminal program. Pass to `runTerminal` to start it. */
export type TerminalProgram = Readonly<{
  start: () => Effect.Effect<void>
}>

const ESC = '\x1b['
const eraseScreen = `${ESC}2J`
const cursorHome = `${ESC}H`
const cursorHide = `${ESC}?25l`
const cursorShow = `${ESC}?25h`
const altScreenEnter = `${ESC}?1049h`
const altScreenLeave = `${ESC}?1049l`

const renderToString = (view: TerminalView): Effect.Effect<string> =>
  Renderer.render()(view).pipe(
    Effect.map(body => eraseScreen + cursorHome + body),
    Effect.provide(Renderer.AnsiRendererLive),
  )

type ResolvedConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources,
> = Readonly<{
  Model: Schema.Codec<Model, any, unknown, unknown>
  flags: Effect.Effect<Flags>
  init: (
    flags: Flags,
  ) => readonly [Model, ReadonlyArray<Command<Message, never, Resources>>]
  update: (
    model: Model,
    message: Message,
  ) => readonly [Model, ReadonlyArray<Command<Message, never, Resources>>]
  view: (model: Model) => TerminalView
  subscriptions:
    | Subscriptions<Model, Message, StreamDepsMap, Resources>
    | undefined
  title: ((model: Model) => string) | undefined
  resources: Layer.Layer<Resources> | undefined
}>

const makeRuntime = <
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources,
>(
  config: ResolvedConfig<Model, Message, StreamDepsMap, Flags, Resources>,
): TerminalProgram => ({
  start: () =>
    Effect.scoped(
      Effect.gen(function* () {
        const provideResources = <A>(
          effect: Effect.Effect<A, never, Resources>,
        ): Effect.Effect<A> =>
          config.resources
            ? Effect.provide(effect, config.resources)
            : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              (effect as Effect.Effect<A>)

        const flags = yield* config.flags

        const modelEquivalence = Schema.toEquivalence(config.Model)

        const messageQueue = yield* Queue.unbounded<Message>()
        const enqueueMessage = (message: Message) =>
          Queue.offer(messageQueue, message)

        const [initModel, initCommands] = config.init(flags)

        const modelRef = yield* Ref.make<Model>(initModel)
        const modelPubSub = yield* PubSub.unbounded<Model>()

        const forkCommand = (
          command: AnyCommand<Message, never, Resources>,
        ): Effect.Effect<void> =>
          Effect.forkDetach(
            command.effect.pipe(
              Effect.withSpan(command.name),
              provideResources,
              Effect.flatMap(enqueueMessage),
            ),
          )

        yield* Effect.forEach(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          initCommands as ReadonlyArray<AnyCommand<Message, never, Resources>>,
          forkCommand,
        )

        const render = (model: Model): Effect.Effect<void> =>
          Effect.gen(function* () {
            const view = config.view(model)
            const frame = yield* renderToString(view)
            process.stdout.write(frame)

            if (config.title) {
              process.stdout.write(`\x1b]2;${config.title(model)}\x07`)
            }
          })

        yield* render(initModel)

        if (config.subscriptions) {
          yield* pipe(
            config.subscriptions,
            Record.toEntries,
            Effect.forEach(
              ([
                _key,
                {
                  schema,
                  modelToDependencies,
                  equivalence: customEquivalence,
                  dependenciesToStream,
                },
              ]) =>
                Effect.gen(function* () {
                  const latestDependenciesRef = yield* Ref.make(
                    modelToDependencies(initModel),
                  )
                  const equivalence =
                    customEquivalence ?? Schema.toEquivalence(schema)

                  const modelStream = Stream.concat(
                    Stream.make(initModel),
                    Stream.fromPubSub(modelPubSub),
                  )

                  yield* Effect.forkDetach(
                    modelStream.pipe(
                      Stream.mapEffect(model =>
                        Effect.gen(function* () {
                          const dependencies = modelToDependencies(model)
                          yield* Ref.set(latestDependenciesRef, dependencies)
                          return dependencies
                        }),
                      ),
                      Stream.changesWith(equivalence),
                      Stream.switchMap(dependencies =>
                        dependenciesToStream(dependencies, () =>
                          Ref.getUnsafe(latestDependenciesRef),
                        ),
                      ),
                      Stream.runForEach(message =>
                        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
                        enqueueMessage(message as Message),
                      ),
                      provideResources,
                    ),
                  )
                }),
              { concurrency: 'unbounded', discard: true },
            ),
          )
        }

        yield* Effect.forever(
          Effect.gen(function* () {
            const message = yield* Queue.take(messageQueue)
            const currentModel = yield* Ref.get(modelRef)
            const [nextModel, commands] = config.update(currentModel, message)

            if (currentModel !== nextModel) {
              yield* Ref.set(modelRef, nextModel)
              yield* render(nextModel)

              if (!modelEquivalence(currentModel, nextModel)) {
                yield* PubSub.publish(modelPubSub, nextModel)
              }
            }

            yield* Effect.forEach(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              commands as ReadonlyArray<AnyCommand<Message, never, Resources>>,
              forkCommand,
            )
          }),
        ).pipe(
          Effect.catchCause(cause =>
            Effect.sync(() => {
              const squashed = Cause.squash(cause)
              const appError =
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))
              process.stdout.write(altScreenLeave + cursorShow)
              console.error('[foldkit] Application crash:', appError)
            }),
          ),
        )
      }),
    ),
})

/**
 * Builds a Foldkit terminal program. Provide a `Model` schema, `init`,
 * `update`, and `view: (model) => Box<AnsiStyle>`. The returned program is
 * passed to `runTerminal`.
 *
 * Views are pure effect-boxes `Box` values: compose with `Box.text`,
 * `Box.vcat`, `Box.annotate`, the `Layout` module, and ANSI annotations.
 */
export function makeTerminalProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
>(
  config: TerminalProgramConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources
  >,
): TerminalProgram

export function makeTerminalProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
>(
  config: TerminalProgramConfig<Model, Message, StreamDepsMap, Resources>,
): TerminalProgram

export function makeTerminalProgram<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
>(
  config:
    | TerminalProgramConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources
      >
    | TerminalProgramConfig<Model, Message, StreamDepsMap, Resources>,
): TerminalProgram {
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  if ('Flags' in config) {
    const withFlags = config as TerminalProgramConfigWithFlags<
      Model,
      Message,
      StreamDepsMap,
      Flags,
      Resources
    >
    return makeRuntime({
      Model: withFlags.Model,
      flags: withFlags.flags,
      init: withFlags.init,
      update: withFlags.update,
      view: withFlags.view,
      subscriptions: withFlags.subscriptions,
      title: withFlags.title,
      resources: withFlags.resources,
    })
  }

  const noFlags = config as TerminalProgramConfig<
    Model,
    Message,
    StreamDepsMap,
    Resources
  >
  return makeRuntime({
    Model: noFlags.Model,
    flags: Effect.succeed(undefined as Flags),
    init: () => noFlags.init(),
    update: noFlags.update,
    view: noFlags.view,
    subscriptions: noFlags.subscriptions,
    title: noFlags.title,
    resources: noFlags.resources,
  })
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/**
 * Starts a Foldkit terminal program. Enters the alternate screen buffer,
 * hides the cursor, and installs SIGINT/SIGTERM/exit handlers that restore
 * the original screen before the process exits.
 */
export const runTerminal = (program: TerminalProgram): void => {
  process.stdout.write(altScreenEnter + cursorHide)

  const cleanup = () => {
    process.stdout.write(cursorShow + altScreenLeave)
  }

  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })
  process.on('exit', cleanup)

  NodeRuntime.runMain(program.start())
}
