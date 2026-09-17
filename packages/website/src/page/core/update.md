# Update

## One Function Defines Every Transition {#overview}

The update function receives the current Model and a Message, then returns the next Model and any Commands for the runtime to execute. It is the only place application state changes.

Update is pure. Given the same Model and Message, it returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. That makes a transition direct to test: pass in the inputs and assert on the returned values.

Use `Message.match` to handle the Message union. If you add a Message and omit its branch, TypeScript reports the missing case. No `default` branch silently absorbs a new variant.

Use a `defineTaggedUnion` or `defineRouteUnion` namespace's `match` for exhaustive matching and `matchOrElse` for selected variants with a fallback. Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) when one handler matches several tags, for Message partial matching, or for unions without their own matcher.

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

Fold a child `init` or `boot` result into the parent instead of unpacking its Model and Commands:

::Snippet{name="updateResultInit" label="composing an init result"}

For another update-like result, keep it attached to the operation that produced it. Name the value after the operation and use dot access. The same rule applies when a test consumes an update result:

::Snippet{name="updateResultTest" label="testing an update result"}

When the operation name collides with the function, use a trailing underscore such as `init_`. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not make an OutMessage impossible to ignore. It keeps the operation and its returned values visibly connected.

Pass optional Commands directly to APIs that accept them, including `Command.mapMessages`. Use `result.commands ?? []` only when the next operation requires an array for spreading, concatenating, execution, or an assertion.

### Composing Update Steps

TypeScript rejects this manual composition when the enclosing update returns `Update.Return<Model, Message>`:

::Snippet{name="updateOptionalCommandsError" label="invalid optional Commands composition"}

Every Foldkit template enables `exactOptionalPropertyTypes`. With that setting, the optional `commands` property may be absent. When the property is present, it must contain Commands. `dialogOpen.commands` has the type `Update.Commands<Message> | undefined`, so TypeScript rejects `commands: dialogOpen.commands`.

This error often points to update results being composed by hand. When both operations update the same Model, express them as Steps and compose them with `Update.combine`:

::Snippet{name="updateCombineOpenDialog" label="composing Update Steps"}

Use `Update.foldChildInit` to keep a child `init` or `boot` result, its lifted Commands, and any OutMessage together. Use `Update.foldChild` for a child update that receives input, or `Update.foldChildStep` for a child helper that receives only its Model.

Use `Update.combine` when two or more operations transform the same Model and a later Step should receive the Model produced by an earlier Step. Name that parameter `stepModel` when an inline Step needs it:

::Snippet{name="updateCombineFoldDialog" label="composing a child fold and another Step"}

`combine` appends the Commands to its returned array in Step order. The runtime forks those Commands independently, so an application must not depend on their execution or completion order.

Do not wrap one Step in `Update.combine`; call that operation directly.

### Combining Child Initialization Results {#combining-independent-results}

Use `Update.foldChildInits` to initialize several Submodels inside one parent. It constructs the parent Model once, then handles each child's OutMessage against that complete Model.

For example, a Workspace Submodel contains Search and Editor Submodels. The Search Submodel's boot result can report a prepared document, and the Editor Submodel's can report an opened document. The Workspace Submodel handles both locally:

::Snippet{name="updateIndependentInits" label="initializing Search and Editor Submodels inside a Workspace Submodel"}

`toParentModel` receives the Search and Editor Models. It also supplies the initial values for the Workspace Submodel's own fields. `Model.make` gives those fields their declared types, including the value type inside `Option.none()`.

The `folds` record determines the order of the OutMessage handlers. Use descriptive string keys such as `search` and `editor`, written in the order the handlers should run. Both records must name the same children.

In this example, the Search fold sets `maybeSelectedDocumentId`. The Editor fold receives that updated Model and sets `maybeOpenedDocumentId`, keeping the selection. Foldkit does not construct the parent again or overwrite either child Model between folds. If a child emits no OutMessage, its handler is skipped.

This order applies to the Model changes made by the folds. Commands run independently; a later child's Commands do not wait for an earlier child's Commands to finish.

### Initializing Children with OutMessages

A parent can combine information from several children into one OutMessage. For example, App contains a Workspace Submodel, which contains Search and Editor Submodels. The Search Submodel's boot function reports `RestoredQuery` when it restores a saved query; the Editor Submodel's reports `RestoredDraft` when it restores a saved draft. App should show one restoration notice that includes both results.

The Workspace Submodel uses `toParentOutMessage` adapters to translate each child's OutMessage into its own OutMessage type. The Workspace Submodel is the parent of the Search and Editor Submodels, and a child of App. It also uses these adapters when an individual child restores state during a later update.

During initialization, `resolveOutMessage` combines the two translated OutMessages into `RestoredWorkspace` for App. It receives them under the `search` and `editor` keys. Both restored values are preserved:

::Snippet{name="updateInitOutMessages" label="combining both restoration results into one OutMessage from the Workspace Submodel"}

If only the Search Submodel reports a restoration, the final OutMessage has `Some(query)` and `None` for the document. If only the Editor Submodel reports one, it has `None` for the query and `Some(documentId)`. If neither reports one, `resolveOutMessage` is not called and the result has no `outMessage`.

The current Model can tell App what query and document are present. It cannot necessarily tell App whether they were restored during this boot. The resolver keeps that information from the OutMessages without adding temporary bookkeeping to the Model.

`resolveOutMessage` is required whenever an entry can produce a parent OutMessage. It runs after all local folds and also receives the final parent Model as its second argument. Return a combined OutMessage when both results matter. Choosing one and dropping the other needs an application-specific reason. Returning `undefined` emits no OutMessage.

When the final Model contains everything needed for the parent's OutMessage, handle the children locally and attach that OutMessage afterward with [`Update.withOutMessage`](#returning-an-outmessage). That also lets initialization report completion when none of the children emitted an OutMessage.

### Deriving an OutMessage in a Local Fold

A local fold can report a more complete result than the child's original OutMessage. For example, an end-date picker reports `SelectedDate`. A date-range Submodel forwards `SelectedEndDate` while the start date is absent. Once both dates are known, its local fold reports `CompletedRange` instead:

::Snippet{name="updateInitDerivedOutMessage" label="reporting a completed range instead of an individual date"}

When the local fold returns `CompletedRange`, Foldkit uses it and skips `toParentOutMessage` for that child. When the fold returns no OutMessage, `toParentOutMessage` supplies `SelectedEndDate`. A child that emits nothing triggers neither handler.

`foldChild`, `foldChildStep`, `foldChildInit`, and each entry in `foldChildInits` follow this rule. In `foldChildInits`, the resulting OutMessage is passed to `resolveOutMessage` alongside those from the other entries; it does not replace another child's OutMessage.

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
