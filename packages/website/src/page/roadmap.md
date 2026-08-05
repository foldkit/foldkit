# Roadmap

## Overview

Foldkit is pre-1.0, and the roadmap has one headline: ship a production-ready 1.0. Everything currently in flight serves that goal. The bigger directions beyond it wait until the core is stable.

Day-to-day work is tracked at ticket granularity in a private tracker, and that level of detail goes stale too quickly to be worth publishing. This page is the durable version: the blocks of work that gate 1.0, the directions after it, and the stances that will not change. [GitHub issues](https://github.com/foldkit/foldkit/issues) are the public surface for bugs and feature requests.

## The path to 1.0

1.0 is a stability commitment, not a feature milestone. It means the public API is locked under semver, the framework has been stress-tested by real applications, and the claims in these docs are backed by published evidence. The remaining work splits into blocks, roughly in order:

- **Framework capability:** finish the surface apps cannot be built without. This block is in progress.
- **Framework quality:** close correctness gaps before anything downstream measures them: test coverage for the newer primitives and consistent patterns across the UI components and example apps.
- **Real-world stress tests:** build example apps in the domains early adopters will build in. Every gap they surface is treated as a framework bug.
- **Benchmarks:** rendering numbers against other frameworks are already published on the performance page; the remaining work is reproducible numbers for TypeScript compilation and runtime throughput, held to the same bar.
- **Audits and DX:** an accessibility audit of the UI components against WCAG with real screen readers, axe-core regression checks in CI, and clearer runtime and type-level error messages when an API is misused.
- **Documentation:** a docs page for every core concept, an accessibility section for every UI component, and an end-to-end tutorial that builds a non-trivial app.
- **Release:** lock the public API, publish the semver commitment, empty the bug backlog, write the 0.x to 1.0 migration guide, and cut a burn-in release before tagging 1.0.

## After 1.0

Build-time static generation and per-request server rendering share one experimental hydration handoff: `renderToString` in `foldkit/experimental/server` and explicit adoption via `Runtime.hydrate`. The [Server Rendering](/core/server-rendering) and [What about SSR?](/faq/what-about-ssr) pages cover the architecture, with separate SSG and SSR reference applications.

Beyond that, these are directions being explored, not commitments:

- **Commands on the server:** a Command whose Effect runs on the server, so an app can reach a database or a private service without standing up a separate API. The client still just dispatches a Message and waits for the result.
- **Rendering beyond the DOM:** the Elm Architecture does not depend on the browser, and the terminal is the first candidate for a non-DOM render target.
- **The ecosystem outside core:** core stays the architecture: the runtime, routing, and the lifecycle primitives. Concerns that sit above it are likely to ship as libraries around Foldkit rather than inside it, the way the UI components already layer on top of core.

## What Foldkit will not do

Two stances are settled and will survive 1.0. Foldkit will not split the view into server and client halves the way React Server Components do: the view is one function of one Model, and cutting that tree across a network boundary breaks the architecture. And Foldkit will not adopt JSX. Both are explained in depth in [What about SSR?](/faq/what-about-ssr) and [Why no JSX?](/faq/why-no-jsx).

## How to follow along

Releases land continuously, and every change is recorded in the [changelog](https://github.com/foldkit/foldkit/blob/main/packages/foldkit/CHANGELOG.md). Bugs and feature requests live in [GitHub issues](https://github.com/foldkit/foldkit/issues). For questions and discussion, join the [Discord](https://discord.gg/kav8VNxqGm).
