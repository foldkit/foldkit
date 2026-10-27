# Init & Flags

## Overview

Initialization turns startup input into the first complete Model and a collection of Commands. The init callback is pure. It describes initial state and work for the Runtime to perform later.

Three inputs have different jobs:

| Input            | Where it comes from                | What it does                                                     |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Flags            | A client Effect or a server render | Carries external startup data into root init                     |
| ChildInitContext | The parent init callback           | Shares decoded context with registered direct child initializers |
| Steps            | The Composition init plan          | Applies ordered parent transitions after child Models are ready  |

`ChildInitContext` does not add another Runtime phase or another data source. Root init may derive it from Flags, the current URL, or both and return it as `childInitContext`. Composition uses that value only to prepare arguments for the parent's direct child initializers.

On a fresh client start, the Runtime builds the supplied application Layer once, resolves the Flags Effect, calls init, renders the initial Model, starts occurrence lifecycles, and then performs init Commands. A Command result always returns later as a Message. Server rendering receives Flags as a value and runs init and view without building browser handler Layers.

## Initialize the Root Model {#init}

Author root init through its named Composition as `ApplicationComposition.makeInit(fn)`. A graphless root still has an empty Composition. The helper checks the returned Model and Commands against the same graph that update, view, and completion use.

The counter starts at zero and has no startup work:

::Snippet{name="initSimple" label="Using init"}

A non-routing Program calls `init` with no arguments. A routing Program passes the current URL, so its first Model can reflect the route. When the Program declares Flags, they become the first argument in either form. `ApplicationComposition.prepareBlock` receives `init` explicitly and checks it against the registered child and handler graph. `Program.make` or `Program.makeElement` then checks the initializer's arguments against its Flags and routing configuration.

Give `ApplicationComposition.makeInit` one concrete function signature. Optional, default, and rest parameters are supported. Wrap an overloaded domain helper or callable object in a concretely typed callback. A generic Block factory closes over its type parameters and keeps the initializer itself concrete.

## Assemble Child Models {#child-initialization}

A completed Block already carries its initializer. The parent Binding decides whether that child should be present at startup and which arguments it receives. Composition calls the selected child initializers, stores their Models, and retains their Commands. The parent init callback supplies only fields the parent owns.

For a child stored in an exact required direct field:

- Omit `init` when the child's initializer takes no arguments. Composition initializes it automatically.
- Use `init: { contextToArgs }` when the child needs arguments from the parent's child init context.
- Use `init: false` when the parent supplies that field in the init plan's `model`.

When several Bindings read the same child init context, add a `ChildInitContext` Schema to the parent Definition. That Schema contextually types each `init.contextToArgs` selector. Put its decoded value in the Composition init plan's `childInitContext` field.

`contextToArgs` maps that context to the child's initializer arguments. It does not describe the current Block's own init arguments. The separate `Binding.init({ args, toParentModel })` operation takes a concrete argument tuple for one initialization. Keyed `init.instances` also keeps each occurrence's concrete `args` tuple.

The following Profile contains a ThemePicker whose initializer requires a Theme. The Binding selects that child input from `childInitContext`, while the init plan supplies only the parent-owned username:

::Snippet{name="blockFoldChildInit" label="Assembling an initial child Model"}

Here, the Binding owns the rule that ThemePicker receives `savedTheme`. Profile init supplies `childInitContext` and its parent-owned `username`. It does not call `themePickerInit`, place `themePicker`, or merge child Commands by hand.

`Composition.makeInit` calls the selected child initializers once, in `bindings` order. Foldkit adds the child-owned fields before constructing the complete Model. Use `commands` for parent Commands and `steps` for parent Steps applied after that Model exists.

Parent Commands appear first in the returned collection, followed by retained child init Commands and Step Commands. The Runtime executes Commands independently, so collection order does not sequence their completion.

These calls assemble values only. They do not construct Services, build handler Layers, or perform Commands.

Keep a child's initial state transition and initial Command in that child's `makeInit`. The parent Binding selects the child's arguments through `init.contextToArgs`, and root init supplies their shared `childInitContext`. Keep root-owned work that does not depend on a preceding Model transition in the root plan's `commands`. For example, API data and example source loading belong to their child initializers, while initial sidebar and anchor scrolling are ordinary root Commands.

