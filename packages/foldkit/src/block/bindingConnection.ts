import { Predicate } from 'effect'

import type { OperationEnvironment } from '../update/operationRecipe.js'
import { assertCompletedBlock } from './assemblyState.js'
import type { BindableBlock } from './binding.js'
import { canonicalBindingOf, runtimeBindingOf } from './composition.js'

/** @internal Identifies an acquired child executable. */
export const ConstructedChildTypeId = Symbol('foldkit/Block/ConstructedChild')

/** @internal Identifies one constructor-owned Binding connection. */
export const BindingConnectionTypeId = Symbol('foldkit/Block/BindingConnection')

const connectBindingTypeId = Symbol('foldkit/Block/ConnectBinding')

/** @internal Installs the private executable connection protocol on native Bindings. */
export const ConnectBindingTypeId: symbol = connectBindingTypeId

/** @internal An acquired executable with its requested static placement. */
export interface ConstructedChild<BlockValue, Placement extends string> {
  readonly [ConstructedChildTypeId]: true
  readonly block: BlockValue
  readonly placement: Placement
}

/** @internal Connects a passive declaration to one acquired child executable. */
export type BindingConnection<BlockValue, Placement extends string> = Readonly<{
  [BindingConnectionTypeId]: true
  binding: object
  child: ConstructedChild<BlockValue, Placement>
}>

declare const BindingParentTypeId: unique symbol

/** @internal Retains the parent owner without exposing its executable graph. */
export interface BindingParent<OwnerValue> {
  readonly [BindingParentTypeId]: OwnerValue
}

declare const ExecutableHandleTypeId: unique symbol
declare const ExecutableConnectionTypeId: unique symbol

/** @internal An acquired public contract whose executable is retained privately. */
export interface ExecutableHandle<Contract> {
  readonly [ExecutableHandleTypeId]: (contract: Contract) => Contract
}

/** @internal A checked connection from a symbolic Binding to an acquired executable. */
export interface ExecutableConnection<Contract, Placement extends string> {
  readonly [ExecutableConnectionTypeId]: readonly [
    contract: (contract: Contract) => Contract,
    placement: Placement,
  ]
}

/** @internal Connects either legacy acquired children or compact executable handles. */
export interface ConnectExecutable<Contract, Placement extends string> {
  (
    child: ConstructedChild<Contract, Placement>,
  ): BindingConnection<Contract, Placement>
  (child: ExecutableHandle<Contract>): ExecutableConnection<Contract, Placement>
}

/** @internal Retains the executable connection protocol outside the ordinary Binding surface. */
export interface ExecutableBinding<Contract, Placement extends string> {
  readonly [connectBindingTypeId]: ConnectExecutable<Contract, Placement>
}

type BindingReconstructor = (
  block: BindableBlock,
) => Readonly<{ placement: string }>
type OperationExecutor = (
  model: unknown,
  args: ReadonlyArray<unknown>,
  environment: OperationEnvironment | undefined,
) => unknown
type BindingViewRecipe = Readonly<{
  binding: object
  config: object
}>

const constructedChildren = new WeakSet<object>()
const executableHandles = new WeakMap<object, BindableBlock>()
const connections = new WeakSet<object>()
const reconstructors = new WeakMap<object, BindingReconstructor>()
const operationExecutors = new WeakMap<object, OperationExecutor>()
const viewRecipes = new WeakMap<object, BindingViewRecipe>()
const bindingResolvers = new WeakMap<
  object,
  (environment: OperationEnvironment | undefined) => object
>()
const declaredBindings = new WeakMap<
  object,
  Readonly<{ block: object; original: object }>
>()
const bindingDeclarations = new WeakMap<object, object>()

/** @internal Retains the exact child contract and canonical passive declaration. */
export const registerDeclaredBinding = (
  binding: object,
  block: object,
  original: object,
): void => {
  declaredBindings.set(binding, { block, original })
}

/** @internal Reads only original declared Binding metadata. */
export const declaredBindingOf = (binding: object) =>
  declaredBindings.get(binding)

/** @internal Associates a newly constructed occurrence with its passive declaration. */
export const registerBindingDeclaration = (
  binding: object,
  declaration: object,
): void => {
  bindingDeclarations.set(binding, declaration)
}

/** @internal Reads immutable construction provenance without selecting a graph. */
export const bindingDeclarationOf = (binding: object) =>
  bindingDeclarations.get(binding)

/** @internal Defers storage-dependent initialization to a constructed graph's Binding. */
export const registerBindingResolver = (
  binding: object,
  resolve: (environment: OperationEnvironment | undefined) => object,
): void => {
  bindingResolvers.set(binding, resolve)
}

/** @internal Reads an explicit-environment Binding resolver without constructing a child. */
export const bindingResolverOf = (binding: object) =>
  bindingResolvers.get(binding)

