# Block

## Overview

A large application becomes difficult to change when every feature's transitions accumulate in one update function. A Block keeps one feature's state machine together: its Model, Messages, update, Commands, and view.

If you know Elm, a Block is an Elm module. It has an `init`, an `update`, a `view`, and `subscriptions`, and every instance of the Block shares them. The difference is where effects live: a Block's Commands are implemented in the same module, and they close over the Effect services the Block needs.

A Block has two parts:

- The class is the contract. It declares the Block's Model, Message, OutMessage, and the Commands and Mounts it owns. It contains no implementation, so a test or a parent can import it without pulling in services.
- `layer` implements the contract. It takes an Effect that yields the services the Block needs and returns its module: `init`, `update`, Command handlers, `view`, and the rest. That Effect runs once per Block, when the program starts. The result is an Effect Layer, conventionally named `SettingsLive`.

An instance is plain data. `new Settings('settings', { initialTheme: 'Dark' })` creates one anywhere: in `init`, or in an update handler that reacts to a Message. Nothing runs until the instance appears in a Model. Then Foldkit calls `init` to give it a starting Model, starts its Commands and Subscriptions, and keeps them running until the instance leaves the Model.

So the Model says which children exist. A parent adds a child by putting an instance in its Model and removes it by taking the instance out. It renders the child with `model.settings.view()`, sends it Messages with `send`, and learns facts from it through OutMessages handled with `Settings.on`.

The application stays one state tree. The root Block's Model contains its children, their Models contain theirs, and the Runtime delivers each Message to the instance that owns it.

:::Info{label="Complete application"}
The [Typing Terminal application](/example-apps/typing-terminal) composes Home and Room as Blocks. Its [client source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src) shows a routed root that holds Home in a field and a Room instance in an `Option`, handles Home's OutMessages, sends Room the keys it captures, and provides every Block and service through one Layer.
:::

## When to Create a Block

Create a Block when part of the application owns a state machine rather than only markup. For example:

- A reusable component owns interaction state, keyboard behavior, focus, or accessibility wiring.
- A feature area owns enough Model and Message variants that its update deserves its own home.
- A feature owns Commands or Subscriptions that should start and stop with its state.

If a section only renders parent state, write a view function instead. A card that receives a title and content does not need its own Block.

## Declare a Block {#child-block}

Declare the Message union and the Commands first, at module level. A Command names the Messages it can produce, so the Messages have to exist before it. Then declare the class:

::Snippet{name="blockSettingsContract" label="Declaring the Settings Block"}

`Block<Settings, Args>()('Settings', contract)` takes up to three type parameters:

