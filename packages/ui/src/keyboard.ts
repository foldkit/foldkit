import { Array, Match, Option, Predicate, pipe } from 'effect'

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

const keyToIndexFromNone = (
  previousKey: string,
  itemCount: number,
  isDisabled: (index: number) => boolean,
): ((key: string) => number) => {
  const find = findFirstEnabledIndex(itemCount, 0, isDisabled)
  const firstEnabledIndex = find(0, 1)
  const lastEnabledIndex = find(itemCount - 1, -1)

  return (key: string): number =>
    Match.value(key).pipe(
      Match.whenOr(previousKey, 'End', 'PageDown', () => lastEnabledIndex),
      Match.orElse(() => firstEnabledIndex),
    )
}

const keyToIndexFromFocused = (
  nextKey: string,
  previousKey: string,
  itemCount: number,
  focusedIndex: number,
  isDisabled: (index: number) => boolean,
): ((key: string) => number) => {
  const find = findFirstEnabledIndex(itemCount, focusedIndex, isDisabled)

  return (key: string): number =>
    Match.value(key).pipe(
      Match.when(nextKey, () => find(focusedIndex + 1, 1)),
      Match.when(previousKey, () => find(focusedIndex - 1, -1)),
      Match.whenOr('Home', 'PageUp', () => find(0, 1)),
      Match.whenOr('End', 'PageDown', () => find(itemCount - 1, -1)),
      Match.orElse(() => focusedIndex),
    )
}

/** Resolves the index a navigation key moves to. From a focused index, the
 *  next and previous keys step to the neighboring enabled index, wrapping at
 *  the ends. With no focused index, the previous key, `End` and `PageDown`
 *  land on the last enabled index, and every other key lands on the first. */
export const keyToIndex = (
  nextKey: string,
  previousKey: string,
  itemCount: number,
  maybeFocusedIndex: Option.Option<number>,
  isDisabled: (index: number) => boolean,
): ((key: string) => number) =>
  Option.match(maybeFocusedIndex, {
    onNone: () => keyToIndexFromNone(previousKey, itemCount, isDisabled),
    onSome: focusedIndex =>
      keyToIndexFromFocused(
        nextKey,
        previousKey,
        itemCount,
        focusedIndex,
        isDisabled,
      ),
  })
