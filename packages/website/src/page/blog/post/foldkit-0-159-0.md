---
title: Foldkit 0.159.0
description: Foldkit's Vite plugin now builds a portable Web fetch handler for Node and Workers, with smaller updates to browser input, accessibility, and tooling.
date: 2026-09-12
coverImage: /blog/foldkit-0-159-0/cover.webp
coverImageAlt: The number 159 in oversized lime green type cropped inside a dark browser window on a charcoal background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.159.0 is out. The main change is a portable `fetch` handler for server-rendered applications.

## A portable server bundle

In 0.155.0, Foldkit moved the browser build, server build, and prerendering into one `vite build`. But the server build still asked you to choose a host entry: a Node HTTP process or a custom Worker.

`@foldkit/vite-plugin` 0.21.0 now builds a Web `fetch` handler. The same server module can run on Node or Workers:

::Snippet{name="release0159ViteBuild" label="server build configuration"}

Run `vite build` and the server output is `dist/server/fetch.js`, with a default export shaped as `{ fetch }`. A Node host serves the built client assets and passes page requests to that handler. A Worker can default-export the same module.

This is a breaking change. Remove `ssr.build.entry` and keep `ssr.serverEntry`. Vite no longer builds your Node host. Use the [SSR example's `scripts/serve.ts`](https://github.com/foldkit/foldkit/blob/main/examples/ssr/scripts/serve.ts) as a reference, and start it with `node scripts/serve.ts` instead of `node dist/server/main.js`. Hosts importing `dist/server/entry.server.js` should import `dist/server/fetch.js`, which still exports `renderPage`.

The [server rendering guide](/core/server-rendering) covers the build and host setup. New SSR projects from `create-foldkit-app` also pin `@effect/platform-node-shared` to their Effect version, so a fresh install cannot silently pick up an incompatible newer prerelease.

## More in this release

There are also several smaller updates:

- `OnInput` and `OnChange` support contenteditable hosts, with new `beforeinput` handlers and Scene steps for editor interactions.
- `OnKeyDownSelf` and `OnKeyDownSelfPreventDefault` ignore key events that bubble up from children.
- CustomElement events decode their payloads against the declared Schema before dispatching a Message.
- Domain and Route unions gain `matchOrElse` for handling selected variants with a shared fallback.
- Canceling a file picker inside a Dialog now keeps the Dialog open.
- Dialog and form controls now require an explicit opt-in for `aria-describedby`.
- `Runtime.embed` reports startup failures in the console.
- The DevTools MCP bin and oxlint plugin have smaller bundles built with Rolldown.
- The Model preservation API uses live reload terminology, including the renamed `foldkit/model-preservation` import.
- A new [anti-patterns guide](/patterns/anti-patterns) covers common Foldkit mistakes and what to do instead.

The [0.159.0 release notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.159.0) have more context and the migration steps for the breaking changes.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for the portable server bundle, the Rolldown migration, and documentation improvements. Thank you also to [@artile](https://github.com/artile) for correcting the documentation snippets and UI overview, and to [@armancharan](https://github.com/armancharan) for the `Runtime.embed` startup reporting fix!

Thanks to everyone building with Foldkit!

Devin
