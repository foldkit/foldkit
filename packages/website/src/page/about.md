# About Foldkit

## What Foldkit Is

Foldkit is an open source TypeScript frontend framework built on [Effect](https://effect.website). It follows The Elm Architecture: an application has one Schema-defined Model, events arrive as Messages, a pure `update` function moves the Model forward, and every side effect is described as data and run by the runtime.

The framework ships routing, server rendering, a headless accessible component library, two test frameworks, DevTools, and a project scaffolder. A Foldkit application is a browser single-page application, optionally prerendered or server rendered.

## Who Builds It

Foldkit is built by Devin Jameson and developed in the open at [github.com/foldkit/foldkit](https://github.com/foldkit/foldkit). It is a community project, not a company product. There is no paid tier, no hosted service, and nothing to sign up for.

Everything is released under the MIT license. The published packages are `foldkit`, `@foldkit/ui`, `@foldkit/devtools`, `@foldkit/devtools-mcp`, `@foldkit/vite-plugin`, `@foldkit/markdown`, `@foldkit/oxlint-plugin`, and `create-foldkit-app`.

## How It Is Built

Every change lands through a pull request against `main`, with typechecking, linting, unit tests, and browser end-to-end tests running on each one. A merge that touches the site deploys straight to [foldkit.dev](https://foldkit.dev), and only when the bundled framework sources still match their published releases. Package releases take the longer path: they publish a canary snapshot first and deploy it to [canary.foldkit.dev](https://canary.foldkit.dev), which runs the same smoke tests against the real deployment before anything is promoted.

Releases go out through Changesets. Every user-visible change to a published package carries a changeset that becomes its changelog entry.

## Project Status

Foldkit is pre-1.0. The architecture is settled and the core API is stable in practice, but minor releases can still change public surface. The [roadmap](/introduction/roadmap) lists the work that gates 1.0, which features are experimental today, and which architectural decisions will not change.

## This Site

foldkit.dev is itself a Foldkit application. The documentation, the blog, the searchable API reference, and the in-browser playground all run through the same Model, update, and view that the docs describe. The [source is on GitHub](https://github.com/foldkit/foldkit/tree/main/packages/website).

The site is also built to be read by agents. Every page is available as Markdown, the full documentation is available as one file, and a read-only JSON [Content API](/api) describes the site to a program.

## Where to Go Next

- [Get Started](/get-started) creates a project and walks through the generated structure.
- [Why Foldkit](/introduction/why-foldkit) explains why Foldkit exists and the principles behind its design.
- [Contact](/contact) lists the ways to reach the project.
