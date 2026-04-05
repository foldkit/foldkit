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

import type { CommandDefinition } from '../command'
import type { Html, KeyboardModifiers } from '../html'
import { Dispatch } from '../runtime'
import type { VNode } from '../vdom'
import type { AnyCommand, BaseInternal, ResolverPair } from './internal'
import {
  assertAllCommandsResolved,
  assertNoUnresolvedCommands,
  resolveByName,
} from './internal'
import type { Locator, LocatorAll } from './query'
import {
  accessibleDescription,
  accessibleName,
  attr,
  resolveTarget,
  selector,
  textContent,
  within,
} from './query'
import {
  allAltText,
  allDisplayValue,
  allPlaceholder,
  allRole,
  allSelector,
  allTestId,
  allText,
  allTitle,
} from './query'

export type { AnyCommand, ResolverPair }

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
  getAllByPlaceholder,
  getAllByAltText,
  getAllByTitle,
  getAllByTestId,
  getAllByDisplayValue,
  first,
  last,
  nth,
  filter,
} from './query'
export type { Locator, LocatorAll } from './query'

/** Multi-match Locator factories. Each returns a `LocatorAll` that resolves
 *  to every matching VNode. Convert to a single `Locator` via `first`,
 *  `last`, or `nth(n)`, or narrow via `filter`. */
export const all = {
  role: allRole,
  text: allText,
  placeholder: allPlaceholder,
  altText: allAltText,
  title: allTitle,
  testId: allTestId,
  displayValue: allDisplayValue,
  selector: allSelector,
} as const
export { sceneMatchers } from './matchers'

/** An immutable test simulation that includes the rendered VNode tree.
 *  The Model and Message are intentionally opaque — Scene tests assert
 *  through the view, not the model. Use Story for model-level assertions. */
