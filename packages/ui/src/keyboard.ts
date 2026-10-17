import { Array, Match, Option, Predicate, pipe } from 'effect'
import type { KeyboardModifiers } from 'foldkit/html'

/** Whether a keydown typed a character for typeahead: a single printable key
 *  (not a named key like "Enter" or "ArrowDown") pressed without Control,
 *  Meta, or Alt. Shift+B types a capital B, so it searches. A chord such as
 *  Meta+B is a shortcut, so typeahead ignores it and leaves the event
 *  uncancelled for the application's key bindings and the browser. */
export const isTypedCharacter =
  (modifiers: KeyboardModifiers) =>
  (key: string): boolean =>
    key.length === 1 &&
    !modifiers.ctrlKey &&
    !modifiers.metaKey &&
    !modifiers.altKey

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
    Match.value(key).pipe(
      Match.when(nextKey, () => find(focusedIndex + 1, 1)),
      Match.when(previousKey, () => find(focusedIndex - 1, -1)),
      Match.whenOr('Home', 'PageUp', () => find(0, 1)),
      Match.whenOr('End', 'PageDown', () => find(itemCount - 1, -1)),
      Match.orElse(() => focusedIndex),
    )
}
