# Runtime

## Overview

A genuinely compact Foldkit application can start in two files. `src/application.ts` owns Model, Message, init, update, view, `ApplicationDefinition`, `ApplicationComposition`, `ApplicationBlock`, and any small local handler bundle. `src/entry.ts` gives `ApplicationBlock` to `Program.make` or `Program.makeElement` and starts the Runtime. Once any root responsibility is extracted, named files own every root responsibility, `composition.ts` owns `ApplicationComposition`, and `block.ts` assembles `ApplicationBlock`; retain `definition.ts` and `ApplicationDefinition` only when root authoring methods use them. The split root has no `application.ts` aggregation file. When handlers or startup Effects require ordinary Services, `services.ts` composes their providers as `ApplicationLayer`. Importing application pieces in a test does not start the Runtime.

The Runtime API makes two independent choices:

- `Program.make` or `Program.makeElement` decides what the app owns. A Program made with `make` owns the page; one made with `makeElement` owns only its container.
- `Runtime.run` or `Runtime.embed` decides who owns the runtime lifetime. `run` starts it for the page lifetime; `embed` returns a handle the host disposes.

`ApplicationBlock` carries the handler requirements for its Commands, Subscriptions, Mounts, and ManagedResources into the Program. It may be an ordinary completed Block or an opt-in terminal root assembled with `ApplicationComposition.assembleRoot`. Call `program.provide(layer)` until the remaining service requirements are satisfied, then pass the runnable Program to `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed` as appropriate. Each call returns a new passive Program. Program construction has no `resources` field, and the Runtime builds the supplied Layers only when it starts that Program.

A root cannot leave an OutMessage for the Program to discard. Handle child OutMessages while composing `ApplicationBlock`, and omit `OutMessage` from the root Definition.

For a larger application, each completed child Block is bound and included in its parent's `bindings`. This carries the handler and lifecycle graph to `ApplicationBlock` without root-level handler lists. A feature may provide business services it owns while leaving HTTP, storage, RPC, and browser requirements open. The application root combines those external providers in `ApplicationLayer`; `ApplicationComposition.assembleBlock({ init, update, view, ... })` or `ApplicationComposition.assembleRoot({ init, update, view, ... })` already has the handlers. [Project Organization](/patterns/project-organization#composing-handler-layers) shows the complete file structure.

Create the root with `Block.makeDefinition('Application', { Model, Message })`. Keep the result as `ApplicationDefinition` when its authoring methods define Commands, Mounts, resources, child Bindings, or Steps. When its only use is `makeComposition`, chain the calls in one top-level declaration so the Definition owner remains a module singleton. A compact root configures child relationships in its all-in-one `application.ts` and registers them in the complete `makeComposition({ bindings, mounts })` call. A split root keeps that graph in `composition.ts`; substantial Binding policies use `composition/composition.ts` with an explicit barrel. The split Composition imports the Definition, child and Mount definitions, and local policy declarations, never root init, update, or view. `block.ts` imports the authored implementation and assembles `ApplicationBlock`. Binding, registration, and root assembly are passive configuration. `entry.ts` supplies only host concerns to `Program.make` or `Program.makeElement`.

The `provide` method adds the supplied Layer recipe and returns a new passive program. The Runtime builds that application Layer once for each start and releases its Scope when that start stops. Command lookup, Subscription restarts, Mount insertions, and ManagedResource reacquisitions reuse the resulting application-scoped handlers and providers.

::Snippet{name="runLayers" label="Providing application services"}

## Program.make {#to-application}

`Program.make` creates a Foldkit Program for an `ApplicationBlock` that owns the page. It supports both apps that leave the URL alone and apps that manage routing. The difference is whether you provide a `routing` config. To scope an app to one node without owning the page, use `Program.makeElement`.

### Without routing

Without a `routing` config, the program doesn't manage the URL bar.

::Snippet{name="runToApplication" label="Application without routing"}

### With routing

With a `routing` config, the program manages the URL bar. The init function receives the current URL and can use it to set the initial route.

::Snippet{name="runToApplicationRouting" label="Application with routing"}

The `routing` config has two handlers. Use `onUrlRequest: ApplicationBlock.Message.ClickedLink` when that Message accepts `{ request }`, and `onUrlChange: ApplicationBlock.Message.ChangedUrl` when that Message accepts `{ url }`. A callback remains available when the payload needs another shape. See [Routing & Navigation](/core/routing-and-navigation) for the full walkthrough.

The root page view returns a `Document` rather than bare HTML. A `Document` contains the body plus the document-level state that `Program.make` reapplies on every render. The tab title, the `<html>` language and direction, and the canonical and og\:url tags therefore stay in sync with the Model. [The Document](/core/view#the-document) lists every field.

## Program.makeElement {#to-element}

### Page Ownership

`Program.make` assumes it owns the page. That is correct for an app that owns its tab, but not for a widget on a page controlled by another application, where document updates would overwrite the host page metadata.

Use `Program.makeElement` to scope a Foldkit app to its container. Its root view returns `Html` directly, and the Runtime never touches the document `<head>` or the `<html>` element. The same Model, init, update, Command, Subscription, ManagedResource, and crash-handling architecture remains available. Element-scoped Programs do not own the URL bar, so `Program.makeElement` has no `routing` config. Supply remaining service requirements with `program.provide(layer)` before starting it.

### Flags

Flags still resolve before init, but their wiring follows the ownership boundary. A page-owning Program receives its Flags Effect when `Runtime.run` starts it. A self-contained Element receives its Flags Effect in the `Program.makeElement` config, and that Effect's requirements join the Program's requirements.

::Snippet{name="runToElement" label="Using Program.makeElement"}

## embed

### Host-Owned Lifetime

`Runtime.run` starts a program for the lifetime of the page and returns no handle. `Runtime.embed` starts one under a host-controlled lifetime, whether the host is React or anything else. The host seeds the program with Flags, exchanges values through Schema-typed Ports, and tears it down with `dispose`.

### Handle Boundary

The returned handle is the whole boundary. The host never reads the Model or dispatches Messages directly. Disposing the handle stops the runtime and its lifecycle work, removes the rendered DOM, and restores the empty container so it can be embedded again.

Values produced from one program by its `provide` method share its container lifetime. Dispose the active handle before embedding another provided variant; Foldkit finishes the previous teardown before starting the next variant.

The [Embedding](/core/embedding) guide has the full walkthrough.
