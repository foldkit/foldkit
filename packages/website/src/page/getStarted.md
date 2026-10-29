# Get Started

Built on Effect. Architected like Elm. Written in TypeScript. Let’s get your first application running.

## Create a Project {#quick-start}

Before you begin, install Node.js 22.22.2 or newer and make sure the package manager you want to use is available. The [create-foldkit-app](https://github.com/foldkit/foldkit/tree/main/packages/create-foldkit-app) scaffolder is the recommended way to start.

### Run the Scaffolder

Run the scaffolder:

::Snippet{name="getStartedCreateProject" label="Create a Foldkit project"}

### Choose a Rendering Mode

The CLI asks for a project name, a rendering mode, and a package manager. If you choose a browser-only SPA, it also asks which [example](/example-apps) you want to start from. The other rendering modes create their own starter applications:

- **SPA:** renders entirely in the browser.
- **[Static generation](/core/server-rendering#build-time-ssg):** prerenders routes to static HTML, then hydrates them in the browser.
- **[Server rendering](/core/server-rendering):** renders each request on a Node server, then hydrates it in the browser.

### Start the Development Server

The scaffolder creates the project and installs its dependencies. Move into the new directory, then start the development server with the package manager you selected:

::Snippet{name="getStartedChangeDirectory" label="Enter the project directory"}

- pnpm: `pnpm dev`
- npm: `npm run dev`
- Yarn: `yarn dev`
- Bun: `bun dev`

Vite prints a local URL when the server is ready. Open it in your browser, and your first Foldkit application is running.

## Find Your Way Around {#project-structure}

The exact files depend on the rendering mode and starter example. The small browser-only Counter SPA shows the usual split.

### Application Files

The Counter starter begins with these files:

- `src/application.ts`: the typed Application and its implementation pieces
- `src/entry.ts`: runtime bootstrap referenced by `index.html`
- `src/styles.css`: Tailwind CSS entry point
- `index.html`: HTML entry point
- `vite.config.ts`: Vite configuration with `@foldkit/vite-plugin`
- `tsconfig.json`: TypeScript configuration
- `.oxlintrc.json`: Oxlint configuration
- `.oxlintrc.effect.json`: Effect type-aware lint configuration
- `.oxfmtrc.json`: Oxfmt configuration
- `AGENTS.md`: your instructions for AI coding assistants working on the project
- `FOLDKIT.md`: Foldkit's own conventions for those assistants, [replaced from the current template when you upgrade Foldkit](/ai/overview)

In a small starter, `src/application.ts` calls `Block.makeDefinition('Application', { Model, Message })`, creates a named `ApplicationComposition`, and assembles `ApplicationBlock`. The Definition authors Commands, Steps, lifecycle behavior, and Bindings; the Composition owns init, update, and the primary view after its child and Mount graph is fixed. Commands, Subscriptions, Mounts, ManagedResources, and their handler recipes stay on the root Block. Larger examples move substantial pieces into focused files as the application grows.

### Runtime Entry

For the Counter starter, `src/entry.ts` imports `ApplicationBlock` and passes it with the page container to `Program.make`. The returned lowercase `program` is a passive runtime input. A starter whose handlers need application Services defines `ApplicationLayer` in `services.ts`, then the entry calls `program.provide(ApplicationLayer)`. Importing the Block, creating the Program, and providing a Layer remain passive; startup happens only when the Runtime starts the Program.

### Project Scripts

The generated project also includes `lint` and `format` scripts. Run them with your selected package manager. For example: `pnpm lint` and `pnpm format`. The `lint` script checks Foldkit conventions and Effect usage. See [Oxlint Plugin](/tooling/oxlint-plugin) for the Foldkit-specific rules.

## Add Foldkit to an Existing Project {#requirements}

Skip this section if you used `create-foldkit-app`. Scaffolded projects already receive compatible package versions.

Foldkit uses Effect 4 stable. These installation instructions use the tested exact versions: `effect@4.0.0` and `@effect/platform-browser@4.0.0`. Install those versions together. Published peer ranges describe compatible versions; the installation command selects one tested version. When upgrading an existing app, update every Effect package to the same version. Use the stable import paths, such as `effect/http` and `effect/persistence`, in place of their `effect/unstable` paths.

Install Foldkit together with those Effect versions:

::Snippet{name="getStartedInstallFoldkit" label="Install Foldkit and Effect"}

## Where to Go Next

- Read [Architecture](/core/architecture) to understand the Model, Message, update, and view loop.
- If you know React, use [Coming from React](/react/coming-from-react) to map familiar ideas onto Foldkit. If you know Elm, compare the two in [Foldkit vs Elm: Side by Side](/elm/foldkit-vs-elm-side-by-side).
- For AI-assisted development, follow the setup in [AI](/ai/overview).
