import {
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Predicate,
  type Scope,
} from 'effect'

import type { Html } from '../html/index.js'
import {
  type SceneStep,
  given as givenScene,
  scene as runScene,
} from '../test/scene.js'
import {
  type StoryStep,
  given as givenStory,
  story as runStory,
} from '../test/story.js'
import { blockRegistry } from './block.js'
import {
  type BlockMessage,
  type RuntimeBlock,
  type RuntimeInstance,
  constructSync,
  disposeGraph,
  hydrate,
  makeGraph,
  renderRoot,
  resolve,
  takeStarted,
  update,
} from './engine.js'

type AnyInstance = Readonly<{
  id: string
  model: any
  send: (message: never) => unknown
}>

/** The plain data form of a Model that holds Block instances: every instance
 *  is replaced by its own resolved Model. Tests read and write this form. */
export type Resolved<
  T,
  Depth extends ReadonlyArray<unknown> = [],
> = Depth['length'] extends 8
  ? T
  : T extends AnyInstance
    ? Resolved<T['model'], [...Depth, unknown]>
    : T extends ReadonlyArray<infer Item>
      ? ReadonlyArray<Resolved<Item, [...Depth, unknown]>>
      : T extends Option.Option<infer Value>
        ? Option.Option<Resolved<Value, [...Depth, unknown]>>
        : T extends Readonly<Record<string, unknown>>
          ? { readonly [K in keyof T]: Resolved<T[K], [...Depth, unknown]> }
          : T

/** The resolved Model of a Block instance. */
export type ResolvedModelOf<Self> = Self extends AnyInstance
  ? Resolved<Self['model']>
  : never

/** The Messages a Block instance accepts, plus Messages addressed to its
 *  children. */
export type MessageOfInstance<Self> = Self extends AnyInstance
  ? Parameters<Self['send']>[0] | BlockMessage
  : never

type ArgsOfInstance<Self> =
  Self extends Readonly<{
    '~args'?: (args: infer Args) => unknown
  }>
    ? Args
    : never

type StorySteps<Self> = ReadonlyArray<
  StoryStep<ResolvedModelOf<Self>, MessageOfInstance<Self>, any>
>

type SceneSteps<Self> = ReadonlyArray<
  SceneStep<ResolvedModelOf<Self>, MessageOfInstance<Self>, any, any>
>

const stepTags: ReadonlySet<unknown> = new Set([
  'ChangedUrlStep',
  'DeliveredMessageStep',
  'InsideStep',
  'MessageStep',
  'MessageWithStep',
  'ModelStep',
  'OutMessageStep',
  'OutMessagesStep',
  'StoryStepsStep',
])

/** Returns whether a value is a Story or Scene step rather than constructor
 *  args, which may themselves be tagged values. */
const isStep = (value: unknown): boolean =>
  Predicate.isFunction(value) ||
  (Predicate.hasProperty(value, '_tag') && stepTags.has(value._tag))

const splitArgs = (
  rest: ReadonlyArray<unknown>,
): Readonly<{ args: unknown; steps: ReadonlyArray<unknown> }> =>
  Option.match(Array.head(rest), {
    onNone: () => ({ args: undefined, steps: rest }),
    onSome: first =>
      isStep(first)
        ? { args: undefined, steps: rest }
        : { args: first, steps: Array.drop(rest, 1) },
  })