### Optional and custom child storage

For an exact unkeyed `Option` field, omitting `init` leaves presence with the parent. Return `Option.none()` from `init.contextToArgs` for absence or `Option.some(args)` for presence.

An exact keyed Option wrapper also leaves presence with the parent. Create it through `initAndSet` or the registered `Binding.init({ key, args, toParentModel })` operation described below. Automatic `init.instances` is available only for keyed arrays. Accessor Bindings likewise remain parent-owned unless the parent initializes them explicitly.

The final parent Model determines which initialized occurrences are active. Init Commands for absent or `presentWhen`-inactive children are omitted. A `subscriptions.when` policy only gates Subscription Streams; it does not suppress child init Commands. Initial Steps may change the child Model without discarding its init Commands.

For custom storage or dynamic creation, call the registered Binding's explicit `init` operation. Pass `{ args, toParentModel }`, plus `key` for a keyed Binding and optional parent `commands`. `args` is the exact child init tuple. `toParentModel` receives the initialized child Model and constructs the complete parent Model. `Binding.init` returns a passive initialization recipe. The recipe has no `.model` or `.commands` fields to project.

Return that recipe directly from the owning Composition's `makeInit` callback or `makeUpdate` handler, or preserve it through the owning Definition's `makeStep` producer. The Composition authoring boundary interprets it directly. Checked execution enters the registered graph, then returns the complete parent Model with every lifted child init Command followed by the optional parent Commands. That collection order does not sequence their effects or completion. The compiler checks the key, argument tuple, complete parent Model, Command requirements, and exact Binding requirement at these boundaries.

During checked execution, runtime validation verifies the active composition frame, validates the complete parent Model against its Schema, checks that `toParentModel` stores a schema-equivalent initialized child, and checks that a keyed result contains exactly one occurrence with the requested key. These guards protect JavaScript with erased types and operations captured for later execution. Ordinary Model construction remains available for fixtures and other pure values.

### Dynamic storage helpers

The optional `foldkit/bindingInit` module reuses declared storage when dynamic initialization only places a child:

| Storage                                                      | Helper          | Existing child         |
| ------------------------------------------------------------ | --------------- | ---------------------- |
| Required or optional direct field                            | `initAndSet`    | Replaced               |
| Option wrapper containing only the key and child fields      | `initAndSet`    | Replaced               |
| Keyed array with existing `init.instances` and `init.toItem` | `initAndAppend` | Duplicate key rejected |
| Record or HashMap containing child Models directly           | `initAndInsert` | Duplicate key rejected |

Pass the Binding, the current complete parent Model, and the child `args`; keyed storage also takes `key`. Each helper returns the same passive recipe as `Binding.init`, preserving child init Commands and registration requirements. Ordinary folds and operations never create absent children.

For example, assume `RoomBinding` declares `field: 'maybeRoomInstance'`, `key: 'roomId'`, and `childField: 'model'`, and its wrapper contains only those last two fields. The parent supplies identity and initializer arguments:

::Snippet{name="initSetKeyedChild" label="Initializing an optional keyed child"}

Direct fields need no startup policy for `initAndSet`. A custom unkeyed accessor may reuse an existing `init.toParentFields` projection. Keep explicit `Binding.init` when creating additional wrapper metadata, changing sibling fields, selecting a different accessor target, adding parent Commands, or replacing an entire tagged parent variant. Do not add a startup policy solely to enable a helper.

For a direct-value map created with `ParentDefinition.makeMapBinding`, insertion keeps every other entry and rejects an occupied key before child init. Assume `EditorsBinding` stores Issue editor Models by Issue ID:

::Snippet{name="initInsertMappedChild" label="Inserting a mapped child"}

When an existing child should be retained, use `makeInitIfMissingStep(Binding, { key, args })`. It returns a connected Step and derives the map field from the Binding. Construction captures the key and arguments; applying the Step checks the current Model. An existing key preserves the exact parent Model and emits no Commands. An absent key initializes and inserts the child with its init Commands. Both paths require the registered Binding.

::Snippet{name="initMappedChildIfMissing" label="Retaining a mapped child"}

