import { HashMap, Option, Predicate, Record } from 'effect'

import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import {
  makeResultRecipe,
  resolveOperationOutput,
} from '../update/operationRecipe.js'
import type {
  AnyBinding,
  BlockOfBinding,
  ParentContractOfBinding,
  RequirementOfBinding,
  StorageOfBinding,
} from './binding.js'
import { bindingResolverOf } from './bindingConnection.js'
import { canonicalBindingOf, runtimeBindingOf } from './composition.js'
import type { RuntimeBindingStorage } from './composition.js'
import type { OutgoingMessageOfBinding } from './delivery.js'
import {
  type BindingInitRecipe,
  isBindingInitRecipe,
  makeBindingInitRecipe,
  runBindingInitRecipe,
} from './initRecipe.js'
import {
  assertRegisteredBinding,
  isRegisteredBinding,
} from './operationGraph.js'
import type { Qualify } from './scope.js'

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnion<Value, Whole = Value> = Value extends unknown
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type ParentModelOf<BindingValue> =
  ParentContractOfBinding<BindingValue> extends Readonly<{ model: infer Model }>
    ? Model
    : never

type InitialRequirementsOf<BindingValue extends AnyBinding> = Qualify<
  BindingValue['placement'],
  Update.RequirementsOf<BlockOfBinding<BindingValue>['init']>
>

type ValidateInsertBinding<
  BindingValue extends AnyBinding,
  Operation extends string = 'initAndInsert',
> =
  IsAny<BindingValue> extends true
    ? readonly [error: `${Operation} requires one concrete Binding`]
    : true extends IsUnion<BindingValue>
      ? readonly [error: `${Operation} requires one concrete Binding`]
      : true extends IsUnion<BindingValue['placement']>
        ? readonly [error: `${Operation} requires one concrete Binding`]
        : StorageOfBinding<BindingValue> extends Readonly<{
              kind: 'Map'
              field: infer Field extends string
              childField: infer ChildField
            }>
          ? true extends IsUnion<Field>
            ? readonly [error: `${Operation} requires one concrete map field`]
            : string extends Field
              ? readonly [error: `${Operation} requires one concrete map field`]
              : [ChildField] extends [never]
                ? readonly []
                : readonly [
                    error: `${Operation} requires exact child values without wrapper metadata`,
                  ]
          : readonly [
              error: `${Operation} requires an exact Record or HashMap child Binding`,
            ]

type MapInitConfig<BindingValue extends AnyBinding> = Readonly<{
  key: Parameters<BindingValue['fold']>[1]
  args: Parameters<BlockOfBinding<BindingValue>['init']>
  commands?: never
  toParentModel?: never
}>

type MapInitProducer<BindingValue extends AnyBinding> = (
  model: ParentModelOf<BindingValue>,
) => Option.Option<MapInitConfig<BindingValue>>

type MapStorage = Extract<RuntimeBindingStorage, { kind: 'Map' }>

const snapshotConfig = (config: unknown): unknown => {
  if (!Predicate.isObject(config)) {
    return config
  }

  const args = Reflect.get(config, 'args')

  return Object.freeze({
    ...config,
    ...(globalThis.Array.isArray(args)
      ? { args: Object.freeze([...args]) }
      : {}),
  })
}

const mapStorageOf = (binding: object, operation: string): MapStorage => {
  const { storage } = runtimeBindingOf(binding)

  if (storage?.kind !== 'Map' || storage.childField !== undefined) {
    throw new Error(
      `[foldkit] ${operation} requires an exact Record or HashMap child Binding.`,
    )
  }

  return storage
}

