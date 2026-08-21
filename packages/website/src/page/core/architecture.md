# Architecture

## One State Tree {#overview}

In most TypeScript UI frameworks, each component manages its own state and effects. Foldkit keeps application state in one `Model` and sends every change through the same loop.

This pattern is called [The Elm Architecture](https://guide.elm-lang.org/architecture/). You don’t need to know Elm to use it. Foldkit adapts the pattern for TypeScript and Effect so state transitions stay explicit and traceable.

## The Loop

Every Foldkit app repeats the same cycle:

1. Something happens, and a `Message` records that fact.
2. `update` receives the current `Model` and the Message, then returns the next Model and any `Command`s to execute.
3. `view` renders the next Model as HTML, and the runtime executes the Commands.
4. User events and effect results produce more Messages, and the cycle begins again.

The complete cycle looks like this:

```diagram
+------> update -> Commands -----------+
|         |                            |
|         v                            |
|       Model -> Subscriptions --------+
|         |                            |
|         +-> ManagedResources --------+
|         |                            |
|         v                            |
|       view -> Mounts ----------------+
|         |                            |
|         v                            |
|       Browser -> events -------------+
|                                      v
|                                   Runtime
|                                      |
|                                      v
+<--------------------------------- Message
```

Five sources report through the Runtime: Commands, the Browser, Mounts, Subscriptions, and ManagedResources. When one produces a Message, the Runtime dispatches it back into `update`.

### Where Messages Come From

- **Browser:** interactions with the rendered view, such as clicks and keypresses, produce Messages directly.
- **Commands:** one-shot side effects such as HTTP requests, focus operations, `localStorage` writes, and navigation calls. The runtime executes each Command and sends its declared result back as a Message. Every Command has a name that appears in [DevTools](/core/devtools), [tests](/testing), and tracing.
- **Mount:** imperative work scoped to the lifetime of an element in the live DOM. For example: portaling an overlay, attaching an observer, or handing an element to a third-party library. `Mount.define` runs an Effect that emits one Message at acquire. `Mount.defineStream` runs a Stream of Messages from listeners or observers. The runtime dispatches those results and runs the paired cleanup when the element unmounts.
- **Subscriptions:** scoped Streams gated by a slice of the Model. The runtime keeps a Subscription alive while that slice holds its value, then starts a fresh scope when the value changes. A Subscription often turns an external source, such as timer ticks, `WebSocket` frames, or system theme changes, into Messages. It can also emit no Messages and maintain DOM state for its lifetime, such as setting `user-select: none` while a drag is active.
- **ManagedResources:** stateful handles, such as a camera stream, a `WebSocket` connection, or a Web Worker pool, that exist while a slice of the Model holds a particular value. The runtime acquires and releases the handle and dispatches Messages for each lifecycle transition. Commands and Subscriptions can use the typed handle while it is live and receive `ResourceNotAvailable` rather than crashing when it is not.

Resources sit beneath the loop instead of feeding it directly. They are app-lifetime dependencies such as an `RpcClient`, an analytics client, or a background compute worker. The runtime shares them with Commands, Subscriptions, and startup Flags, but Resources do not produce Messages themselves.

These sources never mutate the Model. They report what happened with a Message, and only `update` decides the next state. If you want to know how the app reached its current state, follow the Messages.

## Definitions

Use this table as a reference after you understand the loop:

| Concept         | Definition                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model           | The single data structure that holds the entire application state.                                                                                                                                          |
| Message         | A fact about something that happened, such as a button click, a keypress, or a successful request with a payload.                                                                                           |
| update          | A pure function that receives the current Model and a Message, then returns the next Model and any Commands to execute.                                                                                     |
| view            | A pure function that renders the Model as HTML. Its event handlers construct Messages.                                                                                                                      |
| Command         | A description of a one-shot side effect. The runtime executes it and sends the result back as one of its declared Messages.                                                                                 |
| Mount           | Imperative work scoped to a live DOM element. It emits Messages through an Effect or Stream and cleans up when the element unmounts.                                                                        |
| Subscription    | A scoped Stream gated by a slice of the Model. The runtime restarts its scope when that slice changes.                                                                                                      |
| Resource        | An app-lifetime singleton shared with Commands, Subscriptions, and startup Flags. It is a dependency, not a Message source.                                                                                 |
| ManagedResource | A stateful handle scoped to a slice of the Model. The runtime manages its lifecycle, and Commands and Subscriptions can use it while it is live.                                                            |
| Runtime         | The Foldkit engine that executes Commands, runs Subscriptions, manages Mount and resource lifecycles, and routes Messages back into update.                                                                 |
| Submodel        | A self-contained Model, Message, update, and Commands that a parent embeds and delegates to. A child can surface high-level facts to its parent through the optional `outMessage` field returned by update. |

## The Restaurant Analogy

Think of a Foldkit app like a restaurant. The waiter keeps a notebook: a running picture of everything happening right now. Table 3 ordered the salmon. Table 5 is waiting for dessert. When something happens (a customer flags the waiter, the kitchen rings the bell), the waiter hears about it, updates their notebook, and maybe writes a slip for the kitchen. The waiter doesn’t cook the salmon. They hand the slip to the kitchen, and the kitchen reports back when it’s done.

Messages work the same way. “Table 3 asked for the check” is a fact given to the waiter, not an instruction. The waiter decides what to do: maybe bring the check immediately, maybe offer dessert first. The message stays the same either way.

:::Info{label="The restaurant analogy"}
Use the analogy to remember who knows the state and who performs effects. The definitions above remain the literal contracts.
:::

| Foldkit         | Restaurant                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Model           | The waiter’s notebook: the current state of everything                                                                      |
| Message         | Something that happens: “table 3 asked for the check”                                                                       |
| update          | The waiter: hears what happened, updates the notebook, maybe writes a slip                                                  |
| view            | What the customers actually see: plates on the table, the check arriving                                                    |
| Command         | A slip for the kitchen: “prepare the salmon”                                                                                |
| Mount           | Tableside flambé: rolled out to a specific table the moment its dish arrives, rolled away when the plate is cleared         |
| Subscription    | A standing order: “keep the coffee coming for table 5”                                                                      |
| Resource        | Kitchen equipment: the oven, the stand mixer, the deep fryer. Turned on when the kitchen opens and available to every dish. |
| ManagedResource | A specialty station: set up when the menu features the seafood special, broken down when the special ends                   |
| Runtime         | The kitchen: does the work, reports back when done                                                                          |

That’s the architecture in the abstract. The next page shows a complete counter application: the core of the loop (a Model, Messages, `update`, `init`, and `view`) wired together and running.
