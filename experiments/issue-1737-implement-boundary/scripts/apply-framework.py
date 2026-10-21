"""Build the candidate framework source from the pristine baseline files.

Usage: apply-framework.py BASELINE_TREE TARGET_TREE GENERATED_INTERFACE
Writes packages/foldkit/src/block/{definition,public}.ts in TARGET_TREE.
"""
import sys

baseline, target, generated_path = sys.argv[1:4]
definition_path = '/packages/foldkit/src/block/definition.ts'
public_path = '/packages/foldkit/src/block/public.ts'
source = open(baseline + definition_path).read()
generated = open(generated_path).read().rstrip('\n')

# 1. Split the existing assembly validation into its operations and graph parts.
anchor = 'type PublicAssembleBlockImplementation<'
aliases = '''/** The operation-name and exposed-operation checks of assembly. `implement`
 * keeps them in its signatures, so signature selection and contextual types
 * match `assembleBlock`. */
type ValidateAssembleBlockOperations<
  _OwnerValue extends Owner<string>,
  _ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  _OutMessageSchema extends AnySchema | undefined,
  _Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = ValidateBindingOperationNames<
  ImplementationExposedOperations<ImplementationValue>
> &
  ('operations' extends keyof ImplementationValue
    ? ValidateExposedOperations<
        ImplementationValue,
        AuthoredMessage<MessageSchema['Type'], Children>
      >
    : unknown)

/** The graph check of assembly: local and descendant handler, Layer, host
 * handler, lifecycle registration and requirement validation.
 * `ImplementedBlock.assembleBlock()` applies it. */
type ValidateAssembleBlockGraph<
  OwnerValue extends Owner<string>,
  Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>,
  Children extends ReadonlyArray<AnyBinding>,
  ImplementationValue,
> = ValidateImplementationComposition<
  AssembleBlockDefinition<OwnerValue>,
  AssembleBlockCompositionForValidation<Mounts, Children, ImplementationValue>
>

'''
assert source.count(anchor) == 1
source = source.replace(anchor, aliases + anchor, 1)

# 2. Insert the boundary after the AssembleBlock interface.
boundary = '''
/** Phantom key that retains the implementation captured by `implement`. */
export const ImplementationTypeId = Symbol('foldkit/Block/Implementation')

/**
 * An implementation captured by a Composition's `implement` method.
 *
 * `assembleBlock()` returns the same completed Block as
 * `Composition.assembleBlock` for the same implementation. Its only signature is
 * not generic, so TypeScript reads the completed Block type of
 * `const SomeBlock = SomeComposition.implement({ ... }).assembleBlock()` from
 * the declared return type. Files that import `SomeBlock` therefore do not
 * repeat the assembly overload resolution or its graph check.
 *
 * `implement` applies every other assembly check. `assembleBlock()` applies the
 * graph check: local and descendant handler, Layer, host handler, lifecycle
 * registration and requirement validation. It runs when the file that calls
 * `assembleBlock()` is checked and reports on the `implement({ ... })` receiver.
 *
 * Capturing an implementation is passive: it builds no Layer, runs no init, and
 * starts no lifecycle work.
 */
export interface ImplementedBlock<
  CompletedValue,
  ImplementationValue,
  Validation extends () => unknown,
> {
  /** @internal The captured implementation channels. */
  readonly [ImplementationTypeId]: ImplementationValue
  /** Applies the graph check to the captured implementation and returns the
   * completed Block. */
  readonly assembleBlock: (
    this: Readonly<{
      [ImplementationTypeId]: ReturnType<Validation>
    }>,
  ) => CompletedValue
}

/**
 * Captures a Composition's implementation channels for `assembleBlock()`.
 *
 * Each signature repeats the corresponding `AssembleBlock` signature: the same
 * type parameters, constraints, parameter checks and contextual types. Only the
 * graph check moves into the returned `assembleBlock()` method, where it applies
 * to the same inferred channels. Every signature that `AssembleBlock` selects is
 * therefore selected here too, including the later signatures that generic
 * factories reach.
 */
''' + generated + '\n'
view_builder_anchor = '\n/**\n * The `HtmlBuilder` type supplied by a Block or Application Composition.'
assert source.count(view_builder_anchor) == 1
source = source.replace(view_builder_anchor, '\n' + boundary + view_builder_anchor, 1)

# 3. Add the member to the Composition type.
old_member = '''  /** Completes this Composition with its implementation channels and returns
   * a passive Block. */
  readonly assembleBlock: AssembleBlock<
    OwnerValue,
    ModelSchema,
    DispatchSchemaFor<MessageSchema, Children>,
    OutMessageSchema,
    Mounts,
    Children
  >
}'''
new_member = '''  /** Completes this Composition with its implementation channels and returns
   * a passive Block. */
  readonly assembleBlock: AssembleBlock<
    OwnerValue,
    ModelSchema,
    DispatchSchemaFor<MessageSchema, Children>,
    OutMessageSchema,
    Mounts,
    Children
  >
  /** Captures this Composition's implementation channels. Call
   * `assembleBlock()` on the result to return the same passive Block as
   * `assembleBlock`. A Block exported as
   * `Composition.implement({ ... }).assembleBlock()` gives importing files its
   * completed type without repeating the assembly graph check. */
  readonly implement: ImplementBlock<
    OwnerValue,
    ModelSchema,
    DispatchSchemaFor<MessageSchema, Children>,
    OutMessageSchema,
    Mounts,
    Children
  >
}'''
assert source.count(old_member) == 1
source = source.replace(old_member, new_member, 1)

# 4. Passive runtime method on the public Composition.
old_runtime = '''      makeView: composition.makeView,
      assembleBlock: composition.assembleBlock,
    }
'''
new_runtime = '''      makeView: composition.makeView,
      assembleBlock: composition.assembleBlock,
      implement: (implementation: object) => ({
        [ImplementationTypeId]: implementation,
        assembleBlock: () => composition.assembleBlock(implementation),
      }),
    }
'''
assert source.count(old_runtime) == 1
source = source.replace(old_runtime, new_runtime, 1)
open(target + definition_path, 'w').write(source)

public = open(baseline + public_path).read()
old = "export { LocalMountsTypeId } from './definition.js'\n"
new = "export { ImplementationTypeId, LocalMountsTypeId } from './definition.js'\n"
assert public.count(old) == 1
public = public.replace(old, new, 1)
old = '  AssembleBlock,\n  AuthoredViewInputs,\n'
new = '  AssembleBlock,\n  AuthoredViewInputs,\n  ImplementBlock,\n  ImplementedBlock,\n'
assert public.count(old) == 1
public = public.replace(old, new, 1)
open(target + public_path, 'w').write(public)
print('applied to', target)
