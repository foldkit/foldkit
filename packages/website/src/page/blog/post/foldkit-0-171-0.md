---
title: Foldkit 0.171.0
description: Rendering and modal recovery fixes, smaller keyed view caches, less Subscription overhead, and concrete result Messages for Commands and Mounts. Also covering the Effect 4.1 upgrade in 0.170.0.
date: 2026-11-17
coverImage: /blog/foldkit-0-171-0/cover.png
coverImageAlt: The numbers 170 and 171 stacked in cyan, lime, yellow, and coral with black shadows on a light gray background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.171.0 improves rendering under load, modal recovery, and memory use in keyed views. This post also covers 0.170.0, which upgrades Foldkit and its companion packages to Effect 4.1.

## Rendering and recovery

[Animation-frame Subscription](/core/subscriptions#animation-frames) updates can render in the same frame, avoiding an extra frame of delay. Sustained Message traffic also gets a chance to reach the screen: a render can catch up with the waiting batch of Messages instead of being postponed indefinitely. That catch-up can skip a View Transition so queued input reaches the DOM.

An app that crashes with a modal Dialog open releases its modal isolation and scroll lock before showing the [crash view](/core/crash-view#modal-dialogs). Other embedded apps keep their own Dialogs. Modal isolation also preserves changes that browser extensions or other page scripts make to `inert` and `aria-hidden`, preventing observer loops that could freeze the page.

Thank you to [@armancharan](https://github.com/armancharan) for the animation-frame fix, [@artile](https://github.com/artile) for the rendering fix, and [@rjdellecese](https://github.com/rjdellecese) for the modal crash recovery fix!

Thank you to [@jem-computer](https://github.com/jem-computer), [@qdhenry](https://github.com/qdhenry), and [@davidr-cy](https://github.com/davidr-cy) for reporting the animation, rendering, and modal issues!

## Keyed caches and Subscriptions

`createKeyedLazy()` releases cached entries absent from the latest completed render by default. Explicit retention is available for bounded caches that need to reuse an entry after its key disappears. The [view memoization guide](/core/view-memoization) explains the policy.

Foldkit derives Subscription dependencies together and wakes a Subscription's stream only when its dependencies change. `Subscription.lift` also shares child Model projections across entries reading the same parent Model object.

Thank you to [@armancharan](https://github.com/armancharan) for the cache fix, [@ivebenfreed](https://github.com/ivebenfreed) for reporting the retained rows, and [@Makisuo](https://github.com/Makisuo) for the Subscription improvements!

## Result Messages and embedded cleanup

[Commands](/core/commands) and [Mounts](/core/mount) must declare a non-empty list of result Message Schemas. TypeScript rejects `Schema.Never` declarations. When work completes without changing the Model, return a descriptive `Completed*` Message and handle it like any other fact.

For [embedded apps](/core/embedding), `disposeAsync()` lets the host await runtime cleanup before reusing the container. It waits for Subscription, ManagedResource, and Command finalizers, including asynchronous release. Mount finalizers can finish separately.

Thank you to [@raulescobar-g](https://github.com/raulescobar-g) for raising the Mount testing issue and [@austeane](https://github.com/austeane) for awaitable disposal!

## Effect 4.1

0.170.0 moves Foldkit and its companion packages to Effect 4.1 and accepts compatible 4.1 patch releases. Update `effect` and the `@effect/*` packages in your app together. The Node adapter, Vite plugin, and DevTools MCP server require Node.js 22.19 or newer. The release notes cover the crypto API changes and asynchronous Mount acquisition.

Thank you to [@Makisuo](https://github.com/Makisuo) for the Effect compatibility report and [@phibkro](https://github.com/phibkro) for the upgrade proposal!

Thank you also to [@filipfalcon](https://github.com/filipfalcon) for packaging the Foldkit app skills for Cursor and Grok Bot!

See the [0.171.0 notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.171.0), [0.170.0 notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.170.0), and [companion package releases](https://github.com/foldkit/foldkit/releases) for all changes and migration details.

Thanks to everyone building with Foldkit!

Devin
