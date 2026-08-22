# Foldkit vs Elm: Side by Side

## Overview

This comparison uses the same [pixel art editor](/example-apps/pixel-art) in Foldkit and Elm. Both versions include grid drawing, undo and redo, brush, fill, and eraser tools, mirror modes, localStorage persistence, PNG export, keyboard shortcuts, and an application history panel.

Foldkit applies the Elm Architecture in TypeScript on top of Effect. The familiar pieces remain: a Model, Messages, a pure update function, a view, and side effects returned for the Runtime to execute. The differences come from the host languages, their interop models, and the tools each framework builds around the architecture.

Elm is the source of this architecture, and its language provides guarantees TypeScript cannot reproduce. Foldkit trades some of those guarantees for direct access to the TypeScript, Effect, browser, and npm ecosystems.

:::Info{label="Read them both"}
The Foldkit version is in the [examples gallery](/example-apps/pixel-art). The [Elm version source](https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm) is an Elm 0.19 application with no npm dependencies.
:::

## The Architecture You Already Know {#same-architecture}

Most concepts translate directly:

|               | Elm                                           | Foldkit                                                          |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| State         | `Model`                                       | Model declared with Schema                                       |
| Events        | `Msg` custom type                             | Message Schema union                                             |
| Transitions   | `update : Msg -> Model -> ( Model, Cmd Msg )` | `update(model, message): { model: Model; commands?: Commands }`  |
| Side effects  | `Cmd Msg`                                     | Command for Message-driven work, plus other lifecycle primitives |
| Event streams | `Sub Msg`                                     | Subscription backed by an Effect Stream                          |
| Boot data     | Flags decoded or accepted by `init`           | [Flags](/core/init-and-flags) Schema supplied at boot            |
| JS interop    | Flags, ports, and custom elements             | Direct JavaScript APIs, [Mount](/core/mount), and CustomElement  |
| Nested state  | Nested Elm Architecture composition           | [Submodel](/core/submodel) helpers for the same pattern          |

### Elm Msg

The Elm application has 21 `Msg` variants:

::Snippet{name="comparisonElmMsg" label="Elm Msg"}

### Foldkit Message union {#foldkit-message}

The current Foldkit application has 25 parent Messages:

::Snippet{name="comparisonFoldkitMessage" label="Foldkit messages"}

The count differs because the component and effect boundaries differ. Foldkit has `SucceededExportPng` and `CompletedSaveCanvas` for Command completion, plus six `Got*Message` wrappers for two Dialogs, one Listbox, and three RadioGroups. The Elm version hand-rolls those controls and represents their application-facing events with four direct Msgs: `ToggledThemePicker`, `SelectedPaletteTheme`, `DismissedErrorDialog`, and `DismissedGridSizeDialog`.

Both unions are the total input domain of their application update functions. Foldkit’s child wrapper Messages lead to another Message union and update function inside each Submodel.

Elm custom-type values and Foldkit Schema values both have runtime tags. Schema also supplies runtime decoding and encoding when a Message is deliberately used at an external boundary. That does not make an application Message union a wire protocol automatically. A network boundary still needs an explicit Schema and compatibility policy.

## The Update Function

The update functions have the same shape.

### Elm update

::Snippet{name="comparisonElmUpdate" label="Elm update"}

### Foldkit update

::Snippet{name="comparisonFoldkitUpdate" label="Foldkit update"}

`case msg of` becomes `Message.match`. Elm record updates become `evo` transformations. `( model, Cmd.none )` becomes `{ model }`.

Elm enforces exhaustive pattern matching as part of the language. Foldkit obtains the same compile-time failure at a match written with `Message.match`. That is the required Foldkit update style, but TypeScript itself does not prevent someone from writing a non-exhaustive alternative.

Elm record updates and `evo` both preserve references to unchanged nested values. The rendering section shows how each application uses that reference stability.

## The Model: Custom Types vs Schema {#the-model}

### Elm Model (type alias and custom types) {#elm-model}

The Elm Model uses custom types and `Maybe`:

::Snippet{name="comparisonElmModel" label="Elm model"}

This hand-rolled UI stores Dialog visibility through the presence of `exportError` and `pendingGridSize`. The theme picker uses a separate `isThemePickerOpen` field.

### Foldkit Model (Schema struct) {#foldkit-model}

The Foldkit Model uses Effect Schema, `Option`, and child Models for its stateful Foldkit UI controls:

::Snippet{name="comparisonFoldkitModel" label="Foldkit model"}

A Schema exists at runtime as well as in TypeScript. Foldkit can use it to validate flags and persisted values, encode selected data, and describe Models to framework tooling. The child component Models expose interaction state that the Elm application implements directly in its parent Model and views.

