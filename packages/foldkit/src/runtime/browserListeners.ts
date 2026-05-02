import { Option, Queue, String } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions/index.js'
import { Url } from '../url/index.js'
import { RoutingConfig } from './runtime.js'
import { External, Internal } from './urlRequest.js'

export const addNavigationEventListeners = <Message>(
  messageQueue: Queue.Queue<Message>,
  routingConfig: RoutingConfig<Message>,
) => {
  addPopStateListener(messageQueue, routingConfig)
  addLinkClickListener(messageQueue, routingConfig)
  addProgrammaticNavigationListener(messageQueue, routingConfig)
}

const addPopStateListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  routingConfig: RoutingConfig<Message>,
) => {
  const onPopState = () => {
    Queue.offerUnsafe(messageQueue, routingConfig.onUrlChange(locationToUrl()))
  }

  window.addEventListener('popstate', onPopState)
}

const addLinkClickListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  routingConfig: RoutingConfig<Message>,
) => {
  const onLinkClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const maybeLink = Option.fromNullishOr(target.closest('a'))
    if (Option.isNone(maybeLink)) {
      return
    }

    const { href } = maybeLink.value
    if (String.isEmpty(href)) {
      return
    }

    event.preventDefault()

    const linkUrl = new URL(href)
    const currentUrl = new URL(window.location.href)

    if (linkUrl.origin !== currentUrl.origin) {
      Queue.offerUnsafe(
        messageQueue,
        routingConfig.onUrlRequest(External({ href })),
      )
      return
    }

    Queue.offerUnsafe(
      messageQueue,
      routingConfig.onUrlRequest(Internal({ url: urlToFoldkitUrl(linkUrl) })),
    )
  }

  document.addEventListener('click', onLinkClick)
}

const addProgrammaticNavigationListener = <Message>(
  messageQueue: Queue.Queue<Message>,
  routingConfig: RoutingConfig<Message>,
) => {
  const onProgrammaticNavigation = () => {
    Queue.offerUnsafe(messageQueue, routingConfig.onUrlChange(locationToUrl()))
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
