declare const AcquiredTestBlockTypeId: unique symbol

/** @internal Identifies a facade acquired inside a scoped Block test. */
export interface AcquiredTestBlock<OwnerValue> {
  readonly [AcquiredTestBlockTypeId]: OwnerValue
}

type TestGraph = Readonly<{ bindings: ReadonlyArray<object> }>

const graphs = new WeakMap<object, TestGraph>()

/** @internal Retains the original graph behind an acquired test facade. */
export const registerTestGraph = (
  facade: object,
  implementation: TestGraph,
): void => {
  graphs.set(facade, implementation)
}

/** @internal Reads the graph of an original acquired test facade. */
export const testGraphOf = (facade: object): TestGraph | undefined =>
  graphs.get(facade)
