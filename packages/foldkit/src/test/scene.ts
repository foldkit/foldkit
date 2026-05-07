import {
  Array,
  Effect,
  Function,
  Option,
  Predicate,
  String as String_,
  pipe,
} from 'effect'
import { dual } from 'effect/Function'

import type { CommandDefinition } from '../command/index.js'
import type { File } from '../file/index.js'
import type { FoldkitMountMarker } from '../html/index.js'
import { FOLDKIT_MOUNT_KEY, FileHandlerSymbol } from '../html/index.js'
import type { Document, Html, KeyboardModifiers } from '../html/index.js'
import type { MountDefinition } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import type {
  AnyCommand,
  BaseInternal,
  CommandMatcher,
  MountResolver,
  PendingMount,
  Resolver,
  ResolverEntry,
} from './internal.js'
import {
  assertAllCommandsResolved,
  assertAllMountsResolved,
  assertAllUnmountsAcknowledged,
  assertExactCommands,
  assertExactMounts,
  assertHasCommands,
  assertHasMounts,
  assertNoUnacknowledgedUnmounts,
  assertNoUnresolvedCommands,
  assertNoUnresolvedMounts,
  assertZeroCommands,
  assertZeroMounts,
  formatCommand,
  formatMatcher,
  resolveAllInternal,
  resolveByMatcher,
  resolveMountByName,
} from './internal.js'
import type { Locator, LocatorAll } from './query.js'
import {
  accessibleDescription,
  accessibleName,
  ancestorsOf,
  attr,
  resolveTarget,
  selector,
  textContent,
  within,
} from './query.js'
import {
  allAltText,
  allDisplayValue,
  allLabel,
  allPlaceholder,
  allRole,
  allSelector,
  allTestId,
  allText,
  allTitle,
} from './query.js'

export type { AnyCommand, MountResolver, PendingMount, Resolver }

export {
  find,
  findAll,
  textContent,
  attr,
  getByRole,
  getAllByRole,
  getByText,
  getByPlaceholder,
  getByLabel,
  getByAltText,
  getByTitle,
  getByTestId,
  getByDisplayValue,
  role,
  placeholder,
  label,
  altText,
  title,
  testId,
  displayValue,
  selector,
  text,
  within,
  getAllByText,
  getAllByLabel,
  getAllByPlaceholder,
  getAllByAltText,
  getAllByTitle,
  getAllByTestId,
  getAllByDisplayValue,
  first,
  last,
  nth,
  filter,
} from './query.js'
export type { Locator, LocatorAll } from './query.js'

/** Multi-match Locator factories. Each returns a `LocatorAll` that resolves
 *  to every matching VNode. Convert to a single `Locator` via `first`,
 *  `last`, or `nth(n)`, or narrow via `filter`. */
export const all = {
  role: allRole,
  text: allText,
  label: allLabel,
  placeholder: allPlaceholder,
  altText: allAltText,
  title: allTitle,
  testId: allTestId,
  displayValue: allDisplayValue,
  selector: allSelector,
} as const
export { sceneMatchers } from './matchers.js'

/** An immutable test simulation that includes the rendered VNode tree.
 *  The Model and Message are intentionally opaque — Scene tests assert
 *  through the view, not the model. Use Story for model-level assertions. */
export type SceneSimulation<Model, Message, OutMessage = undefined> = Readonly<{
  /** @internal Phantom type — preserves Model and Message for step chain inference. */
  _phantom: [Model, Message]
  commands: ReadonlyArray<AnyCommand>
  mounts: ReadonlyArray<PendingMount>
  outMessage: OutMessage
  html: VNode
}>

/** A callable step that sets the initial Model. Carries phantom type for compile-time validation. */
type WithStep<Model> = Readonly<{ _phantomModel: Model }> &
  (<M, Message, OutMessage = undefined>(
    simulation: SceneSimulation<M, Message, OutMessage>,
  ) => SceneSimulation<M, Message, OutMessage>)

/** A single step in a scene — either a `with` step or a scene simulation transform. */
export type SceneStep<Model, Message, OutMessage> =
  | WithStep<NoInfer<Model>>
  | ((
      simulation: SceneSimulation<Model, Message, OutMessage>,
    ) => SceneSimulation<Model, Message, OutMessage>)

// INTERNAL

type DispatchService = Readonly<{
  dispatchAsync: (message: unknown) => Effect.Effect<void>
  dispatchSync: (message: unknown) => void
}>

type CapturingDispatch = Readonly<{
  dispatch: DispatchService
  getCapturedMessage: () => unknown | undefined
  reset: () => void
}>

type UpdateResult<Model, OutMessage> =
  | readonly [Model, ReadonlyArray<AnyCommand>]
  | readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]

type MountStatus =
  | Readonly<{ _tag: 'Pending' }>
  | Readonly<{ _tag: 'Resolved' }>
  | Readonly<{ _tag: 'Ended'; acknowledged: boolean }>

type MountSlotState = Readonly<{
  slot: PendingMount
  status: MountStatus
}>

const PENDING: MountStatus = { _tag: 'Pending' }
const RESOLVED: MountStatus = { _tag: 'Resolved' }
const ENDED_ACKNOWLEDGED: MountStatus = { _tag: 'Ended', acknowledged: true }
const ENDED_UNACKNOWLEDGED: MountStatus = { _tag: 'Ended', acknowledged: false }

type InternalSceneSimulation<
  Model,
  Message,
  OutMessage = undefined,
> = SceneSimulation<Model, Message, OutMessage> &
  Readonly<{
    model: Model
    message: Message | undefined
    updateFn: (
      model: Model,
      message: Message,
    ) => UpdateResult<Model, OutMessage>
    resolvers: ReadonlyArray<ResolverEntry<Message>>
    viewFn: (model: Model) => Html | Document
    capturingDispatch: CapturingDispatch
    scope: Option.Option<Locator>
    mountSlots: ReadonlyArray<MountSlotState>
  }>

/** A typed Command instance carrying the result Message type via its
 *  `effect` field, so passing `FetchWeather({ zipCode })` to `Scene.Command.resolve`
 *  preserves the link between the Command and its declared result Message. */
type SceneCommandInstance<ResultMessage = unknown> = Readonly<{
  name: string
  args?: Record<string, unknown>
  effect: Effect.Effect<ResultMessage, any, any>
}>

const slotKey = ({ name, occurrence }: PendingMount): string =>
  `${name}#${occurrence}`

const collectRenderedSlots = (vnode: VNode): ReadonlyArray<PendingMount> => {
  const counts = new Map<string, number>()
  const slots: Array<PendingMount> = []
  const walk = (node: VNode): void => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const marker = node.data?.[FOLDKIT_MOUNT_KEY] as
      | FoldkitMountMarker
      | undefined
    if (marker !== undefined) {
      const occurrence = counts.get(marker.name) ?? 0
      counts.set(marker.name, occurrence + 1)
      slots.push({ name: marker.name, occurrence })
    }
    for (const child of node.children ?? []) {
      if (typeof child !== 'string') {
        walk(child)
      }
    }
  }
  walk(vnode)
  return slots
}

