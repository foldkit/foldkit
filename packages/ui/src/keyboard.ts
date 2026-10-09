import { Array, Match, Option, Predicate, pipe } from 'effect'
import type { KeyboardModifiers } from 'foldkit/html'

const isPrintableKey = (key: string): boolean => key.length === 1

/** Whether a keydown holds Ctrl, Meta, or Alt. A character key pressed with one
 *  of those modifiers is a browser, operating system, or assistive-technology
 *  shortcut such as Cmd+F or Ctrl+Space, so it stays with the browser. Shift
 *  only changes which character the key types. */
export const isShortcutChord = (modifiers: KeyboardModifiers): boolean =>
  modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey

/** Whether a keydown types a character into a typeahead query: a single
 *  printable character (not a named key like "Enter" or "ArrowDown") that is
 *  not part of a shortcut chord. */
export const isTypeaheadKey =
  (modifiers: KeyboardModifiers) =>
  (key: string): boolean =>
    isPrintableKey(key) && !isShortcutChord(modifiers)

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
