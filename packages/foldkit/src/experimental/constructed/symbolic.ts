import { Context, Effect, Option, Predicate, Schema } from 'effect'

import {
  executeBindingOperation,
  registerBindingResolver,
  registerDeclaredBinding,
} from '../../block/bindingConnection.js'
import {
  isBindingInitRecipe,
  makeBindingInitRecipe,
  runBindingInitRecipe,
} from '../../block/initRecipe.js'
import { instanceOwnerOf } from '../../block/instanceSchema.js'
import { makeOccurrenceCreation } from '../../block/occurrenceRuntime.js'
import { validateOutMessageHandler } from '../../block/outMessageHandlers.js'
import {
  type OperationEnvironment,
  makeResultRecipe,
} from '../../update/operationRecipe.js'
import type { ConstructorEffectOf, DescriptorContract } from './contract.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

/** @internal One passive relationship, independent of an executable child. */
export interface SymbolicBinding {
  readonly original: object
  readonly definition: object
  readonly child: object
  readonly config: Readonly<Record<string, any>>
  readonly policy: Readonly<Record<string, any>> | undefined
  readonly kind: 'Direct' | 'Map'
}

/** @internal An acquired private graph and the descriptor that constructed it. */
export interface Acquisition {
  readonly descriptor: object
  readonly block: any
  readonly graph: object
  readonly isCurrent: () => boolean
}

/** @internal Lifetime and graph identity assigned to an acquired executable. */
export type AcquisitionContext = Pick<Acquisition, 'graph' | 'isCurrent'>

/** @internal Identifies one private executable construction graph. */
export const ConstructionGraph = Context.Service<symbol, object>(
  'foldkit/ConstructedBlock/ConstructionGraph',
)

const declarations = new WeakMap<object, SymbolicBinding>()
const acquired = new WeakMap<object, Acquisition>()
const constructors = new WeakMap<
  object,
  () => Effect.Effect<object, any, any>
>()
const providedExecutables = new WeakMap<
  object,
  () => Effect.Effect<Option.Option<object>, any, any>
>()
const connections = new WeakMap<
  object,
  Readonly<{
    binding: object
    child: object
    canonicalGraph: object | undefined
  }>
>()
const embeddings = new WeakMap<
  object,
  Readonly<{ binding: object; config: object }>
>()
const executionBindings = new WeakMap<object, OperationEnvironment>()
/** @internal Retains the immutable relationship map of one acquired implementation. */
export const registerExecutionBindings = (
  block: object,
  bindings: OperationEnvironment,
): void => {
  executionBindings.set(block, bindings)
}

/** @internal Reads connections without selecting a global current graph. */
export const executionBindingsOf = (block: object) =>
  executionBindings.get(block)

/** @internal Retains the private executable without exposing its graph in public types. */
export const registerAcquisition = (
  executable: object,
  descriptor: object,
  block: object,
  graph: object,
  isCurrent: () => boolean,
): void => {
  acquired.set(executable, { descriptor, block, graph, isCurrent })
}

/** @internal Associates an alias with the exact acquired graph and lifetime. */
export const registerAcquisitionAlias = (
  executable: object,
  descriptor: object,
  block: object,
  acquisition: Acquisition,
): void =>
  registerAcquisition(
    executable,
    descriptor,
    block,
    acquisition.graph,
    acquisition.isCurrent,
  )

/** @internal Reuses an inherited graph token or creates one for a new root. */
export const withConstructionGraph = <Value, Error, Requirements>(
  construct: (graph: object) => Effect.Effect<Value, Error, Requirements>,
  preferredGraph?: object,
): Effect.Effect<Value, Error, Requirements> =>
  Effect.flatMap(Effect.serviceOption(ConstructionGraph), maybeGraph => {
    const graph = Option.getOrElse(
      maybeGraph,
      () => preferredGraph ?? Object.freeze({}),
    )

    return Effect.provideService(construct(graph), ConstructionGraph, graph)
  })

