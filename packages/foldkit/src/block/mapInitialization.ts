import { HashMap, Predicate, Record } from 'effect'

import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type {
  AnyBinding,
  BlockOfBinding,
  ParentContractOfBinding,
  RequirementOfBinding,
  StorageOfBinding,
} from './binding.js'
import { runtimeBindingOf } from './composition.js'
import type { OutgoingMessageOfBinding } from './delivery.js'
import type { BindingInitRecipe } from './initRecipe.js'
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

type ValidateInsertBinding<BindingValue extends AnyBinding> =
  IsAny<BindingValue> extends true
    ? readonly [error: 'initAndInsert requires one concrete Binding']
    : true extends IsUnion<BindingValue>
      ? readonly [error: 'initAndInsert requires one concrete Binding']
      : true extends IsUnion<BindingValue['placement']>
        ? readonly [error: 'initAndInsert requires one concrete Binding']
        : StorageOfBinding<BindingValue> extends Readonly<{
              kind: 'Map'
              field: infer Field extends string
              childField: infer ChildField
            }>
          ? true extends IsUnion<Field>
            ? readonly [error: 'initAndInsert requires one concrete map field']
            : string extends Field
              ? readonly [
                  error: 'initAndInsert requires one concrete map field',
                ]
              : [ChildField] extends [never]
                ? readonly []
                : readonly [
                    error: 'initAndInsert requires exact child values without wrapper metadata',
                  ]
          : readonly [
              error: 'initAndInsert requires an exact Record or HashMap child Binding',
            ]

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
  config: Readonly<{
    key: Parameters<NoInfer<BindingValue>['fold']>[1]
    args: Parameters<BlockOfBinding<NoInfer<BindingValue>>['init']>
    commands?: never
    toParentModel?: never
  }>,
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
  const runtime = runtimeBindingOf(binding)
  const { isParentModel, storage } = runtime

  if (storage?.kind !== 'Map' || storage.childField !== undefined) {
    throw new Error(
      '[foldkit] initAndInsert requires an exact Record or HashMap child Binding.',
    )
  }

  if (!Predicate.isObject(model) || !isParentModel?.(model)) {
    throw new Error(
      '[foldkit] initAndInsert requires the complete parent Model.',
    )
  }

  if (!Predicate.isObject(config)) {
    throw new Error('[foldkit] initAndInsert requires a key and args object.')
  }

  for (const field of Reflect.ownKeys(config)) {
    if (field !== 'key' && field !== 'args') {
      throw new Error(
        `[foldkit] initAndInsert does not support the configuration field "${globalThis.String(field)}".`,
      )
    }
  }

  const key = Reflect.get(config, 'key')
  const suppliedArgs = Reflect.get(config, 'args')

  if (!globalThis.Array.isArray(suppliedArgs)) {
    throw new Error(
      '[foldkit] initAndInsert args must be a child init argument tuple.',
    )
  }

  const insertChild = (() => {
    if (storage.container === 'Record') {
      if (!Predicate.isString(key)) {
        throw new Error('[foldkit] initAndInsert Record keys must be strings.')
      }

      const record = Reflect.get(model, storage.field)
      if (!Predicate.isObject(record) || HashMap.isHashMap(record)) {
        throw new Error('[foldkit] initAndInsert requires Record storage.')
      }
      if (Record.has(record, key)) {
        throw new Error(
          `[foldkit] initAndInsert cannot insert duplicate key "${key}".`,
        )
      }

      return (child: unknown) => Record.set(record, key, child)
    }

    if (
      !Predicate.isString(key) &&
      !(Predicate.isNumber(key) && globalThis.Number.isFinite(key))
    ) {
      throw new Error(
        '[foldkit] initAndInsert HashMap keys must be strings or finite numbers.',
      )
    }

    const map = Reflect.get(model, storage.field)
    if (!HashMap.isHashMap(map)) {
      throw new Error(
        '[foldkit] initAndInsert requires Effect HashMap storage.',
      )
    }
    if (HashMap.has(map, key)) {
      throw new Error(
        `[foldkit] initAndInsert cannot insert duplicate key "${globalThis.String(key)}".`,
      )
    }

    return (child: unknown) => HashMap.set(map, key, child)
  })()

  const args = [...suppliedArgs]

  return binding.init({
    key,
    args,
    toParentModel: (child: unknown) => {
      return modifyFields(model, {
        [storage.field]: () => insertChild(child),
      })
    },
  })
}