const reconcileMountSlots = (
  previous: ReadonlyArray<MountSlotState>,
  rendered: VNode,
): ReadonlyArray<MountSlotState> => {
  const previousByKey = new Map(
    Array.map(previous, state => [slotKey(state.slot), state] as const),
  )
  const renderedSlots = collectRenderedSlots(rendered)
  const renderedKeys = new Set(Array.map(renderedSlots, slotKey))
  const fromRendered = Array.map(renderedSlots, slot => {
    const existing = previousByKey.get(slotKey(slot))
    if (existing !== undefined && existing.status._tag !== 'Ended') {
      return existing
    }
    return { slot, status: PENDING }
  })
  const fromVanished = pipe(
    previous,
    Array.filter(state => !renderedKeys.has(slotKey(state.slot))),
    Array.map(state => endStatus(state)),
  )
  const unacknowledgedRevived = pipe(
    previous,
    Array.filter(
      state =>
        renderedKeys.has(slotKey(state.slot)) &&
        state.status._tag === 'Ended' &&
        !state.status.acknowledged,
    ),
  )
  return Array.appendAll(
    fromRendered,
    Array.appendAll(fromVanished, unacknowledgedRevived),
  )
}

const endStatus = (state: MountSlotState): MountSlotState => {
  if (state.status._tag === 'Ended') {
    return state
  }
  return { slot: state.slot, status: ENDED_UNACKNOWLEDGED }
}

const pendingMountsOf = (
  mountSlots: ReadonlyArray<MountSlotState>,
): ReadonlyArray<PendingMount> =>
  pipe(
    mountSlots,
    Array.filter(({ status }) => status._tag === 'Pending'),
    Array.map(({ slot }) => slot),
  )

const unacknowledgedEndedMountsOf = (
  mountSlots: ReadonlyArray<MountSlotState>,
): ReadonlyArray<PendingMount> =>
  pipe(
    mountSlots,
    Array.filter(
      ({ status }) => status._tag === 'Ended' && !status.acknowledged,
    ),
    Array.map(({ slot }) => slot),
  )

const UNINITIALIZED = Symbol('uninitialized')

const toInternal = <Model, Message, OutMessage>(
  simulation: SceneSimulation<Model, Message, OutMessage>,
): InternalSceneSimulation<Model, Message, OutMessage> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  simulation as InternalSceneSimulation<Model, Message, OutMessage>

const applyScopeToTarget = (
  scope: Option.Option<Locator>,
  target: string | Locator,
): string | Locator =>
  Option.match(scope, {
    onNone: () => target,
    onSome: parent =>
      typeof target === 'string'
        ? within(parent, selector(target))
        : within(parent, target),
  })

const applyScopeToLocator = (
  scope: Option.Option<Locator>,
  locator: Locator,
): Locator =>
  Option.match(scope, {
    onNone: () => locator,
    onSome: parent => within(parent, locator),
  })

const applyScopeToLocatorAll = (
  scope: Option.Option<Locator>,
  locatorAll: LocatorAll,
): LocatorAll =>
  Option.match(scope, {
    onNone: () => locatorAll,
    onSome: parent => {
      const resolve = (html: VNode): ReadonlyArray<VNode> =>
        Option.match(parent(html), {
          onNone: () => [],
          onSome: locatorAll,
        })
      return Object.assign(resolve, {
        description: `${locatorAll.description} within ${parent.description}`,
      } as const)
    },
  })

// CAPTURING DISPATCH

const createCapturingDispatch = (): CapturingDispatch => {
  let capturedMessage: unknown | undefined

  return {
    dispatch: Dispatch.of({
      dispatchAsync: () => Effect.void,
      dispatchSync: (dispatchedMessage: unknown) => {
        capturedMessage = dispatchedMessage
      },
    }),
    getCapturedMessage: () => capturedMessage,
    reset: () => {
      capturedMessage = undefined
    },
  }
}

// RENDERING

const renderView = <Model>(
  viewFn: (model: Model) => Html | Document,
  model: Model,
  dispatch: DispatchService,
): VNode => {
  const result = viewFn(model)
  const body = Effect.isEffect(result) ? result : result.body
  const maybeVNode = Effect.runSync(
    Effect.provideService(body, Dispatch, dispatch),
  )

  if (Predicate.isNull(maybeVNode)) {
    throw new Error(
      'The view function returned null.\n\n' +
        'Scene tests require a non-null view. ' +
        'If you need to test null-view states, use Story.story instead.',
    )
  }

  return maybeVNode
}

// INTERACTION HELPERS

const EVENT_NAMES: Record<string, string> = {
  click: 'OnClick',
  dblclick: 'OnDoubleClick',
  submit: 'OnSubmit',
  input: 'OnInput',
  change: 'OnChange',
  focus: 'OnFocus',
  blur: 'OnBlur',
  mouseenter: 'OnMouseEnter',
  mouseover: 'OnMouseOver',
  keydown: 'OnKeyDown or OnKeyDownPreventDefault',
  pointerdown: 'OnPointerDown',
  pointerup: 'OnPointerUp',
}

