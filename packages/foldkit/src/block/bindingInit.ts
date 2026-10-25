import { Array, Predicate } from 'effect'

import { modifyFields } from '../struct/index.js'
import type {
  AnyBinding,
  BlockOfBinding,
  IsKeyedBinding,
  ParentContractOfBinding,
} from './binding.js'
import { runtimeBindingOf } from './composition.js'
import type { OutgoingMessageOfBinding } from './delivery.js'
import type { BindingInitRecipe } from './initRecipe.js'
import type { InitialEvidenceOfBinding } from './initialization.js'

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type ParentModelOf<BindingValue> =
  ParentContractOfBinding<BindingValue> extends Readonly<{ model: infer Model }>
    ? Model
    : never

type InitialRequirementsOf<BindingValue> =
  InitialEvidenceOfBinding<BindingValue> extends Readonly<{
    requirements: infer Requirements
  }>
    ? Requirements
    : never

type InitialRegistrationOf<BindingValue> =
  InitialEvidenceOfBinding<BindingValue> extends Readonly<{
    registration: infer Registration
  }>
    ? Registration
    : never

type ValidateAppendBinding<BindingValue extends AnyBinding> =
  IsAny<BindingValue> extends true
    ? readonly [error: 'initAndAppend requires one concrete Binding']
    : true extends IsUnion<BindingValue['placement']>
      ? readonly [error: 'initAndAppend requires one concrete Binding']
      : IsKeyedBinding<BindingValue> extends true
        ? [InitialEvidenceOfBinding<BindingValue>] extends [never]
          ? readonly [
              error: 'initAndAppend requires keyed array init.instances and init.toItem',
            ]
          : InitialEvidenceOfBinding<BindingValue> extends Readonly<{
                field: infer Field extends string
                value: ReadonlyArray<unknown>
              }>
            ? true extends IsUnion<Field>
              ? readonly [
                  error: 'initAndAppend requires one concrete array field',
                ]
              : string extends Field
                ? readonly [
                    error: 'initAndAppend requires one concrete array field',
                  ]
                : readonly []
            : readonly [error: 'initAndAppend requires keyed array storage']
        : readonly [error: 'initAndAppend requires a keyed Binding']

/**
 * Creates a passive initialization recipe that appends one absent keyed child
 * to the supplied parent Model. The Binding must already declare keyed array
 * startup initialization with `init.instances` and `init.toItem`; the same
 * `toItem` function owns wrapper construction for startup and dynamic creation.
 * Do not add an otherwise unnecessary startup policy just to use this helper.
 *
 * Call this from a parent Step or update handler with its current Model and
 * return the recipe intact. Composition initializes the child and lifts its
 * Commands when it interprets the recipe. Construction runs neither child init
 * nor `toItem`. An existing key is rejected; this operation never replaces an
 * occurrence. Other items retain their order and identity.
 *
 * Direct fields, Option wrappers, maps, and custom accessors use the explicit
 * `Binding.init({ args, key?, toParentModel, commands? })` form. This helper does
 * not accept parent Commands or an alternative Model writer.
 */
export function initAndAppend<const BindingValue extends AnyBinding>(
  binding: BindingValue,
  model: ParentModelOf<NoInfer<BindingValue>>,
  config: Readonly<{
    key: Parameters<NoInfer<BindingValue>['fold']>[1]
    args: Parameters<BlockOfBinding<NoInfer<BindingValue>>['init']>
    commands?: never
    toParentModel?: never
  }>,
  ...validation: ValidateAppendBinding<NoInfer<BindingValue>>
): BindingInitRecipe<
  ParentModelOf<BindingValue>,
  OutgoingMessageOfBinding<BindingValue>,
  InitialRequirementsOf<BindingValue>,
  InitialRegistrationOf<BindingValue>
>
export function initAndAppend(
  binding: AnyBinding,
  model: unknown,
  config: unknown,
  ..._validation: ReadonlyArray<unknown>
): unknown {
  const runtime = runtimeBindingOf(binding)
  const { initial, isParentModel } = runtime

  if (initial?.kind !== 'WrappedKeyed') {
    throw new Error(
      '[foldkit] initAndAppend requires keyed array init.instances and init.toItem.',
    )
  }

  if (!Predicate.isObject(model) || !isParentModel?.(model)) {
    throw new Error(
      '[foldkit] initAndAppend requires the complete parent Model.',
    )
  }

  const items = Reflect.get(model, initial.field)

  if (!globalThis.Array.isArray(items)) {
    throw new Error('[foldkit] initAndAppend requires keyed array storage.')
  }

  if (!Predicate.isObject(config)) {
    throw new Error('[foldkit] initAndAppend requires a key and args object.')
  }

  for (const field of Reflect.ownKeys(config)) {
    if (field !== 'key' && field !== 'args') {
      throw new Error(
        `[foldkit] initAndAppend does not support the configuration field "${globalThis.String(field)}".`,
      )
    }
  }

  const key = Reflect.get(config, 'key')
  const suppliedArgs = Reflect.get(config, 'args')

  if (!globalThis.Array.isArray(suppliedArgs)) {
    throw new Error(
      '[foldkit] initAndAppend args must be a child init argument tuple.',
    )
  }

  const args = [...suppliedArgs]

  if (Array.some(items, item => initial.readItemKey(item) === key)) {
    throw new Error(
      `[foldkit] initAndAppend cannot append duplicate key "${globalThis.String(key)}".`,
    )
  }

  return binding.init({
    key,
    args,
    toParentModel: (child: unknown) => {
      const item = initial.toItem({ key, args }, child)

      if (initial.readItemKey(item) !== key) {
        throw new Error(
          '[foldkit] initAndAppend init.toItem must preserve the supplied key.',
        )
      }

      const nextModel = modifyFields(model, {
        [initial.field]: () => Array.append(items, item),
      })

      if (
        !Array.some(
          runtime.select(nextModel),
          occurrence => occurrence.key === key && occurrence.model === child,
        )
      ) {
        throw new Error(
          '[foldkit] initAndAppend init.toItem must preserve the initialized child Model it receives.',
        )
      }

      return nextModel
    },
  })
}
