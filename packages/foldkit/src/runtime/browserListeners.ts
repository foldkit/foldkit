import { Option, String } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions/index.js'
import { External, Internal } from '../navigation/urlRequest.js'
import { Url } from '../url/index.js'
import { RoutingConfig } from './runtime.js'

export const addNavigationEventListeners = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
) => {
  addPopStateListener(dispatch, routingConfig)
  addLinkClickListener(dispatch, routingConfig)
  addProgrammaticNavigationListener(dispatch, routingConfig)
}

const addPopStateListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
) => {
  const onPopState = () => {
    dispatch(routingConfig.onUrlChange(locationToUrl()))
  }

  window.addEventListener('popstate', onPopState)
}

export const addLinkClickListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
) => {
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
}

const addProgrammaticNavigationListener = <Message>(
  dispatch: (message: Message) => void,
  routingConfig: RoutingConfig<Message>,
) => {
  const onProgrammaticNavigation = () => {
    dispatch(routingConfig.onUrlChange(locationToUrl()))
  }

  window.addEventListener('foldkit:urlchange', onProgrammaticNavigation)
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

export const addBfcacheRestoreListener = () => {
  window.addEventListener(
    'pageshow',
    ({ persisted: isRestoredFromBfcache }) => {
      if (isRestoredFromBfcache) {
        location.reload()
      }
    },
  )
}