const captureFromElement = <Model, Message, OutMessage>(
  simulation: SceneSimulation<Model, Message, OutMessage>,
  element: VNode,
  description: string,
  eventName: string,
  invokeHandler: (handler: Function) => void,
): SceneSimulation<Model, Message, OutMessage> => {
  const internal = toInternal(simulation)
  const maybeHandler = Option.fromNullishOr(element.data?.on?.[eventName])

  if (Option.isNone(maybeHandler)) {
    const attributeName = EVENT_NAMES[eventName] ?? eventName
    throw new Error(
      `I found an element matching ${description} but it has no ${eventName} handler.\n\n` +
        `Make sure the element has an ${attributeName} attribute.`,
    )
  }

  internal.capturingDispatch.reset()
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  invokeHandler(maybeHandler.value as Function)
  const captured = internal.capturingDispatch.getCapturedMessage()

  if (Predicate.isUndefined(captured)) {
    return simulation
  }

  assertNoUnresolvedCommands(
    internal.commands,
    'when an interaction dispatched a new Message',
  )
  assertNoUnresolvedMounts(
    internal.mounts,
    'when an interaction dispatched a new Message',
  )
  assertNoUnacknowledgedUnmounts(
    unacknowledgedEndedMountsOf(internal.mountSlots),
    'when an interaction dispatched a new Message',
  )

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const capturedMessage = captured as unknown as Message
  const result = internal.updateFn(internal.model, capturedMessage)
  const [nextModel, commands] = result
  const outMessage = result.length === 3 ? result[2] : internal.outMessage

  return {
    ...internal,
    model: nextModel,
    message: capturedMessage,
    commands: Array.appendAll(internal.commands, commands),
    outMessage,
  } as unknown as SceneSimulation<Model, Message, OutMessage>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

const invokeAndCapture = <Model, Message, OutMessage>(
  simulation: SceneSimulation<Model, Message, OutMessage>,
  target: string | Locator,
  eventName: string,
  invokeHandler: (handler: Function) => void,
): SceneSimulation<Model, Message, OutMessage> => {
  const internal = toInternal(simulation)
  const scopedTarget = applyScopeToTarget(internal.scope, target)
  const { maybeElement, description } = resolveTarget(
    internal.html,
    scopedTarget,
  )

  if (Option.isNone(maybeElement)) {
    throw new Error(
      `I could not find an element matching ${description}.\n\n` +
        'Check that your selector matches an element in the current view.',
    )
  }

  return captureFromElement(
    simulation,
    maybeElement.value,
    description,
    eventName,
    invokeHandler,
  )
}

const lookupTypeAttribute = (vnode: VNode): string | undefined => {
  const fromAttrs = vnode.data?.attrs?.['type']
  const fromProps = vnode.data?.props?.['type']
  return typeof fromAttrs === 'string'
    ? fromAttrs
    : typeof fromProps === 'string'
      ? fromProps
      : undefined
}

const isSubmitButton = (element: VNode): boolean => {
  const type = lookupTypeAttribute(element)
  if (element.sel === 'button') {
    return type === undefined || type === 'submit'
  }
  if (element.sel === 'input') {
    return type === 'submit' || type === 'image'
  }
  return false
}

const isElementDisabled = (element: VNode): boolean => {
  const attrDisabled = element.data?.attrs?.['disabled']
  const propDisabled = element.data?.props?.['disabled']
  const ariaDisabled = element.data?.attrs?.['aria-disabled']
  return (
    attrDisabled === true ||
    attrDisabled === '' ||
    attrDisabled === 'disabled' ||
    propDisabled === true ||
    ariaDisabled === 'true' ||
    ariaDisabled === true
  )
}

const DEFAULT_KEYBOARD_MODIFIERS: KeyboardModifiers = {
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
}

const readFileHandlerTag = (handler: unknown): string | undefined => {
  if (typeof handler !== 'function') {
    return undefined
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const tag = (handler as unknown as Record<symbol, unknown>)[FileHandlerSymbol]
  return typeof tag === 'string' ? tag : undefined
}

const assertFileHandler = (
  handler: unknown,
  expectedTag: 'OnFileChange' | 'OnDropFiles',
  helperName: 'changeFiles' | 'dropFiles',
): void => {
  const tag = readFileHandlerTag(handler)
  if (tag === expectedTag) {
    return
  }

  const isFileChange = expectedTag === 'OnFileChange'
  const eventName = isFileChange ? 'change' : 'drop'
  const correctAttribute = isFileChange ? 'OnFileChange' : 'OnDropFiles'
  const wrongAttribute = isFileChange ? 'OnChange' : 'OnDrop'
  const alternativeHelper = isFileChange
    ? 'Use `Scene.change` for text inputs and selects.'
    : 'Remove `Scene.dropFiles` or add an `OnDropFiles` attribute to the drop zone.'

  throw new Error(
    `Scene.${helperName} requires the target element's ${eventName} handler to be ` +
      `registered via ${correctAttribute}, but it appears to use ${wrongAttribute} instead. ` +
      `${correctAttribute} decodes files from the event; ${wrongAttribute} does not. ` +
      `${alternativeHelper}`,
  )
}

// STEPS

/** Sets the initial Model for a scene test. */
export { with_ as with }
const with_ = <Model>(model: Model): WithStep<Model> => {
  const step = <M, Message, OutMessage = undefined>(
    simulation: SceneSimulation<M, Message, OutMessage>,
  ): SceneSimulation<M, Message, OutMessage> => {
    const internal = toInternal(simulation)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...internal, model } as unknown as SceneSimulation<
      M,
      Message,
      OutMessage
    >
  }
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  return Object.assign(step, {
    _phantomModel: undefined as unknown as Model,
  }) as WithStep<Model>
  /* eslint-enable @typescript-eslint/consistent-type-assertions */
}

/** Resolves a pending Command with the given result Message. Accepts either
 *  a Command Definition (matches by name; any pending Command of that name)
 *  or a Command instance (matches by name AND args; strict). */
const resolveCommand: {
  <Name extends string, ResultMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  <Name extends string, ResultMessage, ParentMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage: (message: ResultMessage) => ParentMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  <ResultMessage>(
    instance: SceneCommandInstance<ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  <ResultMessage, ParentMessage>(
    instance: SceneCommandInstance<ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage: (message: ResultMessage) => ParentMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} =
  <ResultMessage>(
    matcher: CommandMatcher,
    resultMessage: ResultMessage,
    toParentMessage?: (message: ResultMessage) => unknown,
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const internal = toInternal(simulation)
    const messageForUpdate = (Predicate.isUndefined(toParentMessage)
      ? resultMessage
      : toParentMessage(resultMessage)) as unknown as Message
    const next = resolveByMatcher(
      internal as BaseInternal<Model, Message, unknown>,
      matcher,
      messageForUpdate,
    )

    if (Predicate.isUndefined(next)) {
      const pending = Array.match(internal.commands, {
        onEmpty: () => '    (none)',
        onNonEmpty: nonEmpty =>
          pipe(
            nonEmpty,
            Array.map(command => `    ${formatCommand(command)}`),
            Array.join('\n'),
          ),
      })
      throw new Error(
        `I tried to resolve "${formatMatcher(matcher)}" but no matching pending Command was found.\n\n` +
          `Pending Commands:\n${pending}\n\n` +
          'Make sure the previous Message produced this Command.',
      )
    }

    return next as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
const resolveAllCommands =
  <R extends ReadonlyArray<unknown>>(
    ...resolvers: { [K in keyof R]: Resolver<R[K]> }
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    resolveAllInternal(
      toInternal(simulation),
      resolvers,
    ) as unknown as SceneSimulation<Model, Message, OutMessage>

/** Asserts that every given matcher matches a pending Command. Definition
 *  matchers match by name only; Instance matchers match by name + args. */
const expectHasCommandsStep =
  (...matchers: ReadonlyArray<CommandMatcher>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    assertHasCommands(toInternal(simulation).commands, matchers)
    return simulation
  }

/** Asserts that the pending Commands match the given matchers exactly
 *  (order-independent). Definition matchers compare by name; Instance
 *  matchers compare by name + args. */
const expectExactCommandsStep =
  (...matchers: ReadonlyArray<CommandMatcher>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    assertExactCommands(toInternal(simulation).commands, matchers)
    return simulation
  }

/** Asserts that there are no pending Commands. */
const expectNoCommandsStep =
  () =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    assertZeroCommands(toInternal(simulation).commands)
    return simulation
  }

/** Resolves a specific pending Mount with the given result Message. The first
 *  pending mount with the matching name is resolved. Mirrors `resolve` for
 *  Commands; the optional `toParentMessage` lifter matches `Mount.mapMessage`
 *  when a child Submodel mount is observed in a parent's view. */
const resolveMount: {
  <Name extends string, ResultMessage>(
    definition: MountDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  <Name extends string, ResultMessage, ParentMessage>(
    definition: MountDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage: (message: ResultMessage) => ParentMessage,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} =
  <Name extends string, ResultMessage>(
    definition: MountDefinition<Name, ResultMessage>,
    resultMessage: ResultMessage,
    toParentMessage?: (message: ResultMessage) => unknown,
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const internal = toInternal(simulation)
    const messageForUpdate = (Predicate.isUndefined(toParentMessage)
      ? resultMessage
      : toParentMessage(resultMessage)) as unknown as Message
    const next = resolveMountByName(
      internal as BaseInternal<Model, Message, unknown>,
      internal.mounts,
      definition.name,
      messageForUpdate,
    )

    if (Predicate.isUndefined(next)) {
      throw new Error(
        `I tried to resolve Mount "${definition.name}" but it wasn't in the pending Mounts.\n\n` +
          `Pending Mounts:\n${
            Array.isReadonlyArrayNonEmpty(internal.mounts)
              ? pipe(
                  internal.mounts,
                  Array.map(({ name }) => `    ${name}`),
                  Array.join('\n'),
                )
              : '    (none)'
          }\n\n` +
          'Make sure the rendered view contains an OnMount with this name.',
      )
    }

    const resolvedKeys = new Set(
      Array.map(next.pendingMounts, slot => slotKey(slot)),
    )
    const updatedSlots = Array.map(
      internal.mountSlots,
      (state): MountSlotState => {
        if (state.status._tag !== 'Pending') {
          return state
        }
        const key = slotKey(state.slot)
        return resolvedKeys.has(key)
          ? state
          : state.slot.name === definition.name
            ? { slot: state.slot, status: RESOLVED }
            : state
      },
    )

    return {
      ...next.internal,
      mountSlots: updatedSlots,
      mounts: next.pendingMounts,
    } as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Resolves all listed Mounts with their result Messages. Mounts are resolved
 *  in the order listed; each resolution feeds its Message through update
 *  before the next is resolved. */
const resolveAllMounts =
  <R extends ReadonlyArray<unknown>>(
    ...resolvers: { [K in keyof R]: MountResolver<R[K]> }
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    Array.reduce(resolvers, simulation, (current, resolver) => {
      const [definition, resultMessage] = resolver
      const lift =
        resolver.length === 3
          ? /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            (resolver[2] as (message: unknown) => unknown)
          : undefined
      return Predicate.isUndefined(lift)
        ? resolveMount(definition, resultMessage)(current)
        : resolveMount(definition, resultMessage, lift)(current)
    })

/** Asserts that every given Mount is among the pending Mounts. */
const expectHasMountsStep =
  (...definitions: ReadonlyArray<MountDefinition<string, unknown>>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    assertHasMounts(toInternal(simulation).mounts, definitions)
    return simulation
  }

/** Asserts that the pending Mounts match the given definitions exactly
 *  (order-independent, by name). */
const expectExactMountsStep =
  (...definitions: ReadonlyArray<MountDefinition<string, unknown>>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    assertExactMounts(toInternal(simulation).mounts, definitions)
    return simulation
  }

/** Asserts that there are no pending Mounts. */
const expectNoMountsStep =
  () =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    assertZeroMounts(toInternal(simulation).mounts)
    return simulation
  }

/** Acknowledges that the given Mounts disappeared from the rendered tree.
 *  Required for every Mount that fires and then unmounts during a scene,
 *  whether or not it was resolved first. Without this, the scene throws at
 *  the end of the test for any unacknowledged unmount. */
const expectEndedMountsStep =
  (...definitions: ReadonlyArray<MountDefinition<string, unknown>>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const internal = toInternal(simulation)
    const remainingNames = Array.map(definitions, ({ name }) => name)
    const updatedSlots: Array<MountSlotState> = []
    for (const state of internal.mountSlots) {
      if (
        state.status._tag === 'Ended' &&
        !state.status.acknowledged &&
        remainingNames.includes(state.slot.name)
      ) {
        const index = remainingNames.indexOf(state.slot.name)
        remainingNames.splice(index, 1)
        updatedSlots.push({ slot: state.slot, status: ENDED_ACKNOWLEDGED })
      } else {
        updatedSlots.push(state)
      }
    }
    if (Array.isReadonlyArrayNonEmpty(remainingNames)) {
      throw new Error(
        `I tried to acknowledge ended Mounts but some haven't unmounted:\n\n` +
          pipe(
            remainingNames,
            Array.map(name => `    ${name}`),
            Array.join('\n'),
          ) +
          '\n\nUse Scene.Mount.expectEnded only after the Mount has disappeared from the rendered tree.',
      )
    }
    return {
      ...internal,
      mountSlots: updatedSlots,
    } as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Steps that operate on the pending Commands of a scene simulation.
 *  Destructure as `const { Command } = Scene` for concise call sites. */
export const Command = {
  /** Resolves a specific pending Command with the given result Message. */
  resolve: resolveCommand,
  /** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
  resolveAll: resolveAllCommands,
  /** Asserts that every given Command is among the pending Commands. */
  expectHas: expectHasCommandsStep,
  /** Asserts that the pending Commands match the given definitions exactly (order-independent). */
  expectExact: expectExactCommandsStep,
  /** Asserts that there are no pending Commands. */
  expectNone: expectNoCommandsStep,
} as const

/** Steps that operate on the pending Mounts of a scene simulation.
 *  Destructure as `const { Mount } = Scene` for concise call sites. */
export const Mount = {
  /** Resolves a specific pending Mount with the given result Message. */
  resolve: resolveMount,
  /** Resolves all listed Mounts with their result Messages. */
  resolveAll: resolveAllMounts,
  /** Asserts that every given Mount is among the pending Mounts. */
  expectHas: expectHasMountsStep,
  /** Asserts that the pending Mounts match the given definitions exactly (order-independent, by name). */
  expectExact: expectExactMountsStep,
  /** Asserts that there are no pending Mounts. */
  expectNone: expectNoMountsStep,
  /** Acknowledges Mounts that disappeared from the rendered tree. Required for
   *  every Mount that fires and then unmounts during a scene. */
  expectEnded: expectEndedMountsStep,
} as const

/** Runs a function for side effects (e.g. assertions) without breaking the step chain. */
export const tap =
  <Model, Message, OutMessage = undefined>(
    f: (simulation: SceneSimulation<Model, Message, OutMessage>) => void,
  ) =>
  (
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    f(simulation)
    return simulation
  }

const runSteps = <Model, Message, OutMessage>(
  seed: SceneSimulation<Model, Message, OutMessage>,
  steps: ReadonlyArray<SceneStep<Model, Message, OutMessage>>,
): SceneSimulation<Model, Message, OutMessage> =>
  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  Array.reduce(steps, seed, (current, step) => {
    const next = (
      step as (
        simulation: SceneSimulation<Model, Message, OutMessage>,
      ) => SceneSimulation<Model, Message, OutMessage>
    )(current)

    const internal = toInternal(next)

    if ((internal.model as unknown) !== (UNINITIALIZED as unknown)) {
      const html = renderView(
        internal.viewFn,
        internal.model,
        internal.capturingDispatch.dispatch,
      )
      const mountSlots = reconcileMountSlots(internal.mountSlots, html)
      const mounts = pendingMountsOf(mountSlots)
      return { ...internal, html, mountSlots, mounts } as SceneSimulation<
        Model,
        Message,
        OutMessage
      >
    }

    return next
  })
/* eslint-enable @typescript-eslint/consistent-type-assertions */

/** Scopes a sequence of steps to a parent element. Every Locator referenced by
 *  child steps — assertions, interactions — resolves within the parent's subtree.
 *  Use this when several steps share the same scope. For a single scoped query,
 *  prefer `within(parent, child)` directly. Nested `inside` calls compose scopes
 *  via `within(outer, inner)`. */
export const inside =
  <Model, Message, OutMessage = undefined>(
    parent: Locator,
    ...steps: ReadonlyArray<NoInfer<SceneStep<Model, Message, OutMessage>>>
  ) =>
  (
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const priorScope = internal.scope
    const nextScope = Option.match(priorScope, {
      onNone: () => parent,
      onSome: within(parent),
    })
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    const scopedEntry = {
      ...internal,
      scope: Option.some(nextScope),
    } as unknown as SceneSimulation<Model, Message, OutMessage>
    const afterSteps = runSteps(scopedEntry, steps)
    const afterInternal = toInternal(afterSteps)
    return {
      ...afterInternal,
      scope: priorScope,
    } as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

const findAncestorWithHandler = (
  root: VNode,
  element: VNode,
  eventName: string,
): Option.Option<VNode> =>
  pipe(
    root,
    ancestorsOf(element),
    Array.reverse,
    Array.findFirst(vnode => vnode.data?.on?.[eventName] !== undefined),
  )

// INTERACTION STEPS

/** Simulates a click on the element matching the target.
 *  When the element has no click handler, the event bubbles up to the
 *  nearest ancestor with one — mirroring browser event propagation.
 *  When the element is a submit button (`<button>` with no type or
 *  `type="submit"`, `<input type="submit">`, `<input type="image">`) with no
 *  click handler in its ancestor chain, the click falls through to the
 *  `submit` handler of the nearest ancestor `<form>`. */
export const click =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedTarget = applyScopeToTarget(internal.scope, target)
    const { maybeElement, description } = resolveTarget(
      internal.html,
      scopedTarget,
    )

    if (Option.isNone(maybeElement)) {
      throw new Error(
        `I could not find an element matching ${description}.\n\n` +
          'Check that your selector matches an element in the current view.',
      )
    }

    const element = maybeElement.value

    if (isElementDisabled(element)) {
      throw new Error(
        `I found an element matching ${description} but it is disabled.\n\n` +
          'Disabled elements do not receive click events in the browser. ' +
          'Assert the state that enables the element before clicking, or ' +
          'use Scene.expect(locator).not.toBeDisabled() to verify the ' +
          'element is interactive.',
      )
    }

    const hasClickHandler = element.data?.on?.['click'] !== undefined

    if (hasClickHandler) {
      return captureFromElement(
        simulation,
        element,
        description,
        'click',
        handler => {
          handler()
        },
      )
    }

    const maybeAncestor = findAncestorWithHandler(
      internal.html,
      element,
      'click',
    )

    if (Option.isSome(maybeAncestor)) {
      return captureFromElement(
        simulation,
        maybeAncestor.value,
        `ancestor of ${description}`,
        'click',
        handler => {
          handler()
        },
      )
    }

    if (isSubmitButton(element)) {
      const maybeForm = pipe(
        internal.html,
        ancestorsOf(element),
        Array.findLast(vnode => vnode.sel === 'form'),
      )
      if (Option.isSome(maybeForm)) {
        return captureFromElement(
          simulation,
          maybeForm.value,
          `form containing ${description}`,
          'submit',
          handler => {
            handler({ preventDefault: Function.constVoid })
          },
        )
      }
    }

    const attributeName = EVENT_NAMES['click'] ?? 'click'
    throw new Error(
      `I found an element matching ${description} but neither it nor any ancestor has a click handler.\n\n` +
        `Make sure the element or a parent has an ${attributeName} attribute.`,
    )
  }

/** Simulates a double-click on the element matching the target.
 *  When the element has no dblclick handler, the event bubbles up to the
 *  nearest ancestor with one — mirroring browser event propagation. */
export const doubleClick =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedTarget = applyScopeToTarget(internal.scope, target)
    const { maybeElement, description } = resolveTarget(
      internal.html,
      scopedTarget,
    )

    if (Option.isNone(maybeElement)) {
      throw new Error(
        `I could not find an element matching ${description}.\n\n` +
          'Check that your selector matches an element in the current view.',
      )
    }

    const element = maybeElement.value
    const hasHandler = element.data?.on?.['dblclick'] !== undefined

    if (hasHandler) {
      return captureFromElement(
        simulation,
        element,
        description,
        'dblclick',
        handler => {
          handler()
        },
      )
    }

    const maybeAncestor = findAncestorWithHandler(
      internal.html,
      element,
      'dblclick',
    )

    if (Option.isSome(maybeAncestor)) {
      return captureFromElement(
        simulation,
        maybeAncestor.value,
        `ancestor of ${description}`,
        'dblclick',
        handler => {
          handler()
        },
      )
    }

    const attributeName = EVENT_NAMES['dblclick'] ?? 'dblclick'
    throw new Error(
      `I found an element matching ${description} but neither it nor any ancestor has a dblclick handler.\n\n` +
        `Make sure the element or a parent has an ${attributeName} attribute.`,
    )
  }

type PointerDownOptions = Readonly<{
  pointerType?: string
  button?: number
  screenX?: number
  screenY?: number
  clientX?: number
  clientY?: number
}>

const DEFAULT_POINTER_DOWN_OPTIONS: Required<PointerDownOptions> = {
  pointerType: 'mouse',
  button: 0,
  screenX: 0,
  screenY: 0,
  clientX: 0,
  clientY: 0,
}

/** Simulates a pointerdown event on the element matching the target.
 *  When the element has no pointerdown handler, the event bubbles up to
 *  the nearest ancestor with one — mirroring browser event propagation.
 *  Defaults to `pointerType: 'mouse'`, `button: 0`, and `screenX/screenY: 0`. */
export const pointerDown =
  (target: string | Locator, options?: PointerDownOptions) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedTarget = applyScopeToTarget(internal.scope, target)
    const { maybeElement, description } = resolveTarget(
      internal.html,
      scopedTarget,
    )

    if (Option.isNone(maybeElement)) {
      throw new Error(
        `I could not find an element matching ${description}.\n\n` +
          'Check that your selector matches an element in the current view.',
      )
    }

    const element = maybeElement.value
    const { pointerType, button, screenX, screenY, clientX, clientY } = {
      ...DEFAULT_POINTER_DOWN_OPTIONS,
      ...options,
    }
    const invokeHandler = (handler: Function) => {
      handler({
        pointerType,
        button,
        screenX,
        screenY,
        timeStamp: 0,
        clientX,
        clientY,
      })
    }

    if (element.data?.on?.['pointerdown'] !== undefined) {
      return captureFromElement(
        simulation,
        element,
        description,
        'pointerdown',
        invokeHandler,
      )
    }

    const maybeAncestor = findAncestorWithHandler(
      internal.html,
      element,
      'pointerdown',
    )

    if (Option.isSome(maybeAncestor)) {
      return captureFromElement(
        simulation,
        maybeAncestor.value,
        `ancestor of ${description}`,
        'pointerdown',
        invokeHandler,
      )
    }

    throw new Error(
      `I found an element matching ${description} but neither it nor any ancestor has a pointerdown handler.\n\n` +
        'Make sure the element or a parent has an OnPointerDown attribute.',
    )
  }

type PointerUpOptions = Readonly<{
  pointerType?: string
  screenX?: number
  screenY?: number
}>

const DEFAULT_POINTER_UP_OPTIONS: Required<PointerUpOptions> = {
  pointerType: 'mouse',
  screenX: 0,
  screenY: 0,
}

/** Simulates a pointerup event on the element matching the target.
 *  When the element has no pointerup handler, the event bubbles up to
 *  the nearest ancestor with one — mirroring browser event propagation.
 *  Defaults to `pointerType: 'mouse'` and `screenX/screenY: 0`. */
export const pointerUp =
  (target: string | Locator, options?: PointerUpOptions) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedTarget = applyScopeToTarget(internal.scope, target)
    const { maybeElement, description } = resolveTarget(
      internal.html,
      scopedTarget,
    )

    if (Option.isNone(maybeElement)) {
      throw new Error(
        `I could not find an element matching ${description}.\n\n` +
          'Check that your selector matches an element in the current view.',
      )
    }

    const element = maybeElement.value
    const { pointerType, screenX, screenY } = {
      ...DEFAULT_POINTER_UP_OPTIONS,
      ...options,
    }
    const invokeHandler = (handler: Function) => {
      handler({ screenX, screenY, pointerType, timeStamp: 0 })
    }

    if (element.data?.on?.['pointerup'] !== undefined) {
      return captureFromElement(
        simulation,
        element,
        description,
        'pointerup',
        invokeHandler,
      )
    }

    const maybeAncestor = findAncestorWithHandler(
      internal.html,
      element,
      'pointerup',
    )

    if (Option.isSome(maybeAncestor)) {
      return captureFromElement(
        simulation,
        maybeAncestor.value,
        `ancestor of ${description}`,
        'pointerup',
        invokeHandler,
      )
    }

    throw new Error(
      `I found an element matching ${description} but neither it nor any ancestor has a pointerup handler.\n\n` +
        'Make sure the element or a parent has an OnPointerUp attribute.',
    )
  }

/** Simulates a hover (mouseenter) on the element matching the target.
 *  Dispatches the `mouseenter` handler, falling back to `mouseover`. */
export const hover =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedTarget = applyScopeToTarget(internal.scope, target)
    const { maybeElement } = resolveTarget(internal.html, scopedTarget)
    const eventName = Option.match(maybeElement, {
      onNone: () => 'mouseenter',
      onSome: element =>
        element.data?.on?.['mouseenter'] ? 'mouseenter' : 'mouseover',
    })
    return invokeAndCapture(simulation, target, eventName, handler => {
      handler()
    })
  }

/** Simulates a focus event on the element matching the target. */
export const focus =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    invokeAndCapture(simulation, target, 'focus', handler => {
      handler()
    })

/** Simulates a blur event on the element matching the target. */
export const blur =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    invokeAndCapture(simulation, target, 'blur', handler => {
      handler()
    })

/** Simulates a change event on the element matching the target.
 *  Dual: `change(target, value)` or `change(value)` for data-last piping. */
export const change: {
  (
    target: string | Locator,
    value: string,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    value: string,
  ): (
    target: string | Locator,
  ) => <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} = dual(
  2,
  (target: string | Locator, value: string) =>
    <Model, Message, OutMessage = undefined>(
      simulation: SceneSimulation<Model, Message, OutMessage>,
    ): SceneSimulation<Model, Message, OutMessage> =>
      invokeAndCapture(simulation, target, 'change', handler => {
        handler({ target: { value } })
      }),
)

/** Simulates a file input change event on the element matching the target.
 *  For use with `OnFileChange` attributes. The handler receives a synthetic
 *  event with `target.files` set to the provided files array.
 *  Dual: `changeFiles(target, files)` or `changeFiles(files)` for data-last piping. */
export const changeFiles: {
  (
    target: string | Locator,
    files: ReadonlyArray<File>,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    files: ReadonlyArray<File>,
  ): (
    target: string | Locator,
  ) => <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} = dual(
  2,
  (target: string | Locator, files: ReadonlyArray<File>) =>
    <Model, Message, OutMessage = undefined>(
      simulation: SceneSimulation<Model, Message, OutMessage>,
    ): SceneSimulation<Model, Message, OutMessage> =>
      invokeAndCapture(simulation, target, 'change', handler => {
        assertFileHandler(handler, 'OnFileChange', 'changeFiles')
        handler({ target: { files, value: '' } })
      }),
)

/** Simulates a drop event with files on the element matching the target.
 *  For use with `OnDropFiles` attributes. The handler receives a synthetic
 *  event with `dataTransfer.files` set to the provided files array and a
 *  no-op `preventDefault`.
 *  Dual: `dropFiles(target, files)` or `dropFiles(files)` for data-last piping. */
export const dropFiles: {
  (
    target: string | Locator,
    files: ReadonlyArray<File>,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    files: ReadonlyArray<File>,
  ): (
    target: string | Locator,
  ) => <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} = dual(
  2,
  (target: string | Locator, files: ReadonlyArray<File>) =>
    <Model, Message, OutMessage = undefined>(
      simulation: SceneSimulation<Model, Message, OutMessage>,
    ): SceneSimulation<Model, Message, OutMessage> =>
      invokeAndCapture(simulation, target, 'drop', handler => {
        assertFileHandler(handler, 'OnDropFiles', 'dropFiles')
        handler({
          preventDefault: Function.constVoid,
          dataTransfer: { files },
        })
      }),
)

/** Simulates form submission on the element matching the target. */
export const submit =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    invokeAndCapture(simulation, target, 'submit', handler => {
      handler({ preventDefault: Function.constVoid })
    })

/** Simulates typing a value into the input matching the target.
 *  Dual: `type(target, value)` or `type(value)` for data-last piping. */
export { type_ as type }
const type_: {
  (
    target: string | Locator,
    value: string,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    value: string,
  ): (
    target: string | Locator,
  ) => <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} = dual(
  2,
  (target: string | Locator, value: string) =>
    <Model, Message, OutMessage = undefined>(
      simulation: SceneSimulation<Model, Message, OutMessage>,
    ): SceneSimulation<Model, Message, OutMessage> =>
      invokeAndCapture(simulation, target, 'input', handler => {
        handler({ target: { value } })
      }),
)

/** Simulates a keydown event on the element matching the target.
 *  Dual: `keydown(target, key, modifiers?)` or `keydown(key, modifiers?)` for data-last piping. */
export const keydown: {
  (
    target: string | Locator,
    key: string,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    target: string | Locator,
    key: string,
    modifiers: Partial<KeyboardModifiers>,
  ): <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    key: string,
  ): (
    target: string | Locator,
  ) => <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
  (
    key: string,
    modifiers: Partial<KeyboardModifiers>,
  ): (
    target: string | Locator,
  ) => <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ) => SceneSimulation<Model, Message, OutMessage>
} = dual(
  (args: IArguments) => args.length >= 2 && typeof args[1] === 'string',
  (
    target: string | Locator,
    key: string,
    modifiers?: Partial<KeyboardModifiers>,
  ) =>
    <Model, Message, OutMessage = undefined>(
      simulation: SceneSimulation<Model, Message, OutMessage>,
    ): SceneSimulation<Model, Message, OutMessage> =>
      invokeAndCapture(simulation, target, 'keydown', handler => {
        handler({
          key,
          ...DEFAULT_KEYBOARD_MODIFIERS,
          ...modifiers,
          preventDefault: Function.constVoid,
        })
      }),
)

// ASSERTION STEPS

type SceneAssertion = (
  maybeElement: Option.Option<VNode>,
  description: string,
  isNot: boolean,
  root: VNode,
) => void

const wrapAssertion =
  (locator: Locator, assertion: SceneAssertion, isNot: boolean) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedLocator = applyScopeToLocator(internal.scope, locator)
    assertion(
      scopedLocator(internal.html),
      scopedLocator.description,
      isNot,
      internal.html,
    )
    return simulation
  }

const assertOnElement =
  (
    check: (
      vnode: VNode,
      root: VNode,
    ) => Readonly<{ pass: boolean; actual: string }>,
    expectation: string,
  ): SceneAssertion =>
  (maybeElement, description, isNot, root) => {
    if (Option.isNone(maybeElement)) {
      if (!isNot) {
        throw new Error(
          `Expected element matching ${description} to ${expectation} but the element does not exist.`,
        )
      }
      return
    }
    const { pass, actual } = check(maybeElement.value, root)
    if (isNot ? pass : !pass) {
      throw new Error(
        isNot
          ? `Expected element matching ${description} not to ${expectation} but it does.`
          : `Expected element matching ${description} to ${expectation} but ${actual}.`,
      )
    }
  }

const assertExists: SceneAssertion = (maybeElement, description, isNot) => {
  const exists = Option.isSome(maybeElement)
  if (isNot ? exists : !exists) {
    throw new Error(
      isNot
        ? `Expected element matching ${description} not to exist but it does.`
        : `Expected element matching ${description} to exist but it does not.`,
    )
  }
}

const assertAbsent: SceneAssertion = (maybeElement, description, isNot) => {
  const absent = Option.isNone(maybeElement)
  if (isNot ? absent : !absent) {
    throw new Error(
      isNot
        ? `Expected element matching ${description} not to be absent but it is.`
        : `Expected element matching ${description} to be absent but it exists.`,
    )
  }
}

const describeExpected = (expected: string | RegExp): string =>
  expected instanceof RegExp ? `${expected}` : `"${expected}"`

const textMatches = (value: string, expected: string | RegExp): boolean =>
  expected instanceof RegExp ? expected.test(value) : value === expected

const textIncludes = (value: string, expected: string | RegExp): boolean =>
  expected instanceof RegExp ? expected.test(value) : value.includes(expected)

const assertHasText = (expected: string | RegExp): SceneAssertion =>
  assertOnElement(
    vnode => ({
      pass: textMatches(textContent(vnode), expected),
      actual: `received "${textContent(vnode)}"`,
    }),
    `have text ${describeExpected(expected)}`,
  )

const assertContainsText = (expected: string | RegExp): SceneAssertion =>
  assertOnElement(
    vnode => ({
      pass: textIncludes(textContent(vnode), expected),
      actual: `received "${textContent(vnode)}"`,
    }),
    `contain text ${describeExpected(expected)}`,
  )

const assertHasAttr = (
  name: string,
  value: string | undefined,
): SceneAssertion =>
  assertOnElement(
    vnode => {
      const actualValue = attr(vnode, name)
      if (Predicate.isUndefined(value)) {
        return {
          pass: Option.isSome(actualValue),
          actual: 'the attribute is not present',
        }
      }
      return Option.match(actualValue, {
        onNone: () => ({
          pass: false,
          actual: 'the attribute is not present',
        }),
        onSome: actual => ({
          pass: actual === value,
          actual: `received "${actual}"`,
        }),
      })
    },
    Predicate.isUndefined(value)
      ? `have attribute "${name}"`
      : `have attribute ${name}="${value}"`,
  )

const assertHasClass = (expected: string): SceneAssertion =>
  assertOnElement(
    vnode => ({
      pass: vnode.data?.class?.[expected] === true,
      actual: 'it does not',
    }),
    `have class "${expected}"`,
  )

const assertHasStyle = (
  name: string,
  value: string | undefined,
): SceneAssertion =>
  assertOnElement(
    vnode => {
      const maybeActualValue = Option.fromNullishOr(vnode.data?.style?.[name])
      if (Predicate.isUndefined(value)) {
        return {
          pass: Option.isSome(maybeActualValue),
          actual: 'it is not present',
        }
      }
      return Option.match(maybeActualValue, {
        onNone: () => ({ pass: false, actual: 'it is not present' }),
        onSome: actualValue => ({
          pass: String(actualValue) === value,
          actual: `received "${actualValue}"`,
        }),
      })
    },
    Predicate.isUndefined(value)
      ? `have style "${name}"`
      : `have style ${name}="${value}"`,
  )

const assertHasHook = (name: string): SceneAssertion =>
  assertOnElement(vnode => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const hooks = vnode.data?.hook as Record<string, unknown> | undefined
    return {
      pass: typeof hooks?.[name] === 'function',
      actual: 'it is not present',
    }
  }, `have hook "${name}"`)

