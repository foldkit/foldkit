import type { DescriptorTypeId, PublicFacts } from '../constructed/contract.js'
import type { ContractGraph } from './contract.js'

/** @internal Names private implementation facts carried by a selected Layer. */
export declare const LayerOriginalFactsTypeId: unique symbol

/** @internal Exact implementation facts carried by an ordinary completed Layer. */
export interface ImplementationFacts<OwnerValue, Facts, Pending = never> {
  readonly [LayerOriginalFactsTypeId]: Readonly<{
    owner: OwnerValue
    facts: Facts
    pending: Pending
  }>
}

/** @internal Associates private implementation facts with their exact public result capability. */
export declare const LayerSelectedResultTypeId: unique symbol

/** @internal A selected result and its correlated native implementation evidence. */
export interface SelectedImplementationFacts<
  SelectedResult,
  OwnerValue,
  Facts,
  Pending = never,
> extends ImplementationFacts<OwnerValue, Facts, Pending> {
  readonly [LayerSelectedResultTypeId]: (
    selected: SelectedResult,
  ) => SelectedResult
}

/** @internal Complete public identity admitted by a closed fixed-family rule. */
export type SelectedPublicIdentity<
  Value extends Readonly<{
    owner: any
    Model: any
    Message: any
    OutMessage: any
    [DescriptorTypeId]: PublicFacts
  }>,
> = ContractGraph<
  Value['owner'],
  Value['Model'],
  Value['Message'],
  Value['OutMessage'],
  Value[typeof DescriptorTypeId]
>
/** @internal Library-owned invariant over the complete admitted refinement. */
export declare const FixedRefinementTypeId: unique symbol
/** @internal Original canonical identity and admitted public refinement. */
export interface FixedRefinement<Rule, Canonical, Admitted> {
  readonly [FixedRefinementTypeId]: (
    selection: readonly [Rule, Canonical, Admitted],
  ) => readonly [Rule, Canonical, Admitted]
}
/** @internal The closed provider's correlated canonical implementation. */
export declare const FixedRefinementProviderTypeId: unique symbol
/** @internal Invariant library attestation that survives ordinary Layer composition. */
export interface FixedRefinementProvider<Rule, Canonical, Implementation> {
  readonly [FixedRefinementProviderTypeId]: (
    selection: readonly [Rule, Canonical, Implementation],
  ) => readonly [Rule, Canonical, Implementation]
}
