---
title: Foldkit 0.165.0 and 0.166.0
description: Effect 4 stable, an experimental Query module for remote data, and improvements to child lifecycles, DevTools, and Vite.
date: 2026-10-04
coverImage: /blog/foldkit-0-166-0/cover.png
coverImageAlt: A lime upward arrow and coral downward arrow overlap around a question mark on a cyan background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.165.0 and 0.166.0 bring Effect 4 stable and an experimental Query module for remote data. They also improve child lifecycles, DevTools, and Vite.

## Query

The experimental Query module lets you define a Submodel that manages remote data through loading, failure, and refresh. The parent update decides when to load or refresh, and existing data stays available during a refresh.

With an existing `Post` Schema and `fetchPosts` Effect, include the Query's Model and Messages in the parent:

::Snippet{name="release0166Query" label="Defining the posts Submodel"}

The parent starts the first load in init and requests a refresh when the button is clicked. Its `GotPostsMessage` branch passes each fetch result back to Query:

::Snippet{name="release0166QueryUpdate" label="Loading and refreshing posts"}

The view reads an `AsyncData` value. `matchData` keeps rendering the posts while a refresh runs:

::Snippet{name="release0166QueryView" label="Rendering posts during a refresh"}

Add request arguments to create a KeyedQuery, which keeps separate results for resources such as posts by ID. The new [API Cache Query example](/example-apps/api-cache-query) shows a list of posts, details by post ID, and statistics refreshed by a Subscription.

Query is available from `foldkit/experimental`. See the [Query guide](/core/query) for the API.

Thank you to [@rodygosset](https://github.com/rodygosset) for [contributing Query](https://github.com/foldkit/foldkit/pull/1425) and the example!

## Effect 4 stable

Foldkit 0.165.0 updates the framework and its companion packages to Effect `4.0.0`. New SPA, SSG, and SSR projects from `create-foldkit-app` use Effect 4 stable too.

The LiveStore example is temporarily unavailable while its pinned upstream snapshot still uses prerelease Effect imports.

## More in these releases

- `Subscription.lift` now supports optional child Models, as `ManagedResource.lift` already does. Foldkit stops the child's Subscriptions when that child is absent.
- DevTools replaces Effect `Redacted` values with placeholders in its UI and MCP responses. The [DevTools MCP guide](/ai/mcp) explains what a connected client can inspect.
- Foldkit's Vite plugin now bundles installed libraries that depend on Foldkit during server rendering, avoiding a second Foldkit copy. Thank you to [@filipfalcon](https://github.com/filipfalcon) for [reporting](https://github.com/foldkit/foldkit/issues/1562) and [fixing the issue](https://github.com/foldkit/foldkit/pull/1564)!
- The Vite plugin prevents duplicate Effect instances in development, and the Foldkit Oxlint plugin supports `effect-oxlint` 0.4. Thank you to [@birbprophet](https://github.com/birbprophet) for the [Vite](https://github.com/foldkit/foldkit/pull/1566) and [Oxlint](https://github.com/foldkit/foldkit/pull/1569) fixes!
- Documentation examples now have titles and copy controls. Long examples can be expanded when needed.

## Upgrading

Upgrade your Effect packages to `4.0.0` together. Move HTTP, persistence, RPC, reactivity, and CLI imports to their stable paths.

In 0.166.0, rename the child accessor in `Subscription.lift` and `ManagedResource.lift` to `read`. The Subscription reader now returns an `Option`; use `Option.some` for an always-present child. DevTools 0.166.0 requires Foldkit 0.166.0 or newer.

The full [0.165.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.165.0) and [0.166.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.166.0) release notes cover the remaining migration details.

Thanks to everyone building with Foldkit!

Devin