const assertHasHandler = (name: string): SceneAssertion =>
  assertOnElement(
    vnode => ({
      pass: vnode.data?.on?.[name] !== undefined,
      actual: 'it is not present',
    }),
    `have handler "${name}"`,
  )

const assertHasValue = (expected: string): SceneAssertion =>
  assertOnElement(vnode => {
    const actualValue = attr(vnode, 'value')
    return Option.match(actualValue, {
      onNone: () => ({
        pass: false,
        actual: 'the element has no value',
      }),
      onSome: actual => ({
        pass: actual === expected,
        actual: `received "${actual}"`,
      }),
    })
  }, `have value "${expected}"`)

const isDisabled = (vnode: VNode): boolean => {
  const disabled = attr(vnode, 'disabled')
  if (Option.isSome(disabled) && disabled.value !== 'false') {
    return true
  }
  const ariaDisabled = attr(vnode, 'aria-disabled')
  return Option.isSome(ariaDisabled) && ariaDisabled.value === 'true'
}

const assertIsDisabled: SceneAssertion = assertOnElement(
  vnode => ({
    pass: isDisabled(vnode),
    actual: 'it is not disabled',
  }),
  'be disabled',
)

const assertIsEnabled: SceneAssertion = assertOnElement(
  vnode => ({
    pass: !isDisabled(vnode),
    actual: 'it is disabled',
  }),
  'be enabled',
)

