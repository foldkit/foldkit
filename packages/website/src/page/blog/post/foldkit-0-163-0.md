---
title: Foldkit 0.162.0 and 0.163.0
description: Swipe-to-dismiss on Toast, clearer names for Model updates and key bindings, explicit canonical URLs, and SSR builds that no longer publish an unrendered HTML template.
date: 2026-09-19
coverImage: /blog/foldkit-0-163-0/cover.webp
coverImageAlt: Blue cloud imagery fills 162, overlapping an orange and pale pink 163 on a dark background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.163.0 is out. This post also covers 0.162.0.

These releases add swipe-to-dismiss on Toast, make canonical URLs an application decision, keep unrendered HTML out of SSR client output, and give several familiar APIs clearer names.

## Swipe-to-dismiss on Toast

Toast entries can now follow your pointer and dismiss with a swipe. The [Toast guide](/ui/toast#gestures) covers configuration and styling.

Thank you to [@elianiva](https://github.com/elianiva) for [contributing the implementation](https://github.com/foldkit/foldkit/pull/1295)!

## evo renamed to modifyFields

`evo` has been renamed to `modifyFields`. It was the last function in the core Foldkit API whose name was cute rather than clear. `makeConstrainedEvo` has also been renamed `makeModifyFieldsFor`. The behavior is unchanged.

## Explicit canonical URLs

Applications now choose their canonical URLs explicitly through `Document.canonical`. This lets the application decide whether a query parameter identifies different content or is just tracking information. The [Document guide](/core/view#the-document) covers the setup.

## SSR builds no longer emit an unrendered index.html

SSR builds no longer include an unrendered `index.html` template among the browser assets. This prevents static hosts from serving that template as a blank page. Prerendered pages are still generated normally.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for the [canonical URL](https://github.com/foldkit/foldkit/pull/1387) and [SSR build](https://github.com/foldkit/foldkit/pull/1388) changes!

## More in these releases

- Fixed a startup bug that could leave Subscriptions and ManagedResources out of sync with the Model. Thank you to [@WikiRik](https://github.com/WikiRik) for [reporting the timing bug with a runnable reproduction](https://github.com/foldkit/foldkit/issues/1404)!
- `h.OnPointerDown` callbacks now receive `pointerId` and the event target.
- Anchor now explains why an invalid trigger or panel prevents positioning.
- `Subscription.fromEvent` and `Subscription.keyBindings` now call their mapper `mapEvent`; `fromEventFilterMap` and `fromEventFilterMapPreventDefault` use `filterMapEvent`.
- In 0.162.0, `Subscription.keyboardShortcuts` became `Subscription.keyBindings`, and each binding's `shortcut` field became `keys`. The [Subscriptions guide](/core/subscriptions#key-bindings) shows the current API.

The full [0.162.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.162.0) and [0.163.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.163.0) release notes cover every package and migration detail.

Thanks to everyone building with Foldkit!

Devin
