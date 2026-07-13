import { Array, Effect, Option, Stream, String, pipe } from 'effect'

import { fromEventFilterMap } from './fromEvent.js'

/**
 * Whether a binding fires while the user is typing in a form field.
 *
 * `'Suppress'` (the default) drops the shortcut when focus is inside an
 * `input`, `textarea`, `select`, or `contentEditable` element, so typing an
 * `s` never triggers a bare `s` shortcut. `'Allow'` opts a binding back in,
 * typically a `mod` combo like `mod+k` that should open a palette from
 * anywhere.
 */
export type WhileTyping = 'Suppress' | 'Allow'

/**
 * A single-key or `mod`-combo binding. `keys` is a `+`-joined chord string
 * where the token `mod` means "meta on macOS or ctrl elsewhere" and the final
 * token is the key, matched case-insensitively (`'mod+k'`, `'/'`, `'Escape'`).
 *
 * A `mod`-combo matches only when a modifier is held, and a bare key matches
 * only when no modifier is held, so `c` never fires on `mod+c`. `preventDefault`
 * defaults to on for `mod` combos and off for bare keys.
 */
export type KeyBinding<Message> = Readonly<{
  keys: string
  message: () => Message
  whileTyping?: WhileTyping
  preventDefault?: boolean
}>

/**
 * A vim-style prefix chord: press the first key, then the second, to fire.
 * The pending prefix lives inside the Subscription, not the Model, so consumers
 * never carry a `goPending` flag. A non-matching second key clears the prefix
 * and is handled as a fresh key. `preventDefault` defaults to off.
 */
export type ChordBinding<Message> = Readonly<{
  chord: readonly [string, string]
  message: () => Message
  whileTyping?: WhileTyping
  preventDefault?: boolean
}>

export type Binding<Message> = KeyBinding<Message> | ChordBinding<Message>

/**
 * Configuration for the `keyboardShortcuts` Stream helper.
 *
 * `target` defaults to `document`. Pass a thunk when the target may not exist
 * until the Subscription's scope opens.
 */
export type KeyboardShortcutsConfig<Message> = Readonly<{
  bindings: ReadonlyArray<Binding<Message>>
  target?: EventTarget | (() => EventTarget)
}>

const MOD_TOKEN = 'mod'

type KeyDescriptor<Message> = Readonly<{
  requiresMod: boolean
  key: string
  whileTyping: WhileTyping
  preventDefault: boolean
  message: () => Message
}>

type ChordDescriptor<Message> = Readonly<{
  prefix: string
  second: string
  whileTyping: WhileTyping
  preventDefault: boolean
  message: () => Message
}>

const isChordBinding = <Message>(
  binding: Binding<Message>,
): binding is ChordBinding<Message> => 'chord' in binding

const isKeyBinding = <Message>(
  binding: Binding<Message>,
): binding is KeyBinding<Message> => !('chord' in binding)

const parseKeys = (keys: string): { requiresMod: boolean; key: string } => {
  const tokens = String.split(keys, '+')
  const requiresMod = Array.contains(tokens, MOD_TOKEN)
  const key = pipe(
    tokens,
    Array.findLast(token => token !== MOD_TOKEN),
    Option.getOrElse(() => keys),
  )
  return { requiresMod, key: key.toLowerCase() }
}

const toKeyDescriptor = <Message>(
  binding: KeyBinding<Message>,
): KeyDescriptor<Message> => {
  const { requiresMod, key } = parseKeys(binding.keys)
  return {
    requiresMod,
    key,
    whileTyping: binding.whileTyping ?? 'Suppress',
    preventDefault: binding.preventDefault ?? requiresMod,
    message: binding.message,
  }
}

const toChordDescriptor = <Message>(
  binding: ChordBinding<Message>,
): ChordDescriptor<Message> => {
  const [prefix, second] = binding.chord
  return {
    prefix: prefix.toLowerCase(),
    second: second.toLowerCase(),
    whileTyping: binding.whileTyping ?? 'Suppress',
    preventDefault: binding.preventDefault ?? false,
    message: binding.message,
  }
}

const isTypingTarget = (element: Element | null): boolean => {
  if (element === null) {
    return false
  }
  const tagName = element.tagName.toLowerCase()
  const isFieldTag =
    tagName === 'input' || tagName === 'textarea' || tagName === 'select'
  const isEditable = element instanceof HTMLElement && element.isContentEditable
  return isFieldTag || isEditable
}

const isSuppressed = (whileTyping: WhileTyping, inField: boolean): boolean =>
  inField && whileTyping === 'Suppress'

