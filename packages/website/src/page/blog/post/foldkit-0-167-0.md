---
title: Foldkit 0.167.0
description: Code-rendered SSR documents, a Node host adapter, VirtualList scrolling improvements, and a helper for updating Submodels in collections.
date: 2026-10-07
coverImage: /blog/foldkit-0-167-0/cover.png
coverImageAlt: Rows of the number 167 in light gray, stretched to different widths and heights on a coral background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.167.0 brings code-rendered SSR documents, a Node host adapter, and more control over VirtualList scrolling. It also adds a helper for updating Submodels in collections and improves DevTools and Vite integrations.

## Server rendering and the Node adapter

SSR and SSG builds now render the whole HTML document from the server entry. `Server.renderDocument` supplies the application metadata and hydration markers, and you can wrap it to add custom head markup or set the document's language. Request-time rendering and prerendering use the same document renderer.

The new `@foldkit/node` package hosts a built application on Node, serving its static assets and forwarding application requests to its Fetch handler. New SSR projects from `create-foldkit-app` use the adapter.

The [server rendering guide](/core/server-rendering) covers document rendering, the Node adapter, and custom hosts. The [SSR example](/example-apps/ssr) shows the complete setup.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for proposing [code-rendered documents](https://github.com/foldkit/foldkit/issues/1390) and the [Node adapter](https://github.com/foldkit/foldkit/issues/1353)!

## VirtualList for chat and feeds

[VirtualList](/ui/virtual-list) now supports rows that change height and lists that follow appended content. A chat can stay at the bottom as new messages arrive, then preserve the reader's place when they scroll up or load older history.

Try appending messages at the bottom, then scroll up and append another. Click to expand a message and change its height, or load older messages above the viewport:

::Demo{name="chat"}

The [VirtualList guide](/ui/virtual-list#end-anchored-dynamic-heights) explains how this demo handles measured rows and older history.

## Updating a Submodel by key

`Update.foldChildAt` runs a child update for one Submodel selected by key. Define the fold once, then pass it the key and child Message. Here, the parent stores Applicant Submodels in an array, each with a stable entry ID:

::Snippet{name="release0167FoldChildAt" label="Updating an Applicant Submodel by key"}

`readAt` finds the child Model, `writeAt` stores the next one, and `toParentMessage` carries the key when lifting the child's Command results. If `readAt` returns `None`, the parent Model is unchanged.

This replaces a common pattern where each call to `foldChild` closes over an entry's key. The [job-application example](/example-apps/job-application) uses the new helper for education, work-history, and skills Submodels stored in arrays. The [Submodels guide](/core/submodel#fold-child-at) covers the fold and its OutMessage handling.

The Oxlint plugin also recognizes direct-field boundaries declared through `foldChildAt` and catches empty curried `toParentOutMessage` mappers.

Thank you to [@armancharan](https://github.com/armancharan) for [contributing the helper](https://github.com/foldkit/foldkit/pull/1599)!

## More in this release

- DevTools can copy Model, Message, Command, and Mount payloads as formatted JSON. The copied value includes collapsed fields, so you can share the whole payload without expanding the inspector tree.
- The Vite plugin applies its dependency and bundling rules in every environment, including named Cloudflare Worker environments. This fixes missing build IDs and duplicate runtime instances in those integrations.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for reporting and fixing the [DevTools overlay](https://github.com/foldkit/foldkit/pull/1593) and [Vite environment](https://github.com/foldkit/foldkit/pull/1591) issues!

See the full [0.167.0 release notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.167.0) for all changes, package versions, and upgrade guidance.

Thanks to everyone building with Foldkit!

Devin
