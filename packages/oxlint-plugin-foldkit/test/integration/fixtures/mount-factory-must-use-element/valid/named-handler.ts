import { Effect } from 'effect'
import { Mount } from 'foldkit'
import { importedHandler } from 'external-handlers'

const observeElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))
const observeElementAlias = observeElement
const observeElementBuild = function* () {
  return observeElementAlias
}

export const ObserveNamedElement = Mount.define(
  'ObserveNamedElement',
  { messages: [CompletedObserveNamedElement], handler: observeElementBuild},
)

const observeGeneratedElement = ({ element }) =>
  Effect.sync(() => resizeObserver.observe(element))

export const ObserveGeneratedElement = Mount.define(
  'ObserveGeneratedElement',
  { messages: [CompletedObserveGeneratedElement], handler: function* () {
    yield* Effect.void
    return observeGeneratedElement
  }},
)

function observeDeclaredElement({ element }) {
  return Effect.sync(() => resizeObserver.observe(element))
}

export const ObserveDeclaredElement = Mount.define(
  'ObserveDeclaredElement',
  { messages: [CompletedObserveDeclaredElement], handler: function* () { return observeDeclaredElement }},
)

{
  const observeElement = ({ element }) =>
    Effect.sync(() => resizeObserver.observe(element))

  Mount.define(
    'ObserveShadowedElement',
    { messages: [CompletedObserveShadowedElement], handler: function* () { return observeElement }},
  )
}

const cycleA = cycleB
const cycleB = cycleA

Mount.define(
  'UnresolvedCycle',
  { messages: [CompletedUnresolvedCycle], handler: function* () { return cycleA }},
)

Mount.define(
  'ImportedHandler',
  { messages: [CompletedImportedHandler], handler: function* () { return importedHandler }},
)
