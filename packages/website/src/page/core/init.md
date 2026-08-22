# Init & Flags

## The First Model {#init}

`init` constructs the first Model and returns any Commands that should run when the application starts. Its result has the same record shape as update: `{ model, commands? }`.

The counter starts at zero and has no startup work:

::Snippet{name="initSimple" label="init example"}

A non-routing application or element calls `init` with no arguments. A routing application passes the current URL, so its first Model can reflect the route. When the application declares Flags, they become the first argument in either form.

## Startup Data from Flags {#flags}

Flags carry data from outside the application into `init`. Typical sources include persisted state, runtime configuration, and request-specific data supplied during server rendering.

Define the boundary with a Flags Schema. For a fresh client boot, also define an Effect that obtains a value matching that Schema:

::Snippet{name="flagsDefinition" label="Flags definition"}

`init` receives the decoded Flags value and folds it into the first Model:

::Snippet{name="initWithFlags" label="init with Flags"}

### Fresh Client Boot

Pass the Schema to `Runtime.makeApplication` as `Flags`, then pass the Effect to `Runtime.run`. The runtime resolves the Effect before calling `init`. If the configuration omits the Schema, `init` takes no Flags argument and the compiler rejects mismatched wiring.

::Snippet{name="counterEntryWithFlags" label="Flags wiring"}

The example provides `KeyValueStore` inside the Flags Effect because that service is used only during startup. If the same singleton is also needed by Commands or Subscriptions, leave the requirement in the Effect type and provide it through the application's `resources` Layer. The runtime builds that Layer once and shares it. See [Resources](/core/resources) for the full setup.

### Server Rendering and Hydration

Server rendering provides Flags from the request or build instead of running a client Flags Effect. `renderToString` uses that value to call `init`, encodes it through the Schema, and embeds the result in the HTML. `Runtime.hydrate` decodes the same value and calls the same `init`, so the client reconstructs the Model that produced the server HTML.

A hydrating entry does not provide a client Flags Effect. Missing or invalid handoff data fails startup instead of silently booting a different Model. The [Server Rendering](/core/server-rendering#flags-and-what-only-the-browser-knows) guide explains which data is safe and reproducible across that boundary.

Once one Model, Message union, and update function become too large to reason about as a unit, decompose the state machine into [Submodels](/core/submodel). Each child owns its own Model, Messages, update, and Commands behind an explicit parent boundary.
