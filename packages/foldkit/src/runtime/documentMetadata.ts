import { Array } from 'effect'

import { Document, textDirectionToAttribute } from '../html/index.js'

type OwnedElement =
  | Readonly<{ _tag: 'Created'; element: HTMLElement }>
  | Readonly<{
      _tag: 'Found'
      element: HTMLElement
      servedValue: string | undefined
    }>

type HeadField = 'canonical' | 'ogUrl'

type DocumentMetadataElements = Partial<Record<HeadField, OwnedElement>>

type HeadElementDescriptor = Readonly<{
  field: HeadField
  tagName: 'link' | 'meta'
  identityAttribute: string
  identityValue: string
  valueAttribute: string
}>

const CANONICAL_ELEMENT: HeadElementDescriptor = {
  field: 'canonical',
  tagName: 'link',
  identityAttribute: 'rel',
  identityValue: 'canonical',
  valueAttribute: 'href',
}

const OG_URL_ELEMENT: HeadElementDescriptor = {
  field: 'ogUrl',
  tagName: 'meta',
  identityAttribute: 'property',
  identityValue: 'og:url',
  valueAttribute: 'content',
}

type ResolvedDocumentMetadata = Readonly<{
  title: string
  lang: string | undefined
  dirAttribute: string | undefined
  canonical: string | undefined
  ogUrl: string | undefined
}>

type DocumentMetadataInvalidation = { isInvalidated: boolean }

type DocumentMetadataState = {
  readonly elements: DocumentMetadataElements
  readonly observer: MutationObserver
  readonly invalidation: DocumentMetadataInvalidation
  observedHead: HTMLHeadElement
  lastApplied?: ResolvedDocumentMetadata
}

const documentMetadataStates = new WeakMap<
  globalThis.Document,
  DocumentMetadataState
>()

const observeDocumentMetadataMutations = (
  observer: MutationObserver,
): HTMLHeadElement => {
  const observedHead = document.head
  observer.observe(observedHead, {
    attributes: true,
    attributeFilter: ['rel', 'href', 'property', 'content'],
    childList: true,
    characterData: true,
    subtree: true,
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang', 'dir'],
  })
  return observedHead
}

const getOrCreateDocumentMetadataState = (): DocumentMetadataState => {
  const existingState = documentMetadataStates.get(document)
  if (existingState !== undefined) {
    return existingState
  }

  const invalidation: DocumentMetadataInvalidation = { isInvalidated: true }
  const observer = new MutationObserver(() => {
    invalidation.isInvalidated = true
  })
  const metadataState: DocumentMetadataState = {
    elements: {},
    observer,
    invalidation,
    observedHead: observeDocumentMetadataMutations(observer),
  }
  documentMetadataStates.set(document, metadataState)
  return metadataState
}

const findOrCreateHeadElement = (
  metadataState: DocumentMetadataState,
  descriptor: HeadElementDescriptor,
): HTMLElement => {
  const { elements } = metadataState
  const owned = elements[descriptor.field]
  if (owned !== undefined && owned.element.parentNode === document.head) {
    return owned.element
  }

  const found = document.head.querySelector<HTMLElement>(
    `${descriptor.tagName}[${descriptor.identityAttribute}="${descriptor.identityValue}"]`,
  )
  if (found !== null) {
    elements[descriptor.field] = {
      _tag: 'Found',
      element: found,
      servedValue: found.getAttribute(descriptor.valueAttribute) ?? undefined,
    }
    return found
  }

  const created = document.head.appendChild(
    document.createElement(descriptor.tagName),
  )
  elements[descriptor.field] = { _tag: 'Created', element: created }
  return created
}

const restoreOwnedElement = (
  metadataState: DocumentMetadataState,
  descriptor: HeadElementDescriptor,
): void => {
  const owned = metadataState.elements[descriptor.field]

  // NOTE: If another script removes a tracked element, an omitted field must
  // not recreate the element just to restore its earlier value.
  if (owned === undefined || owned.element.parentNode !== document.head) {
    return
  }

  if (owned._tag === 'Created') {
    owned.element.remove()
    return
  }

  const { valueAttribute } = descriptor

  if (owned.servedValue === undefined) {
    owned.element.removeAttribute(valueAttribute)
    return
  }

  if (owned.element.getAttribute(valueAttribute) !== owned.servedValue) {
    owned.element.setAttribute(valueAttribute, owned.servedValue)
  }
}