/** @internal Retains construction under the descriptor's selected Effect or Layer owner. */
export const registerDescriptorConstructor = (
  descriptor: object,
  construct: () => Effect.Effect<object, any, any>,
): void => {
  constructors.set(descriptor, construct)
}

/** @internal Resolves an executable supplied by the current Layer context. */
export const registerProvidedExecutableResolver = (
  descriptor: object,
  resolve: () => Effect.Effect<Option.Option<object>, any, any>,
): void => {
  providedExecutables.set(descriptor, resolve)
}

/** @internal Reads acquisition only for an original registered descriptor. */
export const descriptorConstructorOf = (
  descriptor: object,
): (() => Effect.Effect<object, any, any>) | undefined =>
  constructors.get(descriptor)

/** @internal Reads an original declaration without exposing a public getter. */
export function readDeclaredExecutable<Value extends DescriptorContract>(
  descriptor: Value,
): Effect.Effect<
  object,
  Effect.Error<ConstructorEffectOf<Value>>,
  Effect.Services<ConstructorEffectOf<Value>>
>
export function readDeclaredExecutable(
  descriptor: object,
): Effect.Effect<object, any, any> {
  const construct = descriptorConstructorOf(descriptor)

  if (construct === undefined) {
    throw new Error(
      '[foldkit] A private reader requires an original declared Block.',
    )
  }

  return Effect.suspend(construct)
}

/** @internal Requires an acquired executable rather than a descriptor or forged record. */
export const acquisitionOf = (executable: object): Acquisition => {
  const acquisition = acquired.get(executable)

  if (acquisition === undefined) {
    throw new Error('[foldkit] A connection requires an acquired executable.')
  }

  return acquisition
}

/** @internal Requires the original passive relationship metadata. */
export const symbolicBindingOf = (binding: object): SymbolicBinding => {
  const declaration = declarations.get(binding)

  if (declaration === undefined) {
    throw new Error('[foldkit] This constructor requires a declared Binding.')
  }

  return declaration
}

/** @internal Reads a validated connection without trusting caller-owned fields. */
export const symbolicConnectionOf = (connection: object) => {
  const value = connections.get(connection)

  if (value === undefined) {
    throw new Error(
      '[foldkit] Constructor bindings require original connections.',
    )
  }

  return value
}

/** @internal Resolves a symbolic embedding for the current acquired root only. */
export const symbolicEmbeddingOf = (embedding: object) =>
  embeddings.get(embedding)

const activeBinding = (
  original: object,
  environment: OperationEnvironment | undefined,
): object => {
  const actual = environment?.get(original)

  if (actual === undefined) {
    throw new Error(
      '[foldkit] The Binding is not connected in this executable graph.',
    )
  }

  return actual
}

const selectPolicy = (
  declaration: SymbolicBinding,
  policy: unknown,
): Readonly<Record<string, any>> => {
  if (!Predicate.isObject(policy) || globalThis.Array.isArray(policy)) {
    throw new Error('[foldkit] A Binding policy must be a record.')
  }

  if (!Object.hasOwn(policy, 'fold') && !Object.hasOwn(policy, 'forward')) {
    throw new Error('[foldkit] A Binding policy requires fold or forward.')
  }

  for (const key of Reflect.ownKeys(policy)) {
    if (key !== 'fold' && key !== 'forward') {
      throw new Error(
        '[foldkit] A Binding policy only supports fold and forward.',
      )
    }

    const handler = Reflect.get(policy, key)

    if (!Predicate.isFunction(handler)) {
      throw new Error('[foldkit] A Binding policy member must be a function.')
    }

    validateOutMessageHandler(handler, declaration.child, key)
  }

  return Object.freeze({ ...policy })
}