const mapInitConfig = (
  binding: AnyBinding,
  config: unknown,
  operation: string,
): Readonly<{
  storage: MapStorage
  key: string | number
  args: ReadonlyArray<unknown>
}> => {
  const storage = mapStorageOf(binding, operation)

  if (!Predicate.isObject(config)) {
    throw new Error(`[foldkit] ${operation} requires a key and args object.`)
  }

  for (const field of Reflect.ownKeys(config)) {
    if (field !== 'key' && field !== 'args') {
      throw new Error(
        `[foldkit] ${operation} does not support the configuration field "${globalThis.String(field)}".`,
      )
    }
  }

  const key: unknown = Reflect.get(config, 'key')
  const suppliedArgs = Reflect.get(config, 'args')

  if (!globalThis.Array.isArray(suppliedArgs)) {
    throw new Error(
      `[foldkit] ${operation} args must be a child init argument tuple.`,
    )
  }

  if (storage.container === 'Record') {
    if (!Predicate.isString(key)) {
      throw new Error(`[foldkit] ${operation} Record keys must be strings.`)
    }
  } else if (
    !Predicate.isString(key) &&
    !(Predicate.isNumber(key) && globalThis.Number.isFinite(key))
  ) {
    throw new Error(
      `[foldkit] ${operation} HashMap keys must be strings or finite numbers.`,
    )
  }

  return { storage, key, args: [...suppliedArgs] }
}

const assertParentModel = (
  binding: AnyBinding,
  model: unknown,
  operation: string,
): void => {
  const { isParentModel } = runtimeBindingOf(binding)

  if (!Predicate.isObject(model) || !isParentModel?.(model)) {
    throw new Error(
      `[foldkit] ${operation} requires the complete parent Model.`,
    )
  }
}

const mapEntry = (
  model: unknown,
  storage: MapStorage,
  key: string | number,
  operation: string,
) => {
  if (!Predicate.isObject(model)) {
    throw new Error(
      `[foldkit] ${operation} requires the complete parent Model.`,
    )
  }

  const collection = Reflect.get(model, storage.field)

  if (storage.container === 'Record' && Predicate.isString(key)) {
    if (!Predicate.isObject(collection) || HashMap.isHashMap(collection)) {
      throw new Error(`[foldkit] ${operation} requires Record storage.`)
    }

    return {
      isPresent: Record.has(collection, key),
      insert: (child: unknown) =>
        modifyFields(model, {
          [storage.field]: () => Record.set(collection, key, child),
        }),
    }
  }

  if (!HashMap.isHashMap(collection)) {
    throw new Error(`[foldkit] ${operation} requires Effect HashMap storage.`)
  }

  return {
    isPresent: HashMap.has(collection, key),
    insert: (child: unknown) =>
      modifyFields(model, {
        [storage.field]: () => HashMap.set(collection, key, child),
      }),
  }
}

/**
 * Creates a passive initialization recipe that inserts one absent child into
 * an exact Record or Effect HashMap Binding made by `makeRecordBinding` or `makeHashMapBinding`.
 *
 * The map value must be the child Model itself. Parent-owned wrapper metadata
 * keeps the explicit `Binding.init` writer. Return the recipe intact from a
 * matching parent Step or update handler. Composition initializes the child
 * and lifts its Commands when it interprets the recipe.
 *
 * Construction snapshots the key and child init arguments. An existing key is
 * rejected before child init; this operation never replaces an occurrence.
 * Other entries and parent fields retain their identity. This helper accepts no
 * parent Commands or alternative writer.
 */
export function initAndInsert<const BindingValue extends AnyBinding>(
  binding: BindingValue,
  model: ParentModelOf<NoInfer<BindingValue>>,
  config: MapInitConfig<NoInfer<BindingValue>>,
  ...validation: NoInfer<ValidateInsertBinding<BindingValue>>
): BindingInitRecipe<
  ParentModelOf<BindingValue>,
  OutgoingMessageOfBinding<BindingValue>,
  InitialRequirementsOf<BindingValue>,
  RequirementOfBinding<BindingValue>
>
export function initAndInsert(
  binding: AnyBinding,
  model: unknown,
  config: unknown,
  ..._validation: ReadonlyArray<unknown>
): unknown {
  const resolveBinding = bindingResolverOf(binding)

  if (resolveBinding !== undefined) {
    const capturedConfig = snapshotConfig(config)

    return makeBindingInitRecipe(binding, environment => {
      const recipe = Reflect.apply(initAndInsert, undefined, [
        resolveBinding(environment),
        model,
        capturedConfig,
      ])

      if (!isBindingInitRecipe(recipe)) {
        throw new Error(
          '[foldkit] Map insertion did not produce an initialization recipe.',
        )
      }

      return runBindingInitRecipe(recipe, environment)
    })
  }

  const { storage, key, args } = mapInitConfig(binding, config, 'initAndInsert')

  assertParentModel(binding, model, 'initAndInsert')

  const entry = mapEntry(model, storage, key, 'initAndInsert')

  if (entry.isPresent) {
    throw new Error(
      `[foldkit] initAndInsert cannot insert duplicate key "${globalThis.String(key)}".`,
    )
  }

  return binding.init({
    key,
    args,
    toParentModel: entry.insert,
  })
}