/**
 * Build a Stream that maps global keyboard shortcuts to Messages from a
 * declarative binding table, registering a `keydown` listener when the Stream's
 * scope opens and removing it when the scope closes.
 *
 * Bindings come in two shapes: `keys` (a bare key or `mod` combo like `'mod+k'`)
 * and `chord` (a vim-style prefix pair like `['g', 'l']`). Shortcuts are
 * `inField`-aware by default, so they never fire while the user types in a form
 * field. `preventDefault` runs synchronously inside the browser's dispatch,
 * defaulting to on for `mod` combos and off for bare keys and chords.
 *
 * The pending chord prefix lives inside this Stream, not the consumer's Model,
 * so apps drop the hand-written `keydown` subscription, the `inField` guard, and
 * the `goPending` state that every non-trivial app otherwise rebuilds.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (typically behind `Stream.when`) to gate it on a Model
 * condition.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(() => ({
 *   shortcuts: Subscription.persistent(
 *     Subscription.keyboardShortcuts<Message>({
 *       bindings: [
 *         { keys: 'mod+k', message: () => ToggledPalette(), whileTyping: 'Allow' },
 *         { keys: '/', message: () => OpenedPalette() },
 *         { chord: ['g', 'l'], message: () => Navigated({ to: listRouter() }) },
 *         { keys: 'c', message: () => Navigated({ to: createRouter() }) },
 *       ],
 *     }),
 *   ),
 * }))
 * ```
 */
export const keyboardShortcuts = <Message>(
  config: KeyboardShortcutsConfig<Message>,
): Stream.Stream<Message> =>
  Stream.unwrap(
    Effect.sync(() => {
      const keyDescriptors = pipe(
        config.bindings,
        Array.filter(isKeyBinding),
        Array.map(toKeyDescriptor),
      )
      const chordDescriptors = pipe(
        config.bindings,
        Array.filter(isChordBinding),
        Array.map(toChordDescriptor),
      )

      // NOTE: The pending chord prefix is per-scope mutable state. A fresh
      // closure is created on each materialization via `Stream.unwrap`, so
      // re-subscribing never inherits a stale prefix.
      let maybePendingPrefix: Option.Option<string> = Option.none()

      const matchKey = (
        key: string,
        hasMod: boolean,
        inField: boolean,
      ): Option.Option<KeyDescriptor<Message>> =>
        pipe(
          keyDescriptors,
          Array.findFirst(
            descriptor =>
              descriptor.requiresMod === hasMod &&
              descriptor.key === key &&
              !isSuppressed(descriptor.whileTyping, inField),
          ),
        )

      const matchChord = (
        prefix: string,
        second: string,
        inField: boolean,
      ): Option.Option<ChordDescriptor<Message>> =>
        pipe(
          chordDescriptors,
          Array.findFirst(
            descriptor =>
              descriptor.prefix === prefix &&
              descriptor.second === second &&
              !isSuppressed(descriptor.whileTyping, inField),
          ),
        )

      const startsChord = (key: string): boolean =>
        pipe(
          chordDescriptors,
          Array.some(descriptor => descriptor.prefix === key),
        )

      const emit = (
        descriptor: KeyDescriptor<Message> | ChordDescriptor<Message>,
        event: KeyboardEvent,
      ): Option.Option<Message> => {
        if (descriptor.preventDefault) {
          event.preventDefault()
        }
        return Option.some(descriptor.message())
      }

      const toMessage = (event: KeyboardEvent): Option.Option<Message> => {
        const key = event.key.toLowerCase()
        const hasMod = event.metaKey || event.ctrlKey
        const inField = isTypingTarget(document.activeElement)

        if (Option.isSome(maybePendingPrefix) && !hasMod) {
          const prefix = maybePendingPrefix.value
          maybePendingPrefix = Option.none()
          const maybeChord = matchChord(prefix, key, inField)
          if (Option.isSome(maybeChord)) {
            return emit(maybeChord.value, event)
          }
        }

        const maybeKey = matchKey(key, hasMod, inField)
        if (Option.isSome(maybeKey)) {
          return emit(maybeKey.value, event)
        }

        if (!hasMod && !inField && startsChord(key)) {
          maybePendingPrefix = Option.some(key)
          return Option.none()
        }

        return Option.none()
      }

      return fromEventFilterMap<KeyboardEvent, Message>({
        target: config.target ?? document,
        type: 'keydown',
        toMessage,
      })
    }),
  )
