# Architecture

## One State Tree {#overview}

In most TypeScript UI frameworks, each component manages its own state and effects. Foldkit keeps application state in one `Model` and sends every change through the same loop.

This pattern is called [The Elm Architecture](https://guide.elm-lang.org/architecture/). You don’t need to know Elm to use it. Foldkit adapts the pattern for TypeScript and Effect so state transitions stay explicit and traceable.

## The Loop

### The Cycle

Every Foldkit app repeats the same cycle:

1. Something happens, and a `Message` records that fact.
2. `update` receives the current `Model` and the Message, then returns the next Model and any `Command`s to execute.
3. `view` renders the next Model as HTML, and the runtime executes the Commands.
4. User events and effect results produce more Messages, and the cycle begins again.

#### Runtime Flow

The complete cycle looks like this:

```diagram
+-----> update --> Commands -----------+
|         |                            |
|         v                            |
|       Model ---> Subscriptions ------+
|         |                            |
|         v                            |
|       view ----> Mounts -------------+
|         |                            |
|         v                            |
|       Browser -> events -------------+
|                                      v
|                                   Runtime
|                                      |
|                                      v
+<--------------------------------- Message
```

Four sources report through the Runtime: Commands, the Browser, Mounts, and Subscriptions. When one produces a Message, the Runtime dispatches it back into `update`.

### Where Messages Come From

- **Browser:** interactions with the rendered view, such as clicks and keypresses, produce Messages directly.
- **Commands:** one-shot side effects such as HTTP requests, focus operations, `localStorage` writes, and navigation calls. The runtime executes each Command and sends its declared result back as a Message. Every Command has a name that appears in [DevTools](/core/devtools), [tests](/testing), and tracing.
- **Mount:** imperative work scoped to the lifetime of an element in the live DOM. For example: portaling an overlay, attaching an observer, or handing an element to a third-party library. A Mount declared with `Mount.define` runs an Effect that emits one Message when the element appears. One declared with `Mount.defineStream` runs a Stream of Messages from listeners or observers. The runtime dispatches those results and runs the paired cleanup when the element unmounts.
- **Subscriptions:** Streams that run while a Block instance exists. A Block's `stream` runs for the instance's whole life. A `subscriptions` entry runs while a value derived from the Model stays the same, and restarts when that value changes. A Subscription often turns an external source, such as timer ticks, `WebSocket` frames, or system theme changes, into Messages. It can also emit no Messages and maintain DOM state for its lifetime, such as setting `user-select: none` while a drag is active.

A stateful handle such as a `WebSocket` connection or a camera stream is a child Block that acquires the handle in its constructor and releases it when the parent removes it from the Model. Its Messages reach the Runtime through its `stream`, like any other Subscription. [Resources](/core/managed-resources) covers the pattern.

### Shared Services

Shared services sit beneath the loop instead of feeding it directly. They are app-lifetime dependencies such as an `RpcClient`, an analytics client, or a background compute worker. Block constructors yield them, and the Command handlers, Mount handlers, and Streams those constructors return close over them. Services do not produce Messages themselves.

### Model Ownership

Commands, browser events, Mounts, and Subscriptions never mutate the Model. They report what happened with a Message, and only `update` decides the next state. If you want to know how the app reached its current state, follow the Messages.

## Blocks and Layers {#application-assembly}

The loop above describes one Block. An application is a tree of them. Each Block is a class that declares its Model, Messages, and Commands, and an implementation, built with `make`, that returns its update handlers, Command handlers, and view. A parent creates child instances in its constructor and holds them in its own Model, so the root Block's Model is the state of the whole application.

A Message belongs to one instance. A click inside a child's view goes to the child's update. The child reports facts upward with OutMessages, and the parent changes a child only by sending it a Message.

Each implementation is an Effect Layer. A Block's constructor yields the services it needs, such as an `RpcClient`, and its Command handlers close over them. A parent's Layer requires the Layers of the children it creates. The program receives one Layer that provides the root Block, every Block below it, and every service they yield, and TypeScript rejects a program whose Layer is missing any of them.

`Program.make(Application, { layer, container })` describes the program. `Runtime.run(program)` builds the Layer, constructs the root instance, and starts the loop. The [Block guide](/core/block) builds a parent and child step by step, and the [Layers guide](/core/layers) explains how implementations and services are supplied.

## Definitions

Use this table as a reference after you understand the loop:

| Concept      | Definition                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model        | The single data structure that holds the entire application state.                                                                                                                                     |
| Message      | A fact about something that happened, such as a button click, a keypress, or a successful request with a payload.                                                                                      |
| update       | A pure function that receives the current Model and a Message, then returns the next Model and any Commands to execute.                                                                                |
| view         | A pure function that renders the Model as HTML. Its event handlers construct Messages.                                                                                                                 |
| Command      | A description of a one-shot side effect. The runtime executes it and sends the result back as one of its declared Messages.                                                                            |
| Mount        | Imperative work scoped to a live DOM element. It emits Messages through an Effect or Stream and cleans up when the element unmounts.                                                                   |
| Subscription | A Stream of Messages that runs while a Block instance exists, either always or while a value derived from its Model stays the same.                                                                    |
| Layer        | A recipe for constructing services and Block implementations. The Runtime builds the program's Layer once per start and releases its scoped resources on stop.                                         |
| Runtime      | The Foldkit engine that executes Commands, runs Subscriptions, manages Mount and instance lifecycles, and routes Messages back into update.                                                            |
| Block        | A class that declares a Model, Messages, and Commands, plus a Layer that implements them. A parent holds Block instances in its Model, and each child reports facts to its parent through OutMessages. |

## The Restaurant Analogy

### State and Effects

Think of a Foldkit app like a restaurant. The waiter keeps a notebook: a running picture of everything happening right now. Table 3 ordered the salmon. Table 5 is waiting for dessert. When something happens (a customer flags the waiter, the kitchen rings the bell), the waiter hears about it, updates their notebook, and maybe writes a slip for the kitchen. The waiter doesn’t cook the salmon. They hand the slip to the kitchen, and the kitchen reports back when it’s done.

Messages work the same way. “Table 3 asked for the check” is a fact given to the waiter, not an instruction. The waiter decides what to do: maybe bring the check immediately, maybe offer dessert first. The message stays the same either way.

:::Info{label="The restaurant analogy"}
Use the analogy to remember who knows the state and who performs effects. The definitions above remain the literal contracts.
:::

### Mapping the Concepts

| Foldkit      | Restaurant                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Model        | The waiter’s notebook: the current state of everything                                                              |
| Message      | Something that happens: “table 3 asked for the check”                                                               |
| update       | The waiter: hears what happened, updates the notebook, maybe writes a slip                                          |
| view         | What the customers actually see: plates on the table, the check arriving                                            |
| Command      | A slip for the kitchen: “prepare the salmon”                                                                        |
| Mount        | Tableside flambé: rolled out to a specific table the moment its dish arrives, rolled away when the plate is cleared |
| Subscription | A standing order: “keep the coffee coming for table 5”                                                              |
| Layer        | Kitchen equipment and the cooks who use it: available while the restaurant is open to fulfill orders.               |
| Block        | A section of the restaurant with its own waiter: the bar keeps its own notebook and tells the floor manager facts   |
| Runtime      | The kitchen: does the work, reports back when done                                                                  |

That’s the architecture in the abstract. The next page shows a complete counter application: the core of the loop (a Model, Messages, `update`, and `view`) declared as one Block and running.