const instanceOwnerAt = (definition: object, field: unknown): unknown => {
  const parentSchema = Reflect.get(definition, 'Model')
  const parentFields = Schema.isSchema(parentSchema)
    ? Reflect.get(parentSchema, 'fields')
    : undefined
  const storage =
    Predicate.isObject(parentFields) && Predicate.isString(field)
      ? Reflect.get(parentFields, field)
      : undefined
  const itemSchema = Schema.isSchema(storage)
    ? Reflect.get(storage, 'value')
    : undefined

  return Schema.isSchema(itemSchema) ? instanceOwnerOf(itemSchema) : undefined
}

const bindingValue = (declaration: SymbolicBinding): object => {
  const operations = new Map<string, AnyFunction>()
  const view = () => {
    throw new Error(
      '[foldkit] Render a Binding embedding through the graph-aware h.block builder.',
    )
  }
  const placement = declaration.config['placement']
  const field = declaration.config['field']
  const isFieldPlacement =
    Predicate.isString(field) &&
    (declaration.kind === 'Map' || declaration.config['key'] === undefined)
  const owner = Reflect.get(declaration.child, 'owner')
  const occurrenceCreation =
    declaration.kind === 'Direct' &&
    Predicate.isString(field) &&
    declaration.config['key'] === 'key' &&
    declaration.config['childField'] === 'model' &&
    instanceOwnerAt(declaration.definition, field) === owner
      ? {
          create: (config: unknown) =>
            makeOccurrenceCreation(declaration.original, field, config),
        }
      : {}
  const connect = (
    child: object,
    canonicalGraph: object | undefined,
  ): object => {
    const acquisition = acquisitionOf(child)

    if (!acquisition.isCurrent()) {
      throw new Error(
        '[foldkit] A Binding cannot connect an executable after its acquisition Scope has closed.',
      )
    }

    if (acquisition.descriptor !== declaration.child) {
      throw new Error(
        '[foldkit] The acquired child belongs to another Block descriptor.',
      )
    }

    for (const name of ['construct', 'connect']) {
      if (Object.hasOwn(acquisition.block.operations, name)) {
        throw new Error(
          `[foldkit] Block construction reserves the Binding operation name "${name}".`,
        )
      }
    }

    if (
      Object.hasOwn(occurrenceCreation, 'create') &&
      Object.hasOwn(acquisition.block.operations, 'create')
    ) {
      throw new Error(
        '[foldkit] An Instance Binding reserves create for occurrence initialization.',
      )
    }

    const connection = Object.freeze({})
    connections.set(connection, { binding, child, canonicalGraph })

    return connection
  }
  const target = {
    ...occurrenceCreation,
    placement: placement ?? (isFieldPlacement ? field : owner.id),
    connect: (child: object) => connect(child, undefined),
    construct: () =>
      Effect.flatMap(Effect.serviceOption(ConstructionGraph), maybeGraph => {
        const resolveProvided = providedExecutables.get(declaration.child)
        const construct = constructors.get(declaration.child)
        const canonicalGraph = Option.getOrUndefined(maybeGraph)

        if (construct === undefined) {
          throw new Error(
            '[foldkit] A Binding requires a known child construction recipe.',
          )
        }

        if (resolveProvided === undefined) {
          return Effect.map(construct(), child =>
            connect(child, canonicalGraph),
          )
        }

        return Effect.flatMap(resolveProvided(), maybeProvided =>
          Option.match(maybeProvided, {
            onNone: () =>
              Effect.map(construct(), child => connect(child, canonicalGraph)),
            onSome: child => Effect.succeed(connect(child, canonicalGraph)),
          }),
        )
      }),
    [Symbol.iterator]: () => target.construct()[Symbol.iterator](),
    withOutMessagePolicy: (policy: unknown) =>
      bindingValue({
        ...declaration,
        policy: selectPolicy(declaration, policy),
      }),
    init: (config: object) =>
      makeBindingInitRecipe(declaration.original, environment => {
        const actual = activeBinding(declaration.original, environment)
        const recipe = Reflect.apply(Reflect.get(actual, 'init'), actual, [
          config,
        ])

        if (!isBindingInitRecipe(recipe)) {
          throw new Error(
            '[foldkit] The connected initializer did not produce a recipe.',
          )
        }

        return runBindingInitRecipe(recipe, environment)
      }),
    fold: (model: unknown, ...args: ReadonlyArray<unknown>) =>
      makeResultRecipe((_model, environment) =>
        executeBindingOperation(
          activeBinding(declaration.original, environment),
          'fold',
          model,
          args,
          environment,
        ),
      ),
    embedView: (config: object) => {
      const embedding = Object.freeze({
        ...config,
        view: Reflect.get(config, 'view') ?? view,
      })
      embeddings.set(embedding, { binding: declaration.original, config })

      return embedding
    },
  }
  const binding = new Proxy(Object.freeze(target), {
    get(target, key, receiver) {
      if (Object.hasOwn(target, key)) {
        return Reflect.get(target, key, receiver)
      }

      if (!Predicate.isString(key) || key === 'then') {
        return undefined
      }

      const existing = operations.get(key)

      if (existing !== undefined) {
        return existing
      }

      const operation =
        (...args: ReadonlyArray<unknown>) =>
        (model: unknown) =>
          makeResultRecipe((_model, environment) =>
            executeBindingOperation(
              activeBinding(declaration.original, environment),
              key,
              model,
              args,
              environment,
            ),
          )

      operations.set(key, operation)

      return operation
    },
  })
  declarations.set(binding, declaration)
  registerDeclaredBinding(binding, declaration.child, declaration.original)
  registerBindingResolver(binding, environment =>
    activeBinding(declaration.original, environment),
  )

  return binding
}

