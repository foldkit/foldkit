import { Array, Option, String as Str, pipe } from 'effect'

import { wrapIndex } from './keyboard.js'

/** Finds the first enabled item whose search text starts with the query, searching forward from the active item and wrapping around. On a fresh search, starts after the active item; on a refinement, includes the active item. */
export const resolveTypeaheadMatch = <Item>(
  items: ReadonlyArray<Item>,
  query: string,
  maybeActiveItemIndex: Option.Option<number>,
  isDisabled: (index: number) => boolean,
  itemToSearchText: (item: Item, index: number) => string,
  isRefinement: boolean,
): Option.Option<number> => {
  const lowerQuery = Str.toLowerCase(query)
  const offset = isRefinement ? 0 : 1
  const startIndex = Option.match(maybeActiveItemIndex, {
    onNone: () => 0,
    onSome: index => index + offset,
  })

  const isEnabledMatch = (index: number): boolean =>
    !isDisabled(index) &&
    pipe(
      items,
      Array.get(index),
      Option.exists(item =>
        pipe(
          itemToSearchText(item, index),
          Str.toLowerCase,
          Str.startsWith(lowerQuery),
        ),
      ),
    )

  return pipe(
    items,
    Array.length,
    Array.makeBy(step => wrapIndex(startIndex + step, items.length)),
    Array.findFirst(isEnabledMatch),
  )
}