Elm’s type system is sound and its custom types are compact. TypeScript is intentionally less strict, while Schema adds runtime boundary tools that a plain TypeScript type does not have.

## Ports vs Commands

The pixel editor saves to localStorage and exports a PNG. The Elm implementation crosses into JavaScript for both operations. The Foldkit implementation performs them in Commands.

### Elm ports (the effect lives in JavaScript) {#elm-ports}

The Elm side declares outgoing and incoming ports:

::Snippet{name="comparisonElmPorts" label="Elm ports"}

The JavaScript side subscribes to them in `index.html`:

::Snippet{name="comparisonElmPortsJs" label="port JavaScript"}

The port declaration gives Elm a typed interface. The JavaScript subscriber remains outside the Elm compiler, so a renamed payload field or a missing `send` call is not checked against the Elm source. A JavaScript exception can still affect the host page; the boundary protects Elm code from directly calling arbitrary JavaScript, not the entire page from JavaScript failures.

The export failure needs an incoming port so JavaScript can send `FailedExportPng` back to Elm. Saving is fire-and-forget in this application.

### Foldkit Commands (the effect lives with the app) {#foldkit-commands}

Foldkit runs in the JavaScript ecosystem, so its Commands can use browser APIs and JavaScript libraries directly:

::Snippet{name="comparisonFoldkitCommand" label="Foldkit commands"}

Each Command declares its arguments and result Messages. Its Effect can use typed failures and recovery operators before returning a Message to update. The application still needs to choose meaningful error behavior. Here `ExportPng` reports failure, while `SaveCanvas` intentionally converts storage failure into the same completion Message as success.

:::Info{label="The boundary trade-off"}
Elm prevents application code from calling arbitrary JavaScript and makes interop explicit through ports or custom elements. Foldkit keeps update pure by convention and framework design, while Command bodies can call the host ecosystem directly. TypeScript cannot enforce Elm’s purity boundary.
:::

## JSON: Decoders vs Schema {#json}

Both applications restore a saved canvas from boot flags and persist it as JSON.

### Elm decoders and encoders {#elm-decoders}

Elm defines the type, decoder, and encoder separately:

::Snippet{name="comparisonElmFlags" label="Elm flags"}

The compiler checks the values each function produces, but the decoder and encoder use independent string field names. A mismatch between `"gridSize"` and `"gridsize"` can compile.

### Foldkit Schema (one definition, both directions) {#foldkit-schema}

Foldkit derives both directions from one `SavedCanvas` Schema:

::Snippet{name="comparisonFoldkitFlags" label="Foldkit flags"}

The Schema centralizes field names and value constraints. Encoding and decoding therefore evolve from the same definition. Version migrations and fallback behavior still belong to the application.

## Subscriptions

Both frameworks derive external event streams from Model state. The mouse-release listener exists only while the user is drawing.

### Elm subscriptions

::Snippet{name="comparisonElmSubscriptions" label="Elm subscriptions"}

### Foldkit Subscriptions

::Snippet{name="comparisonFoldkitSubscription" label="Foldkit subscriptions"}

Elm’s `Sub.batch` and Foldkit’s Subscription registry both describe the active set after each state transition. The runtime handles setup and teardown.

Elm uses `Browser.Events` for keyboard and mouse input and an incoming port for export failure. Foldkit Subscriptions use Effect Streams, so the application can construct a Stream from browser APIs or a JavaScript client directly. Export failure does not need a Subscription because it is already a declared Command result.

## Rendering Performance

Both implementations use reference-based memoization around the grid. Actual frame time depends on the production build, browser, and device, so this section compares the mechanisms rather than claiming a universal winner.

### Elm Html.Lazy and Html.Keyed {#elm-lazy}

::Snippet{name="comparisonElmLazy" label="Elm lazy views"}

### Foldkit createLazy and keyed {#foldkit-lazy}

::Snippet{name="comparisonFoldkitMemoization" label="Foldkit memoization"}

`Html.Lazy.lazy` and `createLazy` reuse a previous rendered value when their function inputs remain referentially equal. Elm provides arity-specific helpers such as `lazy` and `lazy5`. Foldkit creates a lazy wrapper at module scope and passes an argument array. `createKeyedLazy` retains a separate cache for each stable key.

### The cell view, twice {#cell-views}

Both cell views attach Message values to event attributes:

::Snippet{name="comparisonElmCellView" label="Elm cell view"}

::Snippet{name="comparisonFoldkitCellView" label="Foldkit cell view"}

Neither view needs a component instance or a memoized event-handler closure for each cell. The coordinates are stored in the `Msg` or Message value dispatched by the event.

## UI Components

The Elm version implements its Dialogs, RadioGroups, switches, and theme picker in the application. That keeps their state and events visible, but the application also owns their ARIA attributes, keyboard behavior, focus behavior, and transitions.

