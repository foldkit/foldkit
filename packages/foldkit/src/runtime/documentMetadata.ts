import { Array } from 'effect'

import { Document, textDirectionToAttribute } from '../html/index.js'

const currentLocationUrl = (): string => {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}`
}

type DocumentMetadataElements = {
  canonical?: HTMLLinkElement
  ogUrl?: HTMLMetaElement
}

type ResolvedDocumentMetadata = Readonly<{
  title: string
  lang: string | undefined
  dirAttribute: string | undefined
  canonicalUrl: string
  ogUrl: string
}>

type DocumentMetadataInvalidation = { isInvalidated: boolean }

type DocumentMetadataState = {
  readonly elements: DocumentMetadataElements
  readonly observer: MutationObserver
  readonly invalidation: DocumentMetadataInvalidation
  observedHead: HTMLHeadElement
  lastApplied?: ResolvedDocumentMetadata
  cachedLocationHref?: string
  cachedLocationCanonical?: string
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

const findOrCreateDocumentMetadataElements = (
  metadataState: DocumentMetadataState,
): Readonly<{
  canonical: HTMLLinkElement
  ogUrl: HTMLMetaElement
}> => {
  const { elements } = metadataState

  let canonical = elements.canonical
  if (canonical === undefined || canonical.parentNode !== document.head) {
    canonical =
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
      document.head.appendChild(document.createElement('link'))
    elements.canonical = canonical
  }

  let ogUrl = elements.ogUrl
  if (ogUrl === undefined || ogUrl.parentNode !== document.head) {
    ogUrl =
      document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]') ??
      document.head.appendChild(document.createElement('meta'))
    elements.ogUrl = ogUrl
  }

  return { canonical, ogUrl }
}

const readOrCacheCurrentLocationUrl = (
  metadataState: DocumentMetadataState,
): string => {
  const currentLocationHref = window.location.href
  if (
    metadataState.cachedLocationHref === currentLocationHref &&
    metadataState.cachedLocationCanonical !== undefined
  ) {
    return metadataState.cachedLocationCanonical
  }

  const canonicalUrl = currentLocationUrl()
  metadataState.cachedLocationHref = currentLocationHref
  metadataState.cachedLocationCanonical = canonicalUrl
  return canonicalUrl
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

  const metadataElements = findOrCreateDocumentMetadataElements(metadataState)

  if (metadataElements.canonical.getAttribute('rel') !== 'canonical') {
    metadataElements.canonical.setAttribute('rel', 'canonical')
  }
  if (
    metadataElements.canonical.getAttribute('href') !==
    nextMetadata.canonicalUrl
  ) {
    metadataElements.canonical.setAttribute('href', nextMetadata.canonicalUrl)
  }
  if (metadataElements.ogUrl.getAttribute('property') !== 'og:url') {
    metadataElements.ogUrl.setAttribute('property', 'og:url')
  }
  if (metadataElements.ogUrl.getAttribute('content') !== nextMetadata.ogUrl) {
    metadataElements.ogUrl.setAttribute('content', nextMetadata.ogUrl)
  }

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

  const canonicalUrl =
    nextDocument.canonical ?? readOrCacheCurrentLocationUrl(metadataState)
  const ogUrl = nextDocument.ogUrl ?? canonicalUrl
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
    lastApplied.canonicalUrl === canonicalUrl &&
    lastApplied.ogUrl === ogUrl

  if (isAppliedMetadataCurrent) {
    return
  }

  reconcileDocumentMetadata(metadataState, {
    title: nextDocument.title,
    lang: nextDocument.lang,
    dirAttribute,
    canonicalUrl,
    ogUrl,
  })
}
