# Update

## Update Defines Message Reactions {#overview}

The update function defines how the application reacts to incoming Messages. It receives the current Model and a Message, then returns the next Model and any Commands for the runtime to execute. Shared pure transitions can also be expressed as Steps and applied by parent startup operations.

Update is pure. Given the same Model and Message, it returns the same result. It does not mutate state, call browser APIs, start timers, or make requests. That makes a transition direct to test: pass in the inputs and assert on the returned values.

### Exhaustive Local Message Handlers

Pass an exhaustive handler record to `FeatureComposition.makeUpdate`. Each handler receives the current Model first and its exact Message payload second. TypeScript reports missing and extra cases. The Composition supplies the argument types and checks the returned Model, Commands, OutMessages, and child registrations.

This excerpt remains in the compact Counter's `application.ts` after its Composition declaration:

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

`FeatureComposition.makeUpdate` infers Command handler requirements and retains each Message handler's own return contract. An operation selecting a silent handler does not acquire an unrelated handler's possible OutMessage. An operation selecting an emitting handler retains that OutMessage and cannot enter `Update.combineSteps`, whose result has no OutMessage channel. Registered Bindings route generated child envelopes before any local handler runs.

### Choosing Between Handlers and Steps

Write an ordinary Message handler as `(model, message) => result`. The Counter handlers above return results directly; each needs no `makeStep` wrapper. Use Step helpers for reusable transitions, sequencing with `Update.combineSteps`, OutMessage policies, or useful specialized shorthand.

In a split feature, export the Step helpers its implementation needs from `definition.ts`. For this Search feature, assume the Model has a `query` field and the Message contract declares `UpdatedQuery` with a `value` payload and `CompletedSave` with no payload:

::Snippet{name="updateStepHelperDefinition" label="Exporting owned Step helpers"}

Implementation files import those helpers from the Definition module. Their Model, Message and result contracts retain the owning Definition's types:

::Snippet{name="updateStepHelperImports" label="Importing owned Step helpers"}

A compact feature destructures its helpers beside its Definition. Keep qualified calls when a module works with several Definitions and the qualifier makes the owner clear. Feature barrels keep authoring helpers private and export the completed Block.

For example, `CompletedSave: makeNoopStep()` constructs a Model-preserving Step once and uses it as the handler. Pass the constructed Step, including the factory call's parentheses. The bare `makeNoopStep` factory does not have a handler's signature.

Keep a Step with the behavior it owns. A Block's reusable internal transition can live in `update.ts` or an owning helper module. Parent coordination belongs beside its Bindings and policies. Steps are useful throughout update authoring, not only in composition files or calls to `Update.combineSteps`.

When a handler only applies an existing compatible Model-first Step, supply the Step directly as its record value. A no-argument Binding operation returns that Step without applying it. Keep a callback when it consumes the Message payload, derives arguments from the Model, defers argument construction until dispatch, supplies dispatch context, or provides necessary contextual inference. Payload-first `Message.match` branches have a different signature and require their own callbacks.

The retained precision depends on the visible handler and helper return types. A broad annotation or an already-erased helper contract cannot recover narrower Commands or OutMessages.

### Updates with Dispatch Context

Use `FeatureComposition.makeUpdate.withContext(context => handlers)` when local handlers need additional dispatch arguments. The factory receives those arguments and returns the exhaustive local handler record. Its handlers receive the Model and exact Message payload as usual. Required, defaulted, optional, and rest context arguments retain their call shapes.

Creating the update is passive. The factory runs for each local dispatch and does not run for a routed child-only delivery. Context-factory handlers that use a generic Step may need the explicit adapter `model => step(model)` for inference; they do not need a Model annotation.

::Snippet{name="updateCurriedContext" label="Authoring an update with dispatch context"}

### Preserving Local Results Beside Connected Operations

`FeatureComposition.makeUpdate` accepts an exhaustive handler record. The callback-taking overload is removed. Use `makeUpdate({})` for a message-free or routed-only Composition; registered Bindings still route child delivery automatically.

Name an extracted handler dedicated to one Message `handle<MessageTag>`, such as `handleUpdatedDescription`, and pass it directly when its Model-first signature is compatible. Give every named Model-first Step value a descriptive name ending in `Step`, such as `refreshStep`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results keep their established names. Keep callbacks that adapt payloads, derive inputs, or provide contextual inference.

If a single handler mixes connected Binding recipes with local results, use canonical local results. Definition-owned Steps supply those result contracts. Return the connected recipe intact, and use `makeFieldsStep`, `makeCommandsStep`, `makeNoopStep`, or `makeStep` for its local branches. A raw `{ model }` beside a connected recipe is rejected because structural inference can otherwise erase Commands or OutMessages before Composition sees them. Ordinary raw-only handlers remain supported.

