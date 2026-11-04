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