| Type parameter | Default | Meaning                                                                                       |
| -------------- | ------- | --------------------------------------------------------------------------------------------- |
| `Self`         |         | The class itself, so instances are typed as `Settings`                                        |
| `Args`         | `void`  | What a parent passes to `new Settings(id, args)`                                              |
| `ViewInput`    | `void`  | What a parent passes to `view(input)`, covered in [View input](#callback-dispatch-boundaries) |

The string `'Settings'` is the Block id. DevTools and error messages use it.

Every field of the contract is optional. A Block with no Model is stateless, and a Block with no Message has nothing to update. A Block with no view that only turns an event source into Messages is how Foldkit models a long-running source. [Subscriptions](/core/subscriptions) covers that case.

## Implement a Block

`Settings.toLayer` takes an Effect and returns `SettingsLive`, a `Layer<Settings>`:

::Snippet{name="blockSettingsLive" label="Implementing Settings"}

The Effect yields `SettingsStore` and returns the Settings module. A Block that uses no services passes a function returning its module instead, `Counter.toLayer(() => ({ init, update, view }))`. Both forms run once, when the program's Layer is built. These are its fields:

| Field           | Required when                   | What it holds                                                                      |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| `init`          | The contract declares a Model   | `(args, { id, path }) => Model`: an instance's starting Model                      |
| `update`        | The contract declares a Message | One handler per Message tag, plus the OutMessage handlers of the Blocks it holds   |
| `commands`      | The contract lists Commands     | One handler per listed Command                                                     |
| `mounts`        | The contract lists Mounts       | One handler per listed Mount                                                       |
| `start`         | —                               | `(model, args) => Commands`: Commands to perform when an instance appears          |
| `subscriptions` | —                               | Streams that run while an instance is in the Model, keyed by values from its Model |
| `view`          | —                               | `(model, h) => Html`, or `(model, h, input) => Html` with a view input             |

A Block without a `view` renders nothing. The root Block's view may return a Document, `{ title, body }`, to set the page title.

The compiler checks the module against the contract. A missing update handler, a missing Command handler, or an update that returns a Command whose results are not this Block's Messages is a type error.

### One module for every instance

The Effect passed to `layer` runs once, when the program's Layer is built. Every Settings instance in the application shares the module it returns. Ten Settings instances means ten Models, all updated by the same `update` and rendered by the same `view`.

So the module has no per-instance state of its own. Anything that differs between instances belongs in the instance's Model:

- `init` receives the instance's args and its `{ id, path }`. Copy what the instance needs into its starting Model.
- Handlers read the instance's state from the `model` argument.
- A Command handler receives what it needs through the Command's args, which update fills from the Model.

`init` and `start` must not do asynchronous work. To load data when an instance appears, return a Command from `start`, and handle its result Message in update like any other.

### Update handlers

An update handler receives the Model and the Message and returns an object with the next `model` and three optional fields. `commands` holds Commands for the Runtime to perform. `outMessage` reports a fact to the parent. `messages` holds Messages for child instances, covered in [Parent to child](#informing-external-state). [Update](/core/update) covers handlers in depth.

### Command handlers

A Command declared at module level has a name, args, and result Messages, but no implementation. The implementation lives under `commands`, keyed by the Command's name. A handler takes the Command's args and returns an Effect that produces one of its result Messages.

Handlers close over the services the Layer's Effect yields. `SettingsLive` yields `SettingsStore` once, and the `SaveTheme` handler uses it every time an update returns `SaveTheme`. Because the Effect yields `SettingsStore`, the Layer `SettingsLive` requires it, and the program fails to compile until something provides it. [Commands](/core/commands) covers Command handlers in depth.

A Command handler serves every instance, so it learns which instance it is working for from its args. This Draft Block copies its id into its Model in `init` and passes it to `SaveDraft`:

::Snippet{name="blockPerInstanceCommand" label="Passing an instance's draft id to its Command"}

The Command's result Message returns to the instance whose update returned the Command. The handler does not need the id for that. It needs the id to save the right draft.

## Create Child Instances {#embedding}

A parent holds a child by putting an instance in a Model field typed with the child class. Profile creates one Settings instance in `init`:

::Snippet{name="blockProfileParent" label="Holding a Settings instance in Profile"}

The Model Schema uses the class itself, `settings: Settings`, not the child's Model Schema. The field holds the instance, and the instance holds the child's current Model.

`new Settings('settings', { initialTheme: 'System' })` takes an id and the child's args. When Profile's starting Model reaches the Runtime, the Runtime finds the new instance and calls Settings' `init` with those args to give it a Model.

The id identifies the instance among its parent's children, and it must be unique among them. Two children of one parent with the same id is an error the Runtime throws when it sees them. Use the same name for the Model field and the id.

### Render a child {#wiring-the-view}

`model.settings.view()` renders the child. The child's view builds handlers with Settings Messages, and the Runtime delivers those Messages to that Settings instance. Profile's update never sees them.

### Provide the child's Layer

Profile's Model holds `Settings`, so `ProfileLive` requires the `Settings` Layer. Provide `SettingsLive` to `ProfileLive`, and provide the services that `SettingsLive` requires:

::Snippet{name="blockProfileEntry" label="Providing Profile's Layers"}

A missing Layer is a type error at `Program.make`. The error names what is missing, such as `Settings` or `SettingsStore`.

If a child holds Blocks of its own, provide their Layers to the child's Layer, or provide one merged Layer to the whole graph with `Layer.provide(Layer.mergeAll(SettingsLive, AvatarLive))`. [Layers](/core/layers) covers this wiring.

## Talk Between Parent and Child

A child owns its state. The parent changes a child only by sending it a Message, and it learns what happened inside the child only through OutMessages.

### Child to parent: OutMessages {#surfacing-facts}

An OutMessage is a fact the child reports upward. Settings declares `OutMessage: defineMessageUnion({ ChangedTheme: { theme: Theme } })`, and its `ClickedTheme` handler returns `outMessage: Settings.OutMessage.ChangedTheme({ theme })`.

The parent handles OutMessages by spreading `Settings.on({ ... })` into its update record, as Profile does above. One entry covers every Settings instance the parent's Model holds. Each handler receives three arguments and returns an ordinary update result for the parent:

- the parent's Model
- the OutMessage
- the instance that reported it

Name each OutMessage variant you handle. `on` ignores variants without a handler. `Settings.onAll({ ... })` requires a handler for every variant, so adding an OutMessage to Settings becomes a type error in every parent until it handles the new variant.

Use an OutMessage when the parent needs to react: update its own Model, return a Command, tell a sibling, or report a fact further up. If the parent only needs to display child state, read it instead.

### Parent to child: send {#informing-external-state}

To change a child, the parent returns one of the child's Messages under `messages`, created with the instance's `send`:

::Snippet{name="blockSendToChild" label="Resetting Settings from Account"}

The Runtime delivers `RequestedReset` to that Settings instance after Account's update returns. Settings' own handler decides what a reset means, so it can return Commands and OutMessages like any other transition.

Name Messages a parent sends for what they mean to the child: `RequestedReset`, `RequestedClose`, `InformedOfRouteChange`. They are facts from the child's point of view, like every other Message.

### Read child state

`model.settings.model` is the Settings instance's current Model. A parent can read it in view, in update, or in a selector:

::Snippet{name="blockReadChildModel" label="Reading Settings state in a parent view"}

The read is one-way. `model.settings.model` is read-only. `modifyFields` on the parent Model can replace the `settings` instance, but it cannot change that instance's Model. The only way to change a child's state is to send it a Message.

### Pass parent state to a child

A child cannot read its parent's Model. Parent state reaches a child in one of three ways, chosen by when the child needs it:

- **Args, once.** `new Settings('settings', { initialTheme })` hands `init` a value when the instance is created. The child copies what it needs into its Model. Later changes in the parent do not reach it.
- **View input, every render.** Data the child only displays, such as a list of options the parent owns, goes in the view input. The child renders whatever the parent passes this time. [View input](#callback-dispatch-boundaries) covers this.
- **A Message, when it changes.** When the child must react to a change, for example to reset itself or start a Command, the parent sends it a Message with `send`.

### Gate a child's Messages

Sometimes the parent's state forbids what a child would otherwise do. `Settings.when(predicate)` drops a Settings instance's Messages while the predicate returns false for the parent's Model:

::Snippet{name="blockGateChild" label="Ignoring Settings clicks while the device is locked"}

While `isLocked` is true, clicks in Settings never reach Settings' update. The predicate also receives the Message, so a gate can let some Messages through. Messages the parent sends with `send` are not gated. Gate in the parent instead of passing the parent's state into the child for the child to check.

## Compose Blocks

The sections below build on two child Blocks. Counter counts up to a maximum taken from its args and reports `ReachedMax`. Stopwatch counts seconds through a Subscription that runs while the stopwatch is running:

::Snippet{name="blockCounterChild" label="Counter Block used by the examples below"}

::Snippet{name="blockStopwatchChild" label="Stopwatch Block used by the examples below"}

### Coordinate siblings through the parent

Siblings do not talk to each other directly. The parent handles one sibling's OutMessage and sends the other a Message. This parent holds two Counters and resets the right one when the left one reaches its maximum:

::Snippet{name="blockSiblings" label="Resetting one Counter when another reaches its maximum"}

`Counter.on` handles `ReachedMax` from both Counters, so the handler checks which one reported. Its third argument is the reporting instance, and `counter.id` is `'left'` or `'right'`.

### Collections

Store instances in an array to hold any number of them. Create an instance with `new` in the update handler that adds it, and filter it out to remove it:

::Snippet{name="blockKeyedCollection" label="A list of Counters"}

`ClickedAddRow` creates the Counter whose id is `row-3` and appends it. The Runtime calls its `init` when the update returns. `ClickedRemoveRow` filters it out, and everything running for it stops. Generate ids from a counter in the Model or from a domain id, so no two rows share one. Key the rendered rows by `counter.id`.

`Counter.on` covers every Counter in `rows`. The handler uses the reporting instance's id to remove the row that reached its maximum.

#### Records of instances {#keyed-map-fields}

Instances can also live in a `Schema.Record`, keyed by a domain id:

::Snippet{name="blockRecordCollection" label="One score Counter per player"}

Instances can live in plain objects, arrays, `Option`, and tagged structs. They cannot live in a `HashMap`, a `HashSet`, or a class instance. Convert those to arrays or Records.

#### Mixed Block types in one list

One list can hold instances of different Blocks. Declare the element Schema as a union of the classes:

::Snippet{name="blockMixedCollection" label="A dashboard of Counter and Stopwatch widgets"}

Every instance has an `id` and a `view`, so the dashboard renders and removes widgets without checking their type. `Counter.on` handles OutMessages from the Counters in the list. Stopwatch reports none, so the dashboard has no entry for it. Ids are shared across the list: a Counter and a Stopwatch in one parent cannot have the same id.

### Optional children

Hold an instance in a `Schema.Option` field when the child should exist only some of the time:

::Snippet{name="blockOptionalChild" label="Showing and hiding a bonus Counter"}

`Option.some(new Counter('bonus', { max: 5 }))` adds the bonus Counter. `init` runs, its `start` Commands and Subscriptions start, and its view can render. `Option.none()` removes it: its Subscriptions end, its in-flight Commands are interrupted, and its state is discarded. Showing it again creates a new instance with a fresh starting Model.

To keep a child's state while it is hidden, keep it in the Model and choose in the view whether to render it.

#### Create a child when its data arrives

A child that needs loaded data in its args is created in the handler that receives the data. SettingsPage loads the saved theme with a `start` Command and creates Settings when the result arrives:

::Snippet{name="blockLoadedChild" label="Creating Settings once the saved theme loads"}

Each state of the page is a variant of `SettingsState`, and only `Loaded` holds a Settings instance. Settings exists only after there is a theme to give it, so it never needs a placeholder state of its own.

### Children in tagged variants {#whole-tagged-variants}

An instance can be a field of one variant of a tagged union. The instance runs while the Model holds that variant:

::Snippet{name="blockTaggedVariant" label="Different children for practice and match modes"}

`ClickedStartMatch` replaces the `Practice` variant with a `Match` holding two new Counters. The practice Counter leaves the Model and stops. `ClickedEndMatch` creates a new practice Counter, which starts from zero. A routed application uses the same shape: each page Block lives in the Model while its route is active.

### Replace or move a child

Foldkit tracks a child by its path: its parent's path plus its own id. What happens when the Model changes depends on whether that path changes:

- **Moving** an instance to another field of the same parent keeps its path. It keeps its state, and its Subscriptions and in-flight Commands keep running.
- **Replacing** it with an instance that has a new id ends the old one and starts the new one from its `init`.

This board pins a stopwatch by moving it to another list, and restarts one by replacing it:

::Snippet{name="blockMoveChild" label="Pinning a Stopwatch keeps it running; restarting replaces it"}

A pinned stopwatch keeps counting from where it was. A restarted one gets a new id, so the old stopwatch's Subscription ends and the new one starts at zero.

To start over, use a new id. An instance created with `new` under the id of a running sibling gets a fresh Model from `init`, but Foldkit treats it as the same running child: its `start` Commands do not run again, and its in-flight Commands deliver their results into the new Model.

## View Input {#callback-dispatch-boundaries}

Some Blocks supply behavior while the parent chooses the markup. A headless Disclosure owns its open state and the attributes that make a button control a panel, but the parent decides what the button and panel look like.

Declare the input type as the third type parameter, and receive it as the third argument of `view`. Wrap attributes the child builds for the parent in `childAttributes(...)`:

::Snippet{name="blockViewInput" label="A Disclosure that takes a toView callback"}

Disclosure builds its panel's DOM id from its path in `init`, so two Disclosures in different parents do not share an id even when both are called `shipping`.

The parent passes the input to `view`:

::Snippet{name="blockViewInputParent" label="Rendering a Disclosure from a parent"}

Two dispatch rules apply:

- Attributes wrapped in `childAttributes` keep the child's dispatch. The `OnClick` inside `attributes.button` delivers `ClickedToggle` to the Disclosure, even though the parent spreads it onto its own button.
- Functions in the input run as the parent. Handlers built inside `toView` with the parent's `h`, such as the Contact support button, deliver the parent's Messages to the parent.

Stateless render helpers such as `Button.view` from `@foldkit/ui` take the caller's `h` and Messages directly. They are not Blocks and need no view input.

Pass stable functions as view input, defined at module level or in the parent's Layer. A child may cache on a function's identity.

## Generic Blocks

A Block that is generic over an item type is a function that declares a class with its implementation and returns it. A class declared with its implementation is its own Layer, so the parent provides it with `Layer.provide(FruitPicker)`. Inside the implementation, refer to the module's Message and OutMessage constants, because the class is not defined yet. The items are parent data, so they arrive through the view input:

::Snippet{name="blockGenericFactory" label="A Picker factory generic over its items"}

Call the factory once at module level and name the result. Each call declares a different Block:

::Snippet{name="blockGenericFactoryUsage" label="Using a Picker of fruit"}

## Lifetimes

What runs for an instance follows the Model:

- When an instance first appears in a Model, `init` gives it a Model, its `start` Commands are performed, and its Subscriptions start.
- It keeps its state across every update that leaves it in place, including a move to another field of the same parent.
- When it leaves the Model, its Subscriptions end and its in-flight Commands are interrupted.
- An instance value that already has a Model, put back after it left, starts again with the state it holds. Its `start` Commands run again.

A Command result or a sent Message addressed to an instance that is no longer in the Model is dropped.

Long-lived resources that one instance uses, such as a WebSocket per chat room, belong in a Subscription or a keyed service, not in the Block's module. [Resources](/core/managed-resources) covers both.

## Test a Block

`story` and `scene` take a Block's Layer, create an instance, and run steps against it. Each returns an Effect, so a test returns it from `it.effect`. Pass the instance's args after the Layer, and provide the services the Layer yields with `Effect.provide`:

::Snippet{name="blockSettingsStory" label="Testing Settings with a story"}

Command handlers never run in a story or scene. `Command.expectExact` asserts which Commands update returned, and `Command.resolve` feeds a result Message back into update. Without `given`, the story starts from the Model `init` returns.

### Test a parent with its children

Provide the child Layers to the parent's Layer. In a story, the Model is the resolved tree: each instance appears as its own Model, so `model.settings.theme` reads the Settings state. Deliver a child's Message with `Block.deliver(Child, path, message)`:

::Snippet{name="blockProfileStory" label="Testing Profile with its Settings child"}

A path is the instance ids from the root, so a direct child's path is its id. A Counter in a collection is `Block.deliver(Counter, 'row-3', message)`, and a Settings inside an `account` child is `Block.deliver(Settings, ['account', 'settings'], message)`. Field names are not part of the path.

A child's Command appears in the parent's story. `Command.at('settings', SaveTheme)` selects the one pending at the `settings` instance, and its result Message returns to that instance.

`given` sets the state of the instances the Model holds. To add an instance, put `new Child(id, args)` in the `given` Model.

### Stub a child

To test a parent alone, provide a different implementation of the child class. The stub below reports `ChangedTheme` for any click and never saves:

::Snippet{name="blockStubChild" label="Testing Profile against a stub Settings"}

[Testing](/testing) covers stories and scenes in depth.

## Coming from Elm

A Block's module maps one-to-one onto an Elm module:

| Elm                                           | Foldkit Block                                     |
| --------------------------------------------- | ------------------------------------------------- |
| `init : Flags -> ( Model, Cmd Msg )`          | `init: (args, { id, path }) => Model` and `start` |
| `update : Msg -> Model -> ( Model, Cmd Msg )` | `update`, one handler per Message                 |
| `view : Model -> Html Msg`                    | `view: (model, h) => Html`                        |
| `subscriptions : Model -> Sub Msg`            | `subscriptions`, keyed by values from the Model   |
| Ports and `Task`s                             | `commands`, closing over Effect services          |

Nesting is where the two differ. In Elm, a parent wraps each child's Messages in its own variant, such as `GotSettingsMsg`, and routes them by hand with `Html.map`, `Cmd.map`, `Sub.map`, and a branch in update. In Foldkit, the parent creates the child with `new` and handles its OutMessages with `Settings.on` or `Settings.onAll`. The Runtime routes the child's own Messages, Commands, and Subscriptions to it. [Foldkit vs Elm](/elm/foldkit-vs-elm-side-by-side) covers the rest of the mapping.

## Debugging in DevTools

DevTools shows each instance's state inside its parent's Model. A Message delivered to a child appears as a `BlockMessage` with the instance's path, such as `['settings']` or `['row-3']`, and the child's own Message inside it.

::Demo{name="message-routing-under-hood"}

## API

| Name                                                            | What it does                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `class X extends Block<X, Args, ViewInput>()('X', contract) {}` | Declares a Block class                                                                                      |
| `X.toLayer(() => ({ ... }))` or `X.toLayer(Effect.gen(...))`    | Implements the Block. Runs once and returns the module; the Effect form yields services. Returns `Layer<X>` |
| `new X(id, args)`                                               | Creates an instance. It starts when it appears in a Model                                                   |
| `instance.view(input?)`                                         | Renders the instance                                                                                        |
| `instance.send(message)`                                        | Creates a Message for the instance. Return it under `messages`                                              |
| `instance.model`                                                | The instance's current Model                                                                                |
| `instance.id`                                                   | The instance id                                                                                             |
| `X.on(handlers)` / `X.onAll(handlers)`                          | Handles OutMessages from every X the parent's Model holds. Spread into the parent's update record           |
| `X.when(predicate)`                                             | Gates the Messages of every X the parent's Model holds. Spread into the parent's update record              |
| `X.Model`, `X.Message`, `X.OutMessage`                          | The contract's Schemas and constructors                                                                     |
| `Block.deliver(X, path, message)`                               | In tests, addresses a Message to the instance at `path`                                                     |
