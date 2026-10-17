# Runtime

## Overview

A genuinely compact Foldkit application can start in two files. `src/application.ts` owns Model, Message, init, update, view, the typed `Application`, `ApplicationComposition`, and any small local handler bundle. `src/entry.ts` chooses browser inputs, calls owned `makeApplication` or `makeElement`, and starts the Runtime. Once any root responsibility is extracted, named files own every root responsibility, `definition.ts` owns `Application`, and `composition.ts` or its composition barrel owns `ApplicationComposition`; the split root has no `application.ts` aggregation file. When handlers or startup Effects require ordinary Services, `services.ts` composes their providers as `ApplicationLayer`. Importing application pieces in a test does not start the Runtime.

The Runtime API makes two independent choices:

- `ApplicationComposition.makeApplication` or `ApplicationComposition.makeElement` decides what the app owns. An application owns the page; an Element owns only its container.
- `Runtime.run` or `Runtime.embed` decides who owns the runtime lifetime. `run` starts it for the page lifetime; `embed` returns a handle the host disposes.

The Application Composition carries the handler requirements for its Commands, Subscriptions, Mounts, and ManagedResources into `makeApplication` or `makeElement`. Call `application.provide(layer)` or `element.provide(layer)` until the remaining service requirements are satisfied, then pass the runnable program to `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed` as appropriate. Each call returns a new passive program. The assembly config has no `resources` field, and the Runtime builds the supplied Layers only when it starts that program.

For a larger application, each completed child Block is bound and included in its parent's `childBindings`. This carries the handler and lifecycle graph to the Application without root-level handler lists. A feature may provide business services it owns while leaving HTTP, storage, RPC, and browser requirements open. The application root combines those external providers in `ApplicationLayer`; `ApplicationComposition.makeApplication({ init, update, view, ... })` already has the handlers. [Project Organization](/patterns/project-organization#composing-handler-layers) shows the complete file structure.

Create the typed Application with `defineApplication` from `foldkit`. A compact root configures child relationships in its all-in-one `application.ts` and registers them in the complete `makeComposition({ childBindings, mounts })` call. A split root keeps that graph in `composition.ts`; substantial Binding policies use `composition/composition.ts` with an explicit barrel. The split Composition imports the Definition, child and Mount definitions, and local policy declarations, never root init, update, or view. External consumers use `composition.ts` or the explicit barrel, never a policy or assembly implementation path. Binding and registration are passive configuration. Its completion methods capture the Model, Message, and composed graph; callers supply implementation pieces and host inputs. The returned lowercase `application` carries its unsatisfied requirements and supplies ordinary Services through `application.provide(layer)`.

The `provide` method adds the supplied Layer recipe and returns a new passive program. The Runtime builds that application Layer once for each start and releases its Scope when that start stops. Command lookup, Subscription restarts, Mount insertions, and ManagedResource reacquisitions reuse the resulting application-scoped handlers and providers.

::Snippet{name="runLayers" label="Providing application services"}

## ApplicationComposition.makeApplication {#to-application}

`ApplicationComposition.makeApplication` creates a Foldkit program for an app that owns the page. It supports both apps that leave the URL alone and apps that manage routing. The difference is whether you provide a `routing` config. To scope an app to one node without owning the page, use `ApplicationComposition.makeElement`.

### Without routing

Without a `routing` config, the program doesn't manage the URL bar.

::Snippet{name="runToApplication" label="Application without routing"}

### With routing

With a `routing` config, the program manages the URL bar. The init function receives the current URL and can use it to set the initial route.

::Snippet{name="runToApplicationRouting" label="Application with routing"}

The `routing` config has two handlers. `onUrlRequest` turns a clicked link into a Message, giving update the choice between internal and external navigation. `onUrlChange` turns the new URL into a Message so update can store the corresponding route in the Model. See [Routing & Navigation](/core/routing-and-navigation) for the full walkthrough.

The view returns a `Document` rather than bare HTML. A `Document` contains the body plus the document-level state that `ApplicationComposition.makeApplication` reapplies on every render. The tab title, the `<html>` language and direction, and the canonical and og\:url tags therefore stay in sync with the Model. [The Document](/core/view#the-document) lists every field.

## ApplicationComposition.makeElement {#to-element}

### Page Ownership

`ApplicationComposition.makeApplication` assumes it owns the page. That is correct for an app that owns its tab, but not for a widget on a page controlled by another application, where document updates would overwrite the host page metadata.

Use `ApplicationComposition.makeElement` to scope a Foldkit app to its container. Its root view returns `Html` directly, and the runtime never touches the document `<head>` or the `<html>` element. The same Model, init, update, Command, Subscription, ManagedResource, and crash-handling architecture remains available. Element-scoped apps do not own the URL bar, so `ApplicationComposition.makeElement` has no `routing` config. Supply its remaining service requirements with `element.provide(layer)` before starting it.

### Flags

Flags still resolve before init, but their wiring follows the ownership boundary. A page-owning application receives its Flags Effect when `Runtime.run` starts it. A self-contained Element receives its Flags Effect in the `ApplicationComposition.makeElement` config, and that Effect's requirements join the Element's requirements.

::Snippet{name="runToElement" label="Using ApplicationComposition.makeElement"}

## embed

### Host-Owned Lifetime

`Runtime.run` starts a program for the lifetime of the page and returns no handle. `Runtime.embed` starts one under a host-controlled lifetime, whether the host is React or anything else. The host seeds the program with Flags, exchanges values through Schema-typed Ports, and tears it down with `dispose`.

### Handle Boundary

The returned handle is the whole boundary. The host never reads the Model or dispatches Messages directly. Disposing the handle stops the runtime and its lifecycle work, removes the rendered DOM, and restores the empty container so it can be embedded again.

Values produced from one program by its `provide` method share its container lifetime. Dispose the active handle before embedding another provided variant; Foldkit finishes the previous teardown before starting the next variant.

The [Embedding](/core/embedding) guide has the full walkthrough.
