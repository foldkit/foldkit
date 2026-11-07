import { Predicate } from 'effect'

import type { AnyBinding, BlockOfBinding } from '../block/binding.js'
import { bindingResolverOf } from '../block/bindingConnection.js'
import type { BindingParent } from '../block/bindingConnection.js'
import { generatedDeliveryOf } from '../block/childEnvelope.js'
import {
  canonicalBindingOf,
  runtimeBindingOf,
  runtimeBindingsOf,
} from '../block/composition.js'
import { executionBindingsOf } from '../experimental/constructed/symbolic.js'
import {
  type GeneratedBindingConstraint,
  type KeyOfBinding,
  type KeyedBindingConstraint,
  type StaticBindingConstraint,
  toParentMessage,
} from './toParentMessage.js'

export type ParentOwnerOf<Binding> =
  Binding extends BindingParent<infer Owner> ? Owner : never

type ChildOwnerOf<Binding> =
  BlockOfBinding<Binding> extends Readonly<{ owner: infer Owner }>
    ? Owner
    : never

export type PathBinding<Element> =
  Element extends Readonly<{ binding: infer Binding }> ? Binding : Element

type PathKey<Element> =
  Element extends Readonly<{ key: infer Key }> ? Key : never

type Last<Path extends ReadonlyArray<unknown>> = Path extends readonly [
  ...infer _Prefix,
  infer Value,
]
  ? Value
  : never

export type PathLeafBinding<Path extends ReadonlyArray<unknown>> = PathBinding<
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

export type ValidateBindingPath<Path extends ReadonlyArray<unknown>> =
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

export type BindingPath = readonly [unknown, ...ReadonlyArray<unknown>]

export type TestGraph = Readonly<{ bindings: ReadonlyArray<object> }>

export const resolveRegisteredBinding = (
  graph: TestGraph,
  declaration: unknown,
  pathIndex?: number,
): object => {
  if (!Predicate.isObject(declaration)) {
    throw new Error(
      pathIndex === undefined
        ? '[foldkit] A Block test requires a Binding registered in its selected graph.'
        : `[foldkit] Binding path element ${pathIndex + 1} must be registered in the selected Block graph.`,
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
      `[foldkit] Binding path element ${pathIndex + 1} requires a Binding connected in the selected Block graph.`,
      { cause },
    )
  }

  if (!runtimeBindingsOf(graph).includes(binding)) {
    throw new Error(
      pathIndex === undefined
        ? '[foldkit] A Block test requires a Binding registered in its selected graph.'
        : `[foldkit] Binding path element ${pathIndex + 1} requires a Binding registered in the selected Block graph.`,
    )
  }

  return binding
}

export type ResolvedPathElement = Readonly<{
  binding: object
  key?: unknown
}>

export const resolveBindingPath = (
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
    const binding = resolveRegisteredBinding(graph, declaration, index)
    const generated = generatedDeliveryOf(binding)

    if (generated === undefined) {
      throw new Error(
        `[foldkit] Binding path element ${index + 1} requires generated child delivery.`,
      )
    }

    if (generated.isKeyed !== selected) {
      throw new Error(
        generated.isKeyed
          ? `[foldkit] Binding path element ${index + 1} requires { binding, key } for its keyed occurrence.`
          : `[foldkit] Binding path element ${index + 1} is static and must be passed as its Binding.`,
      )
    }

    graph = runtimeBindingOf(binding).block

    return selected
      ? { binding, key: Reflect.get(element, 'key') }
      : { binding }
  })
}

export const wrapBindingPathMessage = (
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