const assertIsChecked: SceneAssertion = assertOnElement(vnode => {
  const checked = attr(vnode, 'checked')
  const ariaChecked = attr(vnode, 'aria-checked')
  const pass =
    (Option.isSome(checked) && checked.value !== 'false') ||
    (Option.isSome(ariaChecked) && ariaChecked.value === 'true')
  return { pass, actual: 'it is not checked' }
}, 'be checked')

const isHidden = (vnode: VNode): boolean => {
  const hiddenAttr = attr(vnode, 'hidden')
  if (Option.isSome(hiddenAttr) && hiddenAttr.value !== 'false') return true
  const ariaHidden = attr(vnode, 'aria-hidden')
  if (Option.isSome(ariaHidden) && ariaHidden.value === 'true') return true
  const display = vnode.data?.style?.['display']
  if (display === 'none') return true
  const visibility = vnode.data?.style?.['visibility']
  if (visibility === 'hidden') return true
  return false
}

const assertIsVisible: SceneAssertion = assertOnElement(
  vnode => ({ pass: !isHidden(vnode), actual: 'it is hidden' }),
  'be visible',
)

const assertHasAccessibleName = (expected: string | RegExp): SceneAssertion =>
  assertOnElement(
    (vnode, root) => {
      const actual = accessibleName(root)(vnode)
      return {
        pass: textMatches(actual, expected),
        actual: `received "${actual}"`,
      }
    },
    `have accessible name ${describeExpected(expected)}`,
  )

