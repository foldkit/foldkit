import {
  Array,
  Duration,
  Effect,
  Option,
  Queue,
  Stream,
  String,
  pipe,
} from 'effect'

/** Whether a shortcut may fire when its keyboard event comes from an editable element. */
export type WhileTyping = 'Suppress' | 'Allow'

/** A single key press or a sequence of two or more key presses. */
export type KeyboardShortcut =
  | string
  | Readonly<[string, string, ...Array<string>]>

type BindingBase<Message> = Readonly<{
  shortcut: KeyboardShortcut
  toMessage: (event: KeyboardEvent) => Message
  isEnabled?: boolean
  whileTyping?: WhileTyping
  preventDefault?: boolean
}>

/**
 * One entry in a {@link keyboardShortcuts} binding table.
 *
 * A string describes one key press, such as `'/'`, `'Escape'`, or `'Mod+K'`.
 * An array describes a sequence of at least two presses, such as
 * `['G', 'H']` or `['G', 'Shift+G']`.
 */
export type KeyboardShortcutBinding<Message> = BindingBase<Message> &
  (
    | Readonly<{
        shortcut: string
        whenRepeated?: 'Ignore' | 'Allow'
      }>
    | Readonly<{
        shortcut: Readonly<[string, string, ...Array<string>]>
        whenRepeated?: never
      }>
  )

type ModKey = 'Control' | 'Meta'

/** Configuration for the {@link keyboardShortcuts} Stream helper. */
export type KeyboardShortcutsConfig<Message> = Readonly<{
  bindings: ReadonlyArray<KeyboardShortcutBinding<Message>>
  target?: EventTarget | (() => EventTarget)
  modKey?: ModKey
  sequenceTimeout?: Duration.Input
}>

type ParsedPress = Readonly<{
  key: string
  isAltRequired: boolean
  isControlRequired: boolean
  isMetaRequired: boolean
  isModRequired: boolean
  isShiftRequired: boolean
  identifier: string
}>

type CompiledBinding<Message> = Readonly<{
  presses: Array.NonEmptyReadonlyArray<ParsedPress>
  toMessage: (event: KeyboardEvent) => Message
  whileTyping: WhileTyping
  preventDefault: boolean
  whenRepeated: 'Ignore' | 'Allow'
}>

type ListenerState = {
  maybeSequencePrefix: Option.Option<ReadonlyArray<string>>
  maybeSequenceTimeout: Option.Option<ReturnType<typeof globalThis.setTimeout>>
}

const DEFAULT_SEQUENCE_TIMEOUT = Duration.seconds(1)
const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/
const MODIFIER_KEYS: ReadonlyArray<string> = [
  'alt',
  'altgraph',
  'capslock',
  'control',
  'fn',
  'fnlock',
  'hyper',
  'meta',
  'numlock',
  'os',
  'scrolllock',
  'shift',
  'super',
  'symbol',
  'symbollock',
]
const SHORTCUT_MODIFIERS: ReadonlyArray<string> = [
  'alt',
  'control',
  'meta',
  'mod',
  'shift',
]

const normalizeKey = (key: string): string => {
  if (key === ' ') {
    return key
  }

  const normalized = pipe(key, String.trim, String.toLowerCase)

  if (normalized === 'space') {
    return ' '
  }

  if (normalized === 'plus') {
    return '+'
  }

  return normalized
}

const normalizeModifier = (modifier: string): string => {
  if (modifier === 'ctrl') {
    return 'control'
  }

  if (modifier === 'cmd' || modifier === 'command') {
    return 'meta'
  }

  if (modifier === 'option') {
    return 'alt'
  }

  return modifier
}

const displayKey = (key: string): string => {
  if (key === ' ') {
    return 'space'
  }

  if (key === '+') {
    return 'plus'
  }

  return key
}

const invalidShortcut = (shortcut: string, reason: string): never => {
  throw new Error(`Invalid keyboard shortcut "${shortcut}": ${reason}`)
}