/**
 * Creates a connected Step that initializes and inserts a child only when its
 * key is absent from the Binding's declared Record or Effect HashMap field.
 *
 * Pass one concrete Record or HashMap Binding whose values are child Models,
 * plus its exact key and child init argument tuple, or a Model-first producer
 * returning an Option of that configuration. No field selector or
 * separate presence check is needed. Wrapped values and custom accessors keep
 * explicit initialization because the parent owns their storage policy.
 *
 * A concrete configuration captures the key and arguments at construction.
 * A producer runs once when the Step is applied, using that Step's current
 * parent Model. None preserves the exact Model without initializing a child.
 * Construction does not run the producer or initialize a child.
 * The registered Composition checks the current Model when applying the Step.
 * An existing key preserves the exact parent Model and emits no Commands; an
 * absent key retains every lifted child init Command. Both paths require the
 * same Binding registration. Existing children are never reset or replaced.
 */
export function makeInitIfMissingStep<const BindingValue extends AnyBinding>(
  binding: BindingValue,
  config:
    | MapInitConfig<NoInfer<BindingValue>>
    | MapInitProducer<NoInfer<BindingValue>>,
  ...validation: NoInfer<
    ValidateInsertBinding<BindingValue, 'makeInitIfMissingStep'>
  >
): (
  model: Update.GraphInput<
    ParentModelOf<BindingValue>,
    RequirementOfBinding<BindingValue>
  >,
) => Update.ResultRecipe<
  ParentModelOf<BindingValue>,
  OutgoingMessageOfBinding<BindingValue>,
  never,
  InitialRequirementsOf<BindingValue>,
  RequirementOfBinding<BindingValue>
>
export function makeInitIfMissingStep(
  binding: AnyBinding,
  config: unknown,
  ..._validation: ReadonlyArray<unknown>
): unknown {
  const resolveBinding = bindingResolverOf(binding)

  if (resolveBinding !== undefined) {
    const capturedConfig = Predicate.isFunction(config)
      ? config
      : snapshotConfig(config)

    return (model: unknown) =>
      makeResultRecipe((_model, environment) => {
        const step = Reflect.apply(makeInitIfMissingStep, undefined, [
          resolveBinding(environment),
          capturedConfig,
        ])

        return resolveOperationOutput(step(model), model, environment)
      })
  }

  if (Predicate.isFunction(config)) {
    mapStorageOf(binding, 'makeInitIfMissingStep')

    const originalBinding = canonicalBindingOf(binding)

    return (model: unknown) =>
      makeResultRecipe((_model, environment) => {
        assertRegisteredBinding(originalBinding, binding.placement)
        assertParentModel(binding, model, 'makeInitIfMissingStep')

        const maybeConfig: unknown = config(model)

        if (!Option.isOption(maybeConfig)) {
          throw new Error(
            '[foldkit] makeInitIfMissingStep producer must return an Option of key and args.',
          )
        }

        if (Option.isNone(maybeConfig)) {
          return { model }
        }

        const step = Reflect.apply(makeInitIfMissingStep, undefined, [
          binding,
          maybeConfig.value,
        ])

        return resolveOperationOutput(step(model), model, environment)
      })
  }

  const { storage, key, args } = mapInitConfig(
    binding,
    config,
    'makeInitIfMissingStep',
  )
  const originalBinding = canonicalBindingOf(binding)

  const execute = (model: unknown) => {
    assertRegisteredBinding(originalBinding, binding.placement)

    const entry = mapEntry(model, storage, key, 'makeInitIfMissingStep')

    if (entry.isPresent) {
      return { model }
    }

    assertParentModel(binding, model, 'makeInitIfMissingStep')

    const recipe = binding.init({
      key,
      args,
      toParentModel: entry.insert,
    })

    return runBindingInitRecipe(recipe)
  }

  return (model: unknown) =>
    isRegisteredBinding(originalBinding)
      ? execute(model)
      : makeResultRecipe(() => execute(model))
}