/** @internal Records only relationship policy; no child implementation is inspected. */
export const makeSymbolicBinding = (
  definition: object,
  child: object,
  providedConfig: Readonly<Record<string, any>>,
  kind: 'Direct' | 'Map' = 'Direct',
): object => {
  const instanceOwner = instanceOwnerAt(definition, providedConfig['field'])

  if (
    instanceOwner !== undefined &&
    instanceOwner !== Reflect.get(child, 'owner')
  ) {
    throw new Error(
      '[foldkit] Instance storage belongs to another child Block contract.',
    )
  }

  const allowedKeys =
    kind === 'Map'
      ? new Set([
          'field',
          'childField',
          'placement',
          'subscriptions',
          'delivery',
        ])
      : new Set([
          'field',
          'childField',
          'key',
          'readAll',
          'read',
          'write',
          'writeAt',
          'placement',
          'activeWhen',
          'init',
          'subscriptions',
          'delivery',
          'keySchema',
        ])

  for (const key of Reflect.ownKeys(providedConfig)) {
    if (!Predicate.isString(key) || !allowedKeys.has(key)) {
      throw new Error(
        '[foldkit] This constructor Binding contains unsupported configuration.',
      )
    }
  }

  if (kind === 'Map' && !Predicate.isString(providedConfig['field'])) {
    throw new Error('[foldkit] A symbolic Map Binding requires a field.')
  }

  return bindingValue({
    original: Object.freeze({}),
    definition,
    child,
    kind,
    config: Object.freeze({
      ...providedConfig,
      ...(Predicate.isObject(providedConfig['init'])
        ? { init: Object.freeze({ ...providedConfig['init'] }) }
        : {}),
      ...(Predicate.isObject(providedConfig['delivery'])
        ? { delivery: Object.freeze({ ...providedConfig['delivery'] }) }
        : {}),
      ...(Predicate.isObject(providedConfig['subscriptions'])
        ? {
            subscriptions: Object.freeze({
              ...providedConfig['subscriptions'],
            }),
          }
        : {}),
    }),
    policy: undefined,
  })
}
