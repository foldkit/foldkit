import { HashMap, Predicate, Record } from 'effect'

import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { makeResultRecipe } from '../update/operationRecipe.js'
import type {
  AnyBinding,
  BlockOfBinding,
  ParentContractOfBinding,
  RequirementOfBinding,
  StorageOfBinding,
} from './binding.js'
import { canonicalBindingOf, runtimeBindingOf } from './composition.js'
import type { RuntimeBindingStorage } from './composition.js'
import type { OutgoingMessageOfBinding } from './delivery.js'
import { type BindingInitRecipe, runBindingInitRecipe } from './initRecipe.js'
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

type MapStorage = Extract<RuntimeBindingStorage, { kind: 'Map' }>

const mapInitConfig = (
  binding: AnyBinding,
  config: unknown,
  operation: string,
): Readonly<{
  storage: MapStorage
  key: string | number
  args: ReadonlyArray<unknown>
}> => {
  const { storage } = runtimeBindingOf(binding)

  if (storage?.kind !== 'Map' || storage.childField !== undefined) {
    throw new Error(
      `[foldkit] ${operation} requires an exact Record or HashMap child Binding.`,
    )
  }

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
 * an exact Record or Effect HashMap Binding made by `makeMapBinding`.
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
 * Pass one concrete `makeMapBinding` Binding whose values are child Models,
 * plus its exact key and child init argument tuple. No field selector or
 * separate presence check is needed. Wrapped values and custom accessors keep
 * explicit initialization because the parent owns their storage policy.
 *
 * Construction captures the key and arguments without initializing a child.
 * The registered Composition checks the current Model when applying the Step.
 * An existing key preserves the exact parent Model and emits no Commands; an
 * absent key retains every lifted child init Command. Both paths require the
 * same Binding registration. Existing children are never reset or replaced.
 */
export function makeInitIfMissingStep<const BindingValue extends AnyBinding>(
  binding: BindingValue,
  config: MapInitConfig<NoInfer<BindingValue>>,
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
      : makeResultRecipe(execute)
}
