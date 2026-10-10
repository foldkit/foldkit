import { Effect } from 'effect'
import { Mount } from 'foldkit'

const ignoreElement = ({ element: _element }) =>
  Effect.sync(() => startAnalytics())
const ignoreElementAlias = ignoreElement

export const IgnoreNamedElement = Mount.define(
  'IgnoreNamedElement',
  { messages: [CompletedIgnoreNamedElement] },
  Effect.succeed(ignoreElementAlias),
)

const ignoreGeneratedElement = () => Effect.sync(() => startAnalytics())

export const IgnoreGeneratedElement = Mount.define(
  'IgnoreGeneratedElement',
  { messages: [CompletedIgnoreGeneratedElement] },
  Effect.gen(function* () {
    yield* Effect.void
    return ignoreGeneratedElement
  }),
)

function ignoreDeclaredElement({ element: _element }) {
  return Effect.sync(() => startAnalytics())
}

export const IgnoreDeclaredElement = Mount.define(
  'IgnoreDeclaredElement',
  { messages: [CompletedIgnoreDeclaredElement] },
  Effect.succeed(ignoreDeclaredElement),
)

const ignoreElementThroughNestedDeclaration = ({ element }) => {
  function readNestedElement(element) {
    resizeObserver.observe(element)
  }

  return Effect.sync(() => readNestedElement(document.body))
}

export const IgnoreElementThroughNestedDeclaration = Mount.define(
  'IgnoreElementThroughNestedDeclaration',
  { messages: [CompletedIgnoreElementThroughNestedDeclaration] },
  Effect.succeed(ignoreElementThroughNestedDeclaration),
)

const ignoreElementThroughNestedDestructuring = ({ element }) => {
  const readNestedElement = ({ element }) => resizeObserver.observe(element)

  return Effect.sync(() => readNestedElement({ element: document.body }))
}

export const IgnoreElementThroughNestedDestructuring = Mount.define(
  'IgnoreElementThroughNestedDestructuring',
  { messages: [CompletedIgnoreElementThroughNestedDestructuring] },
  Effect.succeed(ignoreElementThroughNestedDestructuring),
)

const ignoreElementThroughBlockBinding = ({ element }) => {
  {
    const element = document.body
    resizeObserver.observe(element)
  }

  return Effect.void
}

export const IgnoreElementThroughBlockBinding = Mount.define(
  'IgnoreElementThroughBlockBinding',
  { messages: [CompletedIgnoreElementThroughBlockBinding] },
  Effect.succeed(ignoreElementThroughBlockBinding),
)

const observeElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))

{
  const observeElement = ({ element: _element }) =>
    Effect.sync(() => startAnalytics())

  Mount.define(
    'IgnoreShadowedElement',
    { messages: [CompletedIgnoreShadowedElement] },
    Effect.succeed(observeElement),
  )
}

Mount.define(
  'ObserveOuterElement',
  { messages: [CompletedObserveOuterElement] },
  Effect.succeed(observeElement),
)
