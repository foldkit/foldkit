---
title: Foldkit 0.154.0 and 0.155.0
description: Foldkit 0.154.0 and 0.155.0 expand click and focus controls, unify Vite builds for server-rendered apps, introduce HoverIntent, and more.
date: 2026-08-29
coverImage: /blog/foldkit-0-155-0/cover.webp
coverImageAlt: The version numbers 0.154.0 and 0.155.0 in large black type over layered translucent zeros on a lime-green background.
coverImageWidth: 1600
coverImageHeight: 1067
---

Foldkit 0.155.0 is out. I never announced 0.154.0, so this post covers both.

## What shipped in 0.154.0

0.154.0 shipped earlier this week with several additions worth calling out:

- `h.OnClick` gained `defaultAction`, `propagation`, and `focusSelector` controls. Foldkit applies them synchronously before dispatching the Message, covering browser behavior such as preventing a default action, stopping DOM propagation, and focusing an existing element inside the originating gesture. `h.OnClickFocus` was deprecated in 0.154.0 and is removed in 0.155.0. Thank you to [@hdoro](https://github.com/hdoro) for pointing out the limitation in `h.OnClick`!
- `h.OnFocusEnter` and `h.OnFocusLeave` model focus across a compound region. Put them on a common ancestor and Foldkit dispatches only when focus crosses that boundary, not when it moves between descendants.
- `Update.foldChild` and `Update.foldChildStep` can now emit a derived parent OutMessage from `foldOutMessage`. A child fact can update the current Submodel and produce a different fact for its parent without making the parent Message handler inspect the child Message again.
- Popover now supplies a headless `arrow` attribute bundle and keeps it positioned as the panel flips and shifts. You draw the arrow; Foldkit publishes the placement and offsets. Thank you to [@wmaurer](https://github.com/foldkit/foldkit/pull/1125) for contributing it!
- `@foldkit/oxlint-plugin` gained `foldkit/no-empty-to-parent-out-message`, which catches `toParentOutMessage` mappers that always return `undefined` and should be omitted.

Now for 0.155.0.

## One Vite build for the whole application

Foldkit gained [server rendering](/blog/foldkit-has-server-rendering) two weeks ago. It worked, but building a server-rendered application still happened across three commands: build the browser bundle, build the server bundle, then prerender the configured routes.

That separation mattered as soon as another Vite plugin needed to participate in the build. A deployment adapter or host plugin could join the browser build and never see the server build that followed in a separate process. It could deploy half an application. The browser and server builds could also mint different build ids, producing HTML that hydration correctly refused.

`@foldkit/vite-plugin` 0.20.0 now owns the whole build:

::Snippet{name="release0155ViteBuild" label="Vite build configuration"}

Run `vite build` once. Vite produces the browser bundle, the server bundle, and, when `prerender` is enabled, a page for every path exported by the server entry. Every environment belongs to the same build and shares the same build id.

The build also writes `foldkit.build.json` beside the server bundle. It records the output directories, server entry, and generated paths so a deployment host can derive its routing behavior from the artifact instead of asking you to repeat it in platform settings.

Applications without `ssr.build` still produce a browser bundle exactly as before.

This work came from [@filipfalcon](https://github.com/foldkit/foldkit/pull/1174). Thank you!

## Mount construction is pure now

`Mount.define` and `Mount.defineStream` used to take positional inputs, then accept their work in a second call. A Mount with args had a curried `args => element => Effect<Message>` body.

It looked compact, but it hid a bad boundary: the outer function ran when view constructed the MountAction. Anything written between those arrows ran during a pure view, on every render, rather than when the element entered the DOM.

Mount definitions now use one config object with named `args`, `messages`, and `execute` fields:

Before:

::Snippet{name="release0155MountBefore" label="Mount definition before 0.155.0"}

After:

::Snippet{name="release0155MountAfter" label="Mount definition in 0.155.0"}

`execute` has the same flat shape with or without args. Constructing a MountAction now runs nothing. The runtime calls `execute` only after the element exists.

This is a breaking change, and `@foldkit/ui` 0.155.0 now requires `foldkit` 0.155.0 because its Mount definitions use the new shape. The [Mount docs](/core/mount) have the complete migration.

Thank you to [@hdoro](https://github.com/hdoro) for suggesting this API change!

## HoverIntent joins @foldkit/ui

`@foldkit/ui` now includes `HoverIntent`, a headless Submodel for interactions that reveal a panel from a trigger.

It opens after a configurable pointer delay, stays open while the pointer or focus moves between the trigger and panel, and closes after a configurable grace period. Focus opens immediately. Escape closes immediately and prevents reopening until the pointer and focus have both left.

HoverIntent returns trigger and panel event bundles. It does not create markup, choose ARIA roles, position the panel, or style anything. A Hover Card can pair it with Anchor. A hover menu can use it to keep its items available as the pointer moves from the trigger into the panel.

The [HoverIntent docs](/ui/hover-intent) have current examples and API details.

Thank you to [@SyahrulBhudiF](https://github.com/foldkit/foldkit/pull/1179) for contributing it!

## Smaller APIs got sharper too

There is plenty more in 0.155.0:

- `FieldValidation.match` exhaustively matches `NotValidated`, `Validating`, `Valid`, and `Invalid` field states without a manual Effect Match pipeline.
- `CustomElement` builders now accept `ChildAttribute` alongside ordinary attributes, so published Submodel attribute groups compose with them just like native HTML element builders. Thank you to [@jay-zahiri](https://github.com/jay-zahiri) for noting this issue!
- Scene preserves every OutMessage emitted by one update-producing step in runtime order. Use `expectOutMessages` when a batch produces several.
- The renderer does less work in its hot path by caching unchanged document metadata, writing ordinary properties directly, and skipping module scans when a VNode has no module data.
- Dialog now releases its resources when `ShowDialog` fails or is interrupted, and when `CloseDialog` finds that the element is already gone. Thank you to [@wmaurer](https://github.com/foldkit/foldkit/pull/1191) for the fixes!
- ManagedResource now clears its reference and dispatches its release Message when the user-provided release effect fails.
- The deprecated `h.OnClickFocus` is gone. Use `h.OnClick(message, { focusSelector })`.

The packages now build and test with TypeScript 7 as well. The full [0.154.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.154.0) and [0.155.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.155.0) release notes cover every package and migration detail.

Thanks to everyone building with Foldkit!

Devin
