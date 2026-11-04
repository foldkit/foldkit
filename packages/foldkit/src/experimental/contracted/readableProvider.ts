import type { DescriptorTypeId, PublicFacts } from '../constructed/contract.js'
import type {
  FixedRefinement,
  SelectedPublicIdentity,
} from './implementationFacts.js'

/** @internal Identity of one closed library-owned provider family. */
export declare const ClosedFamilyTypeId: unique symbol
/** @internal Exact public selection admitted by a private reader. */
export declare const ExactReadableTypeId: unique symbol
/** @internal Ordinary providers cannot use closed fixed-family admission. */
export declare const OrdinaryReadableKey: unique symbol
/** @internal Capability supplied only by one closed library provider. */
export interface ClosedFamilyCapability<Key> {
  readonly [ClosedFamilyTypeId]: Key
}
/** @internal Exact reader requirement independent of executable acquisition. */
export interface ReadableProvider<
  Key,
  Selected,
> extends ClosedFamilyCapability<Key> {
  readonly [ExactReadableTypeId]: (selected: Selected) => Selected
}
/** @internal Ordinary exact provider without broad fixed-family admission. */
export type ExactReadable<Selected> = ReadableProvider<
  typeof OrdinaryReadableKey,
  Selected
>
/** @internal An exact specialization reader also supplied by its universal provider. */
export type FamilyReaderCapability<Identifier, Selected> = Identifier &
  ExactReadable<Selected>
/** @internal Original universal provider and complete specialization selection. */
export declare const FamilySelectionTypeId: unique symbol
/** @internal Keeps shared-provider admission correlated with the whole public contract. */
export interface FamilySelection<
  Identifier,
  Selected,
  Error,
  Requirements,
  Pending,
> {
  readonly [FamilySelectionTypeId]: (
    selection: readonly [Identifier, Selected, Error, Requirements, Pending],
  ) => readonly [Identifier, Selected, Error, Requirements, Pending]
}
type PublicSelection = Readonly<{
  owner: unknown
  Model: unknown
  Message: unknown
  OutMessage: unknown
  [DescriptorTypeId]: PublicFacts
}>
type ReadableAdmissionFailure<Value> =
  Value extends FixedRefinement<any, any, infer Admitted>
    ? Value extends PublicSelection
      ? [Admitted] extends [SelectedPublicIdentity<Value>]
        ? [SelectedPublicIdentity<Value>] extends [Admitted]
          ? never
          : Readonly<{
              'Fixed-family refinement must match the complete current public contract': never
            }>
        : Readonly<{
            'Fixed-family refinement must match the complete current public contract': never
          }>
      : Readonly<{
          'Fixed-family refinement requires its complete public contract': never
        }>
    : never
/** @internal Checks every union member against the original invariant witness. */
export type ValidateReadableAdmission<Value> = [
  ReadableAdmissionFailure<Value>,
] extends [never]
  ? unknown
  : ReadableAdmissionFailure<Value>
/** @internal Runs after native Binding inference has established the child. */
export type ReadableAdmissionValidation<Value> =
  unknown extends ValidateReadableAdmission<Value>
    ? readonly []
    : readonly [invalidReadableAdmission: ValidateReadableAdmission<Value>]