Pass the Step directly to `Update.combineSteps` or a compatible update handler. Use the owning Definition's `makeStep` when a producer selects or combines Steps. Keep entity lookup and handling of unknown URL IDs in the application.

Wrapped maps keep explicit construction so the parent supplies their metadata. Keyed identity identifies an occurrence; it does not require storing multiple children. Same-key reinitialization does not create a fresh generation or cancel pending work. Replacing a keyed Option with a different key follows ordinary occurrence removal and creation.

### Resetting a child

Use a child-owned operation such as `requestReset` when reset is part of the child's behavior. Its Message enters child update, which owns validation, Commands, OutMessages, and any lifecycle transitions. Reset parent-owned fields separately through the parent's `makeFieldsStep`.

This Counter exposes a Message-backed reset operation and takes its initial count as an init argument:

::Snippet{name="initResetCounter" label="Counter reset operation"}

The parent normally composes that operation with clearing its own draft. When it deliberately wants the initializer's baseline instead, it returns a complete `CounterBinding.init` recipe. Both paths preserve `applicationId`:

::Snippet{name="initResetParent" label="Resetting through a child boundary"}

Return the initialization recipe intact. Composition retains and lifts every child init Command, followed by any parent `commands` supplied in the recipe. This Counter has no pending work or lifecycle. Reinitializing stored Model state does not establish a fresh occurrence generation or cancellation of earlier work. A child with active resources, a Dialog, or pending work needs a child-owned operation that defines the reset behavior.

### Keyed Initial Instances

A keyed-array Binding can declare `init.instances` and `init.toItem`. The first callback selects the ordered keys and exact child init argument tuples. The second builds each stored item from its occurrence and initialized child Model. For a direct child array, it returns that exact child Model with the planned key. For a wrapped array, it returns the parent-owned wrapper containing that exact child Model and key. The parent keeps occurrence IDs and any wrapper metadata outside the child Model.

Return each wrapper as a plain record so its child field keeps the exact initialized object. A wrapper Schema constructor may reconstruct that child and fail the identity check. Composition constructs the full parent Model through its Schema after collecting these records.

This Counter application starts three instances. Its Model declares `counters: Schema.Array(CounterInstance)`, where each instance holds `id` and `counter`. Its `addCounterStep` returns a `CountersBinding.init({ key, args, toParentModel })` recipe, so the Definition defers initialization until it can produce the parent result with the child init Commands:

::Snippet{name="initKeyedChildren" label="Initializing keyed child instances"}

The assembler validates the entire occurrence plan before calling child init. Duplicate keys, invalid keys, and non-array `args` fail with a configuration error. TypeScript checks tuple length and argument types. At a JavaScript boundary, the Runtime cannot reconstruct which initializer parameters were required, optional, defaulted, or rest parameters. Each wrapper must retain its planned key. Only keys present in the final parent Model retain their init Commands; initial Steps may change their child state.

This startup adapter applies to exact `field` / `key` keyed arrays, with or without `childField`. General keyed accessors keep explicit initialization so their custom storage and write policy remain visible.

When an array already declares that startup policy, `initAndAppend` from `foldkit/bindingInit` reuses its `init.toItem` for dynamic creation. Pass the Binding, current parent Model, and `{ key, args }`. It returns a passive recipe that initializes and appends one child when the registered Composition interprets it, retaining the child's Commands and preserving the other items and their order. An existing key is rejected. Keep a presence check in an `init...IfMissingStep` when an existing occurrence should be retained.

Assume `ProjectSettingsBinding` stores `{ projectId, model }` wrappers in `projectSettingsInstances` and already declares `init.toItem`. This Step keeps an existing project editor and initializes an absent one:

::Snippet{name="initAppendKeyedChild" label="Appending a keyed child"}