const assertHasAccessibleDescription = (
  expected: string | RegExp,
): SceneAssertion =>
  assertOnElement(
    (vnode, root) => {
      const actual = accessibleDescription(root)(vnode)
      return {
        pass: textMatches(actual, expected),
        actual: `received "${actual}"`,
      }
    },
    `have accessible description ${describeExpected(expected)}`,
  )

const assertIsEmpty: SceneAssertion = assertOnElement(vnode => {
  const childCount = (vnode.children ?? []).length
  const text = textContent(vnode)
  return {
    pass: String_.isEmpty(text) && childCount === 0,
    actual: String_.isNonEmpty(text)
      ? `received text "${text}"`
      : `received ${childCount} child(ren)`,
  }
}, 'be empty')

const assertHasId = (expected: string): SceneAssertion =>
  assertOnElement(vnode => {
    const actualId = attr(vnode, 'id')
    return Option.match(actualId, {
      onNone: () => ({ pass: false, actual: 'the element has no id' }),
      onSome: actual => ({
        pass: actual === expected,
        actual: `received "${actual}"`,
      }),
    })
  }, `have id "${expected}"`)

const buildExpectChain = (locator: Locator, isNot: boolean) => ({
  toExist: () => wrapAssertion(locator, assertExists, isNot),
  toBeAbsent: () => wrapAssertion(locator, assertAbsent, isNot),
  toHaveText: (expected: string | RegExp) =>
    wrapAssertion(locator, assertHasText(expected), isNot),
  toContainText: (expected: string | RegExp) =>
    wrapAssertion(locator, assertContainsText(expected), isNot),
  toHaveAttr: (name: string, value?: string) =>
    wrapAssertion(locator, assertHasAttr(name, value), isNot),
  toHaveClass: (expected: string) =>
    wrapAssertion(locator, assertHasClass(expected), isNot),
  toHaveStyle: (name: string, value?: string) =>
    wrapAssertion(locator, assertHasStyle(name, value), isNot),
  toHaveHook: (name: string) =>
    wrapAssertion(locator, assertHasHook(name), isNot),
  toHaveHandler: (name: string) =>
    wrapAssertion(locator, assertHasHandler(name), isNot),
  toHaveValue: (expected: string) =>
    wrapAssertion(locator, assertHasValue(expected), isNot),
  toBeDisabled: () => wrapAssertion(locator, assertIsDisabled, isNot),
  toBeEnabled: () => wrapAssertion(locator, assertIsEnabled, isNot),
  toBeEmpty: () => wrapAssertion(locator, assertIsEmpty, isNot),
  toBeVisible: () => wrapAssertion(locator, assertIsVisible, isNot),
  toHaveId: (expected: string) =>
    wrapAssertion(locator, assertHasId(expected), isNot),
  toHaveAccessibleName: (expected: string | RegExp) =>
    wrapAssertion(locator, assertHasAccessibleName(expected), isNot),
  toHaveAccessibleDescription: (expected: string | RegExp) =>
    wrapAssertion(locator, assertHasAccessibleDescription(expected), isNot),
  toBeChecked: () => wrapAssertion(locator, assertIsChecked, isNot),
})

