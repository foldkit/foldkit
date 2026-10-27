import { Array, Option, Predicate } from 'effect'

import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import type {
  AnyBinding,
  BlockOfBinding,
  IsKeyedBinding,
  ParentContractOfBinding,
  RequirementOfBinding,
  StorageOfBinding,
} from './binding.js'
import { runtimeBindingOf } from './composition.js'
import type { OutgoingMessageOfBinding } from './delivery.js'
import type { BindingInitRecipe } from './initRecipe.js'
import type { InitialEvidenceOfBinding } from './initialization.js'
import type { Qualify } from './scope.js'

export { initAndInsert, makeInitIfMissingStep } from './mapInitialization.js'

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

type ValidateConcreteField<Field extends string> =
  true extends IsUnion<Field>
    ? readonly [error: 'initAndSet requires one concrete field']
    : string extends Field
      ? readonly [error: 'initAndSet requires one concrete field']
      : readonly []

type ValidateOptionalInstance<
  BindingValue,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
> = Field extends keyof ParentModelOf<BindingValue>
  ? ParentModelOf<BindingValue>[Field] extends Option.Option<infer Instance>
    ? [ChildField] extends [never]
      ? readonly [error: 'initAndSet requires an Option-wrapped child instance']
      : Exclude<keyof Instance, KeyField | ChildField> extends never
        ? readonly [
            ...ValidateConcreteField<Field>,
            ...ValidateConcreteField<KeyField>,
            ...ValidateConcreteField<ChildField>,
          ]
        : readonly [
            error: 'initAndSet cannot construct additional parent-owned wrapper fields; use Binding.init',
          ]
    : readonly [error: 'initAndSet requires singular child storage']
  : readonly [error: 'initAndSet requires one declared parent field']

type ValidateSetStorage<BindingValue extends AnyBinding> =
  StorageOfBinding<BindingValue> extends infer Storage
    ? IsAny<Storage> extends true
      ? readonly [error: 'initAndSet requires one concrete Binding']
      : [Storage] extends [never]
        ? [InitialEvidenceOfBinding<BindingValue>] extends [never]
          ? readonly [
              error: 'initAndSet requires a declared singular field or init.toParentFields projection',
            ]
          : InitialEvidenceOfBinding<BindingValue> extends Readonly<{
                field: infer Field extends string
              }>
            ? ValidateConcreteField<Field>
            : readonly [error: 'initAndSet requires singular child storage']
        : true extends IsUnion<Storage>
          ? readonly [error: 'initAndSet requires one concrete Binding']
          : Storage extends Readonly<{
                kind: 'Direct'
                field: infer Field extends string
              }>
            ? ValidateConcreteField<Field>
            : Storage extends Readonly<{
                  kind: 'KeyedField'
                  field: infer Field extends string
                  keyField: infer KeyField extends string
                  childField: infer ChildField extends string
                }>
              ? ValidateOptionalInstance<
                  BindingValue,
                  Field,
                  KeyField,
                  ChildField
                >
              : readonly [error: 'initAndSet requires singular child storage']
    : never

type ValidateSetBinding<BindingValue extends AnyBinding> =
  IsAny<BindingValue> extends true
    ? readonly [error: 'initAndSet requires one concrete Binding']
    : true extends IsUnion<BindingValue>
      ? readonly [error: 'initAndSet requires one concrete Binding']
      : true extends IsUnion<BindingValue['placement']>
        ? readonly [error: 'initAndSet requires one concrete Binding']
        : ValidateSetStorage<BindingValue>

/**
 * Creates a passive initialization recipe that replaces one child in its
 * declared parent field. Required fields receive the initialized child;
 * optional fields receive `Option.some(child)`. An exact Option-wrapped keyed
 * instance receives its declared key and child fields. Additional wrapper fields
 * require explicit `Binding.init` construction. An accessor Binding may instead
 * reuse its existing `init.toParentFields` projection.
 *
 * Direct fields and keyed Option wrappers need no startup policy. Return the
 * recipe intact from a matching parent Step or update handler. Composition
 * initializes the child, applies the stored projection, and lifts child init
 * Commands when it interprets the recipe. Construction runs neither init nor
 * the projection.
 *
 * Other parent fields retain their identity. Use explicit
 * `Binding.init({ args, toParentModel, commands? })` when initialization also
 * changes sibling fields, requires a different writer, or adds parent Commands.
 * Reinitializing the same occurrence does not create a fresh generation or
 * cancel pending work. A different keyed identity follows normal lifecycle
 * replacement semantics; ordinary folds and operations still never create it.
 */