const parsePress = (shortcut: string): ParsedPress => {
  const tokens = Array.map(shortcut.split('+'), token =>
    pipe(token, String.trim, String.toLowerCase, normalizeModifier),
  )

  if (Array.some(tokens, String.isEmpty)) {
    return invalidShortcut(
      shortcut,
      'each modifier and key must be named; use "Plus" for the + key',
    )
  }

  const maybeKeyToken = Array.last(tokens)
  if (Option.isNone(maybeKeyToken)) {
    return invalidShortcut(shortcut, 'a key is required')
  }

  const keyToken = maybeKeyToken.value
  if (Array.contains(SHORTCUT_MODIFIERS, keyToken)) {
    return invalidShortcut(shortcut, 'a non-modifier key is required')
  }

  const modifiers = Array.dropRight(tokens, 1)
  const maybeUnknownModifier = Array.findFirst(
    modifiers,
    modifier => !Array.contains(SHORTCUT_MODIFIERS, modifier),
  )
  if (Option.isSome(maybeUnknownModifier)) {
    return invalidShortcut(
      shortcut,
      `unknown modifier "${maybeUnknownModifier.value}"`,
    )
  }

  if (Array.length(Array.dedupe(modifiers)) !== Array.length(modifiers)) {
    return invalidShortcut(shortcut, 'a modifier is repeated')
  }

  const isModRequired = Array.contains(modifiers, 'mod')
  const isControlRequired = Array.contains(modifiers, 'control')
  const isMetaRequired = Array.contains(modifiers, 'meta')
  if (isModRequired && (isControlRequired || isMetaRequired)) {
    return invalidShortcut(
      shortcut,
      'Mod cannot be combined with Control or Meta',
    )
  }

  const key = normalizeKey(keyToken)
  const isAltRequired = Array.contains(modifiers, 'alt')
  const isShiftRequired = Array.contains(modifiers, 'shift')
  const identifier = pipe(
    [
      ...(isModRequired ? ['mod'] : []),
      ...(isControlRequired ? ['control'] : []),
      ...(isMetaRequired ? ['meta'] : []),
      ...(isAltRequired ? ['alt'] : []),
      ...(isShiftRequired ? ['shift'] : []),
      displayKey(key),
    ],
    Array.join('+'),
  )

  return {
    key,
    isAltRequired,
    isControlRequired,
    isMetaRequired,
    isModRequired,
    isShiftRequired,
    identifier,
  }
}

const compileBinding = <Message>(
  binding: KeyboardShortcutBinding<Message>,
): CompiledBinding<Message> => {
  if (
    typeof binding.shortcut !== 'string' &&
    Array.length(binding.shortcut) < 2
  ) {
    throw new Error('A keyboard shortcut sequence requires at least two keys')
  }

  const presses =
    typeof binding.shortcut === 'string'
      ? Array.of(parsePress(binding.shortcut))
      : Array.map(binding.shortcut, parsePress)

  return {
    presses,
    toMessage: binding.toMessage,
    whileTyping: binding.whileTyping ?? 'Suppress',
    preventDefault: binding.preventDefault ?? true,
    whenRepeated: binding.whenRepeated ?? 'Ignore',
  }
}

const bindingLabel = <Message>(binding: CompiledBinding<Message>): string =>
  pipe(
    binding.presses,
    Array.map(press => press.identifier),
    Array.join(' '),
  )

const effectiveIdentifier = (press: ParsedPress, modKey: ModKey): string =>
  pipe(
    [
      ...(press.isControlRequired ||
      (press.isModRequired && modKey === 'Control')
        ? ['control']
        : []),
      ...(press.isMetaRequired || (press.isModRequired && modKey === 'Meta')
        ? ['meta']
        : []),
      ...(press.isAltRequired ? ['alt'] : []),
      ...(press.isShiftRequired ? ['shift'] : []),
      displayKey(press.key),
    ],
    Array.join('+'),
  )

const pressesOverlap = (
  first: ParsedPress,
  second: ParsedPress,
  modKey: ModKey,
): boolean =>
  effectiveIdentifier(first, modKey) === effectiveIdentifier(second, modKey)

const isBindingPrefix = <Message>(
  prefix: CompiledBinding<Message>,
  binding: CompiledBinding<Message>,
  modKey: ModKey,
): boolean =>
  Array.length(prefix.presses) <= Array.length(binding.presses) &&
  Array.every(prefix.presses, (press, index) =>
    pipe(
      Array.get(binding.presses, index),
      Option.exists(candidate => pressesOverlap(candidate, press, modKey)),
    ),
  )

const sharesFirstPress = <Message>(
  first: CompiledBinding<Message>,
  second: CompiledBinding<Message>,
  modKey: ModKey,
): boolean =>
  pipe(
    Array.head(first.presses),
    Option.flatMap(firstPress =>
      pipe(
        Array.head(second.presses),
        Option.map(secondPress =>
          pressesOverlap(firstPress, secondPress, modKey),
        ),
      ),
    ),
    Option.getOrElse(() => false),
  )

