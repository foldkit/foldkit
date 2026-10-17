/** @internal A primitive definition name scoped to one Block. */
export type OwnedName<
  Id extends string,
  LocalName extends string,
> = `${Id}/${LocalName}`

/**
 * @internal Validates a dynamically supplied Block ID.
 */
export const assertBlockId = (id: string): void => {
  if (id.length === 0 || id.includes('/') || id.includes('::')) {
    throw new Error(
      '[foldkit] A named Block ID must be non-empty and cannot contain "/" or "::".',
    )
  }
}

/**
 * @internal Joins a Block ID and local definition name.
 */
export const makeOwnedName = <
  const Id extends string,
  const LocalName extends string,
>(
  id: Id,
  localName: LocalName extends ''
    ? never
    : LocalName extends `${string}/${string}` | `${string}::${string}`
      ? never
      : LocalName,
): OwnedName<Id, LocalName> => {
  assertBlockId(id)

  if (
    localName.length === 0 ||
    localName.includes('/') ||
    localName.includes('::')
  ) {
    throw new Error(
      '[foldkit] A Block primitive name must be non-empty and cannot contain "/" or "::".',
    )
  }

  return `${id}/${localName}`
}
