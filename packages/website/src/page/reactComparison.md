# Foldkit vs React: Side by Side

## Overview

This comparison uses the same [pixel art editor](/example-apps/pixel-art) in Foldkit and React. Both versions include grid editing, undo and redo, brush, fill, and eraser tools, mirror modes, localStorage persistence, PNG export, keyboard shortcuts, accessible controls, and a 32×32 grid that makes rendering work visible.

The React version uses React 19.2, `useReducer`, [Headless UI](https://headlessui.com), custom Hooks, and manual memoization. The Foldkit version uses a Model, Messages, update, Commands, Subscriptions, Foldkit UI Submodels, and view memoization.

This is a comparison of those two implementations. React applications can choose other state and effect architectures, and Foldkit applications can still be structured well or poorly within the framework’s constraints. The useful question is what each implementation makes explicit and what each framework makes unavoidable.

React can recreate many of Foldkit’s boundaries with libraries and conventions. Foldkit begins with those boundaries and builds its Runtime, DevTools, and tests around them. That is the argument this page puts under pressure.

:::Info{label="Try them both"}
The Foldkit version is in the [examples gallery](/example-apps/pixel-art). The [React version source](https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-react) is on GitHub.
:::

## Every Way State Can Change

Start with the input domain for application state. Both versions define a discriminated union and exhaustively route it through one state-transition function.

### Foldkit Message union {#foldkit-message}

The Foldkit application currently has 25 parent Messages:

::Snippet{name="comparisonFoldkitMessage" label="Foldkit messages"}

This union is the complete input type for the parent update function. User events, Command results, and child Submodel Messages all enter through it. A `Got*Message` variant marks a child boundary; the child’s own Message union provides the detailed input domain one level down.

Messages such as `SucceededExportPng` and `CompletedSaveCanvas` do not have to change the Model. They still record that a Command finished, and update must handle them.

:::Info{label="The input domain of update"}
After initialization, the application Model changes only when update handles a Message. Commands and Subscriptions cannot mutate it directly. They dispatch Messages back into the same function.
:::

### React Action type {#react-action}

The React reducer has 19 Actions:

::Snippet{name="comparisonReactAction" label="React actions"}

The Action union is the complete input type for this reducer. It is not the input domain for the whole component tree. PNG export begins in an event handler, localStorage persistence runs in an Effect, and Headless UI owns transient interaction state inside its components.

The difference in counts reflects those boundaries, not missing features. Foldkit has Messages for starting export and for successful export and save completion. It also wraps Messages from two Dialogs, one Listbox, and three RadioGroups. The React reducer instead has Actions for two dialog dismissals and a palette-theme selection, while the rest of the Headless UI interaction stays inside the library.

Both unions are useful indexes. The Foldkit union covers the parent Runtime channel. The React union covers the reducer channel chosen for this application.

## Declaration vs Procedure

The two entry points assemble the same application in different ways.

### React App component {#react-app}

The React `App` component initializes the reducer, derives values, runs three custom Hooks, and passes state into child components:

::Snippet{name="comparisonReactApp" label="React App"}

The six Hooks have distinct jobs: one reducer, two memoized derived values, keyboard shortcuts, mouse release, and persistence. `Toolbar`, `Canvas`, and `HistoryPanel` receive the state slices they render plus `dispatch`. The Dialogs receive their controlled open state and dispatch.

This is ordinary explicit React composition. The component tree is also where state, lifecycle, rendering, and library components meet.

### Foldkit program

The Foldkit entry point supplies the Runtime with the application definitions:

::Snippet{name="comparisonFoldkitProgram" label="Foldkit program"}

`init` constructs the first Model and startup Commands. `Runtime.makeApplication` receives the Model and Flags Schemas, init, update, view, Subscriptions, and container. The Runtime dispatches Messages and executes lifecycle primitives.

The Foldkit view still passes Model data to smaller view functions as parameters. Those functions do not own Hook state or lifecycle, so the Runtime assembly stays separate from the view tree.

## Complete State Ownership {#state-management}

The two versions draw their application-state boundary differently.

### Foldkit Model (every UI component, fully exposed) {#foldkit-model}

The Foldkit Model describes application state with Effect Schema and uses `Option` for absent values. It also contains the Models for two Dialogs, one Listbox, and three RadioGroups:

::Snippet{name="comparisonFoldkitModel" label="Foldkit model"}

Those child Models expose transient interaction state such as whether a Listbox is open, its highlighted item, and its transition phase. The parent still owns selected values such as `paletteThemeIndex`; it passes the selected value into the child view and folds the child’s `Selected` OutMessage into parent state.

### React State (reducer fields, plus whatever Headless UI hides) {#react-state}

This React implementation uses plain TypeScript types and `null` for absence:

::Snippet{name="comparisonReactState" label="React state"}

The reducer owns grid state, selected values, export errors, and the controlled open state for both Dialogs. Headless UI owns its transient focus, keyboard, and transition state. That state exists at runtime but is intentionally encapsulated behind the component API.

React does not require this boundary. An application could use Schema, put more state in the reducer, or divide it among component Hooks, context, and external stores. Foldkit requires application and Submodel state to remain in the Model tree.

## The Complete Answer

For a given Message, Foldkit update returns both the next Model and the Commands caused by that transition. The React reducer returns the next state. Effects and event-handler work are composed elsewhere.

### Foldkit update (state + side effects) {#foldkit-update}

The return type is `{ model, commands? }`:

::Snippet{name="comparisonFoldkitUpdate" label="Foldkit update"}

`Message.match` requires a handler for every Message variant. `evo` preserves references for unchanged fields, which supports view memoization. A handler such as `ClickedUndo` returns the next Model and a `SaveCanvas` Command together.

:::Info{label="What update answers"}
For any parent Message, update shows the next parent Model and the Commands caused immediately by that Message. Subscriptions and Mounts have their own declarations because their lifetimes are not caused by a single update transition.
:::

### React reducer (state only) {#react-reducer}

The reducer returns `State`:

::Snippet{name="comparisonReactReducer" label="React reducer"}

The reducer exhaustively describes its state transitions. Persistence is not part of that return value, so `ClickedUndo` cannot show that localStorage will also be updated. That connection appears in the dependency list of `useLocalStorage`. Export takes another route through an event handler.

React permits libraries and application conventions that pair actions with Effects. This example uses standard reducer, Hook, and handler composition instead.

## Side Effects as Data {#side-effects}

Commands make event-driven side effects inspectable before they run. The pixel editor has two: `SaveCanvas` and `ExportPng`.

### Foldkit Command (effect as a named, inspectable value) {#foldkit-command}

Both Commands are named definitions with Schema-checked arguments and declared result Messages:

::Snippet{name="comparisonFoldkitCommand" label="Foldkit command"}

Update returns a Command value. The Runtime executes its Effect and dispatches the resulting Message. Foldkit DevTools can associate the Command with the Message and Model transition that produced it, and Story or Scene tests can inspect or resolve the same value.

:::Info{label="Effect locations in this application"}
Event-driven work is in `command.ts`. Keyboard and mouse-release event sources are Subscriptions in `subscription.ts`. This application does not need a Mount. The primitive identifies why each effect exists.
:::

### React useEffect (effect as an implicit reaction) {#react-useeffect}

The persistence Hook reacts to the state values in its dependency array:

::Snippet{name="comparisonReactUseEffect" label="React useEffect"}

The React implementation has several effect locations. PNG export runs from `handleExport` in `App.tsx`. Persistence runs in `useLocalStorage`. Keyboard and mouse listeners run in two other custom Hooks. Headless UI manages the effects required by its components.

That distribution follows React’s component and Hook model. To understand a reducer transition and its downstream effects, you read the reducer together with the Hooks and handlers that observe or initiate work.

## What Your Tests Can See

The test boundary follows the production boundary in each implementation.

Foldkit Story tests call update and receive both the Model and Commands. The React reducer tests call the reducer and receive state. The React suite uses component tests for behavior that lives in Effects or event handlers.

### Foldkit test (state + side effects in one story) {#foldkit-test}

`story` dispatches Messages and resolves the Commands returned by update:

::Snippet{name="comparisonFoldkitTest" label="Foldkit test"}

`Command.resolve(SaveCanvas, CompletedSaveCanvas())` verifies that a matching Command is pending, supplies its result Message, and continues the state-machine test. Removing that Command from `ReleasedMouse` makes this Story fail at the resolution step.

### React test (state only) {#react-test}

The reducer test covers the same paint and undo transitions:

::Snippet{name="comparisonReactTest" label="React test"}

It does not assert on persistence because persistence is outside the reducer. This is an appropriate unit boundary for the reducer.

### React test (side effects require mocking + DOM + async) {#react-side-effect-test}

The persistence test crosses the component boundary:

::Snippet{name="comparisonReactSideEffectTest" label="React side-effect test"}

It renders `App` in jsdom, simulates a stroke, spies on localStorage, and waits for the Effect. That test exercises the connection between the reducer state and `useLocalStorage`, which the reducer test cannot see.

|                       | Foldkit Story                        | React tests in this application                    |
| --------------------- | ------------------------------------ | -------------------------------------------------- |
| State transition      | Model after Messages                 | State after Actions                                |
| Event-driven effect   | Inspect or resolve returned Commands | Exercise the handler or Hook at component boundary |
| Persistence assertion | Resolve `SaveCanvas`                 | Spy on localStorage and wait for the Effect        |
| Infrastructure        | `foldkit/story`, no DOM              | Vitest, React Testing Library, and jsdom           |
| Timing in examples    | Synchronous Command resolution       | `waitFor` for the Effect-based persistence test    |

## Interaction Testing Without a DOM {#interaction-testing}

[Scene](/testing/scene) renders Foldkit virtual DOM and dispatches the Messages attached to matching elements. React Testing Library renders React components into jsdom and dispatches browser-like events.

### Foldkit Scene test (virtual DOM, synchronous) {#foldkit-scene-test}

The Scene test clicks Export, resolves the resulting Commands, and dismisses the Dialog:

::Snippet{name="comparisonFoldkitSceneTest" label="Foldkit scene test"}

This test separates intent from outcome. It verifies that the click produces `ExportPng`, then chooses a `FailedExportPng` result and verifies the resulting UI. It does not execute the PNG Effect or prove that a real canvas failure becomes that Message. A separate Command test can cover that boundary when needed.

### React Testing Library (jsdom, mocking, imperative) {#react-scene-test}

The React test drives the component and stubs the canvas boundary:

::Snippet{name="comparisonReactSceneTest" label="React interaction test"}

This is a broader integration test. It reaches `handleExport` and the export implementation, where the mocked `getContext` failure dispatches `ExportFailed`. It then observes the Dialog through the rendered interface.

The two tests make different trade-offs. Scene can assert separately that a click requested a Command and that each possible result produces the right UI. The React test covers the handler-to-browser-API path in one flow, but it needs a browser-API substitute in jsdom.

|               | Foldkit Scene                  | React Testing Library in this example |
| ------------- | ------------------------------ | ------------------------------------- |
| Render target | Virtual DOM                    | jsdom                                 |
| Queries       | `role()`, `text()`, `label()`  | `screen.getByRole()`, `findByText()`  |
| Side effects  | Commands inspected or resolved | Handler and Effect execute            |
| Browser API   | Not exercised by this Scene    | Canvas boundary mocked                |
| Timing        | Synchronous in this test       | Async user events and `findByText`    |

## Streams vs Hooks

Both applications listen for keyboard shortcuts and mouse release. The mouse-release listener should exist only while drawing.

### Foldkit Subscriptions

The Subscription declares that lifetime from Model dependencies:

::Snippet{name="comparisonFoldkitSubscription" label="Foldkit subscription"}

The keyboard stream is persistent. The mouse-release stream is active only when `isDrawing` is true. The Runtime compares Subscription dependencies after each update and scopes each Stream accordingly.

### React hooks

The React custom Hooks express the same lifetime with Effects:

::Snippet{name="comparisonReactHooks" label="React hooks"}

`useMouseRelease` returns without installing a listener when drawing is inactive. When active, it installs the listener and returns its cleanup. The dependency array tells React when to repeat that synchronization. The Hooks linter checks referenced dependencies; the setup function remains responsible for returning the matching cleanup.

## Your State or Theirs

Both applications use controlled values for selections and Dialog visibility. They differ in where transient component interaction state lives.

|                              | Foldkit UI                                                  | React + Headless UI                                 |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| Selected values / open state | Parent Model                                                | Reducer state passed through controlled props       |
| Transient interaction state  | Child Models inside the application Model                   | Encapsulated inside Headless UI components          |
| Events                       | Child Messages and OutMessages folded through parent update | Callback props such as `onChange` and `onClose`     |
| Accessibility behavior       | Implemented by Foldkit UI                                   | Implemented by Headless UI                          |
| Debugging                    | Parent and child Models appear in Foldkit DevTools          | App state and component internals use React’s tools |

Foldkit exposes more of the component state as application data. Headless UI deliberately hides more implementation state behind its component API. Neither choice changes who owns the selected palette theme or whether a Dialog is open in these two applications.

## Rendering Performance

Both implementations limit work around a performance-sensitive grid. Actual frame time depends on the browser, build, device, and interaction, so the code is more useful here than a single local profile.

### Foldkit memoization (data at the boundary) {#foldkit-memoization}

Foldkit memoizes view functions from arrays of Model-derived arguments:

::Snippet{name="comparisonFoldkitMemoization" label="Foldkit memoization"}

`createLazy` and `createKeyedLazy` compare arguments element by element. `evo` preserves references for unchanged Model fields, so panels whose inputs remain referentially equal can reuse their previous virtual DOM.

### React memoization (closures at the boundary) {#react-memoization}

The checked-in React version uses `memo`, `useMemo`, and `useCallback`:

::Snippet{name="comparisonReactMemoization" label="React memoization"}

`memo` compares props by reference. The application stabilizes derived values and handler props so memoized children can skip work. React Compiler 1.0 can generate much of this memoization for compatible components, and teams can adopt it incrementally. This comparison shows the source currently in the repository, which uses the manual forms.

The compiler affects render optimization. It does not move persistence into the reducer or turn event-handler work into returned values, so the earlier state and effect boundaries remain the same.

### One layer down: per-cell rendering {#cell-level-memoization}

The 32×32 canvas contains 1,024 cells. Here is the event boundary for one cell in each implementation.

::Snippet{name="comparisonFoldkitCellView" label="Foldkit cell view"}

The Foldkit cell attaches `PressedCell({ x, y })` and `EnteredCell({ x, y })` Message values. The event attributes dispatch those values to update.

::Snippet{name="comparisonReactCellView" label="React cell view"}

The React cell is a memoized component. Its callbacks close over `x`, `y`, and `dispatch`, and their dependency arrays keep those values current. React Compiler can produce equivalent memoization without the handwritten wrappers when enabled.

## Guarantees React Cannot Provide {#guarantees}

Within a Foldkit application, the framework enforces several properties that React leaves to the selected state and effect architecture. A React application can recreate some of them with a reducer, store, event system, or additional tooling, but React itself does not require them.

### The Message union as total input domain {#message-union-index}

The parent Message union is the total input domain of parent update. A child Submodel repeats that property behind its `Got*Message` wrapper. Every Runtime-driven Model transition therefore enters through a typed value from one of those unions.

React’s Action union provides the same property for this reducer. It does not cover state internal to Headless UI or work begun directly in handlers and Effects, because those paths do not use the reducer.

### Safe evolution under type pressure {#safe-evolution}

Both versions can exhaustively handle a new union variant in their transition function. Foldkit extends that check across the Runtime channel because every parent state transition uses a Message. Adding a Message makes `Message.match` fail until update handles it.

Exhaustiveness catches an omitted branch, not an incorrect branch or a forgotten product requirement. Tests still have to establish what the new case should do.

### Side effects as assertable values {#side-effects-as-values}

A Command has a name, arguments, result Messages, and identity in DevTools and tests. Story and Scene can assert that update returned it before choosing a result. React Effects and handlers are executable code rather than returned descriptions, so their tests observe execution or inject an application-specific abstraction.

### Time-travel that covers UI internals {#time-travel}

Foldkit DevTools records Messages and Model snapshots. Because Foldkit UI Submodels live in the Model, their interaction state participates in that history.

React DevTools inspects component state, and reducer-oriented tools can add action history for application state. Headless UI’s internal Hook state is not part of the pixel editor reducer, so it does not appear in a reducer replay.

### Tests share the runtime’s pipeline {#tests-share-runtime-pipeline}

Story calls update with Messages and handles the Commands update returns. Scene adds the actual Foldkit view and event attributes. The same values cross those boundaries in production and tests.

The React tests also exercise production reducers and components. Their extra jsdom and mocking requirements come from the browser and Hook boundaries selected by this implementation, not from an inability to test React code.

### One place to look when the Model is wrong {#one-update-function}

After init, Foldkit’s application Model is replaced only by update. A wrong Model transition therefore comes from an update handler or a helper it calls. Command and Subscription code can produce the wrong Message, but it cannot mutate the Model around update.

This React application gives its reducer state the same central transition point. Debugging can also cross the reducer boundary when an Effect dispatches the wrong Action or a Headless UI interaction concerns state outside the reducer.

### No stale closures in view, update, or Subscriptions {#no-stale-closures}

Foldkit update receives the current Model with each Message, and Subscription lifetimes are rebuilt from declared Model dependencies. The framework does not use Hook dependency arrays for either boundary.

Closures still exist in application code, and [Mount](/core/mount) arguments are intentionally captured when an element mounts. Commands also capture the arguments supplied when update creates them. Foldkit narrows where captured values matter; it does not remove JavaScript closures.

## Which Scales Better? {#scalability}

The pixel editor shows the structures each codebase will extend. Future features would still involve design choices on both sides.

### Remote persistence

In Foldkit, `ReleasedMouse` could return a `SyncCanvas` Command alongside `SaveCanvas`. In React, the application could extend the persistence Hook, add another Effect, or move synchronization behind an event-driven service. Request ordering, retries, and cancellation need explicit policy in either implementation.

Foldkit keeps the decision to start a Command beside the Model transition. React lets the application choose whether that decision belongs in a handler, Effect, middleware, or data library.

### Multiplayer editing {#multiplayer}

A multiplayer feature should define a wire protocol rather than send the entire UI Model. Foldkit can validate remote Messages or domain events with Schema and route accepted values through update. Local UI Submodels can remain local.

The React version can validate the same protocol and dispatch reducer Actions for accepted events. Foldkit supplies the single Message pipeline as a framework constraint; React requires the application to choose and maintain that boundary.

### Animation timeline

Both versions would add frames, a current index, and playback state. Foldkit can model playback as a Subscription that emits `AdvancedFrame`. React can model it with an Effect and `useEffectEvent`, which reads the current frame data without restarting the interval unless a synchronization dependency changes.

The difference remains placement. Foldkit sends each tick through update. React synchronizes the timer from component state and dispatches Actions from its callback.

### Persistent undo history {#persistent-undo}

Foldkit can persist undo history with a Command and restore it through init or an initialization Command. The React version can extend `useLocalStorage` or add an IndexedDB Hook and initialize reducer state from the stored value.

Both versions need versioning, decoding, and failure behavior for stored data. Foldkit’s Schema and Command result Messages provide built-in places for those concerns; React can use the validation and effect libraries the application selects.

Both applications can grow to support these features. The difference is whether each feature has to join an existing pipeline. Foldkit grows through the same named categories: Model fields, Messages, update handlers, Commands, Subscriptions, and Submodels. React grows through components, Hooks, reducer Actions, and any additional state or effect libraries the team chooses.

Foldkit’s constraint keeps paying the same dividend: a new behavior has a defined home and joins the same timeline. React preserves more freedom to choose that home, which is valuable until those choices become coordination work.

## Conclusion

The pixel editor makes the trade concrete. React keeps rendering and lifecycle close to components and can adopt an enormous ecosystem around them. Its reducer provides a strong state core, while handlers, custom Hooks, and Headless UI complete the application around that core.

Foldkit puts the application Model, state transitions, and event-driven Commands behind one Runtime channel. Subscriptions and Submodels follow the same typed-data approach, and Story, Scene, and DevTools operate on those values directly.

Choose React when its ecosystem and freedom to select an application architecture matter more than having one imposed by the framework. Choose Foldkit when you want the framework to enforce where state transitions, effects, and lifecycles belong instead of relying on each application to establish those boundaries. That constraint is not something Foldkit asks you to tolerate. It is what the framework is for.
