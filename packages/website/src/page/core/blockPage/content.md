# Block

## Overview

A large application becomes difficult to change when every feature's transitions accumulate in one update function. A Block keeps one feature's state machine together: its Model, Messages, update, Commands, and view.

A Block has two parts:

- The class is the contract. It declares the Block's Model, Message, OutMessage, and the Commands and Mounts it owns. It contains no implementation, so a test or a parent can import it without pulling in services.
- `make` implements the contract. It takes a constructor and returns an Effect Layer. The constructor runs once for each instance of the Block, yields the services it needs, and returns the starting Model, update handlers, Command handlers, and view.

A parent creates child instances in its own constructor with `yield* new Settings('settings', args)` and holds them in its Model. Putting an instance into the Model connects it; taking it out disconnects it. The parent renders a child with `model.settings.view()`, sends it Messages with `send`, and learns facts from it through OutMessages handled with `.on`.

The application stays one state tree. The root Block's Model contains its children, their Models contain theirs, and the Runtime delivers each Message to the instance that owns it.

:::Info{label="Complete application"}
The [Typing Terminal application](/example-apps/typing-terminal) composes Home and Room as Blocks. Its [client source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src) shows a routed root that holds Home in a field and a Room instance in an `Option`, handles Home's OutMessages, sends Room the keys it captures, and provides every Block and service through one Layer.
:::

## When to Create a Block

Create a Block when part of the application owns a state machine rather than only markup. For example:

- A reusable component owns interaction state, keyboard behavior, focus, or accessibility wiring.
- A feature area owns enough Model and Message variants that its update deserves its own home.
- A feature owns Commands or event streams that should live and die with its state.

If a section only renders parent state, write a view function instead. A card that receives a title and content does not need its own Block.

## Declare a Block {#child-block}

Declare the Message union and the Commands first, at module level. A Command names the Messages it can produce, so the Messages have to exist before it. Then declare the class:

::Snippet{name="blockSettingsContract" label="Declaring the Settings Block"}

`Block<Settings, Args>()('Settings', contract)` takes up to four type parameters:

| Type parameter | Default | Meaning                                                                                                |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `Self`         |         | The class itself, so instances are typed as `Settings`                                                 |
| `Args`         | `void`  | What a parent passes to `new Settings(id, args)`                                                       |
| `ViewInput`    | `void`  | What a parent passes to `view(input)`, covered in [View input](#callback-dispatch-boundaries)          |
| `Exposed`      | `never` | A value the instance exposes to its parent's Commands, covered in [Resources](/core/managed-resources) |

The string `'Settings'` is the Block id. DevTools and error messages use it.

Every field of the contract is optional. A Block with no Model is stateless, and a Block with no Message has nothing to update. A Block that only produces Messages from an event stream, with no view, is how Foldkit models a long-running source. [Subscriptions](/core/subscriptions) covers that case.

## Implement a Block

`Settings.make` takes an `Effect.fn` constructor and returns `SettingsLive`, a `Layer<Settings>`:

::Snippet{name="blockSettingsLive" label="Implementing Settings"}

The constructor receives the instance id and the args the parent passed. It returns an object with these fields:

| Field           | Required when                   | What it holds                                                          |
| --------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `model`         | The contract declares a Model   | The instance's starting Model                                          |
| `update`        | The contract declares a Message | One handler per Message tag                                            |
| `commands`      | The contract lists Commands     | One handler per listed Command                                         |
| `mounts`        | The contract lists Mounts       | One handler per listed Mount                                           |
| `expose`        | `Exposed` is declared           | The value parent Commands read with `instance.use`                     |
| `start`         | —                               | Commands the Runtime performs when the instance appears                |
| `stream`        | —                               | A Stream of this Block's Messages that runs while the instance exists  |
| `subscriptions` | —                               | Streams that restart when a value derived from the Model changes       |
| `view`          | —                               | `(model, h) => Html`, or `(model, h, input) => Html` with a view input |

A Block without a `view` renders nothing. The root Block's view may return a Document, `{ title, body }`, to set the page title.

The compiler checks the record against the contract. A missing update handler, a missing Command handler, or an update that returns a Command whose results are not this Block's Messages is a type error.

### Update handlers

An update handler receives the Model and the Message and returns an object with the next `model` and three optional fields. `commands` holds Commands for the Runtime to perform. `outMessage` reports a fact to the parent. `messages` holds Messages for child instances, covered in [Parent to child](#informing-external-state). [Update](/core/update) covers handlers in depth.

### Command handlers

A Command declared at module level has a name, args, and result Messages, but no implementation. The implementation lives under `commands`, keyed by the Command's name. A handler takes the Command's args and returns an Effect that produces one of its result Messages.

Handlers close over the services the constructor yields. `SettingsLive` yields `SettingsStore` once, and the `SaveTheme` handler uses it every time update returns `SaveTheme`. Because the constructor yields `SettingsStore`, the Layer `SettingsLive` requires it, and the program fails to compile until something provides it. [Commands](/core/commands) covers Command handlers in depth.

### When the constructor runs

`yield* new Settings('settings', args)` does not run the Settings constructor. It declares an instance. The constructor runs once, synchronously, when that instance first appears in its parent's Model.

That timing has a consequence: the constructor must not do asynchronous work. Yield services and build values, then return. To load data when an instance appears, return a Command under `start`, and handle its result Message in update like any other.

## Hold Child Instances in the Model {#embedding}

A parent holds a child by putting the instance in a Model field typed with the child class. Profile holds one Settings instance in its `settings` field:

::Snippet{name="blockProfileParent" label="Holding a Settings instance in Profile"}

The Model Schema uses the class itself, `settings: Settings`, not the child's Model Schema. The field holds the instance, and the instance holds the child's current Model.

The instance id, `'settings'`, identifies this instance within Profile. Ids must be unique within one parent. Use the same name for the variable, the Model field, and the id.

### Render a child {#wiring-the-view}

`model.settings.view()` renders the child. The child's view builds handlers with Settings Messages, and the Runtime delivers those Messages to that Settings instance. Profile's update never sees them.

### Provide the child's Layer

`ProfileLive` yields `new Settings(...)`, so it requires `Settings`. Provide `SettingsLive` to `ProfileLive`, and provide the services that `SettingsLive` requires:

::Snippet{name="blockProfileEntry" label="Providing Profile's Layers"}

A missing Layer is a type error at `Program.make`. The error names what is missing, such as `Settings` or `SettingsStore`.

If a child creates Blocks of its own, provide their Layers to the child's Layer, or provide one merged Layer to the whole graph with `Layer.provide(Layer.mergeAll(SettingsLive, AvatarLive))`. [Layers](/core/layers) covers this wiring.

## Talk Between Parent and Child

A child owns its state. The parent changes a child only by sending it a Message, and it learns what happened inside the child only through OutMessages.

### Child to parent: OutMessages {#surfacing-facts}

An OutMessage is a fact the child reports upward. Settings declares `OutMessage: defineMessageUnion({ ChangedTheme: { theme: Theme } })`, and its `ClickedTheme` handler returns `outMessage: Settings.OutMessage.ChangedTheme({ theme })`.

The parent handles OutMessages by spreading the instance's `.on` into its update record, as Profile does above with `...settings.on({ ChangedTheme: ... })`. Each handler receives the parent's Model, the OutMessage, and the instance that reported it, and returns an ordinary update result for the parent. Name each OutMessage variant you handle. Variants without a handler are ignored.

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

### Coordinate siblings

Siblings do not talk to each other directly. The parent handles one sibling's OutMessage and sends the other a Message. This parent holds two Counters and resets the right one when the left one reaches its maximum:

::Snippet{name="blockCounterChild" label="Counter Block used by the examples below"}

::Snippet{name="blockSiblings" label="Resetting one Counter when another reaches its maximum"}

## Optional Children

Hold an instance in a `Schema.Option` field when the child should exist only some of the time. The parent declares the instance once in its constructor and puts it in the field when it should appear:

::Snippet{name="blockOptionalChild" label="Showing and hiding a bonus Counter"}

`Option.some(bonus)` connects the bonus Counter: its constructor runs, its Commands, streams, and Subscriptions start, and its view can render. `Option.none()` disconnects it: its scope closes and its state is discarded. Showing it again constructs a fresh instance with a fresh starting Model.

To keep a child's state while it is hidden, keep it in the Model and choose in the view whether to render it.

## Keyed Collections

`Child.each(collection, args)` returns a factory for a collection of instances. Calling the factory with a key creates an instance. Store the instances in an array:

::Snippet{name="blockKeyedCollection" label="A list of Counters"}

`row('row-3')` creates the Counter whose id is `row-3`. Add instances to the array to connect them and filter them out to disconnect them. Key the rendered rows by `counter.id`.

`row.on` handles OutMessages from every instance the factory creates. The third argument is the instance that reported, so the handler knows which row reached its maximum.

A factory call can override the factory's args for one instance: `row('row-3', { max: 10 })`. A factory created without args, such as `Counter.each('rows')`, requires args on every call. Use that form when every instance needs its own args, such as a per-room socket that takes `{ roomId }`.

### Records of instances {#keyed-map-fields}

Instances can also live in a `Schema.Record`, keyed by a domain id:

::Snippet{name="blockRecordCollection" label="One score Counter per player"}

Instances can live in plain objects, arrays, `Option`, and tagged structs. They cannot live in a `HashMap`, a `HashSet`, or a class instance. Convert those to arrays or Records.

## Children in Tagged Variants {#whole-tagged-variants}

An instance can be a field of one variant of a tagged union. The instance is connected while the Model holds that variant:

::Snippet{name="blockTaggedVariant" label="Different children for practice and match modes"}

Switching to `Match` disconnects `practice` and connects `home` and `away`. Switching back constructs `practice` fresh. A routed application uses the same shape: each page Block lives in the Model while its route is active.

## View Input {#callback-dispatch-boundaries}

Some Blocks supply behavior while the parent chooses the markup. A headless Disclosure owns its open state and the attributes that make a button control a panel, but the parent decides what the button and panel look like.

Declare the input type as the third type parameter, and receive it as the third argument of `view`. Wrap attributes the child builds for the parent in `childAttributes(...)`:

::Snippet{name="blockViewInput" label="A Disclosure that takes a toView callback"}

The parent passes the input to `view`:

::Snippet{name="blockViewInputParent" label="Rendering a Disclosure from a parent"}

Two dispatch rules apply:

- Attributes wrapped in `childAttributes` keep the child's dispatch. The `OnClick` inside `attributes.button` delivers `ClickedToggle` to the Disclosure, even though the parent spreads it onto its own button.
- Functions in the input run as the parent. Handlers built inside `toView` with the parent's `h`, such as the Contact support button, deliver the parent's Messages to the parent.

Stateless render helpers such as `Button.view` from `@foldkit/ui` take the caller's `h` and Messages directly. They are not Blocks and need no view input.

Pass stable functions as view input, defined at module level or in the parent's constructor. A child may cache on a function's identity.

## Services and Instances

Each instance's constructor yields its services from the context where the parent declared it. To give one instance a different implementation, provide the service on that declaration:

::Snippet{name="blockServiceOverride" label="A preview Settings instance that never saves"}

`preview` saves through `previewSettingsStore`. `live` saves through whichever `SettingsStore` the program provides.

## Generic Blocks

A Block that is generic over an item type is a function that declares a class and returns it with its Layer attached as `Live`:

::Snippet{name="blockGenericFactory" label="A Picker factory generic over its items"}

Call the factory once at module level and name the result. Each call declares a different Block:

::Snippet{name="blockGenericFactoryUsage" label="Using a Picker of fruit"}

## Lifetimes

An instance lives while it is in its parent's Model:

- It is constructed when it first appears. Its `start` Commands, `stream`, and `subscriptions` begin then.
- It keeps its state across every update that leaves it in place.
- It is disconnected when it leaves the Model. The Runtime closes its scope: Streams and Subscriptions stop, and anything the constructor acquired with `Effect.acquireRelease` is released.
- Putting the same declared instance back constructs it fresh.
- Putting a different instance at the same path disconnects the old one first.

A Command result or a sent Message addressed to an instance that is no longer in the Model is dropped.

## Test a Block

`story` and `scene` take a Block's Layer, build the instance, and run steps against it. Each returns an Effect, so a test returns it from `it.effect`. Provide the services the constructor yields with `Effect.provide`:

::Snippet{name="blockSettingsStory" label="Testing Settings with a story"}

Command handlers never run in a story or scene. `Command.expectExact` asserts which Commands update returned, and `Command.resolve` feeds a result Message back into update. Without `given`, the story starts from the Model the constructor returns.

### Test a parent with its children

Provide the child Layers to the parent's Layer. In a story, the Model is the resolved tree: each instance appears as its own Model, so `model.settings.theme` reads the Settings state. Deliver a child's Message with `Block.deliver(Child, id, message)`:

::Snippet{name="blockProfileStory" label="Testing Profile with its Settings child"}

A child's Command appears in the parent's story. `Command.at('settings', SaveTheme)` selects the one pending at the `settings` instance, and its result Message returns to that instance. Address a keyed instance by collection and key: `Block.deliver(Counter, ['rows', 'row-3'], message)`.

`given` can set the state of instances that exist, but it cannot add or remove them. Do that with Messages, as the application does.

### Stub a child

To test a parent alone, provide a different implementation of the child class. The stub below reports `ChangedTheme` for any click and never saves:

::Snippet{name="blockStubChild" label="Testing Profile against a stub Settings"}

[Testing](/testing) covers stories and scenes in depth.

## Debugging in DevTools

DevTools shows each instance's state inside its parent's Model. A Message delivered to a child appears as a `BlockMessage` with the instance's path, such as `['settings']` or `['rows', 'row-3']`, and the child's own Message inside it.

::Demo{name="message-routing-under-hood"}

## API

| Name                                                                     | What it does                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `class X extends Block<X, Args, ViewInput, Exposed>()('X', contract) {}` | Declares a Block class                                                                      |
| `X.make(Effect.fn(function* (id, args) { ... }))`                        | Implements the Block. Returns `Layer<X>`                                                    |
| `yield* new X(id, args)`                                                 | In a parent constructor, declares an instance                                               |
| `yield* X.each(collection, args)`                                        | In a parent constructor, returns a factory: `factory(key, args?)` declares a keyed instance |
| `instance.view(input?)`                                                  | Renders the instance                                                                        |
| `instance.send(message)`                                                 | Creates a Message for the instance. Return it under `messages`                              |
| `instance.on(handlers)` / `factory.on(handlers)`                         | Handles OutMessages. Spread the result into the parent's update record                      |
| `instance.model`                                                         | The instance's current Model                                                                |
| `instance.id`                                                            | The instance id                                                                             |
| `instance.use`                                                           | The instance's exposed value, or `NotConnected` while it is not in the Model                |
| `X.Model`, `X.Message`, `X.OutMessage`                                   | The contract's Schemas and constructors                                                     |
| `Block.deliver(X, path, message)`                                        | In tests, addresses a Message to the instance at `path`                                     |
