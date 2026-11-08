import { Predicate } from 'effect'

import type { AnyBinding } from '../../../block/binding.js'
import type { BindingParent } from '../../../block/bindingConnection.js'
import { runtimeBindingOf } from '../../../block/composition.js'
import { __messageDeclarations as subscriptionMessageDeclarations } from '../../../subscription/subscription.js'
import {
  type BindingPath,
  type ParentOwnerOf,
  type PathBinding,
  type PathLeafBinding,
  type ValidateBindingPath,
  resolveBindingPath,
  resolveRegisteredBinding,
  wrapBindingPathMessage,
} from '../../../test/bindingPath.js'
import { resolveSubscriptionMessage } from '../../../test/internal.js'
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
        const path = resolveBindingPath(implementation, delivery.path)
        return CoreStory.message(wrapBindingPathMessage(path, delivery.message))
      }

      const binding = resolveRegisteredBinding(implementation, delivery.binding)
      const message: unknown = Reflect.apply(toParentMessage, undefined, [
        binding,
        ...delivery.args,
      ])

      return CoreStory.message(message)
    }

    if (Predicate.isTagged(step, 'BlockSubscriptionMessageStep')) {
      const entry = Reflect.get(step, 'entry')
      const message = Reflect.get(step, 'message')
      const selection = CoreStory.__subscriptionPathSelection(entry)

      if (selection === undefined) {
        const subscriptions: unknown = Reflect.get(facade, 'subscriptions')
        if (!Predicate.isObject(subscriptions)) {
          throw new Error(
            '[foldkit] Story.Subscription.emit requires registered Subscriptions in the selected Block graph.',
          )
        }

        return {
          _tag: 'SubscriptionMessageStep',
          declarations: Reflect.apply(
            subscriptionMessageDeclarations,
            undefined,
            [subscriptions],
          ),
          entry,
          message,
        }
      }

      const path = resolveBindingPath(implementation, selection.path)
      const leaf = path.at(-1)
      if (leaf === undefined) {
        throw new Error(
          '[foldkit] Story.Subscription.at requires a nonempty Binding path.',
        )
      }

      const leafSubscriptions = runtimeBindingOf(leaf.binding).block
        .subscriptions
      const leafMessage = resolveSubscriptionMessage(
        'Story.Subscription.emit',
        subscriptionMessageDeclarations(leafSubscriptions),
        selection.source,
        message,
      )

      return CoreStory.message(wrapBindingPathMessage(path, leafMessage))
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
