import { Option, String } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions/index.js'
import { pushHistory } from '../navigation/history.js'
import { UrlRequest } from '../navigation/urlRequest.js'
import { Url } from '../url/index.js'

/** Configuration for URL routing: a handler for URL changes and, optionally,
 *  one for URL requests.
 *
 *  `onUrlChange` turns the browser's new URL into a Message, whether it came
 *  from back/forward, from `pushUrl`/`replaceUrl`, or from a link the runtime
 *  handled itself. Parse the route there and nowhere else.
 *
 *  `onUrlRequest` intercepts a link click before any of that happens. Omitted,
 *  the runtime handles the click. A same-origin link is pushed to history and
 *  reported through `onUrlChange`. A link that only changes the fragment of
 *  the current URL and a cross-origin link are left to the browser. Provide the
 *  handler to decide per click (say, to confirm leaving a form with unsaved
 *  edits), in which case update owns the navigation and issues `pushUrl` or
 *  `load` itself. */
export type RoutingConfig<Message> = Readonly<{
  onUrlRequest?: (request: UrlRequest) => Message
  onUrlChange: (url: Url) => Message
}>

export const addNavigationEventListeners = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
): (() => void) => {
  const removePopStateListener = addPopStateListener(dispatch, routingConfig)
  const removeLinkClickListener = addLinkClickListener(dispatch, routingConfig)
  const removeProgrammaticNavigationListener =
    addProgrammaticNavigationListener(dispatch, routingConfig)

  return () => {
    removePopStateListener()
    removeLinkClickListener()
    removeProgrammaticNavigationListener()
  }
}

const addPopStateListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
): (() => void) => {
  const onPopState = () => {
    dispatch(routingConfig.onUrlChange(locationToUrl()))
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

    const linkUrl = new URL(href)
    const currentUrl = new URL(window.location.href)
    const isSameOrigin = linkUrl.origin === currentUrl.origin
    const isFragmentLink =
      !String.isEmpty(linkUrl.hash) || linkUrl.href.endsWith('#')
    const isSameDocument =
      isSameOrigin &&
      linkUrl.pathname === currentUrl.pathname &&
      linkUrl.search === currentUrl.search &&
      isFragmentLink
    const { onUrlRequest } = routingConfig

    if (onUrlRequest === undefined) {
      if (isSameOrigin && !isSameDocument) {
        event.preventDefault()
        pushHistory(href)
      }
    } else {
      event.preventDefault()
      dispatch(
        onUrlRequest(
          isSameOrigin
            ? UrlRequest.Internal({ url: urlToFoldkitUrl(linkUrl) })
            : UrlRequest.External({ href }),
        ),
      )
    }
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
  const onProgrammaticNavigation = () => {
    dispatch(routingConfig.onUrlChange(locationToUrl()))
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
