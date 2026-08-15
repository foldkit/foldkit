# Foldkit vs React: Side by Side

## Overview

We built the same [pixel art editor](/example-apps/pixel-art) ([try it live](https://pixel.foldkit.dev)) in both Foldkit and React. Same features, same styling, same algorithms. The goal: put the two approaches side by side and see where they differ. This is a non-trivial app: grid state with undo/redo stacks, three tools with mirror modes, flood fill, localStorage persistence, PNG export, keyboard shortcuts, accessible UI components, and performance-critical grid rendering. It’s the kind of app where architectural decisions compound over time.

The React version uses `useReducer`, [Headless UI](https://headlessui.com), and the best practices we’d use in production: TypeScript, Tailwind, memoization, custom hooks. We gave React every advantage. The result is a clean, well-structured React app written by people who know what they’re doing.

React is a good library with an unmatched ecosystem. This page isn’t a hit-piece. It’s an argument that Foldkit gives you structural guarantees React cannot provide by construction (guarantees about where state lives, how it changes, and what your tests can see) and that those guarantees matter once a codebase has to survive real feature work, real bugs, and real onboarding.

:::Info{label="Try them both"}
The Foldkit version is in the [examples gallery](/example-apps/pixel-art). The [React version source](https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-react) is on GitHub.
:::

## Every Way State Can Change

You’ve just joined a team and opened this codebase for the first time. Before you trace a single data flow, you want to know where state can change: the whole surface area, in one place, readable at a glance. Both codebases try to give you that. They do not succeed equally.

### Foldkit Message union {#foldkit-message}

In Foldkit, you read the [Message](/core/messages) union alongside the update function. 22 Message declarations, each handled by a case in update. The Model is the only place state lives, and the Message union is the only way to change the Model. So together they form a complete index of every way the app can change state, and exactly what changes for each event.

::Snippet{name="comparisonFoldkitMessage" label="Foldkit messages"}

Each declaration reads as a fact: the user pressed a cell, selected a tool, confirmed a grid size change. The PNG export failed. The canvas was saved. If it’s not in the `Message` union, it can’t produce a state change. When a UI component has its own [Submodel](/core/submodel), its `Message` union gives you the same complete picture one layer deeper. Every state transition is indexed in the types and implemented in the update function. Nowhere else.

:::Info{label="The single source of state changes"}
Every state change in the Foldkit application starts with a Message. Every side effect (Command) outcome returns to the update function as a Message. Every UI component interaction flows through a Message.
:::

### React Action type {#react-action}

Now try to answer the same question in React. Since this app uses `useReducer`, the closest equivalent is the `Action` type.

::Snippet{name="comparisonReactAction" label="React actions"}

The React `Action` type has 19 entries to Foldkit’s 22. That gap isn’t the React developer forgetting things. The two locate the same state changes in different parts of the app.

`ClickedExport` is missing: export fires through an inline handler in the App component, not through the reducer. `SucceededExportPng` and `CompletedSaveCanvas` are missing: Foldkit Commands return Messages to the update function when they resolve, so the runtime needs a Message for every outcome. React has no equivalent: imperative effects fire and either dispatch on failure or quietly return. And 3 `Got*Message` variants are missing because the React version delegates the Dialog and Listbox to Headless UI, which keeps their internal state inside its own hooks rather than surfacing deltas as values. The reverse runs the other way. React spells out `DismissedErrorDialog` and `DismissedGridSizeDialog`, while Foldkit’s shipped Dialog closes itself through its `close` bundle, so dismissal never becomes an app Message. And React dispatches `SelectedPaletteTheme` from the palette control directly, while Foldkit folds that selection out of `GotThemeListboxMessage` as it reads the theme Listbox’s OutMessage. Six Messages the React reducer lacks, three Actions it adds: 22 becomes 19.

Stating the difference plainly: Foldkit pulls side effect results and UI component state changes into the Message union as first-class facts. React leaves them distributed: effect outcomes inside handler closures and `useEffect` bodies, component-internal events inside library hooks. Both are valid design choices. But only one gives you a single answer when a teammate asks “how can state change in this app?”. The Message union catalogs every event, and the update function implements every transition.

## Declaration vs Procedure

The entry point of an application reveals its architecture. In Foldkit, the entry point is a declaration. In React, it’s a procedure.

### React App component {#react-app}

The React App component initializes the reducer, computes derived values, delegates global event listeners to custom hooks, and manually threads state into 6 child components:

::Snippet{name="comparisonReactApp" label="React App"}

Count the hooks: `useReducer`, two `useMemo`, plus three custom hooks. That’s 6 hooks in a single component. Remove any of them and something breaks.

Then look at the JSX. Each child receives `dispatch` (or a callback derived from it), plus individual slices of state. `Toolbar` takes 8 props. `Canvas` takes 9. Each child has its own `useCallback` wrappers internally. The prop threading is visible, manual, and exhausting.

### Foldkit program

A Foldkit app splits across two files. `src/main.ts` holds the pure definitions (Model, Messages, init, update, view, subscriptions). `src/entry.ts` imports them and hands the runtime the pieces that make up the program:

::Snippet{name="comparisonFoldkitProgram" label="Foldkit program"}

No refs. No manual memoization at the component boundary. No prop threading. The `init` function returns the initial Model and an empty list of startup Commands. `Runtime.makeApplication` takes the Model schema, init, update, view, and subscriptions, plus the Flags schema and DOM container. `Runtime.run` starts it. The runtime handles event dispatch, memoization, and side effect execution. You declare what the program is. The framework runs it.

## Complete State Ownership {#state-management}

Where does the state of this app actually live? Foldkit has one answer: the [Model](/core/model). React has many answers, and those answers compound over a codebase’s lifetime.

### Foldkit Model (every UI component, fully exposed) {#foldkit-model}

The Foldkit Model uses Effect Schema types with runtime validation, `Option<T>` instead of `null`, and a Submodel field for each stateful UI component. The `themeListbox` field alone exposes the listbox’s internal state: open/closed, transition phase, highlighted item, search query, activation trigger, last pointer position, orientation. The selection itself is not in there: the parent Model owns it as `paletteThemeIndex`, passes it into the listbox view as `maybeSelectedValue`, and folds the `Selected` OutMessage back into it. All of that interaction state exists in the React app too, but inside Headless UI’s hooks, where your reducer can’t see it.

::Snippet{name="comparisonFoldkitModel" label="Foldkit model"}

### React State (reducer fields, plus whatever Headless UI hides) {#react-state}

React’s state uses plain TypeScript types (compile-time only, no validation) with `null` for absent values. The reducer tracks two boolean `isOpen` flags for the dialogs and nothing else about the UI components. Everything that makes a Dialog a Dialog (transition state, focus trap, animation coordination) lives inside Headless UI’s hooks, out of reach of your reducer, your debugger, and your serialization layer.

And this comparison is already being generous. `pixel-art-react` was deliberately built with a single `useReducer` to make the shapes comparable. Nothing in React required that. Most production React codebases end up with state scattered across `useState` calls in leaf components, multiple `useReducer` instances, React contexts, and remote state libraries like TanStack Query. Each is a valid place for state to live, and none of them are connected to the others. Foldkit’s single-Model shape is a framework constraint. React leaves the shape to you, and in practice, that shape compounds over time.

::Snippet{name="comparisonReactState" label="React state"}

## The Complete Answer

Foldkit’s `update` function answers both halves of a single question: given this Model and this Message, what is the new Model, and what side effects should happen? It returns `[Model, Command[]]`. React’s `reducer` answers only the first half: given this state and this action, what is the new state? The second half (which side effects should fire) lives in `useEffect` hooks elsewhere in the codebase, with no type-level connection back to the action that caused them.

### Foldkit update (state + side effects) {#foldkit-update}

The update function returns `[Model, Command[]]`: new state and a list of named side effects. Every piece of the machinery is load-bearing. `M.tagsExhaustive` turns a forgotten Message into a compile error. `evo` preserves references for unchanged fields so downstream memoization works without extra bookkeeping. The tuple return type is the only channel through which side effects reach the runtime: no hooks, no imperative calls, no escape hatches.

::Snippet{name="comparisonFoldkitUpdate" label="Foldkit update"}

:::Info{label="One function, complete answers"}
What happens when the user presses a cell? What happens when they undo? Any question of that shape has its answer in this single function. In Foldkit, that’s the only way to change state. There is no other path.
:::

### React reducer (state only) {#react-reducer}

The reducer returns only the new state. Side effects happen elsewhere in `useEffect` hooks. TypeScript’s exhaustive switch catches a missing state case, but nothing equivalent catches a missing side effect: forget to fire a save on a new `ClickedClear` case, and the code still compiles.

::Snippet{name="comparisonReactReducer" label="React reducer"}

## Side Effects as Data {#side-effects}

In Foldkit, side effects are [Commands](/core/commands): named, typed values that describe work for the runtime to execute. They’re returned from the update function as data. You can see them in [Foldkit DevTools](/core/devtools), assert on them in tests, and trace exactly which Message caused which effect.

In React, side effects are imperative `useEffect` hooks that fire in response to state changes. They’re invisible to your reducer, and connected to state only through dependency arrays that the compiler cannot verify.

### Foldkit Command (effect as a named, inspectable value) {#foldkit-command}

Commands are defined with `Command.define`, wrapping an Effect that describes the work. Each Command has a name, a return type, and appears in DevTools alongside the Message that produced it and the Model diff it accompanied.

::Snippet{name="comparisonFoldkitCommand" label="Foldkit command"}

:::Info{label="A complete inventory of Commands"}
Every side effect the update function can produce is a Command, declared with `Command.define` in `command.ts`. This app has exactly two: `SaveCanvas` and `ExportPng`. That’s the complete list of effects your update function can emit. (External event streams like keyboard and mouse release are handled separately through Subscriptions in `subscription.ts`. Per-element DOM work like focus or third-party library setup is declared inline in the view via `OnMount`.)
:::

### React useEffect (effect as an implicit reaction) {#react-useeffect}

The `useEffect` hook watches for state changes and fires imperatively. There’s no trace connecting the reducer’s state transition to the effect that fires. The effect is a consequence, not a decision.

::Snippet{name="comparisonReactUseEffect" label="React useEffect"}

Now try to answer one question: what side effects does this app have? In Foldkit, you open two files. In React, there is no list. There is no file you can open.

Here’s where the React side effects actually live. The PNG export fires from an inline handler in `App.tsx`. The localStorage save lives in a `useEffect` inside `useLocalStorage.ts`. Keyboard shortcuts attach document listeners from a `useEffect` in `useKeyboardShortcuts.ts`. Mouse release tracking installs another document listener from `useMouseRelease.ts`. Dialog focus restoration and transition timing run inside Headless UI, in code you didn’t write and can’t see. To enumerate them, you grep for `useEffect`, then audit every component for inline handlers and `useCallback` bodies, then read the Headless UI source for what its components do internally.

In Foldkit, you know exactly where to look. The PNG export and localStorage save are Commands, declared in `command.ts`. The keyboard shortcuts and mouse release listener are [Subscriptions](/core/subscriptions), declared in `subscription.ts`. Dialog focus and transition timing belong to Foldkit UI components, which have their own `Message` unions and `Command` definitions you can drill into. Every side effect has a declared home. React’s side effects are a search problem.

## What Your Tests Can See

Both projects have full test suites covering the same behaviors. The experience of writing and reading them is not comparable.

React’s reducer tests dispatch actions and assert on the resulting state. That’s it. They have no way to verify which effects should fire, because effects don’t exist in the reducer’s return type. To test side effects, you need a completely different paradigm: render the full `<App />` component in jsdom, mock browser APIs, fire DOM events, and poll with `vi.waitFor()`.

Foldkit’s tests tell a different story. Look at the `Command.resolve` call in the snippet below: it asserts that releasing the mouse produced a `SaveCanvas` Command, provides the Message that Command will return, and advances the story. State and side effects get verified in the same synchronous pipeline, and every test that fires a Command resolves it by construction, not just the “side effect” tests. Any test that paints, undoes, or exports has Command resolution baked in. Delete a Command from the update function and every test that depended on it breaks. In React, that regression is silent.

### Foldkit test (state + side effects in one story) {#foldkit-test}

`story()` feeds Messages into the update function and inspects both Model and Commands at every step.

::Snippet{name="comparisonFoldkitTest" label="Foldkit test"}

### React test (state only) {#react-test}

Notice what’s missing from this test: any assertion about localStorage, PNG export, or any other side effect. The reducer can’t see them.

::Snippet{name="comparisonReactTest" label="React test"}

### React test (side effects require mocking + DOM + async) {#react-side-effect-test}

The persistence test below spies on `localStorage.setItem`, renders the full `<App />` component, fires a paint stroke via DOM events, then polls with `vi.waitFor()` until the async effect completes.

::Snippet{name="comparisonReactSideEffectTest" label="React side-effect test"}

:::Info{label="Nothing to mock"}
Foldkit’s update is a pure function. Side effects are return values, not imperative calls. That means you can test state transitions and side effects together in a unit test with zero mocking, zero DOM, and zero async. In React, testing a side effect means rendering the full component tree in jsdom, mocking browser APIs, firing synthetic events, and polling for async results.
:::

|                         | Foldkit                                           | React                                                                      |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| State testing           | Inspect Model at any point in story               | Assert on final state after dispatch                                       |
| Effect testing          | Resolve Commands in same pipeline                 | Separate tests with mocking + DOM                                          |
| Test reads as           | Chronological user story                          | State threading with intermediate variables                                |
| Catches removed effects | Yes: unresolved Command fails the story           | No: reducer tests can’t see effects                                        |
| Infrastructure          | `story()` from `foldkit/test` (no test libraries) | `@testing-library/react`, `jsdom`, `@testing-library/jest-dom`, setup file |
| Async                   | Never: everything is synchronous                  | Required for `useEffect` (`vi.waitFor`)                                    |

## Interaction Testing Without a DOM {#interaction-testing}

[Story](/testing/story) tests verify the state machine: Messages in, Model and Commands out. But what about testing from the user’s perspective: clicking buttons, reading text, checking disabled states? React uses `@testing-library/react` with jsdom. Foldkit uses [Scene](/testing/scene): a built-in interaction testing API that runs against the virtual DOM. No browser, no jsdom, no mocking. Same synchronous pipeline, same Command resolution, no test libraries to install.

### Foldkit Scene test (virtual DOM, synchronous) {#foldkit-scene-test}

`scene()` renders the view against a virtual DOM, finds elements by accessible role and text content, dispatches click events through the same update function, and resolves Commands inline. The entire test is synchronous. There is no DOM, no `jsdom`, no `render()`, no cleanup.

::Snippet{name="comparisonFoldkitSceneTest" label="Foldkit scene test"}

Scene finds the Dismiss button by `role('button', { name: 'Dismiss' })`, the same accessible name a screen reader would announce. The click dispatches `GotErrorDialogMessage` through update, which returns a `CloseDialog` Command. Resolve it, and the dialog is gone. Every step is visible, every side effect is accounted for, and the test reads as a chronological user story.

### React Testing Library (jsdom, mocking, imperative) {#react-scene-test}

The same test in React requires jsdom, browser API mocking, and async waiting. You mock `HTMLCanvasElement.prototype.getContext` to force the export to fail, render the component, and use `findByText` to wait for the async state update. The export side effect fires imperatively inside the component. There is no Command to resolve, so there is no way to assert that the effect happened other than checking the DOM after the fact.

::Snippet{name="comparisonReactSceneTest" label="React interaction test"}

The React test is shorter, but shorter is not the same as simpler. The Scene test shows every step of the causality chain as a value: the dispatched Message, the Command the update function returned, the Message that resolution produced, the next state. Each one is a verifiable assertion point. The React test is a black box with assertions at the edges: click, wait, check the DOM. If it fails with `"Export Failed" not in document`, you do not know which step broke: did the click fire, did the handler run, did state update, did React re-render, did the mock work? The Scene test tells you exactly.

The React test also is not testing the real failure case. It mocks `HTMLCanvasElement.prototype.getContext` to return null and hopes the component’s error path responds the same way it would in a real browser. The Scene test says `FailedExportPng({ error: … })` directly. No fake reality, no assumption that the mock behaves like production. And because Commands are values, you can assert on what a click produces without resolving it. `Command.expectExact(ExportPng)` verifies intent in isolation from outcome. React cannot separate the two: you either mock the effect and run the whole flow, or you do not test it at all.

Finally, the React test is coupled to the export implementation. Swap `getContext` for a different library and the test breaks at the mock, even though user-facing behavior is unchanged. The Scene test does not care how export is implemented. It only cares that a `FailedExportPng` Message arrives. It tests behavior, not mechanics.

|              | Foldkit Scene                 | React Testing Library                      |
| ------------ | ----------------------------- | ------------------------------------------ |
| DOM          | Virtual (no jsdom)            | jsdom (full browser simulation)            |
| Events       | Direct handler invocation     | Synthetic event simulation                 |
| Mocking      | None                          | Browser APIs (canvas, localStorage, …)     |
| Side effects | Commands resolved inline      | Fire imperatively, assert on DOM after     |
| Timing       | Synchronous                   | May require `act()` or `waitFor()`         |
| Queries      | `role()`, `text()`, `label()` | `screen.getByRole()`, `screen.getByText()` |
| Cleanup      | None                          | `cleanup()` in `afterEach`                 |

## Streams vs Hooks

Both apps need global event listeners for keyboard shortcuts and mouse release during drawing. Only one of those is always-on. The mouse release listener should only exist while the user is actively drawing. Otherwise you’re paying for a global handler on every `mouseup` event on the page.

### Foldkit Subscriptions

Foldkit uses [Subscriptions](/core/subscriptions): declarative streams whose lifecycle is derived from Model state. The `mouseRelease` Subscription says “this stream is active when `model.isDrawing` is true.” The runtime diffs the dependency values on each update and handles subscribe and unsubscribe for you. You never write `addEventListener`, `removeEventListener`, or a cleanup function. The runtime does it, and it uses the current Model every time.

::Snippet{name="comparisonFoldkitSubscription" label="Foldkit subscription"}

### React hooks

React uses `useEffect` hooks with manual setup, cleanup, and dependency arrays. The `useMouseRelease` hook returns early when `isDrawing` is false; it attaches and removes the listener through a cleanup function; it lists `[isDrawing, dispatch]` as dependencies. All of it is manual. Miss the cleanup and the listener leaks. Miss a dependency and the effect captures stale values and silently misbehaves. The framework can’t catch either for you. `useEffect` is a general-purpose escape hatch, so it has to trust you to write it correctly. Foldkit has no closures at the Subscription boundary. The view and Subscriptions always receive the current Model by construction.

::Snippet{name="comparisonReactHooks" label="React hooks"}

## Your State or Theirs

Foldkit ships [accessible UI components](/ui/overview) (Dialog, RadioGroup, Switch, Listbox). The stateful ones (Dialog, Listbox, RadioGroup) work like everything else in Foldkit: each has a Model, Messages, and an update function. You initialize them in your Model, delegate their Messages in your update, and compose their views. Their Models hold interaction state only. The selection stays with you: the parent Model owns it, passes it into the Listbox view as `maybeSelectedValue`, and folds the `Selected` OutMessage back into its own state. Switch is a controlled render helper: your Model owns the value directly. Either way the state is yours. React uses Headless UI, which provides the same accessible patterns through a component API. But the state is theirs.

|               | Foldkit                                    | React + Headless UI                           |
| ------------- | ------------------------------------------ | --------------------------------------------- |
| State         | Yours: in the Model, visible, serializable | Theirs: internal, invisible, not serializable |
| Events        | Messages delegated through your update     | Callbacks (`onChange`, `onClose`)             |
| Accessibility | Built-in (aria, focus, keyboard)           | Built-in (aria, focus, keyboard)              |
| Debugging     | Full state visible in DevTools             | Component internals scattered across hooks    |

## Rendering Performance

We profiled both production builds painting across a 32×32 grid (1024 cells) in Chrome. React averages ~16.5ms per frame. Foldkit averages ~16.7ms. Both render at 60fps. The result is the same. The developer experience is not.

### Foldkit memoization (data at the boundary) {#foldkit-memoization}

Foldkit memoization lives at the module level. Each lazy wrapper takes an args array and skips the view function when those args match the previous render.

::Snippet{name="comparisonFoldkitMemoization" label="Foldkit memoization"}

`createLazy()` and `createKeyedLazy()` compare arguments element-by-element. `evo()` preserves references for unchanged Model fields, so the comparison just works: panels whose data didn’t change aren’t re-rendered. The arguments are pure data (Model fields and primitives, not handler closures), so there’s nothing to stabilize.

### React memoization (closures at the boundary) {#react-memoization}

Wrap every component in `memo`, every handler in `useCallback`, every derived value in `useMemo`, and thread `dispatch` through every component.

::Snippet{name="comparisonReactMemoization" label="React memoization"}

`React.memo` also uses reference equality. The catch: React components receive callbacks as props, and a fresh arrow function is a new reference every render. Without `useCallback` wrapping every handler and `useMemo` wrapping every derived value, the memoized child re-renders anyway because its props look new. Maintained by hand, this is optimization you must not forget: miss one wrapper and the grid slows down with no test failure or type error to flag it.

React Compiler, stable since October 2025, exists to write these wrappers for you. Enable it and the `memo`, `useCallback`, and `useMemo` in this section are generated at build time; forgetting one stops being a failure mode. We ran the compiler over this React app and every component compiles, so for this codebase the ceremony gap mostly closes. Three things scope that. The compiler is opt-in, in Next.js 16 as everywhere else. It requires components to follow the Rules of React, and code that breaks them is common: an earlier revision of this app wrapped its export handler in `useCallback` and escaped the resulting stale closure by writing a ref during render, and the compiler rejected the whole root component for it. And when the compiler cannot prove a component safe, it skips it, and that component silently ships unmemoized: the failure mode above at a different layer, with `eslint-plugin-react-hooks` as the way to find out.

What the compiler does not change is everything else on this page. It memoizes. It does not move side effects out of `useEffect`, give the reducer a way to return them, connect an effect to the action that caused it, or make any of them visible to a test.

### One layer down: per-cell rendering {#cell-level-memoization}

The panel-level memoization above keeps the toolbar and history pane from re-rendering when only the grid changes. But the grid itself contains `gridSize * gridSize` cells (1024 of them on a 32×32 canvas). Every paint stroke re-renders the ones that changed. Here’s what a single cell looks like in each framework.

::Snippet{name="comparisonFoldkitCellView" label="Foldkit cell view"}

A Foldkit cell is a plain `div` with two event attributes: `OnMouseDown(PressedCell({ x, y }))` and `OnMouseEnter(EnteredCell({ x, y }))`. No component, no `memo` wrapper, no per-cell handler closures. The Message is the event. The runtime dispatches it directly when the attribute fires, and there are no closures at the cell boundary to begin with, so there is nothing to stabilize.

::Snippet{name="comparisonReactCellView" label="React cell view"}

A React cell is a `memo`-wrapped component with two `useCallback` wrappers inside, one per handler. Multiply by 1024 cells. Every handler needs `x`, `y`, and `dispatch` in its dependency array so it doesn’t capture stale coordinates. Miss any and the cell misbehaves silently. Write them but forget `memo` on the component and every cell re-renders on every stroke. The pattern works, and with React Compiler enabled these wrappers are generated instead of written by hand. What no compiler changes is what sits at the boundary: the React cell hands its child closures that must be proven stable, by you or by a build tool. The Foldkit cell hands the runtime two Message values. There is nothing to stabilize because there is nothing that can go stale: `PressedCell({ x, y })` is data, compared by value, the same on every render.

## Guarantees React Cannot Provide {#guarantees}

This is the ledger. Seven structural wins Foldkit gets from its architecture that React’s component model is incapable of providing, no matter how disciplined the team.

### The Message union as total input domain {#message-union-index}

The `Message` union is the total input domain of the update function. By construction, it enumerates every event that can change state, and the update function implements every resulting transition. And because the runtime dispatches only values from the union, nothing state-changing can reach update any other way. Submodels nest the same property: drill into any UI component and its Message union and update function give you the same completeness one layer down. React has no equivalent, because React does not structurally require state changes to go through a single channel. Once the channel is optional, the index stops being total, and the answer to “how can state change in this app?” becomes an archaeological dig through `useEffect` dependencies, custom hooks, and library-internal state.

### Safe evolution under type pressure {#safe-evolution}

Add a `Message` variant and `M.tagsExhaustive` turns every update-function site that needs to handle it into a compile error. Add a `Tool` variant and the nested match inside `PressedCell` stops typechecking. You cannot forget a case: the type system refuses to let the code build. In React, the reducer’s `switch` catches the one call site you knew about; it cannot catch the `useEffect` that should have fired, the `useCallback` that should have been re-memoized, or the custom hook that depends on the old shape. Nothing in the type system connects them to the action.

### Side effects as assertable values {#side-effects-as-values}

A Command is a plain value. It has a name. It appears in [DevTools](/core/devtools) next to the Message that produced it. You can assert on it with `Command.expectExact` or resolve it with a synthetic return Message via `Command.resolve`. Two testing affordances against the same value the runtime executes in production: tests and runtime operate on the identical Command, not a mock of one. `useEffect` has none of those: no name, no identity in DevTools, no connection back to the action that caused it, no way to assert intent without also asserting outcome.

### Time-travel that covers UI internals {#time-travel}

React DevTools shows you the current component tree. [Foldkit DevTools](/core/devtools) shows you the complete history: every Model snapshot, every Message, every Command. And because Submodels live in the Model, that history covers UI component internals too: the Dialog’s transition phase, the Listbox’s active item and search query. You can scrub backwards through a session and see every interior state the UI passed through. In React, Headless UI’s internals never leave component hooks. They aren’t available as a replayable sequence because they aren’t available as values at all.

### Tests share the runtime’s pipeline {#tests-share-runtime-pipeline}

The test suite runs the same pipeline the runtime runs. `story` calls the same update function. `scene` dispatches through the same view. Commands resolve through the same surface. There are no test doubles because there is nothing structurally in the way that would require them: update is pure, Commands are values, Submodels are data. Remove a Command from the update function and every test that depended on it fails. React’s test stack has to simulate a browser to reach production code paths that would otherwise be unreachable from a unit test. Foldkit tests reach them directly, because there is only one kind of code path.

### One place to look when the Model is wrong {#one-update-function}

When the Model is wrong, the bug is in the update function. That is the only place the Model changes, by construction, not by convention. When a React state-transition bug surfaces, it could be in the reducer, in any `useEffect` that dispatches, in a `useCallback` that closed over stale state, in a custom hook, or inside Headless UI. You do not know which. You have to check all of them. The search space for a bug is a structural property of the framework.

### No stale closures in view, update, or Subscriptions {#no-stale-closures}

No dependency arrays. No `useCallback` wrappers. No refs to escape closures. The view, Subscriptions, and update always receive the current Model because the runtime calls them with it on every update. There is no closure captured at render time waiting to go stale. One boundary works differently: [Mount](/core/mount) args are captured when the element enters the DOM and are not refreshed by later renders, with a documented escape hatch for post-mount Model changes. That is the whole list. React’s largest bug class, narrowed to a single boundary you can name.

## Which Scales Better? {#scalability}

A pixel art editor is a non-trivial app, but real codebases accumulate features over time. What would it take to add remote persistence, multiplayer editing, an animation timeline, or persistent undo history?

### Remote persistence

In Foldkit, you’d define a `SyncToServer` Command and return it from the update function. When the user finishes a paint stroke, the `ReleasedMouse` handler returns both `SaveCanvas` and `SyncToServer`. Both side effects are visible in one place, appear in [DevTools](/core/devtools), and your tests verify they were triggered by the right Message. In React, you’d add another `useEffect` that watches for state changes and fires a network request. Now you have two independent effects (localStorage and remote sync) that can race, and neither is visible in the reducer.

### Multiplayer editing {#multiplayer}

Foldkit’s Model is serializable by design. Every field uses Effect Schema types with runtime validation. Sending the Model over a WebSocket and applying remote Messages through the same update function is architecturally trivial: the update function already handles every possible state transition. Remote Messages go through the same pipeline as local ones.

In React, Headless UI’s internal state (active item, transition phase, dialog open/close) can’t be serialized or sent over the wire. A fair response: “I don’t need to sync UI component state; other users don’t care which menu item my cursor is hovering.” True for multiplayer specifically. But the same architectural gap bites you elsewhere: you can’t time-travel through UI interactions during debugging, you can’t replay a user session to reproduce a UI bug, and you can’t assert on UI component state in tests without rendering the full tree in jsdom. The wins Foldkit’s architecture buys aren’t only about multiplayer. They’re about everything downstream of “state is data you can hold in your hand.”

### Animation timeline

Imagine turning this into a frame-by-frame animation tool. You paint multiple grids, arrange them in a timeline, and play them back. In Foldkit, the new state is straightforward: add a `frames: Array<Grid>` field, a `currentFrameIndex`, and an `isPlaying` boolean to the Model. Playback is a Subscription that emits `AdvancedFrame` Messages on a timer when `isPlaying` is true. The update function handles `AdvancedFrame` by incrementing the index. The view renders the current frame. All of it flows through the existing architecture.

In React, the frame sequence lives in the reducer. But playback needs a `useEffect` with a `setInterval` and cleanup. The interval callback closes over stale state, so you need a `useRef` for the current frame index. Now you have the same state in two places: the reducer (source of truth) and the ref (for the closure). The existing localStorage `useEffect` and the playback `useEffect` both respond to state changes, and neither knows about the other. Every new real-time feature adds another coordination problem.

### Persistent undo history {#persistent-undo}

Foldkit’s undo stack is part of the Model. Persisting it to IndexedDB is another Command. Restoring it on page load is part of `init`. The entire round-trip (save, restore, resume) flows through the same architecture with no special cases. React’s undo stack lives in `useReducer` state, but persisting it means coordinating another `useEffect` with the existing localStorage effect, managing serialization of the grid arrays, and ensuring the two effects don’t step on each other.

The pattern is always the same: Foldkit’s architecture scales by adding Messages, Commands, and Subscriptions to structures that already exist. React’s architecture scales by adding more hooks, more effects, and more coordination between them. The first approach compounds clarity. The second compounds complexity.

## Conclusion

React is a good library with an unmatched ecosystem. Foldkit trades ecosystem breadth for architectural guarantees. Whether that trade is worth it depends on whether you’ve been burned by what Foldkit prevents.

Look at what we built. The same app, the same features, the same styling. In React, understanding the app means reading the reducer, the hooks, the components, and the Headless UI docs, then reconciling them in your head. In Foldkit, you read the `Message` union and the update function to see every state change. You read the `Command` definitions to see every side effect the update function produces. You read the Subscriptions to see every external event stream the app listens to. Per-element DOM work like focus or third-party library setup is a Mount declared inline at the view, right where the element is. Complete picture, every effect declared at home.

If you care about adding features without fear, onboarding new developers by pointing them at the Message union, debugging production issues by replaying state, and trusting that your test suite actually catches regressions: Foldkit structurally guarantees those outcomes. React cannot.