/** Creates an inline assertion step. Resolves the Locator against
 *  the current view and asserts on the result. */
export { expect_ as expect }
const expect_ = (locator: Locator) => ({
  ...buildExpectChain(locator, false),
  not: buildExpectChain(locator, true),
})

// LOCATOR-ALL ASSERTIONS

const wrapAllAssertion =
  (
    locatorAll: LocatorAll,
    assertion: (
      matches: ReadonlyArray<VNode>,
      description: string,
      isNot: boolean,
    ) => void,
    isNot: boolean,
  ) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const scopedLocatorAll = applyScopeToLocatorAll(internal.scope, locatorAll)
    assertion(
      scopedLocatorAll(internal.html),
      scopedLocatorAll.description,
      isNot,
    )
    return simulation
  }

const assertCount =
  (expected: number) =>
  (
    matches: ReadonlyArray<VNode>,
    description: string,
    isNot: boolean,
  ): void => {
    const actual = matches.length
    const pass = actual === expected
    if (isNot ? pass : !pass) {
      throw new Error(
        isNot
          ? `Expected elements matching ${description} not to have count ${expected} but they do.`
          : `Expected elements matching ${description} to have count ${expected} but received ${actual}.`,
      )
    }
  }

const buildExpectAllChain = (locatorAll: LocatorAll, isNot: boolean) => ({
  toHaveCount: (expected: number) =>
    wrapAllAssertion(locatorAll, assertCount(expected), isNot),
  toBeEmpty: () => wrapAllAssertion(locatorAll, assertCount(0), isNot),
})

