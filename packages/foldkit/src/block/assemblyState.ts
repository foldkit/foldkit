import { Predicate } from 'effect'

/** @internal Identifies the checked completion contract without a runtime field. */
declare const CompletionTypeId: unique symbol

/** @internal Ties checked completion to one exact Model and Message contract. */
declare const CompletionContractTypeId: unique symbol

/** @internal Records completion through the checked producer boundary. */
export interface CompletionProof {
  readonly [CompletionTypeId]: true
}

/** @internal Invariant proof of the exact completed Model and Message contracts. */
export interface CompletionContractProof<ModelSchema, MessageSchema> {
  readonly [CompletionContractTypeId]: Readonly<{
    Model: (schema: ModelSchema) => ModelSchema
    Message: (schema: MessageSchema) => MessageSchema
  }>
}

/** @internal Retains the completed contract behind an opaque assembly token. */
export declare const AssemblyDraftTypeId: unique symbol

/**
 * An opaque assembly awaiting `Block.assemble`. Its completed
 * contract is available only after the checked Model and producer boundary.
 */
export interface AssemblyDraft<Completed extends object> {
  readonly [AssemblyDraftTypeId]: Completed
}

class AssemblyToken<
  Completed extends object,
> implements AssemblyDraft<Completed> {
  declare readonly [AssemblyDraftTypeId]: Completed
}

const assemblyBlocks = new WeakMap<object, object>()
const completedBlocks = new WeakSet<object>()

/** @internal Requires an original Block registered by checked completion. */
export function assertCompletedBlock(
  block: unknown,
): asserts block is object & CompletionProof {
  if (!Predicate.isObject(block) || !completedBlocks.has(block)) {
    throw new Error(
      '[foldkit] This operation requires a completed Block. Initialize its FromAssembly annotation with Block.assemble(prepare).',
    )
  }
}

/** @internal Marks a Block derived from a previously checked completed Block. */
export const completeDerivedBlock = <Completed extends object>(
  block: Completed,
): Completed & CompletionProof => {
  completedBlocks.add(block)
  assertCompletedBlock(block)

  return block
}

/** @internal Registers a passive assembly behind an opaque runtime token. */
export const makeAssemblyDraft = <Completed extends object>(
  block: Completed,
): AssemblyDraft<Completed> => {
  const draft = Object.freeze(new AssemblyToken<Completed>())
  assemblyBlocks.set(draft, block)

  return draft
}

/** @internal Completes a registered assembly and preserves its original object. */
export const completeAssemblyDraft = (
  draft: unknown,
): object & CompletionProof => {
  if (!Predicate.isObject(draft)) {
    throw new Error(
      '[foldkit] Block.assemble requires a producer returning an original Composition.prepareBlock draft.',
    )
  }

  const block = assemblyBlocks.get(draft)

  if (block === undefined) {
    throw new Error(
      '[foldkit] Block.assemble requires a producer returning an original Composition.prepareBlock draft.',
    )
  }

  completedBlocks.add(block)
  assertCompletedBlock(block)

  return block
}
