import { Predicate } from 'effect'

import type { AnyBinding, BlockOfBinding } from '../block/binding.js'
import { bindingResolverOf } from '../block/bindingConnection.js'
import type { BindingParent } from '../block/bindingConnection.js'
import {
  canonicalBindingOf,
  runtimeBindingOf,
  runtimeBindingsOf,
} from '../block/composition.js'
import { executionBindingsOf } from '../experimental/constructed/symbolic.js'
import { type AcquiredTestBlock, testGraphOf } from './testGraph.js'
import {
  type ChildMessageOf,
  type GeneratedBindingConstraint,
  type KeyOfBinding,
  type KeyedBindingConstraint,
  type StaticBindingConstraint,
  toParentMessage,
} from './toParentMessage.js'

type Parent = AcquiredTestBlock<unknown> &
  Readonly<{ owner: unknown; Message: Readonly<{ Type: unknown }> }>

type ChildParent<Binding extends AnyBinding> =
  BlockOfBinding<Binding> extends infer Child extends Readonly<{
    owner: unknown
    Message: Readonly<{ Type: unknown }>
  }>
    ? AcquiredTestBlock<Child['owner']> &
        Readonly<{
          owner: Child['owner']
          Message: Readonly<{ Type: Child['Message']['Type'] }>
        }>
    : never

/** Maps exact child deliveries into one acquired parent's public dispatch contract. */
export interface ParentMessageMapper<ParentBlock extends Parent> {
  <const Binding extends AnyBinding & BindingParent<ParentBlock['owner']>>(
    binding: Binding &
      GeneratedBindingConstraint<Binding> &
      StaticBindingConstraint<Binding>,
    message: ChildMessageOf<Binding>,
  ): ParentBlock['Message']['Type']
  <const Binding extends AnyBinding & BindingParent<ParentBlock['owner']>>(
    binding: Binding &
      GeneratedBindingConstraint<Binding> &
      KeyedBindingConstraint<Binding>,
    key: KeyOfBinding<Binding>,
    message: ChildMessageOf<Binding>,
  ): ParentBlock['Message']['Type']
}

/**
 * Binds decoded child delivery to an original parent acquired by `withBlock`.
 * Ordinary Stories use `Story.messageIn`. Use this mapper when an advanced
 * scoped fixture needs the selected graph's exact delivery identity, then
 * drive the behavior through Story or Scene steps.
 *
 * The Binding must belong to this parent, and its key and Message retain their
 * exact decoded contracts. Membership is checked against the acquired private
 * graph; the public parent type does not expose a descendant inventory.
 * Pass a child Binding as the second argument to map that selected child's own
 * deliveries without acquiring a separate implementation graph.
 *
 * @example
 * ```ts
 * Story.withBlock({ block: ApplicationBlock, layer }, application => {
 *   const toParentMessage = Test.toParentMessageFor(application)
 *
 *   return Story.story(
 *     application.update,
 *     Story.given(counterReadyModel),
 *     Story.message(
 *       toParentMessage(CounterBinding, CounterBlock.Message.ClickedIncrement()),
 *     ),
 *     Story.model(model => {
 *       expect(model.counter.count).toBe(1)
 *     }),
 *     Story.Command.expectNone(),
 *   )
 * })
 * ```
 * Here `counterReadyModel` is a fixture whose Counter starts at zero. Keep
 * startup scenarios in the Block-aware runner with `Story.init` so initial
 * Commands remain part of the test.
 */
export function toParentMessageFor<const ParentBlock extends Parent>(
  parent: ParentBlock,
): ParentMessageMapper<ParentBlock>
export function toParentMessageFor<
  const ParentBlock extends Parent,
  const Binding extends AnyBinding & BindingParent<ParentBlock['owner']>,
>(
  parent: ParentBlock,
  child: Binding,
): ParentMessageMapper<ChildParent<Binding>>
export function toParentMessageFor(parent: object, child?: object): unknown {
  const implementation = testGraphOf(parent)

  if (implementation === undefined) {
    throw new Error(
      '[foldkit] toParentMessageFor requires an original acquired test Block.',
    )
  }

  const resolve = (graph: typeof implementation, declaration: unknown) => {
    if (!Predicate.isObject(declaration)) {
      throw new Error(
        '[foldkit] toParentMessageFor requires a registered child Binding.',
      )
    }

    const resolveBinding = bindingResolverOf(declaration)
    const binding = canonicalBindingOf(
      resolveBinding === undefined
        ? declaration
        : resolveBinding(executionBindingsOf(graph)),
    )

    if (!runtimeBindingsOf(graph).includes(binding)) {
      throw new Error(
        "[foldkit] toParentMessageFor requires a Binding registered in this parent's test graph.",
      )
    }

    return binding
  }

  const graph =
    child === undefined
      ? implementation
      : runtimeBindingOf(resolve(implementation, child)).block

  return (declaration: unknown, ...args: ReadonlyArray<unknown>): unknown => {
    const binding = resolve(graph, declaration)
    return Reflect.apply(toParentMessage, undefined, [binding, ...args])
  }
}
