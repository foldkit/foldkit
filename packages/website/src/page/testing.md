# Testing

## Story and Scene {#overview}

Foldkit tests at two boundaries. Story calls update directly. Scene enters through the rendered view. Neither test runs a browser or executes the Effects inside Commands, so both stay deterministic and fast.

|                | Story                                        | Scene                                              |
| -------------- | -------------------------------------------- | -------------------------------------------------- |
| Enters through | A Message                                    | An interaction or lifecycle result                 |
| Observes       | Model changes, Commands, and OutMessages     | Rendered output, Commands, Mounts, and OutMessages |
| Best suited to | Update logic, edge cases, and Command wiring | User flows, view behavior, and accessibility       |

Use both. Story proves the state machine behaves correctly. Scene proves that a person can reach that behavior through the view.

Name each file for the boundary it tests:

- `story.test.ts` drives update.
- `scene.test.ts` drives the rendered view.
- When one folder has several tests of the same kind, prefix the subject: `login.story.test.ts`.
- Keep root-level Scene tests for flows that cross pages. Colocate page and Submodel tests with the code they exercise.

The names stay accurate whether update and view live together or in separate files. See [Project Organization](/patterns/project-organization) for the full layout.

## Story

`story` starts from a Model, sends Messages through update, and keeps Commands as data until the test supplies their result Messages. See the [Story](/testing/story) page for the full API.

Story can test a root update or a child update in isolation. The update function is the contract at either level.

::Snippet{name="counterCommandsTest" label="Story example"}

## Scene

`scene` renders the view after every step. Locators find elements by role, label, placeholder, and visible text. Interactions invoke the view's event handlers, while cause-named steps supply Subscription, ManagedResource, and CustomElement results. Scene also tracks pending Commands and Mounts. See the [Scene](/testing/scene) page for the full API.

Scene can also start at the root or at a child Submodel. `withViewInputs` adapts a Submodel view that needs ViewInputs, and `expectOutMessage` checks a child's OutMessage directly.

Choose the level by ownership. Test a Submodel's rendering, interactions, Commands, and OutMessages at the Submodel. Test parent folding, lifted Commands, route changes, and parent-computed ViewInputs at the root. Those behaviors cross the boundary and cannot be observed from the child.

::Snippet{name="sceneWeatherFlow" label="Scene example"}

## Testing with Bun {#bun}

Story and Scene tests also run under `bun test`. Bun needs two things that the Vitest config of a new project provides: a DOM for the tests that touch one, and Foldkit's Scene matchers on its `expect`.

To start a new project that tests with Bun, pass `--test-runner bun` along with `--package-manager bun`:

::Snippet{name="testingBunCreateProject" label="create a project that tests with Bun"}

The project gets a `bunfig.toml`, a `src/bun-setup.ts`, and a `test` script that runs `bun test`. The `map` and `pixel-art` examples cannot be combined with this flag. The `map` tests use `vi.hoisted`, and `pixel-art` has Vitest `bench` benchmarks. `bun:test` provides neither.

To switch an existing project, install happy-dom's global registrator and Bun's type declarations:

::Snippet{name="testingBunInstall" label="install the Bun test dependencies"}

Create a setup file that registers happy-dom and the Scene matchers:

::Snippet{name="testingBunSetup" label="src/bun-setup.ts"}

Then have Bun load it before every test file:

::Snippet{name="testingBunConfig" label="bunfig.toml"}

Keep the `url` option. Without it, happy-dom sets `location` to `about:blank`, and Effect's HttpClient resolves every request URL against `location`. A test that runs an HttpClient request then fails with an `InvalidUrl` error, even when the request URL is absolute.

Delete `vitest.config.ts` and `src/vitest-setup.ts`, and change the `test` script to `bun test`. In test files, import `describe`, `test`, and `expect` from `bun:test` instead of `vitest`. Story and Scene steps stay the same. Importing `foldkit/test/bun` adds the Scene matcher types to `bun:test` and loads Bun's types from `@types/bun`, so `tsconfig.json` needs no `types` entry.

Two things that work under Vitest do not work under `bun test`:

- `vi.hoisted`. `bun:test` provides `vi.mock` as an alias of `mock.module`, but it has no `vi.hoisted`.
- Vite plugins. `bun test` does not run them, so an import that only a Vite plugin can load fails. For example, a `.md` import that `@foldkit/markdown/vite` compiles.
