# Getting Started

Built on Effect. Architected like Elm. Written in TypeScript. Let’s get your first application running.

:::Info{label="New to Foldkit?"}
If you’d like to learn about Foldkit’s architecture before starting a project, head to [Architecture](/core/architecture).
:::

## Requirements

`create-foldkit-app` requires Node.js 22.22.2 or newer.

Foldkit is built on the Effect v4 release candidate and pins its `effect` peer dependency to an exact version: `effect@4.0.0-rc.109`. Stable Effect v3 does not satisfy the pin, so adding Foldkit to a project that already uses Effect v3 will produce peer dependency conflicts, and upgrading Foldkit can require upgrading the Effect release candidate in lockstep. Projects scaffolded with `create-foldkit-app` get the correct versions automatically.

To add Foldkit to an existing project instead of scaffolding a new one, install it together with its pinned peer dependency:

```sh
npm install foldkit effect@4.0.0-rc.109
```

`@effect/platform-browser` is a separate package, pinned to the same version when you need it. `@foldkit/devtools` declares it as a peer dependency, and Effect's browser services such as `BrowserKeyValueStore` and `BrowserCrypto` come from it:

```sh
npm install @effect/platform-browser@4.0.0-rc.109
```

## Quick Start

[Create Foldkit app](https://github.com/foldkit/foldkit/tree/main/packages/create-foldkit-app) is the recommended way to get started. You’ll select an [example](/example-apps) to start with and the package manager you’d like to use.

```sh
npx create-foldkit-app@latest
```

Once the project is created, navigate to the project directory and start the dev server. Each command below is the same step for a different package manager, so pick the one you use:

```sh
pnpm dev
```

```sh
npm run dev
```

```sh
yarn dev
```

```sh
bun dev
```

:::Info{label="Coming from React or Elm?"}
If you know React, the [Coming from React](/react/coming-from-react) guide maps your existing knowledge onto Foldkit. If you know Elm, see [Foldkit vs Elm: Side by Side](/elm/foldkit-vs-elm-side-by-side).
:::

## Project Structure

A new Foldkit project has the following structure:

| File             | Description                                   |
| ---------------- | --------------------------------------------- |
| `src/main.ts`    | Your application code                         |
| `src/entry.ts`   | Runtime bootstrap, referenced from index.html |
| `src/styles.css` | Tailwind CSS entry point                      |
| `index.html`     | HTML entry point                              |
| `vite.config.ts` | Vite configuration with Foldkit HMR plugin    |
| `tsconfig.json`  | TypeScript configuration                      |
| `.oxlintrc.json` | Oxlint configuration                          |
| `.prettierrc`    | Prettier configuration                        |
| `AGENTS.md`      | AI coding assistant conventions               |

The generated project includes `pnpm lint` and `pnpm format`. See [Oxlint Plugin](/tooling/oxlint-plugin) for the Foldkit-specific oxlint rules.

`src/main.ts` holds the pure definitions for your application: Model, Messages, update, init, and view. `src/entry.ts` imports them and boots the runtime with `Runtime.makeApplication` and `Runtime.run`. Some starter examples keep `main.ts` in one file, while others split the Model, Messages, update, and view into separate modules.

When you’re ready to dig in, head to [Architecture](/core/architecture) to understand how the pieces fit together.

:::Info{label="Using AI?"}
Foldkit’s architecture makes AI-assisted development uniquely effective. See [AI](/ai/overview) for setup.
:::
