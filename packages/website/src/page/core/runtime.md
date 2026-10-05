# Runtime

## Overview

A Foldkit app usually starts in two files. `src/main.ts` holds the pure definitions: Model, Messages, update, init, and view. `src/entry.ts` imports them, creates the runtime, and starts it. Keeping runtime side effects in `entry.ts` leaves `main.ts` directly importable from tests.

The Runtime API makes two independent choices:

- `makeApplication` or `makeElement` decides what the app owns. An application owns the page; an element owns only its container.
- `Runtime.run` or `Runtime.embed` decides who owns the runtime lifetime. `run` starts it for the page lifetime; `embed` returns a handle the host disposes.

## makeApplication {#make-application}

`makeApplication` creates a Foldkit program for an app that owns the page. It supports both apps that leave the URL alone and apps that manage routing. The difference is whether you provide a `routing` config. To scope an app to one node without owning the page, use `makeElement`.

### Without routing

Without a `routing` config, the program doesn't manage the URL bar.

::Snippet{name="runMakeApplication" label="Using makeApplication without routing"}

### With routing

With a `routing` config, the program manages the URL bar. The init function receives the current URL and can use it to set the initial route.

::Snippet{name="runMakeApplicationRouting" label="Using makeApplication with routing"}

The `routing` config has two handlers. `onUrlRequest` turns a clicked link into a Message, giving update the choice between internal and external navigation. `onUrlChange` turns the new URL into a Message so update can store the corresponding route in the Model. See [Routing & Navigation](/core/routing-and-navigation) for the full walkthrough.

