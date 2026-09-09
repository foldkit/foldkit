# Update

## One Function Defines Every Transition {#overview}

The update function receives the current Model and a Message, then returns the next Model and any Commands for the runtime to execute. It is the only place application state changes.

Update is pure. Given the same Model and Message, it returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. That makes a transition direct to test: pass in the inputs and assert on the returned values.

Use `Message.match` to handle the Message union. If you add a Message and omit its branch, TypeScript reports the missing case. No `default` branch silently absorbs a new variant.

Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) for other tagged unions, partial matches, fallbacks, and one handler shared across several tags.

::Snippet{name="counterUpdate" label="update example"}

Each branch describes one transition. `ClickedDecrement` and `ClickedIncrement` transform the current count. `ClickedReset` replaces it with zero. This version of the counter has no side effects, so all three omit `commands`.

The branches build their next Model with [evo](/best-practices/immutability#immutable-updates). Each named field receives a function from its current value to its next value. Omitted fields keep their existing values and references, so the same update style continues to work as the Model grows.

Update returns a record containing the next Model and, when needed, an array of Commands. A Command describes one side effect, such as an HTTP request, timer, or browser API call. The [Commands](/core/commands) page adds a delayed reset and puts the optional `commands` field to work.

## Returning Commands

Return Commands beside the next Model from the Message branch that requests the work:

::Snippet{name="updateReturningCommands" label="returning a Command from update"}

`ClickedIncrement` changes the count and asks the runtime to persist it. `CompletedPersistCount` records that the Command finished, but it has no more work to request, so that branch omits `commands`.

An update, init, boot, or component helper that statically creates no Commands omits `commands`. When it computes a Commands collection, it returns that collection directly without checking whether it is empty. The [`foldkit/no-empty-commands-array`](/tooling/oxlint-plugin#no-empty-commands-array) lint rule rejects only a literal `commands: []` property.

## Composing Results

### Keeping Results Together

Keep an update-like result attached to the operation that produced it. Name the value after the operation and use dot access:

::Snippet{name="updateResultInit" label="composing an init result"}

The same rule applies when a test consumes an update result:

::Snippet{name="updateResultTest" label="testing an update result"}

When the operation name collides with the function, use a trailing underscore such as `init_`. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not make an OutMessage impossible to ignore. It keeps the operation and its returned values visibly connected.

Pass optional Commands directly to APIs that accept them, including `Command.mapMessages`. Use `result.commands ?? []` only when the next operation requires an array for spreading, concatenating, execution, or an assertion.

### Composing Update Steps

TypeScript rejects this manual composition when the enclosing update returns `Update.Return<Model, Message>`:

::Snippet{name="updateOptionalCommandsError" label="invalid optional Commands composition"}

Every Foldkit template enables `exactOptionalPropertyTypes`. With that setting, the optional `commands` property may be absent. When the property is present, it must contain Commands. `dialogOpen.commands` has the type `Update.Commands<Message> | undefined`, so TypeScript rejects `commands: dialogOpen.commands`.

This error often points to update results being composed by hand. When both operations update the same Model, express them as Steps and compose them with `Update.combine`:

::Snippet{name="updateCombineOpenDialog" label="composing Update Steps"}

Manual unpacking of a child result usually means the site should use `Update.foldChild` or `Update.foldChildStep`.

Use `Update.combine` when two or more operations transform the same Model and a later Step should receive the Model produced by an earlier Step. Name that parameter `stepModel` when an inline Step needs it:

::Snippet{name="updateCombineFoldDialog" label="composing a child fold and another Step"}

`combine` appends the Commands to its returned array in Step order. The runtime forks those Commands independently, so an application must not depend on their execution or completion order.

Do not wrap one Step in `Update.combine`; call that operation directly.

### Combining Independent Results

Independent child inits are not a sequence because neither child updates the other child's Model. Initialize them separately and assemble the parent Model:

::Snippet{name="updateIndependentInits" label="combining independent init results"}

## Preventing Lost OutMessages

Use `Update.Return<Model, Message>` for an update that cannot emit an OutMessage. It prevents a result containing an OutMessage from entering code that would keep only its Model and Commands:

::Snippet{name="updateRejectLostOutMessage" label="rejected OutMessage-producing result"}

Otherwise, that OutMessage would be lost.

A result with no `outMessage` can still be used where `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is expected:

::Snippet{name="updateAcceptMissingOutMessage" label="accepted plain update result"}

The missing field means this update emitted no OutMessage.

### Returning an OutMessage

When the OutMessage is already known while constructing a new result, include it directly:

::Snippet{name="updateKnownOutMessage" label="returning a known OutMessage"}

Use `Update.withOutMessage` when attaching an OutMessage to an existing plain result or when the value has the type `OutMessage | undefined`. If an operation already produced the plain result, pipe that named result into the helper:

::Snippet{name="updateWithOutMessage" label="attaching an optional OutMessage"}

The object-spread alternative is easy to get wrong:

::Snippet{name="updateAvoidOutMessageSpread" label="invalid OutMessage object spread"}

`Update.withOutMessage` preserves `dialogClose.model` and `dialogClose.commands`. A defined value becomes `outMessage`; `undefined` leaves the property out. The update result must be a plain return, so the helper cannot overwrite an OutMessage another operation emitted.

When constructing the plain result in the same expression and the value has the type `OutMessage | undefined`, pass the result first: `Update.withOutMessage({ model, commands }, outMessage)`.
