import { Effect } from 'effect'
import { Mount } from 'foldkit'
import { importedHandler } from 'external-handlers'

const observeElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))
const observeElementAlias = observeElement
const observeElementBuild = Effect.gen(function* () {
  return observeElementAlias
})

export const ObserveNamedElement = Mount.define('ObserveNamedElement', {
  messages: [CompletedObserveNamedElement],
})

export const ObserveNamedElementLive = ObserveNamedElement.toLayer(observeElementBuild)

const observeGeneratedElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))

export const ObserveGeneratedElement = Mount.define('ObserveGeneratedElement', {
  messages: [CompletedObserveGeneratedElement],
})

export const ObserveGeneratedElementLive = ObserveGeneratedElement.toLayer(
  Effect.gen(function* () {
    yield* Effect.void
    return observeGeneratedElement
  }),
)

function observeDeclaredElement({ element }) {
  return Effect.sync(() => resizeObserver.observe(element))
}

export const ObserveDeclaredElement = Mount.define('ObserveDeclaredElement', {
  messages: [CompletedObserveDeclaredElement],
})

export const ObserveDeclaredElementLive = ObserveDeclaredElement.toLayer(
  Effect.gen(function* () {
    return observeDeclaredElement
  }),
)

{
  const observeElement = ({ element }) =>
    Effect.sync(() => resizeObserver.observe(element))

  Mount.define('ObserveShadowedElement', { messages: [CompletedObserveShadowedElement] }).toLayer(
    Effect.gen(function* () {
      return observeElement
    }),
  )
}

const cycleA = cycleB
const cycleB = cycleA

Mount.define('UnresolvedCycle', { messages: [CompletedUnresolvedCycle] }).toLayer(
  Effect.gen(function* () {
    return cycleA
  }),
)

Mount.define('ImportedHandler', { messages: [CompletedImportedHandler] }).toLayer(
  Effect.gen(function* () {
    return importedHandler
  }),
)