/** @internal Associates an acquired compact handle with its checked executable. */
export const registerExecutableHandle = (
  handle: object,
  block: BindableBlock,
): void => {
  assertCompletedBlock(block)
  executableHandles.set(handle, block)
}

/** @internal Retains the concrete executable selected during construction. */
export const makeConstructedChild = <
  BlockValue extends BindableBlock,
  const Placement extends string,
>(
  block: BlockValue,
  placement: Placement,
): ConstructedChild<BlockValue, Placement> => {
  assertCompletedBlock(block)

  const child = Object.freeze<ConstructedChild<BlockValue, Placement>>({
    [ConstructedChildTypeId]: true,
    block,
    placement,
  })
  constructedChildren.add(child)

  return child
}

/** @internal Validates and retains an immutable constructor-owned connection. */
export const makeConnection = <BlockValue, Placement extends string>(
  binding: Readonly<{ placement: Placement }>,
  acquired:
    | ConstructedChild<BlockValue, Placement>
    | ExecutableHandle<BlockValue>,
): BindingConnection<BlockValue, Placement> => {
  const retained = Predicate.isObject(acquired)
    ? executableHandles.get(acquired)
    : undefined
  const child =
    retained === undefined
      ? acquired
      : makeConstructedChild(retained, binding.placement)

  if (!Predicate.isObject(child) || !constructedChildren.has(child)) {
    throw new Error('[foldkit] Binding.connect requires an acquired child.')
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const constructed = child as ConstructedChild<BlockValue, Placement>

  if (binding.placement !== constructed.placement) {
    throw new Error(
      '[foldkit] Binding.connect requires the declared child placement.',
    )
  }

  const declared = runtimeBindingOf(binding).block
  const actual = constructed.block

  if (
    !Predicate.isObject(actual) ||
    declared.owner !== Reflect.get(actual, 'owner') ||
    declared.Model !== Reflect.get(actual, 'Model') ||
    declared.Message !== Reflect.get(actual, 'Message') ||
    declared.OutMessage !== Reflect.get(actual, 'OutMessage')
  ) {
    throw new Error(
      '[foldkit] Binding.connect requires the declared child Block contracts.',
    )
  }

  const connection = Object.freeze<BindingConnection<BlockValue, Placement>>({
    [BindingConnectionTypeId]: true,
    binding,
    child: constructed,
  })
  connections.add(connection)

  return connection
}

/** @internal Requires an original, validated constructor-owned connection. */
export const isBindingConnection = (
  value: unknown,
): value is BindingConnection<BindableBlock, string> =>
  Predicate.isObject(value) && connections.has(value)

/** @internal Records how a passive parent-owned declaration is reconstructed. */
export const registerBindingReconstructor = (
  binding: object,
  reconstruct: BindingReconstructor,
): void => {
  const canonical = canonicalBindingOf(binding)

  if (reconstructors.has(canonical)) {
    throw new Error('[foldkit] Binding reconstruction was already registered.')
  }

  reconstructors.set(canonical, reconstruct)
}

/** @internal Reconstructs the relationship without changing its declaration. */
export const reconnectBinding = (
  binding: object,
  block: BindableBlock,
): Readonly<{ placement: string }> => {
  const reconstruct = reconstructors.get(canonicalBindingOf(binding))

  if (reconstruct === undefined) {
    throw new Error('[foldkit] Binding has no executable connection factory.')
  }

  return reconstruct(block)
}

/** @internal Retains an explicit-environment executor for a Binding method. */
export const registerBindingOperation = (
  operation: object,
  execute: OperationExecutor,
): void => {
  operationExecutors.set(operation, execute)
}

/** @internal Executes one connected method in its constructor-owned environment. */
export const executeBindingOperation = (
  binding: object,
  name: string,
  model: unknown,
  args: ReadonlyArray<unknown>,
  environment?: OperationEnvironment,
): unknown => {
  const operation = Reflect.get(binding, name)

  if (!Predicate.isFunction(operation)) {
    throw new Error(
      `[foldkit] Connected Binding operation "${name}" is unavailable.`,
    )
  }

  return executeRegisteredBindingOperation(operation, model, args, environment)
}

/** @internal Executes a registered Binding method without ambient connections. */
export const executeRegisteredBindingOperation = (
  operation: object,
  model: unknown,
  args: ReadonlyArray<unknown>,
  environment?: OperationEnvironment,
): unknown => {
  const execute = operationExecutors.get(operation)

  if (execute === undefined) {
    throw new Error('[foldkit] Connected Binding operation is unavailable.')
  }

  return execute(model, args, environment)
}

/** @internal Retains the passive embedding inputs separately from its current view. */
export const registerBindingViewRecipe = (
  result: object,
  binding: object,
  config: object,
): void => {
  viewRecipes.set(result, Object.freeze({ binding, config }))
}

/** @internal Reads an embedding declaration for constructor-local view compilation. */
export const bindingViewRecipeOf = (
  result: object,
): BindingViewRecipe | undefined => viewRecipes.get(result)
