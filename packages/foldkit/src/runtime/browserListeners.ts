import { Option, type Schema, String } from 'effect'

import { OptionExt, StringExt } from '../effectExtensions/index.js'
import { UrlRequest } from '../navigation/urlRequest.js'
import { isCallableTaggedStruct } from '../schema/index.js'
import { Url } from '../url/index.js'

/** Configuration for URL routing with handlers for URL requests and URL changes. */
export type RoutingConfig<Message> = Readonly<{
  onUrlRequest: (request: UrlRequest) => Message
  onUrlChange: (url: Url) => Message
}>

/** A canonical Message constructor accepted directly by Program routing. */
export type RoutingMessageConstructor<
  Field extends string,
  Value,
  Message,
> = Schema.Top &
  Readonly<{
    fields: Readonly<Record<Field, unknown>>
  }> &
  ((payload: Readonly<Record<Field, Value>>) => Message)

/** A Program routing handler, supplied as a callback or canonical Message constructor. */
export type RoutingHandler<Field extends string, Value, Message> =
  | ((value: Value) => Message)
  | RoutingMessageConstructor<Field, Value, Message>

/** Browser routing input accepted by {@link Program.make}. */
export type RoutingInputConfig<Message> = Readonly<{
  onUrlRequest: RoutingHandler<'request', UrlRequest, Message>
  onUrlChange: RoutingHandler<'url', Url, Message>
}>

/** @internal Adapts a Program routing callback or canonical Message constructor. */
export const normalizeRoutingHandler =
  <Field extends string, Value, Message>(
    field: Field,
    handler: RoutingHandler<Field, Value, Message>,
  ): ((value: Value) => Message) =>
  value =>
    isCallableTaggedStruct(handler)
      ? Reflect.apply(handler, undefined, [{ [field]: value }])
      : Reflect.apply(handler, undefined, [value])

/** @internal Converts erased canonical routing constructors to Runtime callbacks. */
export const normalizeRoutingInputConfig = <Message>(
  routing: RoutingInputConfig<Message>,
): RoutingConfig<Message> => {
  const onUrlRequest = normalizeRoutingHandler('request', routing.onUrlRequest)
  const onUrlChange = normalizeRoutingHandler('url', routing.onUrlChange)

  return { onUrlRequest, onUrlChange }
}

/** @internal Converts canonical routing constructors to Runtime callbacks. */
export function normalizeRoutingConfig<RequestMessage, UrlMessage>(
  routing: Readonly<{
    onUrlRequest: (request: UrlRequest) => RequestMessage
    onUrlChange: (url: Url) => UrlMessage
  }>,
): RoutingConfig<RequestMessage | UrlMessage>
export function normalizeRoutingConfig<RequestMessage, UrlMessage>(
  routing: Readonly<{
    onUrlRequest: RoutingMessageConstructor<
      'request',
      UrlRequest,
      RequestMessage
    >
    onUrlChange: RoutingMessageConstructor<'url', Url, UrlMessage>
  }>,
): RoutingConfig<RequestMessage | UrlMessage>
export function normalizeRoutingConfig<RequestMessage, UrlMessage>(
  routing: Readonly<{
    onUrlRequest: RoutingMessageConstructor<
      'request',
      UrlRequest,
      RequestMessage
    >
    onUrlChange: (url: Url) => UrlMessage
  }>,
): RoutingConfig<RequestMessage | UrlMessage>
export function normalizeRoutingConfig<RequestMessage, UrlMessage>(
  routing: Readonly<{
    onUrlRequest: (request: UrlRequest) => RequestMessage
    onUrlChange: RoutingMessageConstructor<'url', Url, UrlMessage>
  }>,
): RoutingConfig<RequestMessage | UrlMessage>
export function normalizeRoutingConfig(
  routing: RoutingInputConfig<any>,
): RoutingConfig<any> {
  return normalizeRoutingInputConfig(routing)
}

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