Use the explicit `Binding.init` writer for custom storage, additional parent fields or Commands, or array replacement. The other [dynamic storage helpers](#dynamic-storage-helpers) cover direct fields, optional keyed slots and direct-value maps. `initAndAppend` requires an existing startup array policy; do not add an otherwise unnecessary startup policy just to use this helper.

## Compose Startup Steps {#startup-steps}

Use startup Steps when initial child Models must exist before a parent transition can run. Composition-owned `init` is the startup boundary. Foldkit does not run a special Runtime boot phase after it.

Put initial Steps in the plan's `steps` array. The Composition assembles the complete parent Model first, then passes each Step the Model returned by the preceding Step. It retains the child init Commands and adds the Commands returned by those Steps.

An optional `boot` helper is a public Message-producing operation called through the Binding after the child Model is stored. It may accept Flags, the current URL, or prerendered data, and update returns the normal next Model and Commands through that Binding. The Runtime later performs those Commands through their handlers. A feature need not define both init and `boot` helpers.

When an existing domain operation such as `requestRestore` or `requestOpen` already describes the transition, put its existing Message constructor directly under `operations`. Use a tuple producer there when the public inputs need mapping, refinement, defaults, or an exact update context tuple. Do not create a separate startup-only Message.

The following excerpt assumes `SettingsBinding` and `SessionBinding` have init policies and provide startup operations. The `steps` array is sequential, so `SessionBinding.requestResume` receives the Model returned by `SettingsBinding.requestRestore`. The result retains Commands from both child initializers and both Steps:

::Snippet{name="initBootSteps" label="Composing startup Steps"}

List each initial Step in `steps`. Composition applies them in order.

## Startup Data from Flags {#flags}

Flags carry data from outside the application into root init. Typical sources include persisted state, runtime configuration, and request-specific data supplied during server rendering. Use a Flags Effect when obtaining that data requires ordinary Effect Services; keep child selection and Model assembly in the pure init callback.

Define the boundary with a Flags Schema. For a fresh client start, also define an Effect that obtains a value matching that Schema:

::Snippet{name="flagsDefinition" label="Flags definition"}

`init` receives the decoded Flags value and folds it into the first Model:

::Snippet{name="initWithFlags" label="Using init with Flags"}

### Fresh Client Start

This compact Counter keeps the graphless root in `application.ts` with its Model, Message, init, update, view, and `ApplicationBlock`. Because the Definition has no other use, it creates `ApplicationComposition` with a top-level `Block.makeDefinition('Application', ...).makeComposition()` chain. The entry imports the Block and passes the Schema to `Program.make` as `Flags`.

::Snippet{name="counterApplicationWithFlags" label="Assembling the Application Block"}

Define the browser storage provider in `services.ts`:

::Snippet{name="counterServices" label="Application storage provider"}

The entry imports `ApplicationLayer`, chooses the container and passes the Flags Effect to `Runtime.run`. The runtime resolves the Effect before calling `init`. If the configuration omits the Schema, `init` takes no Flags argument and the compiler rejects mismatched wiring.

::Snippet{name="counterEntryWithFlags" label="Flags wiring"}

The Flags Effect leaves `KeyValueStore` in its requirements, and the Program supplies the browser provider through `program.provide(ApplicationLayer)`. A whole-application test can supply a deterministic store through the same method. The Runtime builds the Layer once and shares the resulting Service with Flags, Commands, and Subscriptions that require it. Effect's [Managing Services](https://effect.website/docs/v4/requirements-management/services) guide explains how requirements appear in an Effect's type, and [Managing Layers](https://effect.website/docs/v4/requirements-management/layers) explains how Layers construct those Services. See [Layers](/core/layers) for Foldkit's full setup.

### Server Rendering and Hydration

#### Server-Supplied Flags

Server rendering provides Flags from the request or build instead of running a client Flags Effect. `Server.renderToString(ApplicationBlock, { Flags }, { flags })` uses that value to call the Block's `init`, encodes it through the Schema, and embeds the result in the HTML. `Runtime.hydrate` decodes the same value and calls the same `init`, so the client reconstructs the Model that produced the server HTML.

#### Handoff Validation

A hydrating entry does not provide a client Flags Effect. Missing or invalid handoff data fails startup instead of silently constructing a different Model. The [Server Rendering](/core/server-rendering#flags-and-what-only-the-browser-knows) guide explains which data is safe and reproducible across that boundary.

#### Block Decomposition

Once one Model, Message union, and update function become too large to reason about as a unit, decompose the state machine into [Blocks](/core/block). Each child owns its own Model, Messages, update, and Commands behind an explicit parent boundary.
