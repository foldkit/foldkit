import { type Option, Schema } from 'effect'

import type { BindableBlock } from './binding.js'
import type { NamedIdentity } from './identity.js'
import type { InstanceKey } from './instanceContext.js'

type RuntimeParentContract = Readonly<{
  ownerToken: object
  Model: Schema.Top
  Message: Schema.Top
  OutMessage: Schema.Top | undefined
  Startup?: Schema.Top | undefined
}>

/** @internal Direct child initialization policy retained outside the public Binding. */
export type RuntimeDirectBindingInitialPolicy = Readonly<{
  kind: 'Direct'
  field: string
  isOptional: boolean
  resolveArguments: (context: unknown) => Option.Option<ReadonlyArray<unknown>>
  isStored: (model: unknown) => boolean
}>

/** @internal One preflighted wrapped keyed initialization occurrence. */
export type RuntimeWrappedKeyedInitialOccurrence = Readonly<{
  occurrence: unknown
  key: InstanceKey
  args: ReadonlyArray<unknown>
}>

/** @internal Wrapped keyed child initialization policy retained outside the public Binding. */
export type RuntimeWrappedKeyedInitialPolicy = Readonly<{
  kind: 'WrappedKeyed'
  field: string
  resolveOccurrences: (
    context: unknown,
  ) => ReadonlyArray<RuntimeWrappedKeyedInitialOccurrence>
  toItem: (occurrence: unknown, childModel: unknown) => unknown
  readItemKey: (item: unknown) => InstanceKey
}>

/** @internal Startup projection for one custom child storage relationship. */
export type RuntimeProjectedBindingInitialPolicy = Readonly<{
  kind: 'Projected'
  allowedFields: ReadonlyArray<string>
  resolveArguments: (context: unknown) => ReadonlyArray<unknown>
  project: (childModel: unknown) => Readonly<{ field: string; value: unknown }>
  isStored: (model: unknown, field: string) => boolean
}>

/** @internal Child initialization policy retained outside the public Binding. */
export type RuntimeBindingInitialPolicy =
  | RuntimeDirectBindingInitialPolicy
  | RuntimeWrappedKeyedInitialPolicy
  | RuntimeProjectedBindingInitialPolicy

/** @internal Enumerates a Binding's active children from one parent Model. */
export type RuntimeBinding = Readonly<{
  block: BindableBlock
  initialize: (
    key: InstanceKey | undefined,
    args: ReadonlyArray<any>,
  ) => Readonly<{ model: any; commands?: ReadonlyArray<any> }>
  parentContract?: RuntimeParentContract
  isParentModel?: (model: unknown) => boolean
  initial?: RuntimeBindingInitialPolicy
  inspection: Readonly<{
    subscriptions: object
    managedResources: object
    mounts: ReadonlyArray<unknown>
    EffectsLayer: unknown
  }>
  select: (
    model: any,
  ) => ReadonlyArray<Readonly<{ key?: InstanceKey; model: any }>>
  toParentMessage: (key: InstanceKey | undefined, message: any) => any
  subscriptionWhen: (
    model: any,
    key: InstanceKey | undefined,
    name: string,
  ) => boolean
}>

const bindings = new WeakMap<object, RuntimeBinding>()

/** @internal Associates a public binding with its Model enumeration and policies. */
export const registerBinding = (
  binding: object,
  runtime: RuntimeBinding,
): void => {
  bindings.set(binding, runtime)
}

/** @internal Reads the declared composition behavior of one child placement. */
export const runtimeBindingOf = (binding: object): RuntimeBinding => {
  const runtime = bindings.get(binding)
  if (runtime === undefined) {
    throw new Error(
      '[foldkit] Child Binding metadata is unavailable. Create Bindings through the parent Definition.bindChild method.',
    )
  }
  return runtime
}

/** @internal Associates a Binding with its exact parent Definition contract. */
export const registerBindingParentContract = (
  binding: object,
  parentContract: RuntimeParentContract,
): void => {
  const runtime = runtimeBindingOf(binding)
  bindings.set(binding, {
    ...runtime,
    parentContract,
    isParentModel: Schema.is(parentContract.Model),
  })
}

/** @internal Verifies the complete parent Model constructed by a Binding initializer. */
export const assertInitializedParentModel = (
  binding: object,
  placement: string,
  model: unknown,
): void => {
  const { isParentModel } = runtimeBindingOf(binding)
  if (isParentModel !== undefined && !isParentModel(model)) {
    throw new Error(
      `[foldkit] Child Binding "${placement}" init.toParentModel must return a complete parent Model accepted by its parent Definition Schema.`,
    )
  }
}

/** @internal Associates an opt-in child initialization policy. */
export const registerBindingInitialPolicy = (
  binding: object,
  initial: RuntimeBindingInitialPolicy,
): void => {
  const runtime = runtimeBindingOf(binding)
  bindings.set(binding, { ...runtime, initial })
}

/** @internal Rejects Bindings constructed under a different parent contract. */
export const assertBindingParentContracts = (
  parentContract: RuntimeParentContract,
  parentId: string,
  childBindings: ReadonlyArray<Readonly<{ placement: string }>>,
): void => {
  const placementIndexes = new Map<string, number>()
  const initialFieldIndexes = new Map<string, number>()

  for (const [index, childBinding] of childBindings.entries()) {
    const runtime = runtimeBindingOf(childBinding)
    const bindingParent = runtime.parentContract
    const previousIndex = placementIndexes.get(childBinding.placement)

    if (previousIndex !== undefined) {
      throw new Error(
        `[foldkit] Block "${parentId}" child Bindings at indexes ${previousIndex} and ${index} both resolve to placement "${childBinding.placement}". Give each sibling Binding a unique placement.`,
      )
    }

    placementIndexes.set(childBinding.placement, index)

    if (runtime.initial !== undefined && runtime.initial.kind !== 'Projected') {
      const previousFieldIndex = initialFieldIndexes.get(runtime.initial.field)
      if (previousFieldIndex !== undefined) {
        throw new Error(
          `[foldkit] Block "${parentId}" child Bindings at indexes ${previousFieldIndex} and ${index} both initialize field "${runtime.initial.field}". Give each initialized child its own Model field.`,
        )
      }
      initialFieldIndexes.set(runtime.initial.field, index)
    }

    if (
      bindingParent !== undefined &&
      (bindingParent.ownerToken !== parentContract.ownerToken ||
        bindingParent.Model !== parentContract.Model ||
        bindingParent.Message !== parentContract.Message ||
        bindingParent.OutMessage !== parentContract.OutMessage ||
        bindingParent.Startup !== parentContract.Startup)
    ) {
      throw new Error(
        `[foldkit] Child Binding "${childBinding.placement}" belongs to a different parent Definition contract. Create it through the exact "${parentId}" Definition.bindChild method.`,
      )
    }
  }
}

/** @internal Collects every named owner below a block's direct bindings. */
export const descendantOwnersOf = (
  childBindings: ReadonlyArray<object>,
): ReadonlySet<NamedIdentity> => {
  const owners = new Set<NamedIdentity>()

  const visit = (binding: object): void => {
    const { block } = runtimeBindingOf(binding)
    owners.add(block.owner)

    for (const childBinding of block.childBindings) {
      visit(childBinding)
    }
  }

  for (const childBinding of childBindings) {
    visit(childBinding)
  }

  return owners
}
