import { Effect } from 'effect'
import { Mount } from 'foldkit'
import { importedHandler } from 'external-handlers'

const observeElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))
const observeElementAlias = observeElement
const observeElementBuild = Effect.succeed(observeElementAlias)

export const ObserveNamedElement = Mount.define(
  'ObserveNamedElement',
  { messages: [CompletedObserveNamedElement] },
  observeElementBuild,
)

const observeGeneratedElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))

export const ObserveGeneratedElement = Mount.define(
  'ObserveGeneratedElement',
  { messages: [CompletedObserveGeneratedElement] },
  Effect.gen(function* () {
    yield* Effect.void
    return observeGeneratedElement
  }),
)

function observeDeclaredElement({ element }) {
  return Effect.sync(() => resizeObserver.observe(element))
}

export const ObserveDeclaredElement = Mount.define(
  'ObserveDeclaredElement',
  { messages: [CompletedObserveDeclaredElement] },
  Effect.succeed(observeDeclaredElement),
)

{
  const observeElement = ({ element }) =>
    Effect.sync(() => resizeObserver.observe(element))

  Mount.define(
    'ObserveShadowedElement',
    { messages: [CompletedObserveShadowedElement] },
    Effect.succeed(observeElement),
  )
}

const cycleA = cycleB
const cycleB = cycleA

Mount.define(
  'UnresolvedCycle',
  { messages: [CompletedUnresolvedCycle] },
  Effect.succeed(cycleA),
)

Mount.define(
  'ImportedHandler',
  { messages: [CompletedImportedHandler] },
  Effect.succeed(importedHandler),
)
