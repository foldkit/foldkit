import {
  Array,
  Duration,
  Effect,
  Match,
  Number,
  Option,
  Predicate,
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

type PressRequirements = Readonly<{
  key: string
  isAltRequired: boolean
  isControlRequired: boolean
  isMetaRequired: boolean
  isModRequired: boolean
  isShiftRequired: boolean
}>

type ParsedPress = PressRequirements &
  Readonly<{
    identifier: string
  }>

type CompiledBinding<Message> = Readonly<{
  presses: Array.NonEmptyReadonlyArray<ParsedPress>
  toMessage: (event: KeyboardEvent) => Message
  whileTyping: WhileTyping
  preventDefault: boolean
  whenRepeated: 'Ignore' | 'Allow'
}>

type SequenceState<Message> = Readonly<{
  bindings: ReadonlyArray<CompiledBinding<Message>>
  matchedPressCount: number
}>

type ActiveSequence<Message> = SequenceState<Message> &
  Readonly<{
    timeout: ReturnType<typeof setTimeout>
  }>

type SequenceController<Message> = Readonly<{
  clearSequence: () => void
  readSequence: () => Option.Option<ActiveSequence<Message>>
  setSequence: (sequence: SequenceState<Message>) => void
}>

type KeyboardShortcutHandlerContext<Message> = Readonly<{
  bindings: ReadonlyArray<CompiledBinding<Message>>
  emitMessage: (message: Message) => void
  modKey: ModKey
  sequenceController: SequenceController<Message>
}>

type KeyboardShortcutHandler = Readonly<{
  clearSequence: () => void
  handleEvent: (event: Event) => void
}>

type CompiledKeyboardShortcutsConfig<Message> = Readonly<{
  bindings: ReadonlyArray<CompiledBinding<Message>>
  modKey: ModKey | undefined
  sequenceTimeout: number
  target: EventTarget | (() => EventTarget) | undefined
}>

type AcquiredKeyboardShortcutListener = Readonly<{
  clearSequence: () => void
  handleEvent: (event: Event) => void
  ownerDocument: Document
  ownerWindow: Window
  target: EventTarget
}>

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
const NON_CANONICAL_MODIFIERS: ReadonlyArray<string> = [
  'cmd',
  'command',
  'ctrl',
  'option',
]

const normalizeKey = (key: string): string => {
  if (key === ' ') {
    return key
  }

  const normalized = pipe(key, String.trim, String.toLowerCase)

  return Match.value(normalized).pipe(
    Match.withReturnType<string>(),
    Match.when('space', () => ' '),
    Match.when('plus', () => '+'),
    Match.orElse(value => value),
  )
}

const displayKey = (key: string): string =>
  Match.value(key).pipe(
    Match.withReturnType<string>(),
    Match.when(' ', () => 'space'),
    Match.when('+', () => 'plus'),
    Match.orElse(value => value),
  )

const identifierPartWhen = (
  isIncluded: boolean,
  identifier: string,
): Option.Option<string> => Option.liftPredicate(identifier, () => isIncluded)

const pressIdentifier = (press: PressRequirements, modKey?: ModKey): string => {
  const isModUnresolved = press.isModRequired && modKey === undefined
  const isControlRequired =
    press.isControlRequired || (press.isModRequired && modKey === 'Control')
  const isMetaRequired =
    press.isMetaRequired || (press.isModRequired && modKey === 'Meta')

  return pipe(
    [
      identifierPartWhen(isModUnresolved, 'mod'),
      identifierPartWhen(isControlRequired, 'control'),
      identifierPartWhen(isMetaRequired, 'meta'),
      identifierPartWhen(press.isAltRequired, 'alt'),
      identifierPartWhen(press.isShiftRequired, 'shift'),
      Option.some(displayKey(press.key)),
    ],
    Array.getSomes,
    Array.join('+'),
  )
}

const throwInvalidShortcut = (shortcut: string, reason: string): never => {
  throw new Error(`Invalid keyboard shortcut "${shortcut}": ${reason}`)
}

const hasDuplicateModifiers = (modifiers: ReadonlyArray<string>): boolean =>
  Array.length(Array.dedupe(modifiers)) !== Array.length(modifiers)

const parsePress = (shortcut: string): ParsedPress => {
  const tokens = pipe(
    shortcut,
    String.split('+'),
    Array.map(token => pipe(token, String.trim, String.toLowerCase)),
  )

  if (Array.some(tokens, String.isEmpty)) {
    return throwInvalidShortcut(
      shortcut,
      'each modifier and key must be named; use "Plus" for the + key',
    )
  }

  const maybeNonCanonicalModifier = Array.findFirst(tokens, token =>
    Array.contains(NON_CANONICAL_MODIFIERS, token),
  )
  if (Option.isSome(maybeNonCanonicalModifier)) {
    return throwInvalidShortcut(
      shortcut,
      `unknown modifier "${maybeNonCanonicalModifier.value}"`,
    )
  }

  const [modifiers, keyToken] = Array.unappend<string>(tokens)
  const key = normalizeKey(keyToken)
  if (
    Array.contains(SHORTCUT_MODIFIERS, keyToken) ||
    Array.contains(MODIFIER_KEYS, key)
  ) {
    return throwInvalidShortcut(shortcut, 'a non-modifier key is required')
  }

  const maybeUnknownModifier = Array.findFirst(
    modifiers,
    modifier => !Array.contains(SHORTCUT_MODIFIERS, modifier),
  )
  if (Option.isSome(maybeUnknownModifier)) {
    return throwInvalidShortcut(
      shortcut,
      `unknown modifier "${maybeUnknownModifier.value}"`,
    )
  }

  if (hasDuplicateModifiers(modifiers)) {
    return throwInvalidShortcut(shortcut, 'a modifier is repeated')
  }

  const isModRequired = Array.contains(modifiers, 'mod')
  const isControlRequired = Array.contains(modifiers, 'control')
  const isMetaRequired = Array.contains(modifiers, 'meta')
  if (isModRequired && (isControlRequired || isMetaRequired)) {
    return throwInvalidShortcut(
      shortcut,
      'Mod cannot be combined with Control or Meta',
    )
  }

  const isAltRequired = Array.contains(modifiers, 'alt')
  const isShiftRequired = Array.contains(modifiers, 'shift')
  const pressRequirements: PressRequirements = {
    key,
    isAltRequired,
    isControlRequired,
    isMetaRequired,
    isModRequired,
    isShiftRequired,
  }

  return {
    ...pressRequirements,
    identifier: pressIdentifier(pressRequirements),
  }
}

const compileBinding = <Message>(
  binding: KeyboardShortcutBinding<Message>,
): CompiledBinding<Message> => {
  if (
    !Predicate.isString(binding.shortcut) &&
    Array.length(binding.shortcut) < 2
  ) {
    throw new Error('A keyboard shortcut sequence requires at least two keys')
  }

  const presses = Predicate.isString(binding.shortcut)
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

const pressesOverlap = (
  first: ParsedPress,
  second: ParsedPress,
  modKey: ModKey,
): boolean => pressIdentifier(first, modKey) === pressIdentifier(second, modKey)

const isBindingPrefix = <Message>(
  prefix: CompiledBinding<Message>,
  binding: CompiledBinding<Message>,
  modKey: ModKey,
): boolean => {
  if (Array.length(prefix.presses) > Array.length(binding.presses)) {
    return false
  }

  return Array.every(
    Array.zip(prefix.presses, binding.presses),
    ([prefixPress, bindingPress]) =>
      pressesOverlap(prefixPress, bindingPress, modKey),
  )
}

const sharesFirstPress = <Message>(
  first: CompiledBinding<Message>,
  second: CompiledBinding<Message>,
  modKey: ModKey,
): boolean =>
  pressesOverlap(
    Array.headNonEmpty(first.presses),
    Array.headNonEmpty(second.presses),
    modKey,
  )

const validateBindingPair = <Message>(
  binding: CompiledBinding<Message>,
  otherBinding: CompiledBinding<Message>,
  modKey: ModKey,
): void => {
  const bindingIsPrefix = isBindingPrefix(binding, otherBinding, modKey)
  const otherBindingIsPrefix = isBindingPrefix(otherBinding, binding, modKey)

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
}

const validateBindings = <Message>(
  bindings: ReadonlyArray<CompiledBinding<Message>>,
  modKey: ModKey,
): void => {
  Array.forEach(bindings, (binding, index) => {
    Array.forEach(Array.drop(bindings, index + 1), otherBinding => {
      validateBindingPair(binding, otherBinding, modKey)
    })
  })
}

const compileEnabledBindings = <Message>(
  bindings: ReadonlyArray<KeyboardShortcutBinding<Message>>,
): ReadonlyArray<CompiledBinding<Message>> =>
  pipe(
    bindings,
    Array.filter(binding => binding.isEnabled !== false),
    Array.map(compileBinding),
  )

const isSequence = <Message>(binding: CompiledBinding<Message>): boolean =>
  Array.length(binding.presses) > 1

const isModifierEvent = (event: KeyboardEvent): boolean =>
  Array.contains(MODIFIER_KEYS, normalizeKey(event.key))

const isEditableTarget = (target: EventTarget): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = String.toLowerCase(target.tagName)
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

const resolveModKey = (configuredModKey: ModKey | undefined): ModKey => {
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

const firstPressMatches = <Message>(
  binding: CompiledBinding<Message>,
  event: KeyboardEvent,
  modKey: ModKey,
): boolean => pressMatches(Array.headNonEmpty(binding.presses), event, modKey)

const nextPressMatches = <Message>(
  binding: CompiledBinding<Message>,
  matchedPressCount: number,
  event: KeyboardEvent,
  modKey: ModKey,
): boolean =>
  Option.exists(Array.get(binding.presses, matchedPressCount), press =>
    pressMatches(press, event, modKey),
  )

const resolveTarget = (
  target: EventTarget | (() => EventTarget) | undefined,
): EventTarget => {
  if (Predicate.isFunction(target)) {
    return target()
  }

  return target ?? document
}

const resolveValidationModKey = (
  configuredModKey: ModKey | undefined,
): Option.Option<ModKey> => {
  if (configuredModKey !== undefined) {
    return Option.some(configuredModKey)
  }

  if (typeof navigator === 'undefined') {
    return Option.none()
  }

  return Option.some(resolveModKey(undefined))
}

const compileKeyboardShortcutsConfig = <Message>(
  config: KeyboardShortcutsConfig<Message>,
): CompiledKeyboardShortcutsConfig<Message> => {
  const bindings = compileEnabledBindings(config.bindings)
  const sequenceTimeout = Duration.toMillis(
    config.sequenceTimeout ?? DEFAULT_SEQUENCE_TIMEOUT,
  )

  if (!globalThis.Number.isFinite(sequenceTimeout) || sequenceTimeout <= 0) {
    throw new Error('sequenceTimeout must be a finite duration above zero')
  }

  const maybeValidationModKey = resolveValidationModKey(config.modKey)
  if (Option.isSome(maybeValidationModKey)) {
    validateBindings(bindings, maybeValidationModKey.value)
  }

  return {
    bindings,
    modKey: config.modKey,
    sequenceTimeout,
    target: config.target,
  }
}

const makeSequenceController = <Message>(
  sequenceTimeout: number,
): SequenceController<Message> => {
  const state = {
    maybeSequence: Option.none<ActiveSequence<Message>>(),
  }

  const clearSequence = (): void => {
    if (Option.isSome(state.maybeSequence)) {
      clearTimeout(state.maybeSequence.value.timeout)
    }

    state.maybeSequence = Option.none()
  }

  const setSequence = (sequence: SequenceState<Message>): void => {
    clearSequence()
    state.maybeSequence = Option.some({
      ...sequence,
      timeout: setTimeout(clearSequence, sequenceTimeout),
    })
  }

  return {
    clearSequence,
    readSequence: () => state.maybeSequence,
    setSequence,
  }
}

const emitBindingMessage = <Message>(
  context: KeyboardShortcutHandlerContext<Message>,
  binding: CompiledBinding<Message>,
  event: KeyboardEvent,
): void => {
  context.sequenceController.clearSequence()
  if (binding.preventDefault) {
    event.preventDefault()
  }

  context.emitMessage(binding.toMessage(event))
}

const findMatchingOnePressBinding = <Message>(
  bindings: ReadonlyArray<CompiledBinding<Message>>,
  event: KeyboardEvent,
  modKey: ModKey,
  isEditable: boolean,
): Option.Option<CompiledBinding<Message>> =>
  Array.findFirst(
    bindings,
    binding =>
      !isSequence(binding) &&
      isAllowedWhileTyping(binding, isEditable) &&
      (!event.repeat || binding.whenRepeated === 'Allow') &&
      firstPressMatches(binding, event, modKey),
  )

const startFreshSequence = <Message>(
  context: KeyboardShortcutHandlerContext<Message>,
  event: KeyboardEvent,
): void => {
  const isEditable = isFromEditable(event)
  const maybeKeyBinding = findMatchingOnePressBinding(
    context.bindings,
    event,
    context.modKey,
    isEditable,
  )

  if (Option.isSome(maybeKeyBinding)) {
    emitBindingMessage(context, maybeKeyBinding.value, event)
    return
  }

  if (event.repeat) {
    return
  }

  const sequenceBindings = Array.filter(
    context.bindings,
    binding =>
      isSequence(binding) &&
      isAllowedWhileTyping(binding, isEditable) &&
      firstPressMatches(binding, event, context.modKey),
  )

  if (Array.isArrayNonEmpty(sequenceBindings)) {
    const firstBinding = Array.headNonEmpty(sequenceBindings)
    context.sequenceController.setSequence({
      bindings: sequenceBindings,
      matchedPressCount: 1,
    })

    if (firstBinding.preventDefault) {
      event.preventDefault()
    }
  }
}

const continueSequence = <Message>(
  context: KeyboardShortcutHandlerContext<Message>,
  sequence: SequenceState<Message>,
  event: KeyboardEvent,
): void => {
  const isEditable = isFromEditable(event)
  const matchingBindings = Array.filter(
    sequence.bindings,
    binding =>
      isAllowedWhileTyping(binding, isEditable) &&
      nextPressMatches(
        binding,
        sequence.matchedPressCount,
        event,
        context.modKey,
      ),
  )

  if (!Array.isReadonlyArrayNonEmpty(matchingBindings)) {
    context.sequenceController.clearSequence()
    startFreshSequence(context, event)
    return
  }

  const firstBinding = Array.headNonEmpty(matchingBindings)
  const nextMatchedPressCount = Number.increment(sequence.matchedPressCount)
  const maybeCompletedBinding = Array.findFirst(
    matchingBindings,
    binding => Array.length(binding.presses) === nextMatchedPressCount,
  )

  if (Option.isSome(maybeCompletedBinding)) {
    emitBindingMessage(context, maybeCompletedBinding.value, event)
    return
  }

  context.sequenceController.setSequence({
    bindings: matchingBindings,
    matchedPressCount: nextMatchedPressCount,
  })

  if (firstBinding.preventDefault) {
    event.preventDefault()
  }
}

const handleKeyboardShortcutEvent = <Message>(
  context: KeyboardShortcutHandlerContext<Message>,
  event: Event,
): void => {
  if (!(event instanceof KeyboardEvent)) {
    return
  }

  if (event.defaultPrevented || event.isComposing) {
    context.sequenceController.clearSequence()
    return
  }

  if (isModifierEvent(event)) {
    return
  }

  const maybeSequence = context.sequenceController.readSequence()
  if (event.repeat && Option.isSome(maybeSequence)) {
    return
  }

  Option.match(maybeSequence, {
    onNone: () => startFreshSequence(context, event),
    onSome: sequence => continueSequence(context, sequence, event),
  })
}

const makeKeyboardShortcutHandler = <Message>(
  config: Readonly<{
    bindings: ReadonlyArray<CompiledBinding<Message>>
    emitMessage: (message: Message) => void
    modKey: ModKey
    sequenceTimeout: number
  }>,
): KeyboardShortcutHandler => {
  const sequenceController = makeSequenceController<Message>(
    config.sequenceTimeout,
  )
  const context: KeyboardShortcutHandlerContext<Message> = {
    bindings: config.bindings,
    emitMessage: config.emitMessage,
    modKey: config.modKey,
    sequenceController,
  }

  return {
    clearSequence: sequenceController.clearSequence,
    handleEvent: event => handleKeyboardShortcutEvent(context, event),
  }
}

const resolveOwnerDocument = (target: EventTarget): Document => {
  if (target instanceof Document) {
    return target
  }

  if (target instanceof Node && target.ownerDocument !== null) {
    return target.ownerDocument
  }

  return document
}

const acquireKeyboardShortcutListener = <Message>(
  config: CompiledKeyboardShortcutsConfig<Message>,
  emitMessage: (message: Message) => void,
): AcquiredKeyboardShortcutListener => {
  const target = resolveTarget(config.target)
  const modKey = resolveModKey(config.modKey)
  validateBindings(config.bindings, modKey)

  const handler = makeKeyboardShortcutHandler({
    bindings: config.bindings,
    emitMessage,
    modKey,
    sequenceTimeout: config.sequenceTimeout,
  })
  const ownerDocument = resolveOwnerDocument(target)
  const ownerWindow = ownerDocument.defaultView ?? window

  target.addEventListener('keydown', handler.handleEvent)
  ownerWindow.addEventListener('blur', handler.clearSequence)
  ownerDocument.addEventListener('visibilitychange', handler.clearSequence)

  return {
    ...handler,
    ownerDocument,
    ownerWindow,
    target,
  }
}

const releaseKeyboardShortcutListener = (
  listener: AcquiredKeyboardShortcutListener,
): void => {
  listener.target.removeEventListener('keydown', listener.handleEvent)
  listener.ownerWindow.removeEventListener('blur', listener.clearSequence)
  listener.ownerDocument.removeEventListener(
    'visibilitychange',
    listener.clearSequence,
  )
  listener.clearSequence()
}

const keyboardShortcutStream = <Message>(
  config: CompiledKeyboardShortcutsConfig<Message>,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue => {
    const emitMessage = (message: Message): void => {
      Queue.offerUnsafe(queue, message)
    }

    return Effect.acquireRelease(
      Effect.sync(() => acquireKeyboardShortcutListener(config, emitMessage)),
      listener => Effect.sync(() => releaseKeyboardShortcutListener(listener)),
    )
  })

/**
 * Build a Stream that turns declarative keyboard shortcuts into Messages.
 *
 * A string shortcut describes one key press. Modifiers are joined with `+`:
 * `'Mod+K'`, `'Control+Shift+P'`, or `'Alt+ArrowDown'`. The supported modifiers
 * are `Mod`, `Control`, `Meta`, `Alt`, and `Shift`. `Mod` resolves to Meta on
 * Apple platforms and Control elsewhere; `modKey` can override that choice.
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
 * the Model that owns the entry, build it inside `dependenciesToStream` and
 * derive each binding's `isEnabled` from the dependency record. A dependency
 * change opens a new Stream scope and resets any sequence in progress. If a
 * parent owns a condition for a lifted child, declare the table at that parent
 * or put shortcuts with different parent-owned lifetimes in separate child
 * entries so `Subscription.lift` can gate them individually. If the meaning
 * of a key depends on the Model, dispatch a factual key Message and decide
 * what it means in update instead of reading the Model from `toMessage`.
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
): Stream.Stream<Message> =>
  keyboardShortcutStream(compileKeyboardShortcutsConfig(config))
