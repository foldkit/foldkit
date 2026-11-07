import { Predicate } from 'effect'

import type { AnyBinding, BlockOfBinding } from '../../../block/binding.js'
import { bindingResolverOf } from '../../../block/bindingConnection.js'
import type { BindingParent } from '../../../block/bindingConnection.js'
import { generatedDeliveryOf } from '../../../block/childEnvelope.js'
import {
  canonicalBindingOf,
  runtimeBindingOf,
  runtimeBindingsOf,
} from '../../../block/composition.js'
import * as CoreStory from '../../../test/story.js'
import { testGraphOf } from '../../../test/testGraph.js'
import {
  type ChildMessageOf,
  type GeneratedBindingConstraint,
  type KeyOfBinding,
  type KeyedBindingConstraint,
  type StaticBindingConstraint,
  toParentMessage,
} from '../../../test/toParentMessage.js'
import type { PrivateDelivery } from '../../constructed/contract.js'
import { executionBindingsOf } from '../../constructed/symbolic.js'

type ParentOwnerOf<Binding> =
  Binding extends BindingParent<infer Owner> ? Owner : never

type ChildOwnerOf<Binding> =
  BlockOfBinding<Binding> extends Readonly<{ owner: infer Owner }>
    ? Owner
    : never

type PathBinding<Element> =
  Element extends Readonly<{ binding: infer Binding }> ? Binding : Element

type PathKey<Element> =
  Element extends Readonly<{ key: infer Key }> ? Key : never

type Last<Path extends ReadonlyArray<unknown>> = Path extends readonly [
  ...infer _Prefix,
  infer Value,
]
  ? Value
  : never

type PathLeafBinding<Path extends ReadonlyArray<unknown>> = PathBinding<
  Last<Path>
>

type OwnersMatch<Left, Right> = [Left, Right] extends [Right, Left]
  ? unknown
  : never

type ValidatePathElement<Element> =
  PathBinding<Element> extends infer Binding extends AnyBinding &
    BindingParent<unknown>
    ? [GeneratedBindingConstraint<Binding>] extends [never]
      ? never
      : Element extends Readonly<{ binding: Binding; key: unknown }>
        ? [KeyedBindingConstraint<Binding>] extends [never]
          ? never
          : PathKey<Element> extends KeyOfBinding<Binding>
            ? unknown
            : never
        : [StaticBindingConstraint<Binding>] extends [never]
          ? never
          : unknown
    : never

type ValidateBindingPath<Path extends ReadonlyArray<unknown>> =
  Path extends readonly [infer Current, infer Next, ...infer Rest]
    ? ValidatePathElement<Current> &
        OwnersMatch<
          ParentOwnerOf<PathBinding<Next>>,
          ChildOwnerOf<PathBinding<Current>>
        > &
        ValidateBindingPath<readonly [Next, ...Rest]>
    : Path extends readonly [infer Leaf]
      ? ValidatePathElement<Leaf>
      : never

type BindingPath = readonly [unknown, ...ReadonlyArray<unknown>]

type Delivery =
  | Readonly<{
      kind: 'Direct'
      binding: object
      args: ReadonlyArray<unknown>
    }>
  | Readonly<{
      kind: 'Path'
      path: ReadonlyArray<unknown>
      message: unknown
    }>

const deliveries = new WeakMap<object, Delivery>()

/**
 * Delivers a decoded child Message into this Story through its acquired Binding.
 * Keyed Bindings take their decoded occurrence key before the Message. A
 * nonempty Binding path reaches a descendant without hand-wrapping parent
 * envelopes: static occurrences are bare Bindings and keyed occurrences are
 * `{ binding, key }`. Every path segment is resolved through the implementation
 * graph selected for this Story. Missing or inactive occurrences retain the
 * Binding fold's ordinary no-op behavior.
 * The step is passive and reusable across independent graph acquisitions.
 * It preserves ordinary child routing and OutMessage policy, but does not
 * simulate Runtime generation admission. Use a live host test for that.
 *
 * @example
 * ```ts
 * Story.story(
 *   ApplicationBlock,
 *   Story.init(),
 *   Story.messageIn(SearchBinding, SearchBlock.Message.CompletedFetch(result)),
 * )
 *
 * Story.story(
 *   ApplicationBlock,
 *   Story.init(),
 *   Story.messageIn(
 *     [ProjectsBinding, { binding: TasksBinding, key: taskId }, EditorBinding],
 *     EditorBlock.Message.UpdatedTitle({ title }),
 *   ),
 * )
 * ```
 */
export function messageIn<const Path extends BindingPath>(
  path: Path & ValidateBindingPath<Path>,
  message: ChildMessageOf<PathLeafBinding<NoInfer<Path>>>,
): CoreStory.MessageWithStep<
  unknown,
  PrivateDelivery<ParentOwnerOf<PathBinding<Path[0]>>>
>
export function messageIn<
  const Binding extends AnyBinding & BindingParent<unknown>,
>(
  binding: Binding &
    GeneratedBindingConstraint<Binding> &
    StaticBindingConstraint<Binding>,
  message: ChildMessageOf<Binding>,
): CoreStory.MessageWithStep<unknown, PrivateDelivery<ParentOwnerOf<Binding>>>
export function messageIn<
  const Binding extends AnyBinding & BindingParent<unknown>,
