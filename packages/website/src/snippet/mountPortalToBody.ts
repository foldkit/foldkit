import { Effect } from 'effect'
import { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedPortalToBody: {},
})

// Portal-to-body is a per-instance lifecycle effect that uses the element
// directly. The Effect's acquireRelease moves the element to document.body
// at mount and removes it on unmount. The work is pure DOM manipulation on
// the element Mount provides, idempotent and safe to re-run during
// DevTools time-travel.

const PortalToBody = Mount.define('PortalToBody', {
  messages: [Message.CompletedPortalToBody],
  execute: ({ element }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => document.body.appendChild(element)),
        () => Effect.sync(() => element.remove()),
      )
      return Message.CompletedPortalToBody()
    }),
})

const overlayView = (h: HtmlBuilder<Message>): Html =>
  h.div([h.Class('fixed inset-0 bg-black/50'), h.OnMount(PortalToBody())])
