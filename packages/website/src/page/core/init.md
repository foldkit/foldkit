# Init & Flags

## Overview

Initialization turns startup input into the first complete Model and a collection of Commands. The init callback is pure. It describes initial state and work for the Runtime to perform later.

Three inputs have different jobs:

| Input   | Where it comes from                | What it does                                                    |
| ------- | ---------------------------------- | --------------------------------------------------------------- |
| Flags   | A client Effect or a server render | Carries external startup data into root init                    |
| Startup | The parent init callback           | Shares a decoded value with registered child startup selectors  |
| Steps   | The Composition init plan          | Applies ordered parent transitions after child Models are ready |

`Startup` does not add another Runtime phase or another data source. Root init may pass Flags, the current URL, or a value derived from either into `startup`. Composition uses that value while assembling registered children.

On a fresh client start, the Runtime builds the supplied application Layer once, resolves the Flags Effect, calls init, renders the initial Model, starts occurrence lifecycles, and then performs init Commands. A Command result always returns later as a Message. Server rendering receives Flags as a value and runs init and view without building browser handler Layers.

## Initialize the Root Model {#init}

Author root init through its named Composition as `ApplicationComposition.makeInit(fn)`. A graphless root still has an empty Composition. The helper checks the returned Model and Commands against the same graph that update, view, and completion use.

The counter starts at zero and has no startup work:

::Snippet{name="initSimple" label="Using init"}

A non-routing application or element calls `init` with no arguments. A routing application passes the current URL, so its first Model can reflect the route. When the application declares Flags, they become the first argument in either form. `ApplicationComposition.makeApplication` or `makeElement` receives `init` explicitly and checks its arguments against the completion's Flags and routing configuration, along with the registered child and handler graph.

Give `ApplicationComposition.makeInit` one concrete function signature. Optional, default, and rest parameters are supported. Wrap an overloaded domain helper or callable object in a concretely typed callback. A generic Block factory closes over its type parameters and keeps the initializer itself concrete.

## Assemble Child Models {#child-initialization}

A completed Block already carries its initializer. The parent Binding decides whether that child should be present at startup and which arguments it receives. Composition calls the selected child initializers, stores their Models, and retains their Commands. The parent init callback supplies only fields the parent owns.

For a child stored in an exact required direct field:

- Omit `init` when the child's initializer takes no arguments. Composition initializes it automatically.
- Use `init: { args }` when the child needs startup arguments.
- Use `init: false` when the parent supplies that field in the init plan's `model`.

When several Bindings read the same startup input, add a `Startup` Schema to the parent Definition. That Schema contextually types each `init.args` selector. Put its decoded value in the Composition init plan's `startup` field.

The following Profile contains a ThemePicker whose initializer requires a Theme. The Binding selects that child input from `startup`, while the init plan supplies only the parent-owned username:

::Snippet{name="blockFoldChildInit" label="Assembling an initial child Model"}

Here, the Binding owns the rule that ThemePicker receives `savedTheme`. Profile init supplies `startup` and its parent-owned `username`. It does not call `themePickerInit`, place `themePicker`, or merge child Commands by hand.

`Composition.makeInit` calls the selected child initializers once, in `childBindings` order. Foldkit adds the child-owned fields before constructing the complete Model. Use `commands` for parent Commands and `steps` for parent Steps applied after that Model exists.

Parent Commands appear first in the returned collection, followed by retained child init Commands and Step Commands. The Runtime executes Commands independently, so collection order does not sequence their completion.

These calls assemble values only. They do not construct Services, build handler Layers, or perform Commands.

### Optional and custom child storage

For an exact `Option` field, omitting `init` leaves presence with the parent. Return `Option.none()` from `init.args` for absence or `Option.some(args)` for presence. Keyed and accessor Bindings also remain parent-owned when `init` is omitted; use `init.occurrences` or `init.args` when Composition should initialize them.

The final parent Model determines which initialized occurrences are active. Init Commands for absent or `presentWhen`-inactive children are omitted. A `subscriptions.when` policy only gates Subscription Streams; it does not suppress child init Commands. Initial Steps may change the child Model without discarding its init Commands.

For custom storage, deliberate Command ordering, or dynamic creation, call the registered Binding's explicit `init` operation. Pass `{ args, toParentModel }`, plus `key` for a keyed Binding and optional parent `commands`. `args` is the exact child init tuple. `toParentModel` receives the initialized child Model and constructs the complete parent Model. `Binding.init` returns a passive initialization recipe. The recipe has no `.model` or `.commands` fields to project.

Return that recipe directly from the owning Composition's `makeInit` or `makeUpdate` callback, or preserve it through the owning Definition's `step` producer. The Composition callbacks interpret it directly; a completed exposed operation interprets a recipe preserved by its Step. Checked execution enters the registered graph, then returns the complete parent Model with every lifted child init Command followed by the optional parent Commands. The compiler checks the key, argument tuple, complete parent Model, Command requirements, and exact Binding requirement at these boundaries.

During checked execution, runtime validation verifies the active composition frame, validates the complete parent Model against its Schema, checks that `toParentModel` stores a schema-equivalent initialized child, and checks that a keyed result contains exactly one occurrence with the requested key. These guards protect JavaScript with erased types and operations captured for later execution. Ordinary Model construction remains available for fixtures and other pure values.

### Keyed Initial Instances

