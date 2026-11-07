# Embedding

## Overview

A Foldkit app does not have to own its page. `Runtime.embed` starts a program under a host-controlled lifecycle and returns a handle the host uses to communicate with it: for example, a widget inside a React or Vue app, a checkout flow inside a server-rendered page, or an interactive panel inside a larger dashboard. The host controls when the app starts and stops, pushes data in, and receives values out, all without touching the Model or dispatching Messages. The boundary is a set of Schema-typed Ports, modeled on Elm ports.

The [embedding example](/example-apps/embedding) runs everything on this page: a plain TypeScript host page that mounts a ticking widget, pushes a step value in, mirrors the count the widget emits, and unmounts it on demand.

## Choosing an Entry Point

Embedded apps are usually built with `Program.makeElement`: the root Block view returns `Html` and the Runtime stays scoped to its container, never touching the document `<head>`, the URL bar, or anything else the host owns. Use `Program.make` when the embedded app should own page-level concerns like the document title. `embed` accepts Programs from both. Both forms carry their Effect requirements until the Program's `provide` method supplies the needed Layers.

Give each container a unique `id` before creating its Program. Foldkit uses that ID to preserve the Model across reloads.

## Providing Host Implementations

An embedded feature can own a Command's workflow while its host supplies the external capability. For example, an editor can define `SaveDocument` against an `EditorStorage` Service. Its attached handler maps the storage result to the editor's declared Messages, and update handles those results through the usual data flow.

Include the attached handler's `.layer` in the feature's `EffectsLayer`. Supply the host's `EditorStorage` implementation through `program.provide(layer)` before calling `Runtime.embed`. [Host implementations for reusable features](/core/layers#host-implementations-for-reusable-features) shows the feature and a browser-storage host. The same feature can run against a document API or a controlled storage Service in an execution test.

## Declaring Ports

Ports are declared with `Port.inbound` and `Port.outbound`, grouped in a record, and registered on the program config. The record keys name the ports on the handle:

::Snippet{name="embeddingPorts" label="Port declaration"}

## Three Communication Directions {#three-directions}

Host interop maps onto primitives the architecture already has. Data crosses the boundary in three ways, and each direction reuses the concept that already handles that shape of input or output.

### Flags: Initial Data In {#flags}

Data the app needs once, at startup, enters through `Flags`, exactly as in a page-owning app. The host passes values when it constructs the program, and `init` folds them into the initial Model. An embedded Element config includes its Flags Effect; any services that Effect requires join the Element's requirements.

### Inbound Ports: a Subscription {#inbound-ports}

Data the host pushes while the app runs arrives on an inbound Port, which the app consumes as a named Subscription source. `Port.stream(port)` produces the decoded values. The Subscription handler maps each value into a Message, so host input drives `update` the same way any other external event does:

::Snippet{name="embeddingInboundSubscription" label="Inbound Subscription"}

The Subscription module exports its registry. Include `EffectsLayer: subscriptions.layer` in the widget's implementation record, or compose the registry Layer with other local handler recipes in `EffectsLayer`.

Values sent while no Stream for the Port is running are dropped, with one exception: values sent before the first Stream attaches are buffered and delivered to it in order, so sends issued right after `embed` are not lost during startup.

### Outbound Ports: a Command {#outbound-ports}

Values the app announces to the host leave through an outbound Port, written from a Command. `Port.emit` is an Effect that encodes the value and delivers it to every subscribed host listener; it composes into the app’s own Commands like any other Effect:

::Snippet{name="embeddingOutboundCommand" label="Outbound Command"}

The feature Block’s `makeStep` retains the helper’s Command requirements. Include `EffectsLayer: ReportCount.layer` in the implementation record passed to `FeatureBlock.makeLayer`. The Element host acquires that implementation and its child graph under the host lifetime.

When the program runs without an embed handle (started with `Runtime.run`), emitting is a no-op, so the same app works embedded and standalone.

## The Embed Handle

`Runtime.embed(program)` starts the runtime and returns an `EmbedHandle`. The handle has one entry per declared Port under `ports` (inbound Ports get `send`, outbound Ports get `subscribe`), plus `dispose`:

::Snippet{name="embeddingHost" label="Host wiring"}

`dispose` disables the handle immediately and returns a Promise that settles after runtime teardown completes. Teardown interrupts in-flight Commands, releases Subscriptions, Mounts, and ManagedResources, removes the rendered DOM, and restores the original container empty in its place. Await that Promise before creating or embedding a different Program in the same container. Re-embedding the same Program is sequenced automatically, and repeated calls to `dispose` return the same Promise.

## The Schema Boundary

Every value that crosses the boundary passes through its Port’s Schema. The host works with the Schema’s Encoded side, the app with the decoded Type: `send` validates by decoding, and `Port.emit` encodes before delivery. Keep Port Schemas to data that survives encoding, the same discipline as a network payload; functions and DOM references cannot cross. The Model does not cross either: outbound Ports carry facts the app chooses to announce, not state snapshots, so the host never couples to the app’s internal shape.

An invalid inbound value never reaches the app. `send` returns an `Exit` carrying the `SchemaError` and logs the rejection, so a typed host gets compile-time checking and an untyped host gets a clear runtime signal, while the app only ever sees values its Schemas accepted.

## Embedding in React

The handle is framework-agnostic. React’s `useId` gives each widget its own stable container ID. React cleanup cannot await a Promise, so keep the pending teardown and make the next effect setup wait before reusing the container:

::Snippet{name="embeddingReactHost" label="React host"}
