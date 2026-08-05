/** Extracts the tag name from a snabbdom selector, dropping any `#id` or
 *  `.class` suffix. Foldkit builds bare-tag selectors, so in practice this
 *  returns the selector unchanged, but the id/class handling keeps it correct
 *  for any selector snabbdom itself would accept. */
export const tagNameFromSelector = (selector: string): string => {
  const hashIndex = selector.indexOf('#')
  const dotIndex = selector.indexOf('.')
  const hashEnd = hashIndex > 0 ? hashIndex : selector.length
  const dotEnd = dotIndex > 0 ? dotIndex : selector.length
  return selector.slice(0, Math.min(hashEnd, dotEnd))
}
