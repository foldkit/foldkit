---
'foldkit': minor
---

**Breaking:** Mount factories now return `Stream<Message>` instead of `Effect<MountResult<Message>>`.

Mount can now stream events over an element's lifetime, not just announce a single mount Message paired with a cleanup. Subscriptions whose natural lifetime is "this element exists" (scroll listeners on a specific scrollable container, IntersectionObservers on a specific element, listeners on a third-party library instance) collapse into Mounts.

The `MountResult` type is removed from `foldkit/html`.

Migration. The `{ message, cleanup }` record becomes a `Stream`. For one-shot work, use `Stream.fromEffect`. For setup-with-cleanup or continuous-event work, use `Stream.callback` with `Effect.acquireRelease` and terminate the callback Effect with `Effect.never` so the scope stays open until the element is destroyed.

Before:

```ts
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
```

After:

```ts
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
```

For one-shot setup with no cleanup (focus on appearance, scroll to position):

```ts
const FocusInput = Mount.define(
  'FocusInput',
  CompletedFocusInput,
)(element =>
  Stream.fromEffect(
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) {
        element.focus()
      }
      return CompletedFocusInput()
    }),
  ),
)
```

For continuous element-scoped events (scroll listeners, IntersectionObservers, MutationObservers), Mount now subsumes what previously required a hand-rolled Subscription bridge. Attach the listener during acquire, offer each event's Message to the queue, and let the release detach the listener when the element unmounts:

```ts
const ListenSidebarScroll = Mount.define(
  'ListenSidebarScroll',
  ScrolledSidebar,
)(element =>
  Stream.callback<typeof ScrolledSidebar.Type>(queue =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const handler = () =>
            Queue.offerUnsafe(
              queue,
              ScrolledSidebar({ scroll: element.scrollTop }),
            )
          element.addEventListener('scroll', handler, { passive: true })
          return handler
        }),
        handler =>
          Effect.sync(() => element.removeEventListener('scroll', handler)),
      )
      return yield* Effect.never
    }),
  ),
)
```
