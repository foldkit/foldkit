import { Predicate } from 'effect'

type AnyFunction = (...args: ReadonlyArray<any>) => any

declare const CompiledOperationTypeId: unique symbol
declare const InputOperationResultTypeId: unique symbol

/** @internal Retains only the additional input result when the compiled graph is hidden. */
export interface InputOperationResult<Output> {
  readonly [InputOperationResultTypeId]: Output
}

/** @internal Selects input-only channels without reevaluating ordinary local operations. */
export type InputOperationOutputOf<Operation> =
  Operation extends InputOperationResult<infer Output> ? Output : never

/** @internal A pure input executor retaining its exact callable and Composition contracts. */
export type CompiledOperation<
  Execute extends AnyFunction,
  Source extends object,
> = Execute &
  InputOperationResult<ReturnType<Execute>> &
  Readonly<{
    [CompiledOperationTypeId]: readonly [
      execute: (execute: Execute) => Execute,
      source: (source: Source) => Source,
    ]
  }>

const sources = new WeakMap<object, object>()
const sourceAliases = new WeakMap<object, object>()
const originalSources = new WeakSet<object>()

const originalSource = (source: object): object =>
  sourceAliases.get(source) ?? source

/** @internal Preserves the original Composition behind one library-created authoring wrapper. */
export const registerCompiledOperationSource = (
  alias: object,
  source: object,
): void => {
  const original = originalSource(source)
  const existing = sourceAliases.get(alias)

  if (
    (existing !== undefined && existing !== original) ||
    (originalSources.has(alias) && alias !== original)
  ) {
    throw new Error(
      '[foldkit] A compiled input operation source cannot be changed.',
    )
  }

  originalSources.add(original)

  if (alias !== original) {
    sourceAliases.set(alias, original)
  }
}

/** @internal Authenticates a pure executor without invoking it or changing its callable shape. */
export const makeCompiledOperation = <
  const Source extends object,
  const Execute extends AnyFunction,
>(
  source: Source,
  execute: Execute,
): CompiledOperation<Execute, Source> => {
  if (!Predicate.isObject(source) && !Predicate.isFunction(source)) {
    throw new Error(
      '[foldkit] A compiled input operation requires its original Composition.',
    )
  }

  if (!Predicate.isFunction(execute)) {
    throw new Error('[foldkit] A compiled input operation requires a function.')
  }

  const original = originalSource(source)
  const existing = sources.get(execute)

  if (existing !== undefined && existing !== original) {
    throw new Error(
      '[foldkit] A compiled input operation belongs to another Composition.',
    )
  }

  originalSources.add(original)
  sources.set(execute, original)

  // oxlint-disable-next-line typescript/consistent-type-assertions
  return execute as CompiledOperation<Execute, Source>
}

/** @internal Distinguishes authenticated executors from Message aliases and ordinary functions. */
export const isCompiledOperation = (
  value: unknown,
): value is CompiledOperation<AnyFunction, object> =>
  Predicate.isFunction(value) && sources.has(value)

/** @internal Requires the exact native Composition that compiled an input executor. */
export const assertCompiledOperationSource = (
  operation: object,
  source: object,
): void => {
  const registeredSource = sources.get(operation)

  if (
    !Predicate.isFunction(operation) ||
    registeredSource === undefined ||
    registeredSource !== originalSource(source)
  ) {
    throw new Error(
      '[foldkit] A compiled input operation belongs to another Composition.',
    )
  }
}
