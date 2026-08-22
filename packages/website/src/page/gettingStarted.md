# Getting Started

Built on Effect. Architected like Elm. Written in TypeScript. Let’s get your first application running.

## Create a Project {#quick-start}

Before you begin, install Node.js 22.22.2 or newer and make sure the package manager you want to use is available. The [create-foldkit-app](https://github.com/foldkit/foldkit/tree/main/packages/create-foldkit-app) scaffolder is the recommended way to start.

Run the scaffolder:

```sh
npx create-foldkit-app@latest
```

The CLI asks for a project name, a rendering mode, and a package manager. If you choose a browser-only SPA, it also asks which [example](/example-apps) you want to start from. The other rendering modes create their own starter applications:

- **SPA:** renders entirely in the browser.
- **[Static generation](/core/server-rendering#build-time-ssg):** prerenders routes to static HTML, then hydrates them in the browser.
- **[Server rendering](/core/server-rendering):** renders each request on a Node server, then hydrates it in the browser.

The scaffolder creates the project and installs its dependencies. Move into the new directory, then start the development server with the package manager you selected:

```sh
cd your-project
```

- pnpm: `pnpm dev`
- npm: `npm run dev`
- Yarn: `yarn dev`
- Bun: `bun dev`

Vite prints a local URL when the server is ready. Open it in your browser, and your first Foldkit application is running.

## Find Your Way Around {#project-structure}

The exact files depend on the rendering mode and starter example. A small browser-only SPA such as Counter begins with these pieces:

- `src/main.ts`: pure application definitions
- `src/entry.ts`: runtime bootstrap referenced by `index.html`
- `src/styles.css`: Tailwind CSS entry point
- `index.html`: HTML entry point
- `vite.config.ts`: Vite configuration with `@foldkit/vite-plugin`
- `tsconfig.json`: TypeScript configuration
- `.oxlintrc.json`: Oxlint configuration
- `.prettierrc`: Prettier configuration
- `AGENTS.md`: conventions for AI coding assistants working on the project

In a small starter, `src/main.ts` holds the Model, Messages, update, init, and view. Larger examples move those definitions into focused modules as the application grows.

For the Counter starter, `src/entry.ts` imports the application definitions and starts the runtime with `Runtime.makeApplication` and `Runtime.run`. Other starters may compose the application from several modules or start a different host, but they keep runtime startup separate from the pure definitions. That separation lets tests import the application without starting a runtime as a side effect.

The generated project also includes `lint` and `format` scripts. Run them with your selected package manager. For example: `pnpm lint` and `pnpm format`. See [Oxlint Plugin](/tooling/oxlint-plugin) for the Foldkit-specific rules.

## Add Foldkit to an Existing Project {#requirements}

Skip this section if you used `create-foldkit-app`. Scaffolded projects already receive compatible package versions.

Foldkit currently uses the Effect v4 release candidate and pins its `effect` peer dependency to an exact version: `effect@4.0.0-rc.111`. Stable Effect v3 does not satisfy that pin. Adding Foldkit to an Effect v3 project produces peer dependency conflicts. When Foldkit moves to a new release candidate, an existing project may need to upgrade Effect at the same time.

Install Foldkit together with its pinned peer dependency:

```sh
npm install foldkit effect@4.0.0-rc.111
```

`@effect/platform-browser` is a separate package pinned to the same version. Install it when you use `@foldkit/devtools`, which declares it as a peer dependency, or when you need Effect browser services such as `BrowserKeyValueStore` and `BrowserCrypto`:

```sh
npm install @effect/platform-browser@4.0.0-rc.111
```

## Where to Go Next

- Read [Architecture](/core/architecture) to understand the Model, Message, update, and view loop.
- If you know React, use [Coming from React](/react/coming-from-react) to map familiar ideas onto Foldkit. If you know Elm, compare the two in [Foldkit vs Elm: Side by Side](/elm/foldkit-vs-elm-side-by-side).
- For AI-assisted development, follow the setup in [AI](/ai/overview).
