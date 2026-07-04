import { Array, Effect, Option, Queue, Stream, String } from 'effect'

/**
 * Whether a binding fires while the user is typing in a text field.
 *
 * `'Suppress'` (the default) ignores the binding when focus is inside an
 * `input`, `textarea`, `select`, or `contentEditable` element, so global
 * shortcuts never steal keystrokes mid-word. `'Allow'` opts a binding out of
 * that guard for shortcuts that must work while typing, such as an `Escape`
 * that dismisses an open palette from inside its search box.
 */
export type WhileTyping = 'Suppress' | 'Allow'

type BindingBase<Message> = Readonly<{
  message: () => Message
  whileTyping?: WhileTyping
  preventDefault?: boolean
}>

/**
 * A binding for a single key or modifier combo.
 *
 * `keys` is a `+`-separated combo where the final token is the key and any
 * leading tokens are modifiers: `'/'`, `'Escape'`, `'mod+k'`, `'shift+/'`,
 * `'mod+shift+p'`. The `mod` modifier matches Cmd on macOS or Ctrl elsewhere
 * (either `metaKey` or `ctrlKey`). Key names are matched case-insensitively
 * against `KeyboardEvent.key` (`'Escape'`, `'ArrowDown'`, `'/'`, `'k'`).
 */
export type KeyBinding<Message> = BindingBase<Message> &
  Readonly<{ keys: string }>

/**
 * A binding for a chord: an ordered sequence of plain keys pressed one after
 * another, vim-style. `['g', 'l']` fires when `g` is followed by `l`. Chord
 * keys are plain (no modifiers); a non-matching second key cancels the chord
 * and is re-evaluated as a fresh press.
 */
export type ChordBinding<Message> = BindingBase<Message> &
  Readonly<{ chord: ReadonlyArray<string> }>

/**
 * A single entry in a `keyboardShortcuts` binding table: either a
 * {@link KeyBinding} or a {@link ChordBinding}.
 */
export type ShortcutBinding<Message> =
  | KeyBinding<Message>
  | ChordBinding<Message>

/**
 * Configuration for the `keyboardShortcuts` Subscription helper.
 *
 * `bindings` is the declarative table mapping keys, modifier combos, and
 * chords to Messages. `target` is where the `keydown` listener attaches,
 * defaulting to `document`; pass a thunk when the target may not exist until
 * the Subscription's scope opens.
 */
export type KeyboardShortcutsConfig<Message> = Readonly<{
  bindings: ReadonlyArray<ShortcutBinding<Message>>
  target?: EventTarget | (() => EventTarget)
}>

type ParsedKey = Readonly<{
  key: string
  needsMod: boolean
  needsShift: boolean
  needsAlt: boolean
}>

const MODIFIER_KEYS: ReadonlyArray<string> = [
  'control',
  'shift',
  'alt',
  'meta',
  'os',
]

const isChordBinding = <Message>(
  binding: ShortcutBinding<Message>,
): binding is ChordBinding<Message> => 'chord' in binding

const normalizeKey = (key: string): string => String.toLowerCase(key)

const parseKeys = (keys: string): ParsedKey => {
  const tokens = Array.map(keys.split('+'), token => normalizeKey(token.trim()))
  const modifiers = Array.filter(
    tokens,
    token =>
      token === 'mod' ||
      token === 'shift' ||
      token === 'alt' ||
      token === 'option',
  )
  const maybeKey = Array.findLast(
    tokens,
    token =>
      token !== 'mod' &&
      token !== 'shift' &&
      token !== 'alt' &&
      token !== 'option',
  )
  return {
    key: Option.getOrElse(maybeKey, () => ''),
    needsMod: Array.contains(modifiers, 'mod'),
    needsShift: Array.contains(modifiers, 'shift'),
    needsAlt:
      Array.contains(modifiers, 'alt') || Array.contains(modifiers, 'option'),
  }
}

const isModifierEvent = (event: KeyboardEvent): boolean =>
  Array.contains(MODIFIER_KEYS, normalizeKey(event.key))

const isInField = (): boolean => {
  const element = document.activeElement
  if (element === null) {
    return false
  }
  const tag = String.toLowerCase(element.tagName)
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true
  }
  return element instanceof HTMLElement && element.isContentEditable
}

const modifiersMatch = (parsed: ParsedKey, event: KeyboardEvent): boolean => {
  const isModActive = event.metaKey || event.ctrlKey
  if (parsed.needsMod !== isModActive) {
    return false
  }
  return (
    parsed.needsShift === event.shiftKey && parsed.needsAlt === event.altKey
  )
}

const keyBindingMatches = <Message>(
  binding: KeyBinding<Message>,
  event: KeyboardEvent,
): boolean => {
  const parsed = parseKeys(binding.keys)
  return parsed.key === normalizeKey(event.key) && modifiersMatch(parsed, event)
}

const isAllowedWhileTyping = <Message>(
  binding: ShortcutBinding<Message>,
  inField: boolean,
): boolean => !inField || (binding.whileTyping ?? 'Suppress') === 'Allow'

const isPlainKey = (event: KeyboardEvent): boolean =>
  !event.metaKey && !event.ctrlKey && !event.altKey

