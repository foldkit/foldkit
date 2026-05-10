import { Effect } from 'effect'
import { Mount } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

const h = html<Message>()

const CompletedPortalToBody = m('CompletedPortalToBody')

// Portal-to-body is a per-instance lifecycle effect that uses the
// element directly: the Mount Effect moves the rendered element to
// document.body and the cleanup removes it on unmount. The work is
// pure DOM manipulation on the element Mount provides, which means
// it's idempotent and safe to re-run during DevTools time-travel.

const PortalToBody = Mount.define(
  'PortalToBody',
  CompletedPortalToBody,
)(element =>
  Effect.sync(() => {
    document.body.appendChild(element)
    return {
      message: CompletedPortalToBody(),
      cleanup: () => element.remove(),
    }
  }),
)

const overlayView = (): Html =>
  h.div([h.Class('fixed inset-0 bg-black/50'), h.OnMount(PortalToBody())])