The Foldkit version uses [Foldkit UI](/ui/overview). Its Dialogs, RadioGroups, and Listbox are Submodels, while Switch is a controlled render helper. Selected values remain in the parent Model. Each stateful component reports changes through OutMessages that the parent folds into its own update.

|                                     | Elm application                           | Foldkit application                                                    |
| ----------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| Dialog, RadioGroup, Switch, Listbox | Implemented in the application            | Dialog, Listbox, and RadioGroup Submodels; controlled Switch helper    |
| Accessibility behavior              | Implemented and tested by the application | Implemented and tested by Foldkit UI                                   |
| Selected values                     | Parent Model                              | Parent Model                                                           |
| Transient interaction state         | Parent Model and view logic               | Child Models in the application Model                                  |
| Composition                         | Nested architecture written by the app    | [Submodel](/core/submodel) helpers standardize parent-child delegation |

The comparison is between the two checked-in applications, not the entire Elm package ecosystem. An Elm application can use community UI packages or organize nested state differently.

## Testing

Both update functions are pure and easy to call directly. Their effect values differ.

### Elm update test (pure, but the Cmd is opaque) {#elm-test}

::Snippet{name="comparisonElmTest" label="Elm test"}

`Cmd Msg` is opaque, so a direct `elm-test` unit test cannot compare or pattern-match the Command returned by update. The underscores discard it. Removing the save Command from `ReleasedMouse` would not fail this particular unit test.

Program-level tools such as [elm-program-test](https://package.elm-lang.org/packages/avh4/elm-program-test/latest/) provide a higher-level way to simulate supported effects and interactions. That is a different test boundary from inspecting a `Cmd` value directly.

### Foldkit Story test (Commands are assertable values) {#foldkit-story-test}

::Snippet{name="comparisonFoldkitTest" label="Foldkit test"}

A [Story](/testing/story) receives the named Commands returned by update. `Command.resolve` verifies that `SaveCanvas` is pending, supplies `CompletedSaveCanvas`, and dispatches that result Message. Removing the Command makes this Story fail at the resolution step.

[Scene](/testing/scene) adds interaction through Foldkit virtual DOM. It can query by accessible role, label, or text without starting jsdom.

## What You Give Up

Moving from Elm to Foldkit gives up language-level constraints.

**Enforced purity.** Elm code cannot call `Date.now()`, mutate an object, or perform I/O from update. TypeScript can. Foldkit’s architecture, conventions, and tests make the intended boundary visible, but they do not make an impure update impossible to write.

**Elm’s runtime guarantees.** Elm models failure as data and prevents the ordinary null, undefined, and non-exhaustive failures common in JavaScript. Foldkit uses Schema, Effect, and explicit failure Messages, but TypeScript and npm dependencies can still throw or produce invalid values.

**A smaller language and package surface.** Elm has one language, formatter, package manager, and constrained package API. TypeScript plus Effect and browser libraries has a larger set of concepts and more choices.

**A smaller default runtime footprint.** Optimized Elm output is often compact. A Foldkit application includes Foldkit and Effect. The actual production size depends on the application and should be measured from the two builds being considered.

## What You Gain

Foldkit gains direct access to the host ecosystem and additional framework tools.

**JavaScript and npm access.** Browser APIs and compatible JavaScript packages can be imported into a Command, Mount, Subscription, ManagedResource, or CustomElement without a port layer.

**TypeScript integration.** An embedded Foldkit program can share modules and types with its TypeScript host. Elm also embeds cleanly, but host communication crosses flags, ports, or custom elements.

**Schema codecs.** One definition can provide the TypeScript type, runtime validation, and encoding and decoding for an external boundary.

**Inspectable Commands.** Foldkit DevTools records named Commands beside the Messages that produced them, and Story and Scene tests can assert on the same values.

**Effect services and control flow.** Commands can compose retries, timeouts, concurrency, resources, Layers, and typed failures from Effect.

**First-party UI Submodels.** Foldkit UI supplies accessible components built with the same Model, Message, and update architecture as the application.

## Conclusion

Elm and Foldkit share the application model, so the choice turns on the host environment and the guarantees you need.

Choose Elm when its language, compiler, package constraints, and interop model fit the application. Those constraints provide purity and refactoring guarantees that a TypeScript framework cannot reproduce.

Choose Foldkit when the application needs to remain in TypeScript, integrate directly with JavaScript libraries, or use Effect services while retaining the Elm Architecture. Foldkit standardizes that architecture and adds Schema, inspectable Commands, Submodels, DevTools, and testing tools around it.

The [Elm source](https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm) and [Foldkit source](https://github.com/foldkit/foldkit/tree/main/examples/pixel-art) remain recognizably the same kind of program. Their differences show which guarantees come from Elm the language and which structures Foldkit recreates in TypeScript.
