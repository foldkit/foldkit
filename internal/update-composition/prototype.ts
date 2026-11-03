export const makeComposableUpdates = <
  const Composition extends Readonly<{ makeUpdate: unknown }>,
>(
  composition: Composition,
): Composition['makeUpdate'] => composition.makeUpdate