const validateBindings = <Message>(
  bindings: ReadonlyArray<CompiledBinding<Message>>,
  modKey: ModKey,
): void => {
  Array.forEach(bindings, (binding, index) => {
    Array.forEach(Array.drop(bindings, index + 1), otherBinding => {
      const bindingIsPrefix = isBindingPrefix(binding, otherBinding, modKey)
      const otherBindingIsPrefix = isBindingPrefix(
        otherBinding,
        binding,
        modKey,
      )

      if (bindingIsPrefix || otherBindingIsPrefix) {
        const relation =
          Array.length(binding.presses) === Array.length(otherBinding.presses)
            ? 'duplicates'
            : 'overlaps as a complete shortcut and a sequence prefix'
        throw new Error(
          `Keyboard shortcut "${bindingLabel(binding)}" ${relation} "${bindingLabel(otherBinding)}"`,
        )
      }

      if (
        sharesFirstPress(binding, otherBinding, modKey) &&
        binding.preventDefault !== otherBinding.preventDefault
      ) {
        throw new Error(
          `Keyboard shortcut sequences beginning with the same key must use the same preventDefault setting: "${bindingLabel(binding)}" and "${bindingLabel(otherBinding)}"`,
        )
      }
    })
  })
}

const compileBindings = <Message>(
  bindings: ReadonlyArray<KeyboardShortcutBinding<Message>>,
): ReadonlyArray<CompiledBinding<Message>> => {
  return pipe(
    bindings,
    Array.filter(binding => binding.isEnabled !== false),
    Array.map(compileBinding),
  )
}

const isSequence = <Message>(binding: CompiledBinding<Message>): boolean =>
  Array.length(binding.presses) > 1

const isModifierEvent = (event: KeyboardEvent): boolean =>
  Array.contains(MODIFIER_KEYS, normalizeKey(event.key))

const isEditableTarget = (target: EventTarget): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = pipe(target.tagName, String.toLowerCase)
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  )
}

const isFromEditable = (event: KeyboardEvent): boolean =>
  Array.some(event.composedPath(), isEditableTarget)

const isAllowedWhileTyping = <Message>(
  binding: CompiledBinding<Message>,
  isEditable: boolean,
): boolean => !isEditable || binding.whileTyping === 'Allow'

const resolveModKey = (
  configuredModKey: KeyboardShortcutsConfig<unknown>['modKey'],
): ModKey => {
  if (configuredModKey !== undefined) {
    return configuredModKey
  }

  return APPLE_PLATFORM_PATTERN.test(navigator.userAgent) ? 'Meta' : 'Control'
}

const pressMatches = (
  press: ParsedPress,
  event: KeyboardEvent,
  modKey: ModKey,
): boolean => {
  const isControlRequired =
    press.isControlRequired || (press.isModRequired && modKey === 'Control')
  const isMetaRequired =
    press.isMetaRequired || (press.isModRequired && modKey === 'Meta')

  return (
    press.key === normalizeKey(event.key) &&
    press.isAltRequired === event.altKey &&
    isControlRequired === event.ctrlKey &&
    isMetaRequired === event.metaKey &&
    press.isShiftRequired === event.shiftKey
  )
}

const matchesPrefix = <Message>(
  binding: CompiledBinding<Message>,
  prefix: ReadonlyArray<string>,
): boolean =>
  Array.every(prefix, (identifier, index) =>
    pipe(
      Array.get(binding.presses, index),
      Option.exists(press => press.identifier === identifier),
    ),
  )

const firstPressMatches = <Message>(
  binding: CompiledBinding<Message>,
  event: KeyboardEvent,
  modKey: ModKey,
): boolean =>
  pipe(
    Array.head(binding.presses),
    Option.exists(press => pressMatches(press, event, modKey)),
  )

const nextPressMatches = <Message>(
  binding: CompiledBinding<Message>,
  prefix: ReadonlyArray<string>,
  event: KeyboardEvent,
  modKey: ModKey,
): boolean =>
  pipe(
    Array.get(binding.presses, Array.length(prefix)),
    Option.exists(press => pressMatches(press, event, modKey)),
  )