export type SceneSimulation<Model, Message, OutMessage = undefined> = Readonly<{
  /** @internal Phantom type — preserves Model and Message for step chain inference. */
  _phantom: [Model, Message]
  commands: ReadonlyArray<AnyCommand>
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
    resolvers: Record<string, Message>
    viewFn: (model: Model) => Html
    capturingDispatch: CapturingDispatch
    scope: Option.Option<Locator>
  }>

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
  viewFn: (model: Model) => Html,
  model: Model,
  dispatch: DispatchService,
): VNode => {
  const maybeVNode = Effect.runSync(
    Effect.provideService(viewFn(model), Dispatch, dispatch),
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
  dblclick: 'OnDblClick',
  submit: 'OnSubmit',
  input: 'OnInput',
  change: 'OnChange',
  focus: 'OnFocus',
  blur: 'OnBlur',
  mouseenter: 'OnMouseEnter',
  mouseover: 'OnMouseOver',
  keydown: 'OnKeyDown or OnKeyDownPreventDefault',
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

  const element = maybeElement.value
  const maybeHandler = Option.fromNullable(element.data?.on?.[eventName])

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

const DEFAULT_KEYBOARD_MODIFIERS: KeyboardModifiers = {
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
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

/** Resolves a specific pending Command with the given result Message. */
export const resolve: {
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
} =
  <Name extends string, ResultMessage>(
    definition: CommandDefinition<Name, ResultMessage>,
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
    const next = resolveByName(
      internal as BaseInternal<Model, Message, unknown>,
      definition.name,
      messageForUpdate,
    )

    if (Predicate.isUndefined(next)) {
      const pending = Array.isNonEmptyReadonlyArray(internal.commands)
        ? pipe(
            internal.commands,
            Array.map(({ name }) => `    ${name}`),
            Array.join('\n'),
          )
        : '    (none)'
      throw new Error(
        `I tried to resolve "${definition.name}" but it wasn't in the pending Commands.\n\n` +
          `Pending Commands:\n${pending}\n\n` +
          'Make sure the previous Message produced this Command.',
      )
    }

    return next as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

/** Resolves all listed Commands with their result Messages. Handles cascading resolution. */
export const resolveAll =
  (pairs: ReadonlyArray<ResolverPair>) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> => {
    const internal = toInternal(simulation)
    const resolvers: Record<string, Message> = {}
    for (const [definition, resultMessage] of pairs) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      resolvers[definition.name] = resultMessage as Message
    }

    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    let current = {
      ...internal,
      resolvers: { ...internal.resolvers, ...resolvers },
    } as BaseInternal<Model, Message, OutMessage>

    const MAX_CASCADE_DEPTH = 100

    for (let depth = 0; depth < MAX_CASCADE_DEPTH; depth++) {
      const resolvable = current.commands.find(
        ({ name }) => name in current.resolvers,
      )

      if (Predicate.isUndefined(resolvable)) {
        break
      }

      const next = resolveByName(
        current,
        resolvable.name,
        current.resolvers[resolvable.name]!,
      )

      if (Predicate.isUndefined(next)) {
        break
      }

      current = next as BaseInternal<Model, Message, OutMessage>

      if (depth === MAX_CASCADE_DEPTH - 1) {
        throw new Error(
          'resolveAll hit the maximum cascade depth (100). ' +
            'This usually means Commands are producing Commands in an infinite cycle.',
        )
      }
    }

    return current as unknown as SceneSimulation<Model, Message, OutMessage>
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  }

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
      return { ...internal, html } as SceneSimulation<
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

// INTERACTION STEPS

/** Simulates a click on the element matching the target. */
export const click =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    invokeAndCapture(simulation, target, 'click', handler => {
      handler()
    })

/** Simulates a double-click on the element matching the target. */
export const doubleClick =
  (target: string | Locator) =>
  <Model, Message, OutMessage = undefined>(
    simulation: SceneSimulation<Model, Message, OutMessage>,
  ): SceneSimulation<Model, Message, OutMessage> =>
    invokeAndCapture(simulation, target, 'dblclick', handler => {
      handler()
    })

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
      const maybeActualValue = Option.fromNullable(vnode.data?.style?.[name])
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

// SUBMODEL VIEW ADAPTER

/** Adapts a submodel view for Scene testing. In the Submodel pattern, the view
 *  takes a `toParentMessage` function that maps child Messages to parent Messages.
 *  Scene tests the child in isolation, so `childView` passes the identity function
 *  and erases the parent type. */
export const childView =
  <Model>(
    viewFn: (
      model: Model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toParentMessage: (message: any) => any,
    ) => Html,
  ): ((model: Model) => Html) =>
  model =>
    viewFn(model, message => message)

// SCENE

/** Executes a scene test. Throws if any Commands remain unresolved. */
export const scene: {
  <Model, Message, OutMessage>(
    config: Readonly<{
      update: (
        model: Model,
        message: Message,
      ) => readonly [Model, ReadonlyArray<AnyCommand>, OutMessage]
      view: (model: Model) => Html
    }>,
    ...steps: ReadonlyArray<SceneStep<Model, Message, OutMessage>>
  ): void
  <Model, Message>(
    config: Readonly<{
      update: (
        model: Model,
        message: Message,
      ) => readonly [Model, ReadonlyArray<AnyCommand>]
      view: (model: Model) => Html
    }>,
    ...steps: ReadonlyArray<SceneStep<Model, Message, undefined>>
  ): void
} = <Model, Message, OutMessage = undefined>(
  config: Readonly<{
    update: (model: Model, message: Message) => UpdateResult<Model, OutMessage>
    view: (model: Model) => Html
  }>,
  ...steps: ReadonlyArray<SceneStep<Model, Message, OutMessage>>
): void => {
  const capturingDispatch = createCapturingDispatch()

  /* eslint-disable @typescript-eslint/consistent-type-assertions */
  const seed = {
    model: UNINITIALIZED as unknown,
    message: undefined,
    commands: [],
    outMessage: undefined as unknown,
    updateFn: config.update,
    resolvers: {},
    html: undefined as unknown,
    viewFn: config.view,
    capturingDispatch,
    scope: Option.none(),
  } as unknown as SceneSimulation<Model, Message, OutMessage>

  const result = runSteps(seed, steps)
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  const internal = toInternal(result)
  assertAllCommandsResolved(internal.commands)
}
