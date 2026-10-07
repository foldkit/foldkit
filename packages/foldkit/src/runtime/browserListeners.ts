import { Option, Schema, String } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions/index.js'
import {
  pendingScrollReadResume,
  recordLeavingEntryAndTraverse,
  startHistoryEntryTracking,
} from '../navigation/historyEntries.js'
import { UrlChangeType } from '../navigation/urlChangeType.js'
import { UrlRequest } from '../navigation/urlRequest.js'
import type { RenderCommit } from '../render/commit.js'
import { Url } from '../url/index.js'

/** Configuration for URL routing with handlers for URL requests and URL changes.
 *  `onUrlChange` receives the new URL and how it changed:
 *  `UrlChangeType.Push()` from `pushUrl`, `UrlChangeType.Replace()` from
 *  `replaceUrl`, and `UrlChangeType.Traverse` for Back and Forward, carrying
 *  `maybeSavedScrollPosition`, the scroll position the reader last had on that
 *  entry, or `Option.none()` when none was recorded. */
export type RoutingConfig<Message> = Readonly<{
  onUrlRequest: (request: UrlRequest) => Message
  onUrlChange: (url: Url, urlChangeType: UrlChangeType) => Message
}>

/** The navigation listeners of a routing runtime. `resumeScrollReadsAfterBoot`
 *  is called once boot has completed, and `removeListeners` on teardown. */
export type NavigationEventListeners = Readonly<{
  resumeScrollReadsAfterBoot: () => void
  removeListeners: () => void
}>

const isUrlChangeType = Schema.is(UrlChangeType)

// NOTE: the render that shows the arrived entry can be held for longer than a
// frame, for example by a View Transition, so this waits for its commit, then
// one frame more.
const scheduleOneFrameAfterRender = (
  renderCommit: typeof RenderCommit.Service,
  callback: () => void,
): (() => void) => {
  let cancel = (): void => {}

  const requestFrame = (): void => {
    const frameRequest = requestAnimationFrame(callback)

    cancel = () => {
      cancelAnimationFrame(frameRequest)
    }
  }

  if (renderCommit.isCommitPending()) {
    cancel = renderCommit.onNextCommit(requestFrame)
  } else {
    requestFrame()
  }

  return () => {
    cancel()
  }
}

export const addNavigationEventListeners = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
  renderCommit: typeof RenderCommit.Service,
): NavigationEventListeners => {
  let isBootComplete = false
  let cancelScheduledResume = (): void => {}

  const resumeScrollReadsAfterRender = (): void => {
    const maybeResume = pendingScrollReadResume()

    if (Option.isSome(maybeResume)) {
      cancelScheduledResume()
      cancelScheduledResume = scheduleOneFrameAfterRender(
        renderCommit,
        maybeResume.value,
      )
    }
  }

  const stopHistoryEntryTracking = startHistoryEntryTracking()
  const removePopStateListener = addPopStateListener(
    dispatch,
    routingConfig,
    () => {
      if (isBootComplete) {
        resumeScrollReadsAfterRender()
      }
    },
  )
  const removeLinkClickListener = addLinkClickListener(dispatch, routingConfig)
  const removeProgrammaticNavigationListener =
    addProgrammaticNavigationListener(dispatch, routingConfig)

  return {
    resumeScrollReadsAfterBoot: () => {
      isBootComplete = true
      resumeScrollReadsAfterRender()
    },
    removeListeners: () => {
      cancelScheduledResume()
      removePopStateListener()
      removeLinkClickListener()
      removeProgrammaticNavigationListener()
      stopHistoryEntryTracking()
    },
  }
}

const addPopStateListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
  onTraversalDispatched: () => void,
): (() => void) => {
  const onPopState = (event: PopStateEvent) => {
    dispatch(
      routingConfig.onUrlChange(
        locationToUrl(),
        recordLeavingEntryAndTraverse(event.state),
      ),
    )
    onTraversalDispatched()
  }

  window.addEventListener('popstate', onPopState)
  return () => {
    window.removeEventListener('popstate', onPopState)
  }
}

export const addLinkClickListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
): (() => void) => {
  const onLinkClick = (event: MouseEvent) => {
    const isNonPrimaryButton = event.button !== 0
    const isModifierKeyPressed =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    const isDefaultPrevented = event.defaultPrevented

    if (isNonPrimaryButton || isModifierKeyPressed || isDefaultPrevented) {
      return
    }

    const eventTarget = event.target
    if (!(eventTarget instanceof Element)) {
      return
    }

    const maybeLink = Option.fromNullishOr(eventTarget.closest('a'))
    if (Option.isNone(maybeLink)) {
      return
    }

    const { value: link } = maybeLink
    const { href } = link
    if (String.isEmpty(href)) {
      return
    }

    const isNonSelfTarget =
      !String.isEmpty(link.target) && link.target !== '_self'
    const isDownloadLink = link.hasAttribute('download')

    if (isNonSelfTarget || isDownloadLink) {
      return
    }

    event.preventDefault()

    const linkUrl = new URL(href)
    const currentUrl = new URL(window.location.href)

    if (linkUrl.origin !== currentUrl.origin) {
      dispatch(routingConfig.onUrlRequest(UrlRequest.External({ href })))
      return
    }

    dispatch(
      routingConfig.onUrlRequest(
        UrlRequest.Internal({ url: urlToFoldkitUrl(linkUrl) }),
      ),
    )
  }

  document.addEventListener('click', onLinkClick)
  return () => {
    document.removeEventListener('click', onLinkClick)
  }
}

const addProgrammaticNavigationListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
): (() => void) => {
  const onProgrammaticNavigation = (event: Event) => {
    const urlChangeType =
      event instanceof CustomEvent && isUrlChangeType(event.detail)
        ? event.detail
        : UrlChangeType.Push()

    dispatch(routingConfig.onUrlChange(locationToUrl(), urlChangeType))
  }

  window.addEventListener('foldkit:urlchange', onProgrammaticNavigation)
  return () => {
    window.removeEventListener('foldkit:urlchange', onProgrammaticNavigation)
  }
}

const urlToFoldkitUrl = (url: URL): Url => {
  const { protocol, hostname, port, pathname, search, hash } = url

  return {
    protocol,
    host: hostname,
    port: OptionExt.fromString(port),
    pathname,
    search: StringExt.stripPrefixNonEmpty('?')(search),
    hash: StringExt.stripPrefixNonEmpty('#')(hash),
  }
}

const locationToUrl = (): Url => urlToFoldkitUrl(new URL(window.location.href))
