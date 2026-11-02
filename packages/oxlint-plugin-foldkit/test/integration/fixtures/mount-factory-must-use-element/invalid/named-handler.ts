import { Effect } from 'effect'
import { Mount } from 'foldkit'

const ignoreElement = ({ element: _element }) =>
  Effect.sync(() => startAnalytics())
const ignoreElementAlias = ignoreElement

export const IgnoreNamedElement = Mount.define('IgnoreNamedElement', {
  messages: [CompletedIgnoreNamedElement],
})

export const IgnoreNamedElementLive = IgnoreNamedElement.toLayer(
  Effect.gen(function* () {
    return ignoreElementAlias
  }),
)

const ignoreGeneratedElement = () => Effect.sync(() => startAnalytics())

export const IgnoreGeneratedElement = Mount.define('IgnoreGeneratedElement', {
  messages: [CompletedIgnoreGeneratedElement],
})

export const IgnoreGeneratedElementLive = IgnoreGeneratedElement.toLayer(
  Effect.gen(function* () {
    yield* Effect.void
    return ignoreGeneratedElement
  }),
)

function ignoreDeclaredElement({ element: _element }) {
  return Effect.sync(() => startAnalytics())
}

export const IgnoreDeclaredElement = Mount.define('IgnoreDeclaredElement', {
  messages: [CompletedIgnoreDeclaredElement],
})

export const IgnoreDeclaredElementLive = IgnoreDeclaredElement.toLayer(
  Effect.gen(function* () {
    return ignoreDeclaredElement
  }),
)

const ignoreElementThroughNestedDeclaration = ({ element }) => {
  function readNestedElement(element) {
    resizeObserver.observe(element)
  }

  return Effect.sync(() => readNestedElement(document.body))
}

export const IgnoreElementThroughNestedDeclaration = Mount.define('IgnoreElementThroughNestedDeclaration', {
  messages: [CompletedIgnoreElementThroughNestedDeclaration],
})

export const IgnoreElementThroughNestedDeclarationLive = IgnoreElementThroughNestedDeclaration.toLayer(
  Effect.gen(function* () {
    return ignoreElementThroughNestedDeclaration
  }),
)

const ignoreElementThroughNestedDestructuring = ({ element }) => {
  const readNestedElement = ({ element }) => resizeObserver.observe(element)

  return Effect.sync(() => readNestedElement({ element: document.body }))
}

export const IgnoreElementThroughNestedDestructuring = Mount.define('IgnoreElementThroughNestedDestructuring', {
  messages: [CompletedIgnoreElementThroughNestedDestructuring],
})

export const IgnoreElementThroughNestedDestructuringLive = IgnoreElementThroughNestedDestructuring.toLayer(
  Effect.gen(function* () {
    return ignoreElementThroughNestedDestructuring
  }),
)

const ignoreElementThroughBlockBinding = ({ element }) => {
  {
    const element = document.body
    resizeObserver.observe(element)
  }

  return Effect.void
}

export const IgnoreElementThroughBlockBinding = Mount.define('IgnoreElementThroughBlockBinding', {
  messages: [CompletedIgnoreElementThroughBlockBinding],
})

export const IgnoreElementThroughBlockBindingLive = IgnoreElementThroughBlockBinding.toLayer(
  Effect.gen(function* () {
    return ignoreElementThroughBlockBinding
  }),
)

const observeElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))

{
  const observeElement = ({ element: _element }) =>
    Effect.sync(() => startAnalytics())

  Mount.define('IgnoreShadowedElement', { messages: [CompletedIgnoreShadowedElement] }).toLayer(
    Effect.gen(function* () {
      return observeElement
    }),
  )
}

Mount.define('ObserveOuterElement', { messages: [CompletedObserveOuterElement] }).toLayer(
  Effect.gen(function* () {
    return observeElement
  }),
)