const findRootBlock = (context: Context.Context<never>): RuntimeBlock => {
  const roots = Array.filter(Array.fromIterable(blockRegistry), block =>
    Option.isSome(Context.getOption(context, block.service)),
  )

  if (roots.length !== 1) {
    throw new Error(
      `[foldkit] A story or scene Layer must provide exactly one Block, but it provides ${roots.length}. Provide child Blocks with \`Layer.provide\` rather than \`Layer.merge\`.`,
    )
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return roots[0] as RuntimeBlock
}

type Simulation = Readonly<{
  update: (
    model: unknown,
    message: unknown,
  ) => Readonly<{
    model: unknown
    commands: ReadonlyArray<never>
    outMessage: unknown
  }>
  view: (model: unknown) => unknown
  initialModel: unknown
}>

const makeSimulation = <E, R>(
  layer: Layer.Layer<unknown, E, R>,
  args: unknown,
): Effect.Effect<Simulation, E, R | Scope.Scope> =>
  Effect.gen(function* () {
    const context = yield* Layer.build(layer)
    const block = findRootBlock(context)
    const graph = makeGraph({ isSimulation: true })
    yield* Effect.addFinalizer(() => disposeGraph(graph))

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    let current = constructSync(graph, block, [], block.id, args, context)
    takeStarted(graph)

    const toInstance = (model: unknown): RuntimeInstance => {
      current = hydrate(model, current) as RuntimeInstance
      return current
    }

    return {
      initialModel: resolve(current),
      update: (model, message) => {
        const result = update(graph, toInstance(model), message)
        current = result.instance
        return {
          model: resolve(result.instance),
          commands: result.commands as ReadonlyArray<never>,
          outMessage: result.outMessage,
        }
      },
      view: model => renderRoot(graph, toInstance(model)),
    }
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  })

/**
 * Runs a Story against a Block. Builds the instance from its Layer, starts
 * from the Model its constructor returns, and runs the steps against its
 * update. Command handlers never run: assert on the Commands update returned
 * and resolve them with result Messages. The root instance's `start`
 * Commands are not part of the story; a child's `start` Commands are, as
 * Commands of the update that put the child in the Model. Pass constructor
 * args after the Layer when the Block takes them. Instance scopes close when
 * the story ends.
 */
export const story: {
  <Self, E, R>(
    layer: Layer.Layer<Self, E, R>,
    ...steps: StorySteps<Self>
  ): Effect.Effect<void, E, R>
  <Self, E, R>(
    layer: Layer.Layer<Self, E, R>,
    args: ArgsOfInstance<Self>,
    ...steps: StorySteps<Self>
  ): Effect.Effect<void, E, R>
  // oxlint-disable-next-line typescript/consistent-type-assertions
} & typeof runStory = ((
  layer: unknown,
  ...rest: ReadonlyArray<unknown>
): unknown => {
  if (!Layer.isLayer(layer)) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return (runStory as (...args: ReadonlyArray<unknown>) => void)(
      layer,
      ...rest,
    )
  }
  const { args, steps } = splitArgs(rest)
  return Effect.scoped(
    Effect.map(
      // oxlint-disable-next-line typescript/consistent-type-assertions
      makeSimulation(layer as Layer.Layer<unknown, unknown, unknown>, args),
      simulation => {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const storySteps = steps as ReadonlyArray<
          StoryStep<unknown, unknown, unknown>
        >
        runStory(
          simulation.update,
          givenStory(simulation.initialModel),
          ...storySteps,
        )
      },
    ),
  )
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
}) as never

/**
 * Runs a Scene against a Block: renders its view, drives it through user
 * interactions, and asserts on the rendered output. Builds the instance from
 * its Layer the same way {@link story} does.
 */
export const scene: {
  <Self, E, R>(
    layer: Layer.Layer<Self, E, R>,
    ...steps: SceneSteps<Self>
  ): Effect.Effect<void, E, R>
  <Self, E, R>(
    layer: Layer.Layer<Self, E, R>,
    args: ArgsOfInstance<Self>,
    ...steps: SceneSteps<Self>
  ): Effect.Effect<void, E, R>
  // oxlint-disable-next-line typescript/consistent-type-assertions
} & typeof runScene = ((
  layer: unknown,
  ...rest: ReadonlyArray<unknown>
): unknown => {
  if (!Layer.isLayer(layer)) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return (runScene as (...args: ReadonlyArray<unknown>) => void)(
      layer,
      ...rest,
    )
  }
  const { args, steps } = splitArgs(rest)
  return Effect.scoped(
    Effect.map(
      // oxlint-disable-next-line typescript/consistent-type-assertions
      makeSimulation(layer as Layer.Layer<unknown, unknown, unknown>, args),
      simulation => {
        /* eslint-disable @typescript-eslint/consistent-type-assertions */
        const sceneSteps = steps as ReadonlyArray<
          SceneStep<unknown, unknown, unknown, any>
        >
        runScene(
          {
            update: simulation.update,
            view: (model: unknown) => simulation.view(model) as Html,
          } as never,
          givenScene(simulation.initialModel) as never,
          ...(sceneSteps as ReadonlyArray<never>),
        )
        /* eslint-enable @typescript-eslint/consistent-type-assertions */
      },
    ),
  )
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
}) as never