const syncHeadElement = (
  metadataState: DocumentMetadataState,
  descriptor: HeadElementDescriptor,
  value: string | undefined,
): void => {
  if (value === undefined) {
    restoreOwnedElement(metadataState, descriptor)
    delete metadataState.elements[descriptor.field]
    return
  }

  const element = findOrCreateHeadElement(metadataState, descriptor)

  if (
    element.getAttribute(descriptor.identityAttribute) !==
    descriptor.identityValue
  ) {
    element.setAttribute(descriptor.identityAttribute, descriptor.identityValue)
  }

  if (element.getAttribute(descriptor.valueAttribute) !== value) {
    element.setAttribute(descriptor.valueAttribute, value)
  }
}

const rebindDocumentMetadataObserverToCurrentHead = (
  metadataState: DocumentMetadataState,
): void => {
  // NOTE: a MutationObserver remains attached to a detached head after
  // document.head is replaced. Rebind it and invalidate the metadata snapshot
  // before the next unchanged guard.
  metadataState.observer.disconnect()
  metadataState.observedHead = observeDocumentMetadataMutations(
    metadataState.observer,
  )
  metadataState.invalidation.isInvalidated = true
}

const reconcileDocumentMetadata = (
  metadataState: DocumentMetadataState,
  nextMetadata: ResolvedDocumentMetadata,
): void => {
  if (document.title !== nextMetadata.title) {
    document.title = nextMetadata.title
  }

  const { documentElement } = document

  if (
    nextMetadata.lang !== undefined &&
    documentElement.lang !== nextMetadata.lang
  ) {
    documentElement.lang = nextMetadata.lang
  }

  if (
    nextMetadata.dirAttribute !== undefined &&
    documentElement.dir !== nextMetadata.dirAttribute
  ) {
    documentElement.dir = nextMetadata.dirAttribute
  }

  syncHeadElement(metadataState, CANONICAL_ELEMENT, nextMetadata.canonical)
  syncHeadElement(metadataState, OG_URL_ELEMENT, nextMetadata.ogUrl)

  metadataState.lastApplied = nextMetadata
  metadataState.invalidation.isInvalidated = false
  // NOTE: clear the records produced by Foldkit's own writes before the
  // observer callback runs. Otherwise the next unchanged render would be
  // marked dirty and repeat every DOM read this cache is meant to avoid.
  metadataState.observer.takeRecords()
}

export const applyDocumentMetadata = (
  nextDocument: Document,
  mountedRoot: Node | undefined,
): void => {
  if (!mountedRoot || !document.body.contains(mountedRoot)) {
    return
  }

  const metadataState = getOrCreateDocumentMetadataState()

  if (metadataState.observedHead !== document.head) {
    rebindDocumentMetadataObserverToCurrentHead(metadataState)
  }

  const ogUrl = nextDocument.ogUrl ?? nextDocument.canonical
  const dirAttribute =
    nextDocument.dir === undefined
      ? undefined
      : textDirectionToAttribute(nextDocument.dir)

  // NOTE: MutationObserver callbacks are asynchronous. Consume queued records
  // synchronously before trusting the unchanged fast path.
  if (Array.isArrayNonEmpty(metadataState.observer.takeRecords())) {
    metadataState.invalidation.isInvalidated = true
  }

  const lastApplied = metadataState.lastApplied
  const isAppliedMetadataCurrent =
    !metadataState.invalidation.isInvalidated &&
    lastApplied !== undefined &&
    lastApplied.title === nextDocument.title &&
    lastApplied.lang === nextDocument.lang &&
    lastApplied.dirAttribute === dirAttribute &&
    lastApplied.canonical === nextDocument.canonical &&
    lastApplied.ogUrl === ogUrl

  if (isAppliedMetadataCurrent) {
    return
  }

  reconcileDocumentMetadata(metadataState, {
    title: nextDocument.title,
    lang: nextDocument.lang,
    dirAttribute,
    canonical: nextDocument.canonical,
    ogUrl,
  })
}
