import { Option, Schema as S, pipe } from 'effect'

export const GOT_MESSAGE_PATTERN = /^Got.+Message$/

const Tagged = S.Struct({ _tag: S.String })
export const isTagged = S.is(Tagged)

/** Submodel chain information extracted from a recorded Message. */
export type SubmodelInfo = Readonly<{
  submodelPath: ReadonlyArray<string>
  maybeLeafTag: Option.Option<string>
}>

/**
 * Walk a chain of `Got<Submodel>Message` wrappers in a recorded Message and
 * return the wrapper tags plus the innermost leaf tag.
 *
 * The Submodel pattern propagates child Messages up to a parent by wrapping
 * them in `GotChildMessage({ message: childMessage })`. Nested submodels stack
 * those wrappers. Walking the chain reveals the parent → child → grandchild
 * dispatch path that produced the entry.
 *
 * Returns an empty path and `Option.none` for top-level Messages whose tag
 * doesn't match the `Got*Message` pattern. Otherwise the path lists wrapper
 * tags from outer to inner, and `maybeLeafTag` is `Some` when the innermost
 * wrapped value is itself a tagged Message (the underlying child Message that
 * originated the chain).
 */
export const extractSubmodelInfo = (
  tag: string,
  message: unknown,
): SubmodelInfo => {
  if (!GOT_MESSAGE_PATTERN.test(tag)) {
    return { submodelPath: [], maybeLeafTag: Option.none() }
  }

  const path: Array<string> = [tag]
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  let current: unknown = (message as Record<string, unknown>)?.['message']

  while (isTagged(current) && GOT_MESSAGE_PATTERN.test(current._tag)) {
    path.push(current._tag)
    current = (current as Record<string, unknown>)?.['message']
  }
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  return {
    submodelPath: path,
    maybeLeafTag: pipe(
      current,
      Option.liftPredicate(isTagged),
      Option.map(({ _tag }) => _tag),
    ),
  }
}
