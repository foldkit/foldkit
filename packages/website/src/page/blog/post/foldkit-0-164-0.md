---
title: Foldkit 0.164.0
description: Meter and Progress join Foldkit UI, DevTools MCP finds your dev server automatically, and coordinated client and server builds handle hydration identity for you.
date: 2026-09-30
coverImage: /blog/foldkit-0-164-0/cover.png
coverImageAlt: The number 164 above a lime green progress bar between 0 and 1 on a dark background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.164.0 is out. This release adds two UI primitives, simplifies DevTools MCP and server rendering setup, and improves Scene queries and UI behavior.

## Meter and Progress

Foldkit UI now includes [Meter](/ui/meter) for displaying a value within a known range, and [Progress](/ui/progress) for showing progress through a task, such as uploading a file or loading a page.

Both are headless: your Model supplies the value, and you control the markup and styling. Foldkit connects your labels to the controls and provides the range attributes and fill sizing.

Thank you to [@elianiva](https://github.com/elianiva) for [contributing both components](https://github.com/foldkit/foldkit/pull/1294), and to [@filipfalcon](https://github.com/filipfalcon) for [proposing them](https://github.com/foldkit/foldkit/issues/888)!

## Automatic DevTools MCP discovery

DevTools MCP now finds the development server for your project automatically and reconnects when it restarts. You no longer need to keep port settings in sync, and separate projects can run without competing for a relay port.

The discovered connection uses a token to protect Model inspection and Message dispatch. Existing fixed-port configurations still work, and Windows still requires a fixed port. The [DevTools MCP guide](/ai/mcp) covers setup.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for [contributing automatic discovery](https://github.com/foldkit/foldkit/pull/1368)!

## Simpler hydration setup

When one Vite build produces the client and server artifacts, the Foldkit plugin now generates their shared build id. Applications no longer need to pass it through their rendering and hydration entries by hand.

If the artifacts build in separate jobs, keep supplying the same explicit id to both. The [server rendering guide](/core/server-rendering#the-build-id) covers that setup.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for [proposing automatic build ids](https://github.com/foldkit/foldkit/issues/1431) and for the Scene, Subscription, build tooling, and server-rendering work in this release!

## More in this release

- [Slider](/ui/slider) supports vertical layouts and an option to keep the entire handle within the track. Thank you to [@elianiva](https://github.com/elianiva) for [contributing these options](https://github.com/foldkit/foldkit/pull/1293)!
- [Scene](/testing/scene) text locators accept regular expressions. Selectors support quoted attribute values containing spaces and `:not()`, while role locators gain `aria-current` filtering and more implicit HTML roles.
- [`Subscription.fromMediaQuery`](/core/subscriptions#media-queries) reports a media query's current value when it starts, then emits changes. For example, use it for reduced motion, system color scheme, or viewport breakpoints.
- Anchored panels inside a Dialog stay visible and interactive, including in scrolling dialogs. Interrupted enter and leave animations also wait for the current transition before removing an element.
- Fixed DOM ownership when lazy views share a constant root, and event listener updates when views reuse the same handlers.
- Server rendering handles deeply nested views without overflowing the call stack and reports the documented depth-limit error when a view exceeds the limit.
- Union matchers infer their result from every handler. Thank you to [@armancharan](https://github.com/armancharan) for [the fix](https://github.com/foldkit/foldkit/pull/1452)!
- Deployment integrations can read completed build metadata directly from the Vite plugin.

Thank you to [@wmaurer](https://github.com/wmaurer) for the Animation fixes and for [reporting](https://github.com/foldkit/foldkit/issues/1470) and fixing the Dialog overlay issue, and to [@artile](https://github.com/artile) for the [Popover reproduction](https://github.com/foldkit/foldkit/issues/1470#issuecomment-5889199816)!

## Upgrading

Pin your Effect packages to `4.0.0-rc.117`. The new Vite plugin requires Foldkit 0.164.0 or newer.

Custom Animation integrations and tests must carry the transition generation in their result Messages. Dialog overlays need a positioned trigger wrapper. If a custom overlay inside a Dialog uses `portalToContainingRoot` for its backdrop, switch to `portalBackdrop`. See the [Animation](/ui/animation) and [Dialog](/ui/dialog) guides for the current APIs and setup.

The full [0.164.0 release notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.164.0) cover every package and migration detail.

Thanks to everyone building with Foldkit!

Devin