>(
  binding: Binding &
    GeneratedBindingConstraint<Binding> &
    KeyedBindingConstraint<Binding>,
  key: KeyOfBinding<Binding>,
  message: ChildMessageOf<Binding>,
): CoreStory.MessageWithStep<unknown, PrivateDelivery<ParentOwnerOf<Binding>>>
export function messageIn(
  bindingOrPath: object,
  ...args: ReadonlyArray<unknown>
): CoreStory.MessageWithStep<unknown, never> {
  const step = CoreStory.messageWith(() => {
    throw new Error(
      '[foldkit] messageIn requires a Block-aware Story to acquire its child graph.',
    )
  })

  if (globalThis.Array.isArray(bindingOrPath)) {
    if (bindingOrPath.length === 0 || args.length !== 1) {
      throw new Error(
        '[foldkit] messageIn path delivery requires at least one Binding path element and one child Message.',
      )
    }

    deliveries.set(step, {
      kind: 'Path',
      path: bindingOrPath,
      message: args[0],
    })
  } else {
    deliveries.set(step, { kind: 'Direct', binding: bindingOrPath, args })
  }

  return step
}

type TestGraph = Readonly<{ bindings: ReadonlyArray<object> }>

const resolveBinding = (
  graph: TestGraph,
  declaration: unknown,
  pathIndex?: number,
): object => {
  if (!Predicate.isObject(declaration)) {
    throw new Error(
      pathIndex === undefined
        ? "[foldkit] messageIn requires a Binding registered in this Story's Block graph."
        : `[foldkit] messageIn path element ${pathIndex + 1} must be a Binding registered in the selected Block graph.`,
    )
  }

  const resolver = bindingResolverOf(declaration)
  let binding: object
  try {
    binding = canonicalBindingOf(
      resolver === undefined
        ? declaration
        : resolver(executionBindingsOf(graph)),
    )
  } catch (cause) {
    if (pathIndex === undefined) {
      throw cause
    }

    throw new Error(
      `[foldkit] messageIn path element ${pathIndex + 1} requires a Binding connected in the selected Block graph.`,
      { cause },
    )
  }

  if (!runtimeBindingsOf(graph).includes(binding)) {
    throw new Error(
      pathIndex === undefined
        ? "[foldkit] messageIn requires a Binding registered in this Story's Block graph."
        : `[foldkit] messageIn path element ${pathIndex + 1} requires a Binding registered in the selected Block graph.`,
    )
  }

  return binding
}

type ResolvedPathElement = Readonly<{
  binding: object
  key?: unknown
}>

const resolvePath = (
  implementation: TestGraph,
  path: ReadonlyArray<unknown>,
): ReadonlyArray<ResolvedPathElement> => {
  let graph = implementation

  return path.map((element, index) => {
    const selected =
      Predicate.isObject(element) &&
      Object.hasOwn(element, 'binding') &&
      Object.hasOwn(element, 'key')
    const declaration = selected ? Reflect.get(element, 'binding') : element
    const binding = resolveBinding(graph, declaration, index)
    const generated = generatedDeliveryOf(binding)

    if (generated === undefined) {
      throw new Error(
        `[foldkit] messageIn path element ${index + 1} requires generated child delivery.`,
      )
    }

    if (generated.isKeyed !== selected) {
      throw new Error(
        generated.isKeyed
          ? `[foldkit] messageIn path element ${index + 1} requires { binding, key } for its keyed occurrence.`
          : `[foldkit] messageIn path element ${index + 1} is static and must be passed as its Binding.`,
      )
    }

    graph = runtimeBindingOf(binding).block

    return selected
      ? { binding, key: Reflect.get(element, 'key') }
      : { binding }
  })
}

const wrapPathMessage = (
  path: ReadonlyArray<ResolvedPathElement>,
  leafMessage: unknown,
): unknown =>
  path.reduceRight(
    (message, element) =>
      Object.hasOwn(element, 'key')
        ? Reflect.apply(toParentMessage, undefined, [
            element.binding,
            element.key,
            message,
          ])
        : Reflect.apply(toParentMessage, undefined, [element.binding, message]),
    leafMessage,
  )

/** @internal Resolves passive delivery steps against one test's private graph. */
export const resolveStorySteps = (
  facade: object,
  steps: ReadonlyArray<unknown>,
): ReadonlyArray<unknown> => {
  const implementation = testGraphOf(facade)

  if (implementation === undefined) {
    throw new Error(
      '[foldkit] A Block-aware Story requires its acquired graph.',
    )
  }

  const resolve = (step: unknown): unknown => {
    if (!Predicate.isObject(step)) {
      return step
    }

    const delivery = deliveries.get(step)

    if (delivery !== undefined) {
      if (delivery.kind === 'Path') {
        const path = resolvePath(implementation, delivery.path)
        return CoreStory.message(wrapPathMessage(path, delivery.message))
      }

      const binding = resolveBinding(implementation, delivery.binding)
      const message: unknown = Reflect.apply(toParentMessage, undefined, [
        binding,
        ...delivery.args,
      ])

      return CoreStory.message(message)
    }

    if (Predicate.isTagged(step, 'StoryStepsStep')) {
      const nested: unknown = Reflect.get(step, 'steps')

      if (globalThis.Array.isArray(nested)) {
        return { ...step, steps: nested.map(resolve) }
      }
    }

    return step
  }

  return steps.map(resolve)
}