The view returns a `Document` rather than bare HTML. A `Document` contains the body plus the document-level state that `makeApplication` reapplies on every render. The tab title, the `<html>` language and direction, and the canonical and og\:url tags therefore stay in sync with the Model. [The Document](/core/view#the-document) lists every field.

## makeElement {#make-element}

`makeApplication` assumes it owns the page. That is correct for an app that owns its tab, but not for a widget on a page controlled by another application, where document updates would overwrite the host page metadata.

Use `makeElement` to scope a Foldkit app to its container. Its view returns `Html` directly, and the runtime never touches the document `<head>` or the `<html>` element. The same Model, init, update, Command, Subscription, resource, and crash-handling architecture remains available. Element-scoped apps do not own the URL bar, so `makeElement` has no `routing` config.

Flags still resolve before init, but their wiring follows the ownership boundary. A page-owning application receives its Flags Effect when `Runtime.run` starts it. A self-contained element receives its Flags Effect in the `makeElement` config.

::Snippet{name="runMakeElement" label="Using makeElement"}

## embed

`Runtime.run` starts a program for the lifetime of the page and returns no handle. `Runtime.embed` starts one under a host-controlled lifetime, whether the host is React or anything else. The host seeds the program with Flags, exchanges values through Schema-typed Ports, and tears it down with `dispose`.

The returned handle is the whole boundary. The host never reads the Model or dispatches Messages directly. Disposing the handle stops the runtime and its lifecycle work, removes the rendered DOM, and restores the empty container so it can be embedded again.

The [Embedding](/core/embedding) guide has the full walkthrough.

## Lazy composition

Use `lazyComposition` to load a second root implementation after the Runtime has booted. The Runtime owns the loaded functions. The Model and readiness Messages contain only `CompositionIdentity`: a build id, an implementation key, and a request id.

Each implementation supplies the same typed `update`, `view`, and optional `subscriptions` as the root. It can fold Submodels and OutMessages normally. The root `resources` Layer and `managedResources` declarations stay fixed, so Commands and Subscriptions from every implementation share the same services and runtime scope. An implementation cannot add service tags at activation.

Root configuration `subscriptions` remain active in the runtime scope across implementation changes. Put application-wide phone, media, and navigation streams there. A loaded implementation's `subscriptions` belong only to that accepted route identity and stop when the accepted identity changes. The root record and the loaded record are separate scopes; neither replaces the other. Each keeps the normal dependency-equivalence behavior within its own lifetime.

Keep persistent shell nodes in one shared view function called by the root and each loaded implementation. Vite's view identity transform then gives the shell the same identity across activation, preserving its DOM, focus, and uncontrolled inputs. Different route view functions still carry different identities and replace their route subtrees normally. The Runtime does not override view identity to disguise a route change.

::Snippet{name="runtimeLazyComposition" label="Loading an implementation inside one Runtime"}

Declare a finite `keys` list and one `buildId`. `requested(model)` identifies the work to load; `accepted(model)` identifies the implementation to use. The Runtime runs `load` as an Effect and publishes `onLoaded` or `onFailed`. Import rejection belongs in the Effect's string error channel. Unexpected defects retain the normal crash behavior. No retry runs automatically. Root update retries by creating a new request id.

Loading consumes only services declared by the fixed root `resources` Layer. Loaded Commands and route Subscriptions may also consume the fixed ManagedResource services. The lazy configuration cannot infer additional service requirements to bypass those declarations. A failed root Layer remains fatal during loading, even when the loader does not itself read a service; it does not publish readiness against an unavailable app context.

When the root update is resource-free and only lazy code consumes a service, inference may keep the root resource type at `never`. Declare that existing constructor type parameter explicitly: `makeApplication<Model, Message, AppServices>` or `makeElement<Model, Message, AppServices>` for a configuration without Flags. The `resources` Layer must still provide `AppServices`; the annotation does not install services. With Flags, the constructor parameters begin `Model, Message, Flags, AppServices`.

`isLifecycleMessage` identifies Messages that must go through the root update even when a loaded implementation is active. Include navigation, loaded, failed, and return-to-root Messages. Root update accepts readiness only when the entire identity matches its current request. A late response from an earlier visit cannot activate a later visit to the same key.

Successful implementations are cached for the Runtime lifetime, bounded by `keys`. Going from A to B to A reuses A's code, but the new accepted request identity stops the prior route Subscriptions and starts the next route record. Root Subscriptions remain alive. Subscription dependency changes retain the usual equivalence and cleanup behavior. The Runtime rejects an unknown key, a different build, or an accepted identity whose implementation has not loaded. It does not silently render the root in place of missing code.

DevTools replay resolves the implementation from each historical Model, not the current route. A restored Model's accepted implementation loads before the first render. If loading that restored identity fails, startup fails rather than painting another implementation. All retained implementations disappear when the Runtime is disposed. Development reloads create a new cache and load restored identity again, so each implementation must use the normal Vite view-identity transform and the application's build id must change when its contract changes.

A restored accepted implementation that cannot load fails the startup Effect with the loader's reason. This happens before the renderer exists, so it does not paint a crash view or emit `onFailed` into a running update loop. There is no automatic reload or retry. `start` callers can handle the failed Effect; a later fresh boot runs `init` and can request another identity normally. Ordinary post-boot loading failures still produce `onFailed` Messages and remain recoverable through root update.

### Server rendering boundary

This activation channel is for client-rendered apps. `Runtime.hydrate` rejects `lazyComposition` before adopting the server DOM. The experimental server renderer does not run the loading channel. SSR and SSG apps must statically resolve their implementation before rendering and use the ordinary configuration; the lazy configuration is not a replacement for a server-side composition API.

The routing example includes an executable smoke page at `/lazy.html`. Open Home, click **Open reports**, increment the loaded route, and return Home. The Reports module is a dynamic import, while Foldkit and Effect remain shared by one Runtime.

## API Reference

- `CompositionIdentity`: Schema and type for `{ buildId, key, requestId }`.
- `Composition<Model, Message, Services, View>`: typed root implementation. `View` defaults to `Document`; an element uses `Html`.
- `LazyCompositionConfig<Model, Message, Resources, Services, View>`: finite implementation loading and Model identity selection configuration. `load` returns an Effect with string failures; readiness and failure callbacks produce Messages.