export function initAndSet<const BindingValue extends AnyBinding>(
  binding: BindingValue,
  model: ParentModelOf<NoInfer<BindingValue>>,
  config: Readonly<{
    args: Parameters<BlockOfBinding<NoInfer<BindingValue>>['init']>
    commands?: never
    toParentModel?: never
  }> &
    (IsKeyedBinding<NoInfer<BindingValue>> extends true
      ? Readonly<{ key: Parameters<NoInfer<BindingValue>['fold']>[1] }>
      : Readonly<{ key?: never }>),
  ...validation: NoInfer<ValidateSetBinding<BindingValue>>
): BindingInitRecipe<
  ParentModelOf<BindingValue>,
  OutgoingMessageOfBinding<BindingValue>,
  Qualify<
    BindingValue['placement'],
    Update.RequirementsOf<BlockOfBinding<BindingValue>['init']>
  >,
  RequirementOfBinding<BindingValue>
>
export function initAndSet(
  binding: AnyBinding,
  model: unknown,
  config: unknown,
  ..._validation: ReadonlyArray<unknown>
): unknown {
  const { initial, storage, isParentModel } = runtimeBindingOf(binding)

  if (
    storage?.kind !== 'Direct' &&
    initial?.kind !== 'Projected' &&
    !(storage?.kind === 'KeyedOption' && storage.isPlainWrapper)
  ) {
    throw new Error(
      '[foldkit] initAndSet requires singular child storage without additional wrapper fields or an init.toParentFields projection.',
    )
  }

  if (!Predicate.isObject(model) || !isParentModel?.(model)) {
    throw new Error('[foldkit] initAndSet requires the complete parent Model.')
  }

  if (!Predicate.isObject(config)) {
    throw new Error('[foldkit] initAndSet requires an args object.')
  }

  for (const field of Reflect.ownKeys(config)) {
    if (
      field !== 'args' &&
      !(storage?.kind === 'KeyedOption' && field === 'key')
    ) {
      throw new Error(
        `[foldkit] initAndSet does not support the configuration field "${globalThis.String(field)}".`,
      )
    }
  }

  const suppliedArgs = Reflect.get(config, 'args')
  const key = Reflect.get(config, 'key')

  if (!globalThis.Array.isArray(suppliedArgs)) {
    throw new Error(
      '[foldkit] initAndSet args must be a child init argument tuple.',
    )
  }

  return binding.init({
    ...(storage?.kind === 'KeyedOption' ? { key } : {}),
    args: [...suppliedArgs],
    toParentModel: (child: unknown) => {
      if (storage?.kind === 'Direct') {
        return modifyFields(model, {
          [storage.field]: () =>
            storage.isOptional ? Option.some(child) : child,
        })
      } else if (storage?.kind === 'KeyedOption') {
        return modifyFields(model, {
          [storage.field]: () =>
            Option.some({
              [storage.keyField]: key,
              [storage.childField]: child,
            }),
        })
      } else if (initial?.kind === 'Projected') {
        const projection = initial.project(child)

        return modifyFields(model, {
          [projection.field]: () => projection.value,
        })
      } else {
        throw new Error('[foldkit] initAndSet storage metadata is unavailable.')
      }
    },
  })
}

type ValidateAppendBinding<BindingValue extends AnyBinding> =
  IsAny<BindingValue> extends true
    ? readonly [error: 'initAndAppend requires one concrete Binding']
    : true extends IsUnion<BindingValue>
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
 * Singular fields and direct-value maps use `initAndSet` and `initAndInsert`.
 * Custom storage, mixed parent transitions and additional wrapper metadata use
 * explicit `Binding.init({ args, key?, toParentModel, commands? })`. This helper
 * does not accept parent Commands or an alternative Model writer.
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
  ...validation: NoInfer<ValidateAppendBinding<BindingValue>>
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
