import { Effect, Queue, Stream } from 'effect'
import { Mount } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

const h = html<Message>()

const CompletedPortalToBody = m('CompletedPortalToBody')

// Portal-to-body is a per-instance lifecycle effect that uses the element
// directly. Stream.callback keeps the stream's scope open for the element's
// lifetime; the acquire moves the element to document.body and the release
// removes it on unmount. The work is pure DOM manipulation on the element
// Mount provides, idempotent and safe to re-run during DevTools time-travel.

const PortalToBody = Mount.define(
  'PortalToBody',
  CompletedPortalToBody,
)(element =>
  Stream.callback<typeof CompletedPortalToBody.Type>(queue =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          document.body.appendChild(element)
          Queue.offerUnsafe(queue, CompletedPortalToBody())
        }),
        () => Effect.sync(() => element.remove()),
      )
      return yield* Effect.never
    }),
  ),
)

const overlayView = (): Html =>
  h.div([h.Class('fixed inset-0 bg-black/50'), h.OnMount(PortalToBody())])