A keyed-array Binding can declare `init.occurrences` and `init.toItem`. The first callback selects the ordered keys and exact child init argument tuples. The second builds each stored item from its occurrence and initialized child Model. For a direct child array, it returns that exact child Model with the planned key. For a wrapped array, it returns the parent-owned wrapper containing that exact child Model and key. The parent keeps occurrence IDs and any wrapper metadata outside the child Model.

Return each wrapper as a plain record so its child field keeps the exact initialized object. A wrapper Schema constructor may reconstruct that child and fail the identity check. Composition constructs the full parent Model through its Schema after collecting these records.

This Counter application starts three instances. Its Model declares `counters: Schema.Array(CounterInstance)`, where each instance holds `id` and `counter`. Its `addCounter` Step returns a `CountersBinding.init({ key, args, toParentModel })` recipe, so the Definition defers initialization until it can produce the parent result with the child init Commands:

::Snippet{name="initKeyedChildren" label="Initializing keyed child instances"}

The assembler validates the entire occurrence plan before calling child init. Duplicate keys, invalid keys, and non-array `args` fail with a configuration error. TypeScript checks tuple length and argument types. At a JavaScript boundary, the Runtime cannot reconstruct which initializer parameters were required, optional, defaulted, or rest parameters. Each wrapper must retain its planned key. Only keys present in the final parent Model retain their init Commands; initial Steps may change their child state.

This startup adapter applies to exact `field` / `key` keyed arrays, with or without `childField`. General keyed accessors keep explicit initialization so their custom storage and write policy remain visible.

## Compose Startup Steps {#startup-steps}

Use startup Steps when initial child Models must exist before a parent transition can run. Composition-owned `init` is the startup boundary. Foldkit does not run a special Runtime boot phase after it.

Put initial Steps in the plan's `steps` array. The Composition assembles the complete parent Model first, then passes each Step the Model returned by the preceding Step. It retains the child init Commands and adds the Commands returned by those Steps.

An optional `boot` helper is an ordinary exposed Step called through the Binding after the child Model is stored. It may accept Flags, the current URL, or prerendered data, and it returns the normal next Model and Commands through that Binding. The Runtime later performs those Commands through their handlers. A feature need not define both init and `boot` helpers.

When an existing domain operation such as `restore` or `open` already describes the transition, expose that Step instead. Do not create a Message only to trigger startup behavior.

The following excerpt assumes `SettingsBinding` and `SessionBinding` have init policies and expose startup operations. The `steps` array is sequential, so `SessionBinding.resume` receives the Model returned by `SettingsBinding.restore`. The result retains Commands from both child initializers and both Steps:

::Snippet{name="initBootSteps" label="Composing startup Steps"}

List each initial Step in `steps`. Composition applies them in order.

## Startup Data from Flags {#flags}

Flags carry data from outside the application into root init. Typical sources include persisted state, runtime configuration, and request-specific data supplied during server rendering. Use a Flags Effect when obtaining that data requires ordinary Effect Services; keep child selection and Model assembly in the pure init callback.

Define the boundary with a Flags Schema. For a fresh client start, also define an Effect that obtains a value matching that Schema:

::Snippet{name="flagsDefinition" label="Flags definition"}

`init` receives the decoded Flags value and folds it into the first Model:

::Snippet{name="initWithFlags" label="Using init with Flags"}

### Fresh Client Start

This compact Counter keeps the graphless root in `application.ts` with its Model, Message, init, update, and view. It creates `ApplicationComposition` with `Application.makeComposition()`. The entry imports that Composition and passes the Schema to its owned `makeApplication` method as `Flags`.

::Snippet{name="counterApplicationWithFlags" label="Application configuration with Flags"}

Define the browser storage provider in `services.ts`:

::Snippet{name="counterServices" label="Application storage provider"}

The entry imports `ApplicationLayer`, chooses the container and passes the Flags Effect to `Runtime.run`. The runtime resolves the Effect before calling `init`. If the configuration omits the Schema, `init` takes no Flags argument and the compiler rejects mismatched wiring.

::Snippet{name="counterEntryWithFlags" label="Flags wiring"}

The Flags Effect leaves `KeyValueStore` in its requirements, and the completed application supplies the browser provider through `application.provide(ApplicationLayer)`. A whole-application test can supply a deterministic store through the same method. The Runtime builds the Layer once and shares the resulting Service with Flags, Commands, and Subscriptions that require it. Effect's [Managing Services](https://effect.website/docs/v4/requirements-management/services) guide explains how requirements appear in an Effect's type, and [Managing Layers](https://effect.website/docs/v4/requirements-management/layers) explains how Layers construct those Services. See [Layers](/core/layers) for Foldkit's full setup.

### Server Rendering and Hydration

#### Server-Supplied Flags

Server rendering provides Flags from the request or build instead of running a client Flags Effect. `Server.renderToString(ApplicationComposition, { init, update, view, Flags }, { flags })` uses that value to call `init`, encodes it through the Schema, and embeds the result in the HTML. List every completion field explicitly, importing it from its real owner. `Runtime.hydrate` decodes the same value and calls the same `init`, so the client reconstructs the Model that produced the server HTML.

#### Handoff Validation

A hydrating entry does not provide a client Flags Effect. Missing or invalid handoff data fails startup instead of silently constructing a different Model. The [Server Rendering](/core/server-rendering#flags-and-what-only-the-browser-knows) guide explains which data is safe and reproducible across that boundary.

#### Block Decomposition

Once one Model, Message union, and update function become too large to reason about as a unit, decompose the state machine into [Blocks](/core/block). Each child owns its own Model, Messages, update, and Commands behind an explicit parent boundary.
