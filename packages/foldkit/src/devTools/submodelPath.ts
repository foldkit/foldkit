import { Array, Option, Schema as S, pipe } from 'effect'

import { withConstructorProbe } from '../schema/index.js'

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

/** A private sentinel leaf the {@link commandSubmodelPath} fold starts from. It
 *  stands in for the Command's eventual result Message. Deliberately not a
 *  `Got*Message`, so a fold that applies no wrappers walks to an empty path. */
const COMMAND_SUBMODEL_PATH_PROBE: unknown = {}

/**
 * The Command-side analogue of {@link extractSubmodelInfo}. A Command reaches
 * DevTools before its Effect resolves, so its destination Submodel can only be
 * recovered from the `mapMessage`/`mapMessages` lifts recorded on it, not from a
 * dispatched Message. Folding that chain over a probe leaf reproduces the
 * wrapping the result would travel through, e.g.
 * `GotPanelMessage({ message: GotEditorMessage({ message: probe }) })`, then
 * reuses `extractSubmodelInfo` to read the wrapper-tag path from outer to inner.
 *
 * The fold runs under `withConstructorProbe`: a real `Got*Message` wrapper
 * validates its `message` field via `Schema.make` and would reject the probe,
 * so probe mode makes the constructors stamp their `_tag` without decoding the
 * payload. The whole fold is still guarded, so a mapper that throws for any
 * other reason degrades to an empty path rather than breaking DevTools
 * recording.
 *
 * Returns an empty path for a Command with no chain (a top-level Command), or
 * one whose fold does not produce a `Got*Message`. Unlike an entry there is no
 * leaf tag: the result Message the leaf stands for only exists once the Effect
 * resolves, so the destination is known but the arriving Message is not.
 */
export const commandSubmodelPath = (
  messageMappers: ReadonlyArray<(message: unknown) => unknown> | undefined,
): ReadonlyArray<string> => {
  const mappers = messageMappers ?? []

  if (Array.isReadonlyArrayEmpty(mappers)) {
    return []
  }

  try {
    const wrapped = withConstructorProbe(() =>
      Array.reduce(mappers, COMMAND_SUBMODEL_PATH_PROBE, (current, mapper) =>
        mapper(current),
      ),
    )

    return isTagged(wrapped)
      ? extractSubmodelInfo(wrapped._tag, wrapped).submodelPath
      : []
  } catch {
    return []
  }
}
