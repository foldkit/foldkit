# Runtime

## Overview

A Foldkit app usually starts in two files. `src/main.ts` holds the pure definitions: Model, Messages, update, init, and view. `src/entry.ts` imports them, creates the runtime, and starts it. Keeping runtime side effects in `entry.ts` leaves `main.ts` directly importable from tests.

The Runtime API makes two independent choices:

- `makeApplication` or `makeElement` decides what the app owns. An application owns the page; an element owns only its container.
- `Runtime.run` or `Runtime.embed` decides who owns the runtime lifetime. `run` starts it for the page lifetime; `embed` returns a handle the host disposes.

## makeApplication {#make-application}

`makeApplication` creates a Foldkit program for an app that owns the page. It supports both apps that leave the URL alone and apps that manage routing. The difference is whether you provide a `routing` config. To scope an app to one node without owning the page, use `makeElement`.

### Without routing

Without a `routing` config, the program doesn't manage the URL bar. This is the default for most programs.

::Snippet{name="runMakeApplication" label="makeApplication without routing example"}

### With routing

With a `routing` config, the program manages the URL bar. The init function receives the current URL and can use it to set the initial route.

::Snippet{name="runMakeApplicationRouting" label="makeApplication with routing example"}

The `routing` config has two handlers. `onUrlRequest` turns a clicked link into a Message, giving update the choice between internal and external navigation. `onUrlChange` turns the new URL into a Message so update can store the corresponding route in the Model. See [Routing & Navigation](/core/routing-and-navigation) for the full walkthrough.

The view returns a `Document` rather than bare HTML. A `Document` contains the body plus the document-level state that `makeApplication` reapplies on every render. The tab title, the `<html>` language and direction, and the canonical and og\:url tags therefore stay in sync with the Model. [The Document](/core/view#the-document) lists every field.

## makeElement {#make-element}

`makeApplication` assumes it owns the page. That is correct for an app that owns its tab, but not for a widget on a page controlled by another application, where document updates would overwrite the host page metadata.

Use `makeElement` to scope a Foldkit app to its container. Its view returns `Html` directly, and the runtime never touches the document `<head>` or the `<html>` element. The same Model, init, update, Command, Subscription, resource, and crash-handling architecture remains available. Element-scoped apps do not own the URL bar, so `makeElement` has no `routing` config.

Flags still resolve before init, but their wiring follows the ownership boundary. A page-owning application receives its Flags Effect when `Runtime.run` starts it. A self-contained element receives its Flags Effect in the `makeElement` config.

::Snippet{name="runMakeElement" label="makeElement example"}

## embed

`Runtime.run` starts a program for the lifetime of the page and returns no handle. `Runtime.embed` starts one under a host-controlled lifetime, whether the host is React or anything else. The host seeds the program with Flags, exchanges values through Schema-typed Ports, and tears it down with `dispose`.

The returned handle is the whole boundary. The host never reads the Model or dispatches Messages directly. Disposing the handle stops the runtime and its lifecycle work, removes the rendered DOM, and restores the empty container so it can be embedded again.

The [Embedding](/core/embedding) guide has the full walkthrough.
