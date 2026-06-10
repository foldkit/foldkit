---
'foldkit': minor
---

Add `Runtime.embed` and the `Port` module: a typed, lifecycle-managed handle for running a Foldkit app inside a host application, modeled on Elm's ports.

**New:** `Runtime.embed(program)` starts a runtime under host control and returns an `EmbedHandle`. The host drives the app only through the handle: `ports.<name>.send(value)` pushes data in, `ports.<name>.subscribe(listener)` receives values out (returning an unsubscribe function), and `dispose()` shuts the runtime down. `dispose` is idempotent and runs full cleanup: Subscriptions, Mounts, ManagedResources, and in-flight Commands stop, the rendered DOM is removed, and the container element is restored empty, ready to be embedded again. Works with programs from both `makeApplication` and `makeElement`. New types: `EmbedHandle`, `PortHandles`, `InboundPortHandle`, `OutboundPortHandle`; `MakeRuntimeReturn` gains a type parameter (defaulted, existing annotations unaffected) carrying the program's Ports.

**New:** the `Port` module (`foldkit/port`) declares the boundary. `Port.inbound(schema)` and `Port.outbound(schema)` create typed Ports, grouped in a record and registered through the new `ports` config field on `makeApplication` and `makeElement`. Each direction maps onto an existing primitive: the app consumes an inbound Port as a Subscription source (`Port.subscription(port, toMessage)`, or `Port.stream(port)` for Model-gated entries) and writes an outbound Port from a Command (`Port.emit(port, value)`). Values are validated at the boundary: `send` decodes against the Port's Schema and returns an `Exit`, so an invalid value never reaches the app; `emit` encodes, so host listeners receive the Schema's Encoded form.

```ts
const ports = {
  inbound: { stepChanged: Port.inbound(S.Number) },
  outbound: { countChanged: Port.outbound(S.Number) },
}

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  ports,
  container,
})

const handle = Runtime.embed(element)
handle.ports.stepChanged.send(5)
const unsubscribe = handle.ports.countChanged.subscribe(count =>
  console.log(count),
)
handle.dispose()
```

**Changed:** interrupting a runtime's `start()` fiber now tears the whole runtime down. The render loop, Subscription streams, ManagedResource lifecycles, and Command fibers fork into the runtime scope instead of detaching, navigation and bfcache listeners are removed on shutdown, and the DevTools overlay is cleaned up with its runtime. `makeElement` apps no longer install the page-reloading bfcache listener; reloading on bfcache restore is a page-level decision, so only page-owning `makeApplication` apps register it.
