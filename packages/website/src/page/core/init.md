# Init & Flags

## Overview

Every Block instance starts from its Block's `init`. `init(args, { id, path })` returns the instance's starting Model, and the optional `start(model, args)` lists Commands for the Runtime to perform when the instance appears. Both are fields of the module the Block's Layer returns, shared by every instance, like `init` in an Elm module.

`init` builds the starting Model from three kinds of input:

| Input         | Where it comes from                              | What it does                                             |
| ------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Instance args | The parent's `new Child(id, args)`               | Configures one instance                                  |
| Flags         | A client Effect, or a value from a server render | Carries external startup data to the root as `{ flags }` |
| URL           | The browser, when the program has routing        | Gives the root its starting route as `{ url }`           |

`init` is a plain function. It returns a value and does no work. Work that has to wait, such as loading data, belongs in a `start` Command whose result arrives later as a Message.

On a fresh client start, the Runtime builds the program's Layer, which runs each Block's Layer constructor once. It then resolves the Flags Effect when the program declares Flags, calls the root's `init`, calls `init` for every child in that starting Model, renders the first Model, and performs their `start` Commands and starts their Subscriptions. Server rendering receives Flags as a value, builds the same Model, and renders it without running any Command or Subscription.

## Initialize the Root Model {#init}

A root without Flags or routing takes no args. The counter starts at zero and has no startup work:

::Snippet{name="initSimple" label="Starting a counter at zero"}

The root's args follow from the program's options:

- No `Flags` and no `routing`: the root takes no args.
- `Flags`: the root takes `{ flags }`.
- `routing`: the root takes `{ url }`.
- Both: the root takes `{ flags, url }`.

Declare those args as the second type parameter of the root class, such as `Block<Application, Readonly<{ flags: Flags }>>()`. `Program.make` checks the options against them: a root that takes `{ flags }` requires a `Flags` Schema, and a root that takes `{ url }` requires `routing`.

## Configure Child Instances {#child-initialization}

A child's args come from its parent. The parent passes them to `new` where it creates the instance, and it can derive them from its own args:

::Snippet{name="initThemeFlags" label="Flags carrying a saved theme"}

::Snippet{name="initChildArgs" label="Passing a saved theme to Settings"}

`new Settings('settings', args)` creates a plain value. Settings' `init` turns those args into the instance's starting Model when the instance first appears in a Model. Because `settings` is in the root's starting Model, that happens at startup, right after the root's `init`.

### Keyed Initial Instances

A collection can start with instances. Create one with `new` for each item in the starting Model, each with its own id and args:

::Snippet{name="initKeyedChildren" label="Starting with one score per player"}

Each Counter's id is the player's id, so ids stay unique among Scoreboard's children and stable as players are added or removed.

### Resetting a Child

To return a child to its starting state, send it a Message that its update handles, such as `RequestedReset`. The child decides what reset means and can return Commands while doing it.

Replacing an instance with `new Child(id, args)` under a new id also starts it fresh: the old instance's Subscriptions stop and its in-flight Commands are interrupted, and the new one gets a starting Model from `init` and runs its `start` Commands. Use this when the child should be discarded entirely, such as closing and reopening a form.

## Startup Work with start Commands {#startup-steps}

Return `start` when an instance should begin work as soon as it appears. `start` receives the instance's starting Model and its args. This ProfileCard loads its profile when it appears:

::Snippet{name="initStartCommands" label="Loading a profile when the card appears"}

The starting Model records `Loading`, so the first render already shows the loading state. The Runtime performs `LoadProfile` after that render, and `SucceededLoadProfile` or `FailedLoadProfile` arrives as an ordinary Message.

The Runtime performs `start` every time a new instance appears in a Model, including when a parent adds it in a later update. A ProfileCard added to a list loads its own profile without the parent returning a Command.

A story starts from the Model `init` returns and does not record the root's `start` Commands. Test the loading transition by sending the result Message.

## Startup Data from Flags {#flags}

Flags carry data from outside the application into the root's `init`. Typical sources include persisted state, runtime configuration, and request-specific data supplied during server rendering. Use a Flags Effect when obtaining that data requires services; keep Model construction in the root's `init`.

Define the boundary with a Flags Schema. For a fresh client start, also define an Effect that obtains a value matching that Schema:

::Snippet{name="flagsDefinition" label="Flags definition"}

The root declares `{ flags: Flags }` as its args, and its `init` folds the value into its starting Model:

::Snippet{name="initWithFlags" label="Starting the count from Flags"}

### Fresh Client Start

The Flags Effect reads from `KeyValueStore`, so it needs a store. Define the browser storage provider in `services.ts`:

::Snippet{name="counterServices" label="Application storage provider"}

The entry passes the Flags Schema to `Program.make` and the Flags Effect to `Runtime.run`, providing the store to the Effect:

::Snippet{name="counterEntryWithFlags" label="Flags wiring"}

The Runtime resolves the Flags Effect before calling the root's `init`. If the root takes `{ flags }` and the program omits `Flags`, or the Effect still requires a service, the entry does not compile. Effect's [Managing Services](https://effect.website/docs/v4/requirements-management/services) guide explains how requirements appear in an Effect's type, and [Layers](/core/layers) covers how the program's own services are provided.

### Server Rendering and Hydration

#### Server-Supplied Flags

Server rendering provides Flags from the request or build instead of running a client Flags Effect. `Server.renderToString(Application, { layer, Flags }, { flags })` calls the root's `init` with that value, encodes it through the Schema, and embeds the result in the HTML. `Runtime.hydrate` decodes the same value and calls `init` with it, so the client rebuilds the Model that produced the server HTML.

#### Handoff Validation

A hydrating entry does not provide a client Flags Effect. Missing or invalid handoff data fails startup instead of silently building a different Model. The [Server Rendering](/core/server-rendering#flags-and-what-only-the-browser-knows) guide explains which data is safe and reproducible across that boundary.

## Splitting into Blocks

Once one Model, Message union, and update function become too large to reason about as a unit, decompose the state machine into [Blocks](/core/block). Each child owns its own Model, Messages, update, and Commands, and its `init` receives the args its parent passes to `new`.
