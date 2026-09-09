# Roadmap

## Current Goal

Foldkit is pre-1.0, and the current goal is a production-ready 1.0. All work in progress is in service of that release. For 1.0, Foldkit will target browser applications. Future view targets may include terminal and native mobile. Day-to-day work is tracked in [GitHub issues](https://github.com/foldkit/foldkit/issues).

## The Path to 1.0

Foldkit is a fairly ambitious framework. There is a lot of surface area to build and battle-test: the core Runtime, Foldkit UI, DevTools, Story and Scene testing, server rendering, and everything around them. The path to 1.0 is therefore less concrete than it would be for a UI rendering library that hands you a few rendering primitives and calls it done.

That said, there is a formula: build progressively more ambitious and feature-rich applications, fill in the gaps we find, and repeat. That is the path development has followed since I started working on Foldkit in June 2025, and every week the framework has improved. The path to 1.0 is essentially to continue doing that in a focused and structured way.

The 1.0 stamp means that you can build production-grade web applications in Foldkit. The framework needs to be feature-complete, and it needs to have been thoroughly tested by people building production-grade software with it. So 1.0 means people are _already_ building production-grade applications in Foldkit without having to fight the framework along the way.

The other half of the 1.0 stamp is API stability. Stable public APIs will follow semver.

There is not a neat linear checklist between here and there, but the remaining work falls into a few clear buckets.

### Build More Ambitious Applications

This is the big one. We have 30-something example applications built as I'm writing this. [foldkit.dev](https://foldkit.dev) and [Typing Terminal](/example-apps/typing-terminal) have exposed problems that isolated examples never would. I've also built a few closed-source projects that have pushed the boundaries of the framework. The next applications need to push on deep Submodel trees, complicated forms, async state, data-heavy interaction, performance, browser APIs, routing, Mount integrations, server handoffs, and all the unknown unknowns you can only discover by just plain building things.

When an application finds a missing primitive, an awkward API, or an unreasonable performance cost, that work goes back into Foldkit. No application should have to paper over a framework problem with a private convention.

### Promoting Experimental Surfaces

Server rendering and Machine are the two largest public surfaces still behind an experimental boundary. Server rendering needs more production use across different hosts. Machine needs to prove that it makes complicated state easier to understand. They will both graduate out of experimental before 1.0.

### Foldkit UI

Foldkit UI is an ambitious project in and of itself, being a UI library for Foldkit. It needs a complete accessibility audit with actual screen readers. Adding `axe-core` to CI will catch a useful class of regressions, but it does not replace using the components the way a person using a screen reader does. Every component page also needs to spell out its keyboard, focus, labeling, and screen-reader behavior.

### Performance

Foldkit can be faster. It's already fast enough for most applications, but there's no reason to do unnecessary work in the browser if we can avoid it. You can see the current benchmark numbers on the [Performance](/faq/performance) page. I plan on spending a few weeks to a month purely focused on performance before 1.0.

### Documentation

Documentation is hard and time-consuming, mostly because it's the thing agents are worst at producing. It's also really important that it's good. Foldkit introduces a new programming model for the frontend. Yes, it's The Elm Architecture, but it adds significant surface area outside classic TEA: first-class Submodels, Mount, ManagedResources, Story and Scene testing, SSR, Machine, to name a few. All of these need to be documented and communicated clearly. I plan on taking at least a month to just read through and edit all of the existing documentation.

### Freeze It and Let It Sit

At some point we'll enter the release candidate stage. Foldkit 1.0 ships when there is no known correctness gap serious enough to undermine the stability promise, the migration path is written, and the release candidate has held up outside this repository.

## What Exists Today

You can already build complete applications with Foldkit. People are already betting on it as the frontend of their startup's product. It's well past the toy side project phase.

The [example applications](/example-apps) range from a counter to a pixel art editor, map and chart integration, WebSockets, embedding Foldkit, and both static and request-time server rendering. They are intentionally small enough to study and showcase a particular subset of the Foldkit APIs.

## How Foldkit Got Here

The project has come a long way.

- **June 2025:** I started with the smallest useful version of The Elm Architecture on Effect: a Model, Messages, update, a view, and Commands.
- **August–September 2025:** virtual DOM rendering and routing landed, followed by the first prerelease and Create Foldkit App. At that point, Foldkit became something another person could actually install.
- **October 2025:** foldkit.dev went live, and I started the multiplayer typing game that became Typing Terminal.
- **February 2026:** regular 0.x releases replaced canaries. Foldkit UI began, and Subscriptions and ManagedResources gave external streams and stateful services explicit lifecycles.
- **March–April 2026:** DevTools made the running architecture visible. Scene joined Story so applications could be tested through either update or the rendered view. The Runtime also became inspectable by agents through the Model Context Protocol (MCP).
- **May 2026:** first-class Submodels and a rendering overhaul made large applications easier to divide without giving up one-way data flow or predictable performance.
- **June–July 2026:** Foldkit UI and DevTools became their own packages, the Oxlint plugin began enforcing Foldkit architecture, `@foldkit/markdown` shipped, and the rendering benchmark became reproducible from the repository.
- **August 2026:** build-time SSG and request-time SSR shipped behind an experimental boundary. This site moved onto Foldkit's own SSG path, and the documentation became available as Markdown and through a versioned JSON API for agents.

## What's Locked

Names and API signatures can still change before 1.0, but the architecture is locked. The Model remains the source of truth for application state. Messages are facts about what happened. After init, every Model change passes through update. Side effects happen through explicit boundaries, not inside update or view. That part isn't going anywhere.

Server rendering will not create a second kind of Foldkit application. It uses the same Model, init, and view as the browser, not a parallel server-side programming model. Foldkit will not add `'use client'` and `'use server'` style annotations.

## Beyond 1.0

Once the core is stable, I want to focus mostly on supporting the community and building with Foldkit and Effect in public. I also want to explore:

- **Server-executed Commands:** let an application do work on the server with a special kind of Command.
- **Rendering beyond the DOM:** apply the same Model, Message, and update architecture to another target. A terminal renderer is the first obvious experiment, with native mobile potentially following later.
- **Libraries around the core:** keep the core focused on architecture while higher-level capabilities grow as separate packages. Foldkit UI and `@foldkit/markdown` already follow that pattern.

## Following the Work

The day-to-day work lives in [GitHub issues](https://github.com/foldkit/foldkit/issues). Stable releases and their notes appear on [GitHub](https://github.com/foldkit/foldkit/releases). For questions or discussion, join the [Discord](https://discord.gg/kav8VNxqGm).