/** Creates an inline multi-match assertion step. Use for count-based
 *  assertions like `toHaveCount(n)` or `toBeEmpty()`. */
export const expectAll = (locatorAll: LocatorAll) => ({
  ...buildExpectAllChain(locatorAll, false),
  not: buildExpectAllChain(locatorAll, true),
})

// SCENE

/** Executes a scene test. Throws if any Commands remain unresolved. */
export const scene: {
  <Model, Message, OutMessage>(
    config: Readonly<{
      update: (
        model: Model,
        message: Message,
      ) => readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]
      view: (model: Model) => Html | Document
    }>,
    ...steps: ReadonlyArray<SceneStep<Model, Message, OutMessage>>
  ): void
  <Model, Message>(
    config: Readonly<{
      update: (
        model: Model,
        message: Message,
      ) => readonly [Model, ReadonlyArray<AnyCommand>]
      view: (model: Model) => Html | Document
    }>,
    ...steps: ReadonlyArray<SceneStep<Model, Message, undefined>>
  ): void
} = <Model, Message, OutMessage = undefined>(
  config: Readonly<{
    update: (model: Model, message: Message) => UpdateResult<Model, OutMessage>
    view: (model: Model) => Html | Document
  }>,
  ...steps: ReadonlyArray<SceneStep<Model, Message, OutMessage>>
): void => {
  const capturingDispatch = createCapturingDispatch()

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const seed = {
    model: UNINITIALIZED as unknown,
    message: undefined,
    commands: [],
    mounts: [],
    mountSlots: [],
    outMessage: undefined as unknown,
    updateFn: config.update,
    resolvers: [],
    html: undefined as unknown,
    viewFn: config.view,
    capturingDispatch,
    scope: Option.none(),
  } as unknown as SceneSimulation<Model, Message, OutMessage>

  const result = runSteps(seed, steps)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internal = toInternal(result)
  assertAllCommandsResolved(internal.commands)
  assertAllMountsResolved(internal.mounts)
  assertAllUnmountsAcknowledged(
    unacknowledgedEndedMountsOf(internal.mountSlots),
  )
}