::Snippet{name="updateCanonicalLocalResults" label="Preserving local results beside connected operations"}

For other domain unions, use their `match` for exhaustive matching and `matchOrElse` for selected variants with a fallback. Use [Effect's `Match`](https://effect.website/docs/code-style/pattern-matching/) when one handler matches several tags, for partial matching, or for unions without their own matcher.

### Calling update as a Step

An authored update supports both call directions. The Runtime calls `update(model, message, ...context)`. Application code can call `update(message)(model, ...context)` to turn one truthful Message into a Step. The curried form retains the same Command requirements, OutMessage type, and registered graph evidence.

Use the curried form for internal Step composition. A Block's `operations` record has a narrower purpose: each named operation produces a Message and any update context. Put the local Message constructor directly under `operations` when the public arguments map directly to its payload. Completion creates the operation without constructing a Message. The completed Block or a registered Binding passes that Message through the Block's update synchronously as part of the pure transition. It does not enqueue another Runtime Message or add a startup phase. The same Message branch owns the child invariant, Model change, Command, and OutMessage. This `informRouteChanged` operation records that a parent informed the child of a route change:

::Snippet{name="updateCurriedStep" label="Declaring a Message-producing operation"}

A constructor-backed operation takes one constructor payload object for a constructor with fields, with constructor defaults honored, followed by the update context. An empty-fields constructor takes no payload placeholder. Use a tuple producer under `operations` when the public inputs need mapping, refinement, defaults, or an exact context tuple. Inline tuple producers receive context from `prepareBlock`; use `Tuple.make(Message.Fact(...), ...context)` when extracting one so TypeScript preserves the tuple. Both forms complete through the same update path. The update preserves the selected Message handler's output, while update utilities retain the union across handlers. A producer that can select several Messages retains all their possible outputs. Calling a pure operation does not run effects returned by another branch. Keep standalone and Definition-owned Steps for internal composition that does not form part of the Block's public operation API.

The context rule is exact: `update(message)(model, ...context)`. `Update.combineSteps` accepts unary Steps, so an update with required dispatch context needs an explicit unary adapter that supplies that context, as `refreshStep` does in the dispatch-context example above.

`Update.defineStep` does the same inference for a standalone Step producer. Annotate its Model parameter and let the helper infer the returned Command requirements and OutMessage. Author an OutMessage fold with `ParentDefinition.makeOutMessageFold(ChildBlock, handlers)` whether the fold is inline in a Binding policy or extracted to a named value. The completed child and parent Definition supply the child payloads, parent Model, result channels, and `FoldContext`. Callers can compose Steps that do not emit OutMessages through `Update.combineSteps` without naming a service union by hand.

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

This error often points to update results being composed by hand. When both operations update the same Model, express them as Steps and compose them with `Update.combineSteps`:

::Snippet{name="updateCombineOpenDialog" label="Composing Update Steps"}

#### Child Bindings and Multiple Steps

A child Binding projects `init`, `fold`, and every declared operation. Calling a Binding operation returns a connected parent Step that preserves the child's Message mapping, selected operation's Command requirements and OutMessage type, OutMessage policy, and Binding requirement. Its Model input requires the exact registered graph, so typed calls with a raw Model fail. Apply one to the contextual Model inside `makeUpdate`, include it in `makeInit` startup, or return it from the owner's `makeStep` producer. Return or compose the connected result intact: its public type exposes no `.model` or `.commands` before checked execution and cannot be narrowed to a useful `{ model }` return. The raw recipe exposes only channels produced directly by the child transition. `makeUpdate` and `makeInit` resolve the registered OutMessage policy and sibling operations into the final parent Command Message, requirements, and OutMessage channels. Derive an exported parent contract from that Composition-authored update or the completed Block. `Definition.makeStep` preserves or wraps a connected value. A completed `block.operations.operation(model, ...args)` carries its own graph, accepts the raw Block Model, dispatches the produced Message through update, and returns the readable executed result. A keyed Binding prepends its key to the operation arguments. Ordinary internal Steps remain directly callable. TypeScript can erase a function result when assigning it to a method that returns `void`; outside the exact graph, invoking that erased method only constructs and discards passive configuration and executes no child work. Do not treat that structural erasure as a usable execution path or claim that every erasure fails compilation.

The graph requirement is intentional: an ordinary `Model` type says nothing about whether the Dialog Binding and its OutMessage policy are registered. Migrate a helper that accepts a raw Model into a Definition-owned Step, then return that Step from `makeUpdate`, list it in `makeInit`, or compose it with another Step through `Update.combineSteps`.

::Snippet{name="updateConnectedStepBefore" label="❌ Applying a connected Step to a raw Model"}

::Snippet{name="updateConnectedStepAfter" label="✅ Deferring a connected Step to its Composition"}

#### Extracting a Local Edit Before an Emitting Operation

An extracted helper can change parent-owned fields and then apply a child operation whose policy emits an OutMessage. Derive the helper's Model input from that connected operation with `Parameters<typeof operation>[0]`. This retains its exact Binding requirement; a plain Model annotation loses that requirement.

::Snippet{name="blockExtractedConnectedStep" label="Preserve the connected operation's input contract"}

The child fold sees the updated parent fields. Return its complete result so Composition can resolve Commands and OutMessages. Do not put the emitting operation in `combineSteps`, which deliberately has no OutMessage channel. This extracted form needs one precise input annotation; inline handlers receive their contextual Model from `makeUpdate`.

#### Combining Steps

Use `Update.combineSteps` when two or more operations transform the same Model and a later Step should receive the Model produced by an earlier Step. Use the owning Definition's narrow helper when that Step only changes fields:

::Snippet{name="updateCombineFoldDialog" label="Composing a child fold and another Step"}

#### Command Order

`combineSteps` collects the Steps' Commands without executing them. The Runtime forks the batch independently, so an application must not depend on the Commands' execution or completion order.

Do not wrap one Step in `Update.combineSteps`; call that operation directly.

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

A restoration Step may emit a child OutMessage after the complete parent Model exists. Select a `fold` through the Binding's `withOutMessagePolicy` method to handle that fact locally. The fold can update the parent Model and return Commands, and those Commands join the startup result.

Parent init cannot emit an OutMessage. A Binding used from init therefore handles the initial fact locally instead of forwarding it to another parent:

::Snippet{name="updateInitOutMessages" label="Handling startup OutMessages"}

### Deriving an OutMessage in a Local Fold

A local fold can report a more complete result than the child's original OutMessage. For example, an end-date picker reports `SelectedDate`. A date-range Block forwards `SelectedEndDate` while the start date is absent. Once both dates are known, its local fold reports `CompletedRange` instead:

::Snippet{name="updateInitDerivedOutMessage" label="Deriving a completed range OutMessage"}

#### Replacement Rule

When the selected `fold` returns `CompletedRange`, Foldkit uses it and skips the selected `forward` for that dispatch. When the fold returns no OutMessage, `forward` supplies `SelectedEndDate`. A child that emits nothing triggers neither handler.

## Preventing Lost OutMessages

`Update.combineSteps` has no OutMessage channel. Return an OutMessage-producing Binding operation's complete result directly. The compiler rejects ordinary emitting Steps at the combination call and identifies the incompatible `outMessage` channel.

A connected operation can acquire a parent OutMessage channel through its registered policy. The matching Composition checks that channel during update and init authoring, including nested combinations and combinations extracted through Definition-owned Steps. Return the emitting operation's complete result directly. Attaching another OutMessage afterward does not repair a combination that discards a child policy's OutMessage.

These checks depend on the channels visible in the supplied contracts. They cannot recover an OutMessage already erased by an inaccurate upstream annotation. Runtime rejection remains a safeguard for JavaScript and erased contracts.

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

For a Step or handler whose only job is to emit an OutMessage while preserving the Model, use the owning Definition's [`makeOutMessageStep(producer)`](/core/block#focused-step-producers). Its producer may read the current Model and exact Message; `.fromMessage` omits the Model, and `() => outMessage` supplies a fixed value. Cohesive mixed handlers can keep returning the result directly.

#### Attaching an Optional OutMessage

Use `Update.withOutMessage` when attaching an OutMessage to an existing plain result or when the value has the type `OutMessage | undefined`. If an operation already produced the plain result, pipe that named result into the helper:

::Snippet{name="updateWithOutMessage" label="Attaching an optional OutMessage"}

The object-spread alternative is easy to get wrong:

::Snippet{name="updateAvoidOutMessageSpread" label="Invalid OutMessage object spread"}

`Update.withOutMessage` preserves `dialogClose.model` and `dialogClose.commands`. A defined value becomes `outMessage`; `undefined` leaves the property out. The update result must be a plain return, so the helper cannot overwrite an OutMessage another operation emitted.

#### Constructing Inline

When constructing the plain result in the same expression and the value has the type `OutMessage | undefined`, pass the result first: `Update.withOutMessage({ model, commands }, outMessage)`.
