---
title: Foldkit 0.171.0
description: Rendering fixes, Dialog cleanup after crashes, smaller keyed view caches, less Subscription overhead, and concrete result Messages for Commands and Mounts. Also covering the Effect 4.1 upgrade in 0.170.0.
date: 2026-11-17
coverImage: /blog/foldkit-0-171-0/cover.png
coverImageAlt: The numbers 170 and 171 stacked in cyan, lime, yellow, and coral with black shadows on a light gray background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.171.0 fixes delayed renders and Dialogs that block the crash screen, and releases unused keyed view cache entries. This post also covers 0.170.0, which upgrades Foldkit and its companion packages to Effect 4.1.

## Rendering and Dialog fixes

[Animation-frame Subscription](/core/subscriptions#animation-frames) updates can now render before the current frame paints instead of waiting another frame. The page can also now redraw during sustained Message traffic instead of waiting indefinitely for a quiet moment. That redraw can skip a View Transition so waiting input changes appear on screen.

An app that crashes with a modal Dialog open now removes the Dialog's restrictions on input and scrolling before showing the [crash view](/core/crash-view#modal-dialogs). The crash screen can receive input and scroll. Dialogs in other embedded apps stay open.

While a Dialog is open, Foldkit now preserves changes that browser extensions or other page scripts make to `inert` and `aria-hidden`. This prevents two scripts from repeatedly overwriting each other's changes and freezing the page.

Thank you to [@armancharan](https://github.com/armancharan) for the animation-frame fix, [@artile](https://github.com/artile) for the rendering fix, and [@rjdellecese](https://github.com/rjdellecese) for the fix that keeps the crash screen usable!

Thank you to [@jem-computer](https://github.com/jem-computer), [@qdhenry](https://github.com/qdhenry), and [@davidr-cy](https://github.com/davidr-cy) for reporting the animation, rendering, and Dialog issues!

## View caches and Subscriptions

By default, `createKeyedLazy()` now releases a cached view when its key is absent from a completed render. Apps that switch between a fixed set of views can opt into keeping them for reuse. The [view memoization guide](/core/view-memoization) explains the policy.

Foldkit now checks all Subscription dependencies in one pass and wakes only the Subscriptions whose dependencies changed. When several entries read a child Model through `Subscription.lift`, that read now runs once for each parent Model object.

Thank you to [@armancharan](https://github.com/armancharan) for the cache fix, [@ivebenfreed](https://github.com/ivebenfreed) for reporting the retained rows, and [@Makisuo](https://github.com/Makisuo) for the Subscription improvements!

## Result Messages and app shutdown

[Commands](/core/commands) and [Mounts](/core/mount) must now declare a non-empty list of result Message Schemas. TypeScript rejects `Schema.Never` declarations. When work completes without changing the Model, return a descriptive `Completed*` Message and handle it like any other fact.

For [embedded apps](/core/embedding), the new `disposeAsync()` method lets the host wait for the app to stop before reusing its container. It waits for Subscription, ManagedResource, and Command cleanup, including asynchronous work. Mount cleanup can finish after the Promise resolves.

Thank you to [@raulescobar-g](https://github.com/raulescobar-g) for raising the Mount testing issue and [@austeane](https://github.com/austeane) for `disposeAsync()`!

## Effect 4.1

0.170.0 upgraded Foldkit and its companion packages to Effect 4.1. Their dependency ranges now allow 4.1 patch releases. Update `effect` and the `@effect/*` packages in your app together. The Node adapter, Vite plugin, and DevTools MCP server require Node.js 22.19 or newer. The release notes cover the crypto API changes and canceling Mount setup that is waiting on asynchronous work.

Thank you to [@Makisuo](https://github.com/Makisuo) for the Effect compatibility report and [@phibkro](https://github.com/phibkro) for the upgrade proposal!

Thank you also to [@filipfalcon](https://github.com/filipfalcon) for packaging the Foldkit app skills for Cursor and Grok Bot!

See the [0.171.0 notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.171.0), [0.170.0 notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.170.0), and [companion package releases](https://github.com/foldkit/foldkit/releases) for all changes and migration details.

Thanks to everyone building with Foldkit!

Devin
