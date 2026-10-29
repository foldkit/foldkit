import { Effect, Queue, Stream } from 'effect'

import { ExampleDetailDefinition } from './definition'
import { type ChangedExampleUrl, Message } from './message'

const BRIDGE_MESSAGE_TYPE = 'foldkit-example-url'

type ExampleUrlBridgeMessage = Readonly<{
  type: typeof BRIDGE_MESSAGE_TYPE
  url: string
}>

const isExampleUrlMessageFromIframe = (
  event: MessageEvent,
  iframe: HTMLIFrameElement,
): event is MessageEvent<ExampleUrlBridgeMessage> =>
  event.source === iframe.contentWindow &&
  event.origin === window.location.origin &&
  event.data &&
  typeof event.data === 'object' &&
  event.data.type === BRIDGE_MESSAGE_TYPE &&
  typeof event.data.url === 'string'

const observeExampleUrlMessages = (element: Element) => {
  if (!(element instanceof HTMLIFrameElement)) {
    return Stream.empty
  }

  return Stream.callback<ChangedExampleUrl>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const handler = (event: MessageEvent) => {
          if (!isExampleUrlMessageFromIframe(event, element)) {
            return
          }

          Queue.offerUnsafe(
            queue,
            Message.ChangedExampleUrl({ url: event.data.url }),
          )
        }

        window.addEventListener('message', handler)
        return handler
      }),
      handler =>
        Effect.sync(() => window.removeEventListener('message', handler)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
}

export const ObserveExampleUrlMessages =
  ExampleDetailDefinition.makeMountStream('ObserveExampleUrlMessages', {
    messages: [Message.ChangedExampleUrl],
    handler: function* () {
      return ({ element }) => observeExampleUrlMessages(element)
    },
  })
