import { Array, Match as M, Option, Predicate, pipe } from 'effect'

/** Whether a keyboard event key is a single printable character (not a named key like "Enter" or "ArrowDown"). */
export const isPrintableKey = (key: string): boolean => key.length === 1

export const wrapIndex = (index: number, length: number): number =>
  ((index % length) + length) % length

export const findFirstEnabledIndex =
  (
    itemCount: number,
    focusedIndex: number,
    isDisabled: (index: number) => boolean,
  ) =>
  (startIndex: number, direction: 1 | -1): number =>
    pipe(
      itemCount,
      Array.makeBy(step => wrapIndex(startIndex + step * direction, itemCount)),
      Array.findFirst(Predicate.not(isDisabled)),
      Option.getOrElse(() => focusedIndex),
    )

export const keyToIndex = (
  nextKey: string,
  previousKey: string,
  itemCount: number,
  focusedIndex: number,
  isDisabled: (index: number) => boolean,
): ((key: string) => number) => {
  const find = findFirstEnabledIndex(itemCount, focusedIndex, isDisabled)

  return (key: string): number =>
    M.value(key).pipe(
      M.when(nextKey, () => find(focusedIndex + 1, 1)),
      M.when(previousKey, () => find(focusedIndex - 1, -1)),
      M.whenOr('Home', 'PageUp', () => find(0, 1)),
      M.whenOr('End', 'PageDown', () => find(itemCount - 1, -1)),
      M.orElse(() => focusedIndex),
    )
}
