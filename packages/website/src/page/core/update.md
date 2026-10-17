# Update

## Update Defines Message Reactions {#overview}

The update function defines how the application reacts to incoming Messages. It receives the current Model and a Message, then returns the next Model and any Commands for the runtime to execute. Shared pure transitions can also be expressed as Steps and applied by parent startup operations.

Update is pure. Given the same Model and Message, it returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. That makes a transition direct to test: pass in the inputs and assert on the returned values.

### Exhaustive Message Matching

Use `Message.match` to handle the Message union. If you add a Message and omit its branch, TypeScript reports the missing case. No `default` branch silently absorbs a new variant.

Use a `defineTaggedUnion` or `defineRouteUnion` namespace's `match` for exhaustive matching and `matchOrElse` for selected variants with a fallback. Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) when one handler matches several tags, for Message partial matching, or for unions without their own matcher. This excerpt remains in the compact Counter's `application.ts` after its Application declaration.

::Snippet{name="counterUpdate" label="Using update"}

### Building the Next Model

#### Pure Model Changes

Each branch describes one transition. `ClickedDecrement` and `ClickedIncrement` transform the current count. `ClickedReset` replaces it with zero. This version of the counter has no side effects, so all three omit `commands`.

The branches build their next Model with [modifyFields](/best-practices/immutability#immutable-updates). Each named field receives a function from its current value to its next value. Omitted fields keep their existing values and references, so the same update style continues to work as the Model grows.

#### Update Results

Update returns a record containing the next Model and, when needed, an array of Commands. A Command describes one side effect, such as an HTTP request, timer, or browser API call. The [Commands](/core/commands) page adds a delayed reset and puts the optional `commands` field to work.

## Returning Commands

### Command-Producing Branches

Return Commands beside the next Model from the Message branch that requests the work:

::Snippet{name="updateReturningCommands" label="Returning a Command from update"}

`ClickedIncrement` changes the count and asks the runtime to persist it. `CompletedPersistCount` records that the Command finished, but it has no more work to request, so that branch omits `commands`.

`FeatureComposition.makeUpdate` authors a Block's update and infers the handler services required by the Commands across all parent-owned branches. Registered Bindings route their claimed wrapper Messages before this callback runs.

`Update.defineStep` does the same inference for a standalone Step producer. Annotate its Model parameter and let the helper infer the returned Command requirements and OutMessage. A pure OutMessage fold can use `OutMessage.match<Update.Step<Model, Message>>` directly; the matcher types its Model parameter without a Step helper. Callers can then compose that Step with pure Steps through `Update.combine` without naming a service union by hand.

`Update.RequirementsOf<typeof update>` extracts the inferred handler service union from an update. Use it when a parent or exported type needs to name those requirements. Application assembly reads the requirements from the update return type directly.

### Omitting Commands

An update, init, Step, or component helper that statically creates no Commands omits `commands`. When it computes a Commands collection, it returns that collection directly without checking whether it is empty. The [`foldkit/no-empty-commands-array`](/tooling/oxlint-plugin#no-empty-commands-array) lint rule rejects only a literal `commands: []` property.

## Composing Results

### Returning an Initialization Recipe

For custom startup, a registered Binding's `init` returns a passive recipe that retains `toParentModel`, the child arguments, and optional parent Commands. Return that recipe directly from `makeInit`; the Composition interprets it under the registered graph and produces the complete parent Model with the lifted child Commands. The recipe itself has no result fields to unpack. Ordinary eligible startup uses [Composition-owned init](/core/init-and-flags#child-initialization) to assemble child fields and Commands:

::Snippet{name="updateResultInit" label="Returning a Binding init recipe"}

### Keeping Results Together

#### Operation-Named Results

For another ordinary update-like result that already contains a Model and optional Commands or OutMessage, keep it attached to the operation that produced it. Name the value after the operation and use dot access. The same rule applies when a test consumes an update result:

::Snippet{name="updateResultTest" label="Testing an update result"}

When the operation name collides with the function, use a trailing underscore such as `init_`. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not make an OutMessage impossible to ignore. It keeps the operation and its returned values visibly connected.

#### Optional Command Collections

Pass optional Commands directly to APIs that accept them, including `Command.mapMessages`. Use `result.commands ?? []` only when the next operation requires an array for spreading, concatenating, execution, or an assertion.

### Composing Update Steps

#### Why Optional Commands Fail

TypeScript rejects this manual composition when the enclosing update returns `Update.Return<Model, Message>`:

::Snippet{name="updateOptionalCommandsError" label="Invalid optional Commands composition"}

Every Foldkit template enables `exactOptionalPropertyTypes`. With that setting, the optional `commands` property may be absent. When the property is present, it must contain Commands. `dialogOpen.commands` has the type `Update.Commands<Message> | undefined`, so TypeScript rejects `commands: dialogOpen.commands`.

This error often points to update results being composed by hand. When both operations update the same Model, express them as Steps and compose them with `Update.combine`:

::Snippet{name="updateCombineOpenDialog" label="Composing Update Steps"}

#### Child Bindings and Multiple Steps

A child Binding projects `init`, `fold`, and every named public Step. The fold and named Steps preserve the child's Message mapping, Command requirements, OutMessage policy, and Binding requirement. Their Model input requires the exact registered graph, so typed calls with a raw Model fail. Apply one to the contextual Model inside `makeUpdate`, include the Step in `makeInit` startup, or return it from the owner's `step` producer. Return or compose the connected result intact: its public type exposes no `.model` or `.commands` before checked execution and cannot be narrowed to a useful `{ model }` return. `makeUpdate` and `makeInit` consume it while their graph is active; `Definition.step` preserves or wraps it. A completed `block.expose.operation(model, ...args)` carries its own graph, accepts the raw Block Model, and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript can erase a function result when assigning it to a method that returns `void`; outside the exact graph, invoking that erased method only constructs and discards passive configuration and executes no child work. Do not treat that structural erasure as a usable execution path or claim that every erasure fails compilation.

#### Combining Steps

Use `Update.combine` when two or more operations transform the same Model and a later Step should receive the Model produced by an earlier Step. Name that parameter `stepModel` when an inline Step needs it:

::Snippet{name="updateCombineFoldDialog" label="Composing a child fold and another Step"}

#### Command Order

`combine` appends the Commands to its returned array in Step order. The runtime forks those Commands independently, so an application must not depend on their execution or completion order.

Do not wrap one Step in `Update.combine`; call that operation directly.

### Combining Child Initialization and Startup Steps {#combining-independent-results}

Declare child startup ownership beside the Bindings and author the parent initializer through its Composition. The plan supplies only parent-owned fields and lists any startup Steps; the Composition assembles initialized child fields and lifted Commands.

For example, a Workspace Block contains Search and Editor Blocks. Their required direct fields use the automatic zero-argument startup policy. The Search and Editor restoration operations are ordinary Steps listed after the parent-owned fields:

::Snippet{name="updateIndependentInits" label="Initializing Search and Editor Blocks"}

#### Parent Construction and Fold Order

The Composition combines the Search and Editor Models with the Workspace Block's own fields. It retains each child's init Commands and appends the Commands returned by the restoration Steps.

#### Step Order

The Step array determines the order of Model transitions. In this example, the Search restoration runs first. The Editor restoration receives that updated Model, so it preserves the selected document. Each child's Binding applies its OutMessage policy as part of the Step.

#### Command Execution

The Step order applies to Model changes. Commands run independently; a later child's Commands do not wait for an earlier child's Commands to finish.

### Handling OutMessages from Startup Steps

A restoration Step may emit a child OutMessage after the complete parent Model exists. Configure `outMessage.fold` on the Binding to handle that fact locally. The fold can update the parent Model and return Commands, and those Commands join the startup result.

Parent init cannot emit an OutMessage. A Binding used from init therefore handles the initial fact locally instead of forwarding it to another parent:

::Snippet{name="updateInitOutMessages" label="Handling startup OutMessages"}

### Deriving an OutMessage in a Local Fold

A local fold can report a more complete result than the child's original OutMessage. For example, an end-date picker reports `SelectedDate`. A date-range Block forwards `SelectedEndDate` while the start date is absent. Once both dates are known, its local fold reports `CompletedRange` instead:

::Snippet{name="updateInitDerivedOutMessage" label="Deriving a completed range OutMessage"}

#### Replacement Rule

When `outMessage.fold` returns `CompletedRange`, Foldkit uses it and skips `outMessage.forward` for that dispatch. When the fold returns no OutMessage, `outMessage.forward` supplies `SelectedEndDate`. A child that emits nothing triggers neither handler.

## Preventing Lost OutMessages

### Return Type Boundaries

Use `Update.Return<Model, Message>` for an update that cannot emit an OutMessage. It prevents a result containing an OutMessage from entering code that would keep only its Model and Commands:

::Snippet{name="updateRejectLostOutMessage" label="Rejected OutMessage-producing result"}

Otherwise, that OutMessage would be lost.

A result with no `outMessage` can still be used where `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is expected:

::Snippet{name="updateAcceptMissingOutMessage" label="Accepted plain update result"}

The missing field means this update emitted no OutMessage.

### Returning an OutMessage

#### Known OutMessages

When the OutMessage is already known while constructing a new result, include it directly:

::Snippet{name="updateKnownOutMessage" label="Returning a known OutMessage"}

#### Attaching an Optional OutMessage

Use `Update.withOutMessage` when attaching an OutMessage to an existing plain result or when the value has the type `OutMessage | undefined`. If an operation already produced the plain result, pipe that named result into the helper:

::Snippet{name="updateWithOutMessage" label="Attaching an optional OutMessage"}

The object-spread alternative is easy to get wrong:

::Snippet{name="updateAvoidOutMessageSpread" label="Invalid OutMessage object spread"}

`Update.withOutMessage` preserves `dialogClose.model` and `dialogClose.commands`. A defined value becomes `outMessage`; `undefined` leaves the property out. The update result must be a plain return, so the helper cannot overwrite an OutMessage another operation emitted.

#### Constructing Inline

When constructing the plain result in the same expression and the value has the type `OutMessage | undefined`, pass the result first: `Update.withOutMessage({ model, commands }, outMessage)`.
