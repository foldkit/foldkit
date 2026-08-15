# Foldkit vs Elm: Side by Side

## Overview

We built the same [pixel art editor](/example-apps/pixel-art) ([try it live](https://pixel.foldkit.dev)) in both Foldkit and Elm. Same features, same styling, same algorithms: grid drawing with undo/redo stacks, three tools with mirror modes, flood fill, localStorage persistence, PNG export, keyboard shortcuts, and a time-travel history panel.

Foldkit and Elm agree about architecture, so this page is a translation guide, not an argument. Foldkit is the Elm Architecture, implemented in TypeScript on top of Effect: a single Model, Messages as facts, a pure update function, side effects as data the runtime executes. If you know Elm, you already know how a Foldkit app is shaped. What differs is the host language and what each side gets from it.

And to be clear about the direction of respect: Elm is where this architecture comes from. Elm still provides guarantees Foldkit cannot match, and this page says so plainly where it matters.

:::Info{label="Read them both"}
The Foldkit version is in the [examples gallery](/example-apps/pixel-art). The [Elm version source](https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm) is on GitHub: idiomatic Elm 0.19, no npm dependencies, just `elm make`.
:::

## The Architecture You Already Know {#same-architecture}

Here is the whole translation table. Every row is a direct conceptual match.

|               | Elm                                           | Foldkit                                           |
| ------------- | --------------------------------------------- | ------------------------------------------------- |
| State         | `Model`                                       | Model (Schema struct)                             |
| Events        | `Msg` custom type                             | Message union (Schema)                            |
| Transitions   | `update : Msg -> Model -> ( Model, Cmd Msg )` | `update(model, message): [Model, Command[]]`      |
| Side effects  | `Cmd Msg` (opaque)                            | Command (a named, inspectable value)              |
| Event streams | `Sub Msg`                                     | Subscription (Effect Stream)                      |
| Boot data     | Flags (`Json.Decode.Value`)                   | [Flags](/core/init-and-flags) (Schema, an Effect) |
| JS interop    | Ports, custom elements                        | n/a (the app is already JavaScript)               |
| Nested state  | Nested TEA (by hand)                          | [Submodel](/core/submodel) (first-class)          |

The rest of this page walks through the rows where the differences are interesting. Where a row is boring (in the best way), we say so and move on.

### Elm Msg

The Elm `Msg` type has 21 variants. It reads exactly like you would expect:

::Snippet{name="comparisonElmMsg" label="Elm Msg"}

### Foldkit Message union {#foldkit-message}

The Foldkit Message union has 22. Same naming convention, same facts, same role as the total input domain of the update function:

::Snippet{name="comparisonFoldkitMessage" label="Foldkit messages"}

Why 22 against 21? The difference is structural, not stylistic. Foldkit Commands report back: `CompletedSaveCanvas` and `SucceededExportPng` exist because every Command resolution returns to update as a Message. In Elm, a fire-and-forget port has no completion Msg unless you wire one through another port. Three more are `Got*Message` variants delegating to [Foldkit UI](/ui/overview) Submodels (Dialog, Listbox). The Elm version hand-rolls those components, so their events collapse into the app’s own Msg variants, including four Msgs Foldkit doesn’t need: `ToggledThemePicker` and `SelectedPaletteTheme`, because the shipped Listbox tracks its own open state and reports selection through its `Got*Message`; plus `DismissedErrorDialog` and `DismissedGridSizeDialog`, because the shipped Dialog closes itself through its `close` bundle.

One real difference hides in the type definitions. Elm Msgs are constructors of a custom type: they exist at runtime as opaque tagged values. Foldkit Messages are Schema values: serializable, validatable, printable. That’s what lets [Foldkit DevTools](/core/devtools) log, diff, and replay them, and what makes sending Messages over a wire a non-event.

## The Update Function

This is the section where you should feel at home. The two update functions are the same function wearing different syntax.

### Elm update

::Snippet{name="comparisonElmUpdate" label="Elm update"}

### Foldkit update

::Snippet{name="comparisonFoldkitUpdate" label="Foldkit update"}

Pattern match on the message, return new state plus effects. `case msg of` becomes `M.tagsExhaustive`. Record update syntax becomes `evo`, which preserves references for unchanged fields exactly the way Elm’s record update does (that reference stability is what makes memoization work in both frameworks; more below). `( model, Cmd.none )` becomes `[model, []]`.

Exhaustiveness is worth a closer look. Elm’s compiler enforces it at the language level: a missing case is a compile error, full stop. Foldkit gets the same failure mode through `M.tagsExhaustive`, which makes a missing Message handler a type error. Both stop you at compile time. The difference is that Elm’s check is unconditional, while Foldkit’s applies wherever update is written with `M.tagsExhaustive`, which is how every Foldkit program in these docs is written.

## The Model: Custom Types vs Schema {#the-model}

### Elm Model (type alias and custom types) {#elm-model}

The Elm Model is a record of custom types. Impossible states are unrepresentable in both versions: the error dialog is open exactly when `exportError` is `Just`, and the confirm dialog is open exactly when `pendingGridSize` is `Just`. No booleans to desynchronize.

::Snippet{name="comparisonElmModel" label="Elm model"}

### Foldkit Model (Schema struct) {#foldkit-model}

The Foldkit Model is the same shape declared as an Effect Schema struct, with `Option` where Elm has `Maybe`, plus Submodel fields for the stateful UI components:

::Snippet{name="comparisonFoldkitModel" label="Foldkit model"}

Why declare the Model as a Schema instead of a plain type? Because a Schema is a type that also exists at runtime. It validates data at the boundaries (the localStorage round-trip below), derives encoders and decoders instead of making you write them, and gives DevTools a faithful, serializable picture of your whole application state. Elm’s type system is cleaner to read, and it is sound, which TypeScript’s does not even aim to be. Foldkit’s buys you machinery.

## Ports vs Commands

Here is the deepest real difference between the two frameworks, and this app exercises it twice: saving to localStorage and exporting a PNG. Neither is possible in pure Elm, because Elm code cannot touch browser APIs that aren’t wrapped by an official package. Both go through ports.

### Elm ports (the effect lives in JavaScript) {#elm-ports}

::Snippet{name="comparisonElmPorts" label="Elm ports"}

And the JavaScript half, which lives in `index.html`:

::Snippet{name="comparisonElmPortsJs" label="port JavaScript"}

Ports are a deliberate, principled design, and they deliver something remarkable: JavaScript on the other side of a port can throw, hang, or lie, and your Elm app cannot crash. The boundary is absolute. That’s the pitch, and it’s real.

The cost is also real. The export feature is now two codebases: an encoder and port declaration in Elm, and a JavaScript handler somewhere else that the Elm compiler has never heard of. The failure path needs its own port. Rename a field in the encoder and the JavaScript silently receives the old shape of nothing. You can write the JavaScript side in TypeScript and type the port payloads by hand (tools like elm-ts-interop generate those types), but the two sides remain separate programs: nothing checks them against each other.

### Foldkit Commands (the effect lives with the app) {#foldkit-commands}

Foldkit doesn’t have a JS boundary because the whole app is already in the JS ecosystem. Both effects are [Commands](/core/commands): named values wrapping an Effect, with the export logic (an offscreen canvas element, a download link) written inline, typed, and tested alongside everything else.

::Snippet{name="comparisonFoldkitCommand" label="Foldkit commands"}

:::Info{label="What replaces the safety?"}
Elm’s purity at this boundary is enforced by the compiler; Foldkit’s by the architecture: side effects exist only inside Commands, every Command resolves to a Message (including failures, via `Effect.catch`), and the update function stays pure. You lose the compiler’s absolute wall and gain the ability to call any npm library three lines from your update function, with the failure path in the same file as the effect.
:::

## JSON: Decoders vs Schema {#json}

Both apps persist the canvas to localStorage and restore it through flags at boot. That means a JSON round-trip, and the two frameworks make you pay for it differently.

### Elm decoders and encoders {#elm-decoders}

Elm requires a decoder for the way in and an encoder for the way out, written separately. The compiler checks each one against your types, but nothing checks them against each other:

::Snippet{name="comparisonElmFlags" label="Elm flags"}

### Foldkit Schema (one definition, both directions) {#foldkit-schema}

In Foldkit the `SavedCanvas` Schema is declared once, and both directions are derived from it:

::Snippet{name="comparisonFoldkitFlags" label="Foldkit flags"}

Elm decoders are precise and composable, and many Elm developers genuinely like writing them. But they are a maintenance surface: every field exists in three places (the type, the decoder, the encoder), and the compiler verifies each against the type but not against each other’s field names. `Decode.field "gridSize"` and `Encode.object [ ( "gridsize", … ) ]` typecheck fine and lose your data. Schema collapses the three places into one.

## Subscriptions

This is the section with the least to translate. Both frameworks derive active event listeners from Model state, and the runtime handles subscribe and unsubscribe as the Model changes. The mouse-release listener exists only while the user is drawing, in both apps, with no manual listener management in either.

### Elm subscriptions

::Snippet{name="comparisonElmSubscriptions" label="Elm subscriptions"}

### Foldkit Subscriptions

::Snippet{name="comparisonFoldkitSubscription" label="Foldkit subscriptions"}

The differences are at the edges. Elm subscriptions are limited to what official packages expose (`Browser.Events`, `Time`, ports); anything else means a port. Foldkit [Subscriptions](/core/subscriptions) are Effect Streams, so any event source you can reach from JavaScript (WebSockets, observers, third-party SDKs) can feed Messages directly, with the Stream combinators for filtering and mapping along the way. Note also the third entry in the Elm list: `exportPngFailed FailedExportPng` is port plumbing. The Foldkit version has no equivalent because Command failures already return as Messages.

## Rendering Performance

Both apps render a 32×32 grid (1024 cells) at 60fps during paint strokes, and both get there the same way: reference-equality memoization at panel and row boundaries. If you’ve used `Html.Lazy`, you already know how Foldkit memoization works.

### Elm Html.Lazy and Html.Keyed {#elm-lazy}

::Snippet{name="comparisonElmLazy" label="Elm lazy views"}

### Foldkit createLazy and keyed {#foldkit-lazy}

::Snippet{name="comparisonFoldkitMemoization" label="Foldkit memoization"}

`lazy` and `createLazy` do the identical check: if the arguments are reference-equal to last render, skip the view function. Elm’s record update and Foldkit’s `evo` both preserve unchanged references, so in both frameworks the check passes for everything a Message didn’t touch. The mechanical difference: Elm’s `lazy` family is arity-indexed (`lazy` through `lazy8`, and the wrapped function itself must be a top-level reference), while `createLazy` takes an args array and is created once at module level.

### The cell view, twice {#cell-views}

One layer down, the per-cell code is where the two frameworks look most alike, because both treat messages as values at the event boundary. There are no handler closures to stabilize in either:

::Snippet{name="comparisonElmCellView" label="Elm cell view"}

::Snippet{name="comparisonFoldkitCellView" label="Foldkit cell view"}

## UI Components

The Elm version hand-rolls its dialogs, radio groups, switches, and theme listbox: the markup, the ARIA attributes, the open/closed state in the Model, the Escape key in the keyboard decoder, the backdrop click. Elm makes that work pleasant, but it’s on you, and the hand-rolled versions in this app cover less ground than a production component library (no focus trapping, no arrow-key navigation in the radio groups). Community packages exist, and elm-ui takes a different road entirely, but there is no standard accessible component kit.

Foldkit ships [UI components](/ui/overview). The stateful ones (the dialogs, the radio groups, and the theme listbox here) are themselves little Elm Architecture programs: each has a Model, Messages, and an update function, and you compose them as [Submodels](/core/submodel). Their Models hold interaction state only: the selection stays in your Model, flows into the listbox view as `maybeSelectedValue`, and comes back as a `Selected` OutMessage your update folds. The rest (the mirror switches here) are controlled render helpers: your Model owns the value, and the helper bundles the markup, ARIA, and keyboard wiring around it. Focus management, ARIA, keyboard navigation, and transitions come built in, and the state lives in your Model where DevTools and tests can see it. If you ever wrote nested TEA in Elm (the triple of init/update/view, the `Cmd.map`/`Html.map` plumbing), Submodels are exactly that pattern with the plumbing standardized.

|                                     | Elm (this app)                   | Foldkit                                                                              |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Dialog, RadioGroup, Switch, Listbox | Hand-rolled views + Model fields | Shipped: Dialog, Listbox, and RadioGroup as Submodels, Switch as a controlled helper |
| Accessibility                       | Whatever you write               | Built-in (aria, focus, keyboard)                                                     |
| Component state                     | Yours, in the Model              | Yours, in the Model                                                                  |
| Wiring pattern                      | Nested TEA by hand               | Same pattern, built into the framework                                               |

## Testing

Testing the update function is a pleasure in both frameworks, for the same reason: it’s a pure function, so a test is just calling it. The difference shows up the moment a side effect matters.

### Elm update test (pure, but the Cmd is opaque) {#elm-test}

::Snippet{name="comparisonElmTest" label="Elm test"}

Look at the underscores. Each `update` call returns a `Cmd` and the test throws it away, because a `Cmd` is opaque by design: no equality, no pattern matching, no way to ask “was that the save command?”. Delete the save from `ReleasedMouse` and this test stays green. The Elm community’s answer is [elm-program-test](https://package.elm-lang.org/packages/avh4/elm-program-test/latest/), which is excellent but requires restructuring your program around simulatable effect types to use fully.

### Foldkit Story test (Commands are assertable values) {#foldkit-story-test}

::Snippet{name="comparisonFoldkitTest" label="Foldkit test"}

Because Commands are plain values, [Story](/testing/story) tests assert on them and resolve them inline, in the same synchronous pipeline as the Model assertions. Remove the `SaveCanvas` Command from the update function and this test fails. No program restructuring required: the production update function is already in the shape the test needs. [Scene](/testing/scene) extends the same idea to interaction tests against the virtual DOM, querying by accessible role, no jsdom.

## What You Give Up

If you move from Elm to Foldkit, these are real losses.

**Enforced purity.** Nothing in TypeScript stops a teammate from calling `Date.now()` in the middle of a Foldkit update function. The framework’s conventions, `Story` tests, and review culture catch it; in Elm it cannot be written at all.

**No runtime exceptions.** Elm’s flagship claim holds up in practice. Foldkit confines effects and models failures as Messages, and Effect makes error channels explicit, but the host language can still throw, and dependencies from npm can do anything at all.

**A small language.** Elm fits in your head. No `any`, no type assertions, no six ways to write a function, one formatter with no options, and packages that cannot perform side effects. TypeScript plus Effect is a far larger surface, and Foldkit’s conventions are doing work the Elm language does by construction.

**Smaller bundles.** Dead code elimination is Elm’s home turf. `elm make --optimize` produces famously tiny assets. A Foldkit app carries the Effect runtime; tree-shaking helps, but Elm wins this one comfortably.

## What You Gain

**The npm ecosystem, without a boundary.** Every chart library, auth SDK, websocket client, and date library is a direct import inside a Command. The pixel art app’s canvas export went from “a port, an encoder, and a script tag” to a typed function next to the update that triggers it. This is the single biggest practical difference, and it compounds with every feature.

**Gradual adoption, both directions.** Elm embeds in an existing page too, talking to the host through flags and ports. A Foldkit program embedded in a TypeScript app shares its types and calls its modules directly; nothing is serialized across a boundary.

**Schema as one source of truth.** Types that validate, encode, and decode. No hand-written decoder/encoder pairs to keep in sync, and runtime validation at every boundary where the outside world hands you data.

**Commands you can hold.** Elm’s `Cmd` is opaque to your tests and your debugger. Foldkit Commands are named values: [DevTools](/core/devtools) shows every Command next to the Message that produced it, and tests assert on them directly. Elm’s time-traveling debugger shows you every Msg and Model; Foldkit DevTools shows you those plus the effects.

**Effect underneath.** Retries, timeouts, concurrency, resource safety, and structured error handling are library primitives you compose inside Commands, not patterns you reinvent with Cmds and Msgs.

**Shipped UI components.** The accessible component kit Elm leaves to the community comes in the box, built on the same architecture as your app.

## Conclusion

If Elm fits your constraints (greenfield frontend, a team excited by it, light interop needs), it remains one of the best ways to build a web application, and nothing on this page argues otherwise. Foldkit exists for the situations where Elm’s walled garden is the dealbreaker: a TypeScript codebase you can’t leave, npm dependencies you can’t wrap, teammates you can’t retrain.

The bet Foldkit makes is that the Elm Architecture is the most durable idea in frontend, worth carrying into the ecosystem where most teams actually live, even at the cost of trading guarantees the compiler enforces for guarantees you would have to go out of your way to break. You can audit that trade concretely: read [the Elm source](https://github.com/foldkit/foldkit/tree/main/comparisons/pixel-art-elm) and [the Foldkit source](https://github.com/foldkit/foldkit/tree/main/examples/pixel-art) side by side. They are recognizably the same program. That’s the point.
