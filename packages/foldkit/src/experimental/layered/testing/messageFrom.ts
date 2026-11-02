import { Predicate } from 'effect'

import type { AnyBinding } from '../../../block/binding.js'
import { bindingResolverOf } from '../../../block/bindingConnection.js'
import type { BindingParent } from '../../../block/bindingConnection.js'
import {
  canonicalBindingOf,
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

const deliveries = new WeakMap<
  object,
  Readonly<{ binding: object; args: ReadonlyArray<unknown> }>
>()

/**
 * Delivers a decoded child Message through this Story's acquired Binding.
 * Keyed Bindings take their decoded occurrence key before the Message.
 * The step is passive and reusable across independent graph acquisitions.
 * It preserves ordinary child routing and OutMessage policy, but does not
 * simulate Runtime generation admission. Use a live host test for that.
 *
 * @example
 * ```ts
 * Story.story(
 *   ApplicationBlock,
 *   Story.init(),
 *   Story.messageFrom(SearchBinding, SearchBlock.Message.CompletedFetch(result)),
 * )
 * ```
 */
export function messageFrom<
  const Binding extends AnyBinding & BindingParent<unknown>,
>(
  binding: Binding &
    GeneratedBindingConstraint<Binding> &
    StaticBindingConstraint<Binding>,
  message: ChildMessageOf<Binding>,
): CoreStory.MessageWithStep<unknown, PrivateDelivery<ParentOwnerOf<Binding>>>
export function messageFrom<
  const Binding extends AnyBinding & BindingParent<unknown>,
>(
  binding: Binding &
    GeneratedBindingConstraint<Binding> &
    KeyedBindingConstraint<Binding>,
  key: KeyOfBinding<Binding>,
  message: ChildMessageOf<Binding>,
): CoreStory.MessageWithStep<unknown, PrivateDelivery<ParentOwnerOf<Binding>>>
export function messageFrom(
  binding: object,
  ...args: ReadonlyArray<unknown>
): CoreStory.MessageWithStep<unknown, never> {
  const step = CoreStory.messageWith(() => {
    throw new Error(
      '[foldkit] messageFrom requires a Block-aware Story to acquire its child graph.',
    )
  })

  deliveries.set(step, { binding, args })

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
      const resolveBinding = bindingResolverOf(delivery.binding)
      const binding = canonicalBindingOf(
        resolveBinding === undefined
          ? delivery.binding
          : resolveBinding(executionBindingsOf(implementation)),
      )

      if (!runtimeBindingsOf(implementation).includes(binding)) {
        throw new Error(
          "[foldkit] messageFrom requires a Binding registered in this Story's Block graph.",
        )
      }

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