type Outcome<Message> = Readonly<{
  pending: Option.Option<string>
  message: Option.Option<Message>
  isPrevented: boolean
}>

const chordFirstKey = <Message>(
  binding: ChordBinding<Message>,
): Option.Option<string> => Option.map(Array.head(binding.chord), normalizeKey)

const chordSecondKey = <Message>(
  binding: ChordBinding<Message>,
): Option.Option<string> =>
  Option.map(Array.get(binding.chord, 1), normalizeKey)

const matchFreshPress = <Message>(
  bindings: ReadonlyArray<ShortcutBinding<Message>>,
  event: KeyboardEvent,
  inField: boolean,
): Outcome<Message> => {
  const key = normalizeKey(event.key)

  const maybeSingle = Array.findFirst(
    bindings,
    binding =>
      !isChordBinding(binding) &&
      isAllowedWhileTyping(binding, inField) &&
      keyBindingMatches(binding, event),
  )
  if (Option.isSome(maybeSingle)) {
    const binding = maybeSingle.value
    return {
      pending: Option.none(),
      message: Option.some(binding.message()),
      isPrevented: binding.preventDefault ?? true,
    }
  }

  const isChordPrefix =
    isPlainKey(event) &&
    Array.some(
      bindings,
      binding =>
        isChordBinding(binding) &&
        isAllowedWhileTyping(binding, inField) &&
        Option.contains(chordFirstKey(binding), key),
    )
  if (isChordPrefix) {
    return {
      pending: Option.some(key),
      message: Option.none(),
      isPrevented: true,
    }
  }

  return { pending: Option.none(), message: Option.none(), isPrevented: false }
}

const step = <Message>(
  bindings: ReadonlyArray<ShortcutBinding<Message>>,
  pending: Option.Option<string>,
  event: KeyboardEvent,
): Outcome<Message> => {
  if (isModifierEvent(event)) {
    return { pending, message: Option.none(), isPrevented: false }
  }

  const inField = isInField()
  const key = normalizeKey(event.key)

  if (Option.isSome(pending) && isPlainKey(event)) {
    const prefix = pending.value
    const maybeChord = Array.findFirst(
      bindings,
      binding =>
        isChordBinding(binding) &&
        isAllowedWhileTyping(binding, inField) &&
        Option.contains(chordFirstKey(binding), prefix) &&
        Option.contains(chordSecondKey(binding), key),
    )
    if (Option.isSome(maybeChord)) {
      const binding = maybeChord.value
      return {
        pending: Option.none(),
        message: Option.some(binding.message()),
        isPrevented: binding.preventDefault ?? true,
      }
    }
  }

  return matchFreshPress(bindings, event, inField)
}

/**
 * Build a Stream that turns a declarative keyboard-shortcut table into
 * Messages, attaching a single `keydown` listener when the Stream's scope
 * opens and removing it when the scope closes.
 *
 * The table supports single keys (`'/'`, `'Escape'`), modifier combos
 * (`'mod+k'`, where `mod` is Cmd on macOS or Ctrl elsewhere), and vim-style
 * chords (`['g', 'l']` — `g` then `l`). Every binding is **`inField`-aware by
 * default**: it does not fire while focus is inside an `input`, `textarea`,
 * `select`, or `contentEditable` element, so shortcuts never steal keystrokes
 * mid-word. Opt a binding out with `whileTyping: 'Allow'`. A matched binding
 * calls `preventDefault` unless it sets `preventDefault: false`.
 *
 * The listener runs synchronously inside the browser's event dispatch, so its
 * `preventDefault` takes effect. Chord state lives inside the Stream's scope,
 * so it resets cleanly when the Subscription tears down.
 *
 * This is a Stream, not a Subscription entry. Wrap it with
 * `Subscription.persistent` for a listener whose lifetime spans the whole
 * Subscriptions record, or plug it into a `Subscription.make` entry's
 * `dependenciesToStream` (behind `Stream.when`) to gate it on a Model
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
 *         { keys: 'Escape', message: () => ClosedPalette(), whileTyping: 'Allow' },
 *         { chord: ['g', 'l'], message: () => Navigated({ to: listRoute() }) },
 *         { keys: 'c', message: () => CreatedTask() },
 *       ],
 *     }),
 *   ),
 * }))
 * ```
 */
export const keyboardShortcuts = <Message>(
  config: KeyboardShortcutsConfig<Message>,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target =
          typeof config.target === 'function'
            ? config.target()
            : (config.target ?? document)

        const state = { pending: Option.none<string>() }

        const handleEvent = (event: Event): void => {
          if (!(event instanceof KeyboardEvent)) {
            return
          }
          const outcome = step(config.bindings, state.pending, event)
          state.pending = outcome.pending
          if (outcome.isPrevented) {
            event.preventDefault()
          }
          if (Option.isSome(outcome.message)) {
            Queue.offerUnsafe(queue, outcome.message.value)
          }
        }

        target.addEventListener('keydown', handleEvent)
        return { target, handleEvent }
      }),
      ({ target, handleEvent }) =>
        Effect.sync(() => {
          target.removeEventListener('keydown', handleEvent)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
