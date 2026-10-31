# Runtime

## Overview

A compact Foldkit application can start in two files. `src/application.ts` declares the root Block, `Application`, and implements it as `ApplicationLive`. `src/entry.ts` passes both to `Program.make` or `Program.makeElement` and starts the Runtime. When the root's constructors yield services, `src/services.ts` builds them as `ApplicationLayer`. Importing application modules in a test does not start anything.

The Runtime API makes two independent choices:

- `Program.make` or `Program.makeElement` decides what the app owns. A program made with `make` owns the page; one made with `makeElement` owns only its container.
- `Runtime.run` or `Runtime.embed` decides who owns the runtime lifetime. `run` starts it for the page lifetime; `embed` returns a handle the host disposes.

Both program constructors take the root class and an options object. The `layer` option provides the root Block, every Block it creates, and every service their constructors yield. Its type must have no remaining requirements, so a program with a missing Block or service does not compile. [Layers](/core/layers) covers how to build that Layer.

`Program.make` and `Program.makeElement` only describe the program. The Runtime builds the Layer when it starts the program, constructs the root instance, and releases everything when it stops.

## Program.make {#to-application}

`Program.make` creates a program whose root owns the page. It supports apps that leave the URL alone and apps that manage routing. The difference is whether you provide a `routing` config.

### Without routing

Without a `routing` config, the program doesn't manage the URL bar:

::Snippet{name="runToApplication" label="Application without routing"}

### With routing

With a `routing` config, the program manages the URL bar. The root takes `{ url }` as its args and receives the starting URL:

::Snippet{name="runRoutedApplication" label="A root that receives the URL"}

::Snippet{name="runToApplicationRouting" label="Application with routing"}

The `routing` config has two handlers. Pass `onUrlRequest: Application.Message.ClickedLink` when that Message accepts `{ request }`, and `onUrlChange: Application.Message.ChangedUrl` when that Message accepts `{ url }`. A callback works when the payload needs another shape. A root that takes `{ url }` requires `routing`, and `Program.make` rejects one without it. See [Routing & Navigation](/core/routing-and-navigation) for the full walkthrough.

The root's view returns a `Document` rather than bare Html. A `Document` contains the body plus the document-level state that `Program.make` reapplies on every render. The tab title, the `<html>` language and direction, and the canonical and og\:url tags therefore stay in sync with the Model. A root view that returns Html renders as the body of a Document titled with the root Block id. [The Document](/core/view#the-document) lists every field.

## Program.makeElement {#to-element}

### Page Ownership

`Program.make` assumes it owns the page. That is correct for an app that owns its tab, but not for a widget on a page controlled by another application, where document updates would overwrite the host page's metadata.

Use `Program.makeElement` to scope a Foldkit app to its container. Its root view returns `Html`, and the Runtime never touches the document `<head>` or the `<html>` element. The same Blocks, Commands, Subscriptions, Mounts, and crash handling are available. Element programs do not own the URL bar, so `Program.makeElement` has no `routing` config.

::Snippet{name="runMakeElement" label="Using Program.makeElement"}

### Flags

Flags follow the same shape for both constructors. Pass the Flags Schema to the program constructor as `Flags`, and pass the Flags Effect to `Runtime.run` as `{ flags }`. The root takes `{ flags }` as its args. [Init & Flags](/core/init-and-flags#flags) shows the complete wiring.

## embed

### Host-Owned Lifetime

`Runtime.run` starts a program for the lifetime of the page and returns no handle. `Runtime.embed` starts one under a host-controlled lifetime, whether the host is React or anything else. The host seeds the program with Flags, exchanges values through Schema-typed Ports, and tears it down with `dispose`.

### Handle Boundary

The returned handle is the whole boundary. The host never reads the Model or dispatches Messages directly. Disposing the handle stops the runtime and its lifecycle work, removes the rendered DOM, and restores the empty container so it can be embedded again.

The [Embedding](/core/embedding) guide has the full walkthrough.