const appendNextIdentifier = <Message>(
  binding: CompiledBinding<Message>,
  prefix: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  pipe(
    Array.get(binding.presses, Array.length(prefix)),
    Option.match({
      onNone: () => prefix,
      onSome: press => Array.append(prefix, press.identifier),
    }),
  )

const resolveTarget = (
  target: KeyboardShortcutsConfig<unknown>['target'],
): EventTarget => {
  if (typeof target === 'function') {
    return target()
  }

  return target ?? document
}

/**
 * Build a Stream that turns declarative keyboard shortcuts into Messages.
 *
 * A string shortcut describes one key press. Modifiers are joined with `+`:
 * `'Mod+K'`, `'Control+Shift+P'`, or `'Alt+ArrowDown'`. `Ctrl`, `Cmd`, and
 * `Option` are aliases for `Control`, `Meta`, and `Alt`. `Mod` resolves to Meta
 * on Apple platforms and Control elsewhere; `modKey` can override that choice.
 * Matching uses `KeyboardEvent.key`, case-insensitively, after the active
 * keyboard layout has been applied. Use `Space` and `Plus` for those keys.
 *
 * An array describes an ordered sequence of two or more presses. Every press
 * uses the same grammar, so `['G', 'Shift+G']` is valid. Sequences reset after
 * one second by default; `sequenceTimeout` accepts any Effect Duration input.
 * Modifier-only events and repeated keydowns do not advance a sequence.
 *
 * Shortcuts are suppressed by default when the event's composed path contains
 * an `input`, `textarea`, `select`, or contenteditable element. Set
 * `whileTyping` to `'Allow'` for a binding that must work there. Events emitted
 * during IME composition are always ignored. Repeated keydowns are ignored for
 * one-press shortcuts unless `whenRepeated` is `'Allow'`. An event another
 * handler already canceled is ignored and clears any sequence in progress.
 *
 * Matched key presses call `preventDefault()` before dispatching. For a
 * sequence, that policy applies to every matched press. Set `preventDefault`
 * to `false` to opt out. Sequences sharing a prefix must use the same policy.
 * Duplicate bindings and a complete shortcut that is also a sequence prefix
 * are rejected when the Stream is created.
 *
 * This helper returns a Stream, not a complete Subscription entry. Use
 * `Subscription.persistent` for a fixed table. When availability depends on
 * the Model, build it inside an entry's `dependenciesToStream` and derive each
 * binding's `isEnabled` from the dependency record. A dependency change opens
 * a new Stream scope and resets any sequence in progress. If the meaning of a
 * key depends on the Model, dispatch a factual key Message and decide what it
 * means in update instead of reading the Model from `toMessage`.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(entry => ({
 *   shortcuts: entry(
 *     { isPaletteOpen: Schema.Boolean },
 *     {
 *       modelToDependencies: model => ({
 *         isPaletteOpen: model.paletteState._tag === 'Open',
 *       }),
 *       dependenciesToStream: ({ isPaletteOpen }) =>
 *         Subscription.keyboardShortcuts<Message>({
 *           bindings: [
 *             {
 *               shortcut: 'Escape',
 *               isEnabled: isPaletteOpen,
 *               whileTyping: 'Allow',
 *               toMessage: () => Message.PressedEscape(),
 *             },
 *             {
 *               shortcut: 'Mod+K',
 *               whileTyping: 'Allow',
 *               toMessage: () => Message.PressedSearchShortcut(),
 *             },
 *             {
 *               shortcut: ['G', 'L'],
 *               toMessage: () => Message.PressedListShortcut(),
 *             },
 *           ],
 *         }),
 *     },
 *   ),
 * }))
 * ```
 */
export const keyboardShortcuts = <Message>(
  config: KeyboardShortcutsConfig<Message>,
): Stream.Stream<Message> => {
  const bindings = compileBindings(config.bindings)
  const sequenceTimeout = Duration.toMillis(
    config.sequenceTimeout ?? DEFAULT_SEQUENCE_TIMEOUT,
  )

  if (!globalThis.Number.isFinite(sequenceTimeout) || sequenceTimeout <= 0) {
    throw new Error('sequenceTimeout must be a finite duration above zero')
  }

  const validationModKey =
    config.modKey ??
    (typeof navigator === 'undefined' ? undefined : resolveModKey(undefined))
  if (validationModKey !== undefined) {
    validateBindings(bindings, validationModKey)
  }

  return Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target = resolveTarget(config.target)
        const modKey = resolveModKey(config.modKey)
        validateBindings(bindings, modKey)
        const state: ListenerState = {
          maybeSequencePrefix: Option.none(),
          maybeSequenceTimeout: Option.none(),
        }

        const clearSequence = (): void => {
          if (Option.isSome(state.maybeSequenceTimeout)) {
            globalThis.clearTimeout(state.maybeSequenceTimeout.value)
          }

          state.maybeSequencePrefix = Option.none()
          state.maybeSequenceTimeout = Option.none()
        }

        const setSequencePrefix = (prefix: ReadonlyArray<string>): void => {
          clearSequence()
          state.maybeSequencePrefix = Option.some(prefix)
          state.maybeSequenceTimeout = Option.some(
            globalThis.setTimeout(clearSequence, sequenceTimeout),
          )
        }

        const emit = (
          binding: CompiledBinding<Message>,
          event: KeyboardEvent,
        ): void => {
          clearSequence()
          if (binding.preventDefault) {
            event.preventDefault()
          }
          Queue.offerUnsafe(queue, binding.toMessage(event))
        }

        const startFresh = (event: KeyboardEvent): void => {
          const isEditable = isFromEditable(event)
          const maybeKeyBinding = Array.findFirst(
            bindings,
            binding =>
              !isSequence(binding) &&
              isAllowedWhileTyping(binding, isEditable) &&
              (!event.repeat || binding.whenRepeated === 'Allow') &&
              firstPressMatches(binding, event, modKey),
          )

          if (Option.isSome(maybeKeyBinding)) {
            emit(maybeKeyBinding.value, event)
            return
          }

          if (event.repeat) {
            return
          }

          const sequenceBindings = Array.filter(
            bindings,
            binding =>
              isSequence(binding) &&
              isAllowedWhileTyping(binding, isEditable) &&
              firstPressMatches(binding, event, modKey),
          )

          if (Array.isReadonlyArrayNonEmpty(sequenceBindings)) {
            const firstBinding = Array.headNonEmpty(sequenceBindings)
            const firstPress = Array.headNonEmpty(firstBinding.presses)
            setSequencePrefix([firstPress.identifier])
            if (firstBinding.preventDefault) {
              event.preventDefault()
            }
          }
        }

        const continueSequence = (
          prefix: ReadonlyArray<string>,
          event: KeyboardEvent,
        ): void => {
          const isEditable = isFromEditable(event)
          const matchingBindings = Array.filter(
            bindings,
            binding =>
              isSequence(binding) &&
              matchesPrefix(binding, prefix) &&
              isAllowedWhileTyping(binding, isEditable) &&
              nextPressMatches(binding, prefix, event, modKey),
          )

          const maybeFirstBinding = Array.head(matchingBindings)
          if (Option.isNone(maybeFirstBinding)) {
            clearSequence()
            startFresh(event)
            return
          }

          const firstBinding = maybeFirstBinding.value
          const nextPrefix = appendNextIdentifier(firstBinding, prefix)
          const maybeCompletedBinding = Array.findFirst(
            matchingBindings,
            binding =>
              Array.length(binding.presses) === Array.length(nextPrefix),
          )

          if (Option.isSome(maybeCompletedBinding)) {
            emit(maybeCompletedBinding.value, event)
            return
          }

          setSequencePrefix(nextPrefix)
          if (firstBinding.preventDefault) {
            event.preventDefault()
          }
        }

        const handleEvent = (event: Event): void => {
          if (!(event instanceof KeyboardEvent)) {
            return
          }

          if (event.defaultPrevented || event.isComposing) {
            clearSequence()
            return
          }

          if (isModifierEvent(event)) {
            return
          }

          if (event.repeat && Option.isSome(state.maybeSequencePrefix)) {
            return
          }

          Option.match(state.maybeSequencePrefix, {
            onNone: () => startFresh(event),
            onSome: prefix => continueSequence(prefix, event),
          })
        }

        const ownerDocument =
          target instanceof Node ? (target.ownerDocument ?? document) : document
        const ownerWindow = ownerDocument.defaultView ?? window
        const clearSequenceFromLifecycle = (): void => clearSequence()

        target.addEventListener('keydown', handleEvent)
        ownerWindow.addEventListener('blur', clearSequenceFromLifecycle)
        ownerDocument.addEventListener(
          'visibilitychange',
          clearSequenceFromLifecycle,
        )

        return {
          target,
          handleEvent,
          ownerWindow,
          ownerDocument,
          clearSequence,
          clearSequenceFromLifecycle,
        }
      }),
      ({
        target,
        handleEvent,
        ownerWindow,
        ownerDocument,
        clearSequence,
        clearSequenceFromLifecycle,
      }) =>
        Effect.sync(() => {
          target.removeEventListener('keydown', handleEvent)
          ownerWindow.removeEventListener('blur', clearSequenceFromLifecycle)
          ownerDocument.removeEventListener(
            'visibilitychange',
            clearSequenceFromLifecycle,
          )
          clearSequence()
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
}
