import { Option, String } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions/index.js'
import { External, Internal } from '../navigation/urlRequest.js'
import { Url } from '../url/index.js'
import { RoutingConfig } from './runtime.js'

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

    const link = maybeLink.value
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
      dispatch(routingConfig.onUrlRequest(External({ href })))
      return
    }

    dispatch(
      routingConfig.onUrlRequest(Internal({ url: urlToFoldkitUrl(linkUrl) })),
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

// NOTE: a stable module-level handler keeps registration idempotent.
// `addEventListener` discards a duplicate registration (same type, same
// callback reference, same capture), so a page-owning runtime that
// re-runs under HMR reuses the single listener instead of stacking
// reloads.
const reloadOnBfcacheRestore = ({
  persisted: isRestoredFromBfcache,
}: PageTransitionEvent): void => {
  if (isRestoredFromBfcache) {
    location.reload()
  }
}

export const addBfcacheRestoreListener = (): (() => void) => {
  window.addEventListener('pageshow', reloadOnBfcacheRestore)
  return () => {
    window.removeEventListener('pageshow', reloadOnBfcacheRestore)
  }
}
