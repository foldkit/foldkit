# Update

## Update Defines Message Reactions {#overview}

Update decides how a Block reacts to each Message. A Block's constructor returns an `update` record with one handler per Message tag. Each handler receives the current Model and the Message, and returns the next Model plus anything the Runtime should do next.

Update is pure. Given the same Model and Message, a handler returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. Work like that is described by a Command, which update returns and the Runtime performs. A pure handler is direct to test: pass in the inputs and assert on the returned values.

### Exhaustive Message Handlers {#exhaustive-local-message-handlers}

The counter's update record has one handler for each of its three Messages. This version omits the view to keep the focus on update:

::Snippet{name="counterUpdateRecord" label="Counter update handlers"}

The record is typed from the class. Each handler's `model` parameter is the Block's Model, and its second parameter is the exact Message variant for that key, so a handler for `UpdatedQuery` can destructure `{ value }` without annotations. A missing handler or a key that is not a Message tag is a type error.

### Building the Next Model

Each handler describes one transition. `ClickedDecrement` and `ClickedIncrement` transform the current count. `ClickedReset` replaces it with zero.

The handlers build the next Model with [modifyFields](/best-practices/immutability#immutable-updates). Each named field receives a function from its current value to its next value. Omitted fields keep their existing values and references, so the same style keeps working as the Model grows. Pass a transformer point-free when it depends only on the field, as in `count: Number.increment`, and use `() => value` when replacing the field with something else.

## Update Results

A handler returns an object with the next `model` and up to three optional fields:

| Field        | What it holds                                                           |
| ------------ | ----------------------------------------------------------------------- |
| `model`      | The next Model                                                          |
| `commands`   | Commands for the Runtime to perform after the update                    |
| `outMessage` | One fact to report to the parent Block                                  |
| `messages`   | Messages for child instances, each created with `model.child.send(...)` |

Omit a field when the handler has nothing to put in it. Return `{ model }` when a handler creates no Commands. The [`foldkit/no-empty-commands-array`](/tooling/oxlint-plugin#no-empty-commands-array) lint rule rejects a literal `commands: []`. When a handler computes a collection of Commands, return it directly without checking whether it is empty.

### Returning Commands

Return Commands beside the next Model from the handler whose Message calls for the work:

::Snippet{name="updateReturningCommands" label="Returning a Command from update"}

`ClickedIncrement` changes the count and returns `PersistCount`. The Runtime performs `PersistCount` after the update and dispatches `CompletedPersistCount` when it finishes. That handler has no more work to request, so it returns `{ model }`.

An update can return Commands listed on the class, their `Interrupt` Commands, or any other Command whose result Messages belong to this Block. [Commands](/core/commands) covers declaring and implementing them.

### Reporting an OutMessage

A child Block reports a fact to its parent by returning `outMessage`. The Search Block below reports `ChoseResult` when a result is clicked:

::Snippet{name="updateSearchContract" label="Search contract with an OutMessage"}

The handler returns `outMessage: Search.OutMessage.ChoseResult({ title })` beside its Model. The parent decides what the fact means. An OutMessage is a fact, not a request: name it for what happened, such as `ChoseResult`, not for what the parent should do.

### Sending Messages to Children

A parent changes a child instance by returning that child's Message under `messages`. `model.settings.send(Settings.Message.RequestedReset())` creates the Message for one instance. The Runtime delivers each one to its instance after the parent's update returns, and the child's own handler decides what it means. [Parent to child](/core/block#informing-external-state) shows a complete parent.

## Shared Transitions {#shared-steps}

When several handlers make the same change, extract it as a plain function. Two shapes cover most cases:

- A function from Model to Model, such as `resetPage`, for a change several handlers make before they return.
- A function from Model to an update result, such as `searchStep`, when the change includes Commands. A function of this shape is a Step. Name it for its purpose, ending in `Step`.

::Snippet{name="updateSharedSteps" label="Sharing transitions across Search handlers"}

`UpdatedQuery` sets the query, resets the page, and passes that Model to `searchStep`, which returns the Model with a `SearchCatalog` Command for the reset page. Each function receives the Model the previous one returned, so the order of the calls is the order of the changes.

Keep a transition used by one handler next to that handler. Put transitions shared across a Block's handlers in the Block's file, above its `Live` Layer. A handler dedicated to one Message and extracted to its own function is named `handle<MessageTag>`, such as `handleUpdatedQuery`.

### Command Order

The order of Commands in a result is the order they were collected. It is not an execution order. The Runtime starts every returned Command, and their results arrive as each one finishes. When one effect must follow another, return the second Command from the handler for the first one's result Message.

## Handling Child OutMessages

A parent handles a child's OutMessages by spreading `child.on({ ... })` into its update record. Each handler receives the parent's Model, the OutMessage, and the instance that reported it. It returns an ordinary update result for the parent, so it can return Commands, send Messages to other children, or report an OutMessage of the parent's own:

::Snippet{name="updateForwardOutMessage" label="Reporting a child fact further up"}

Sidebar records the title and reports `OpenedDocument` to its own parent. The two facts are different: Search reports which result was chosen, and Sidebar reports that a document opened. [Block](/core/block#surfacing-facts) covers OutMessages in depth.

## Matching Other Unions

Inside a handler, match Model fields and payloads through their own unions. Use a union's `match` for exhaustive handling and `matchOrElse` for selected variants with a fallback. Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) when one branch matches several tags, for partial matching, or for unions without their own matcher.

## Testing Update

A story runs Messages through a Block's update and asserts on the results. It never runs Command handlers. It records the Commands update returned and lets the test resolve each one with a result Message:

::Snippet{name="updateStory" label="Testing the Search update"}

[Testing](/testing) covers stories in depth.
