# Mount

## Overview

Most Foldkit code is declarative. The [view](/core/view) is a pure function from Model to Html. It does not reach into the DOM, hold element references, or run side effects.

Mount is the escape hatch for work whose cause is a particular element existing in the DOM. `OnMount` supplies the live `Element`, starts the work when that element enters the DOM, and tears it down when the element leaves.

### Mount Definitions

Use `FeatureDefinition.makeMount` for work that produces one Message when it starts. Its handler receives the live element and the rendered view's state, then returns an `Effect<Message>` that emits that Message. Its scope remains open until unmount so cleanup registered with `Effect.acquireRelease` runs at the right time. Use `FeatureDefinition.makeMountStream` when listeners or observers on the element must emit a continuing `Stream<Message>`.

Mount definitions declare their name, args, and result Messages in the config, then set `config.handler` to a generator constructor. Foldkit applies `Effect.gen` internally. Both owned constructors expose the attached recipe as `.layer`.

### Result Messages

Both `FeatureDefinition.makeMount` and `FeatureDefinition.makeMountStream` require at least one declared result Message. When no result needs to change the Model, return a descriptive `Completed*` Message and leave the Model unchanged in update. The Message keeps the effect visible to DevTools, Scene tests, and replay.

:::Info{label="Functional core, imperative shell"}
The view describes what should be on screen. `OnMount` handles imperative work at the boundary between the virtual DOM and a live element. Results still return to update as Messages, and setup stays paired with cleanup inside the Mount's Effect or Stream.
:::

:::Info{label="Mounts surface in tests"}
Scene records every `OnMount` in the rendered view as a pending Mount. A test must acknowledge or resolve each one with a declared result Message. See [Scene](/testing/scene) for the full contract.
:::

## When to Reach for Mount

### Lifecycle Ownership

Choose a lifecycle primitive by what causes the work:

- A [Command](/core/commands) runs because update just handled a Message. Use it for one-time work such as navigation, network requests, storage, analytics, or focusing an input after `OpenedDialog`.

- A Mount runs because an element exists, and the work needs that live `Element`. Use it to measure geometry, portal a node, attach an element observer, or instantiate a library in a specific container.

- A [Subscription](/core/subscriptions) listens to an external event source while dependencies derived from the Model remain active. Timers, document events, system theme changes, and WebSocket messages fit this shape.

- A [ManagedResource](/core/managed-resources) owns a stateful handle whose lifetime follows a Model condition and whose operations are performed by Commands.

- A [CustomElement](/core/custom-element) renders a native web component with declarative properties and `CustomEvent`s. Use Mount only when the foreign element requires an imperative API instead.

### Check the Cause

:::Info{label="Check the cause, not the timing"}
Work that happens when an element appears is not necessarily caused by that element. For example: when `OpenedDialog` makes a search input visible, focusing it is still caused by the Message. Return a `FocusInput` Command from that Message's update handler. Reach for Mount only when the work is inseparable from the live element and its lifetime.
:::

## Side Effects on Mount

### DOM Node Lifetime

A Mount follows the lifetime of a DOM node, not a VNode. Foldkit reconstructs VNodes on every render, but the differ reuses an existing DOM node when its tag and identity still match. A reused node keeps its Mount running. A replaced node closes the old Mount's scope, runs its finalizers, and starts a fresh Mount on the new node.

### Stable Identity

View-function identity and stable keys keep that lifecycle attached to the right logical element. This matters in mapped lists, where an unkeyed reorder can reuse the same DOM position for different data. Key each item by a stable Model identifier so its DOM node and Mount move together.

### Portal Example

Portal-to-body is a small example. When an overlay enters the DOM, its Mount moves the live element to `document.body` so it can escape clipping ancestors. When the element unmounts, the paired release removes it.

::Snippet{name="mountPortalToBody" label="Portal-to-body"}

### Handler Layers

A Mount starts when its element enters the DOM and stops when that element leaves. In a split feature, `mount.ts` owns the definition and handler, while `composition.ts` owns its registration, including when the feature has no children. Both Composition and view import the definition from `mount.ts`, avoiding a Composition/view cycle. Include its definition in the owning Composition's `mounts`, include its handler recipe in the local `EffectsLayer`, produce the opaque draft with `prepareBlock`, and finish it with `Block.assemble`. Composition declares a Mount the view may render; a conditional Mount need not appear in every render.

::Snippet{name="mountHandlerLayers" label="Registering a Mount handler Layer"}

`FeatureComposition.makeView` derives the view builder's allowed Mounts from its Composition. TypeScript rejects a view that requires a Mount absent from that Composition, and the completed Block carries the matching handler graph to the root. Foldkit also checks each rendered definition before patching the DOM. Use the same definition in the view, Composition, and Layer assembly. Distinct Mount definitions within one Block need distinct local names; composition derives their application paths. The handler Layer lives for the application lifetime, while each Mount acquisition and cleanup follows its element.

### Mount Work Requirements

:::Info{label="Two rules for Mount work"}
First, the handler must use the live element. If it does not read or write that element, a Message or Model condition is probably the real cause. Second, the work must be safe to repeat whenever that element is inserted again. DOM measurement, paired DOM manipulation, observers, and element-owned library instances fit these rules.
:::

#### One Mount per Element

:::Warning{label="Attach one Mount per element"}
A VNode supports one Mount. Attaching a second `OnMount` throws while constructing the VNode, before either Mount runs. The error names both Mounts, including when their attributes come from spread arrays or child attribute groups. Combine both behaviors in one Mount and register both releases in its scope. `OnUnmount` can share the element with that Mount.
:::

#### Historical Renders

:::Warning{label="Mounts re-run during DevTools time-travel"}
DevTools re-renders historical Models. Elements inserted during replay run their Mounts again, and elements removed during replay run their finalizers. Keep Mount work replay-safe and local to the element. External mutations such as network calls, storage writes, and analytics belong in Commands.
:::

## Per-Instance Args {#args}

### Declaring Args

#### Definition Shape

A Mount often needs an input that differs by element instance, such as an initial scroll position, chart data, or a stable host id. Declare those under `args`, using the same Schema record shape a [Command](/core/commands) takes. The handler receives the runtime fields `element` and `viewStateChanges` alongside the declared args, so those names are reserved and rejected under `args`:

::Snippet{name="mountDefineArgs" label="Mount args definition"}

#### Runtime Invocation

Calling the Definition with an args record creates the MountAction passed to `OnMount`. That call never runs the handler. The Runtime invokes it when the element enters the DOM, so the pure view only describes the action. A `FeatureDefinition.makeMountStream` handler returns a `Stream<Message>` instead.

#### What Belongs in Args

Args are only per-instance inputs. Module constants stay in lexical scope, and Model-owned handles come from ManagedResources. Put an app-wide service requirement in the handler constructor so the completed program's `provide` method can supply it once and execution tests can substitute the external provider while retaining the real Mount implementation.

:::Info{label="Args surface in DevTools and tests"}
DevTools shows the args beside the Mount name. Scene tests can target one instance by passing the same args record to `Mount.expectHas` or `Mount.resolve`. See [Scene](/testing/scene) for the Definition and instance matcher contract.
:::

### Capture Time and Reactivity

:::Warning{label="Args are captured at mount"}
The handler receives the args from the render that inserts the element. Later renders create new MountActions, but a reused DOM node does not run the handler again. Name values for that lifecycle, such as `initialScroll` or `seedValue`, rather than implying that they stay current.
:::

When a later Message changes the Model and should trigger new DOM work, return a Command from that Message's update handler. A Subscription is appropriate when a Model dependency controls the lifetime of an external stream or a paired DOM state, or when a browser event must be handled synchronously, such as calling `preventDefault` inside its listener. Mount args are not reactive properties for either case.

## Paused Historical Views

Time travel pauses the rendered view, not the application. The live Model, history, Commands, Subscriptions, and ManagedResources continue normally behind the historical DOM. A Mount owns imperative behavior attached to an element in that rendered view, so its handler input includes `viewStateChanges`, a `Stream<'Live' | 'Paused'>`.

### Observing the View State

The Stream begins with the rendered view state at the moment the Mount is acquired, followed by changes. That initial state is retained while the handler performs asynchronous setup, so a Mount inserted by a historical render receives `Paused` first even if it consumes the Stream only after setup finishes. The Stream stays open for the Mount's lifetime and reports only `Live` when time travel is unavailable. A surviving live Mount is not restarted, interrupted, or reacquired when the view pauses. On resume, Mounts receive `Live` only after Foldkit has patched the latest live view back into the DOM.

Custom renderers without time travel can pass `Mount.liveViewStateChanges` as the required second argument to a low-level `MountAction.f` call. It emits `Live` immediately and stays open.

### Keeping Imperative UI Read-only

Use the Stream to update state owned by the imperative integration itself. For example, a rich-text editor can call its read-only API while the historical view is installed, then restore editing when the live view returns:

::Snippet{name="mountViewStateChanges" label="Making an editor read-only during time travel"}

### Live and Historical Mounts

#### Live Mounts During Time Travel

A Mount acquired by the live view keeps participating in the live application while a historical view is displayed. Its asynchronous setup can complete, and its external streams can keep producing Messages. Foldkit cannot tell whether an arbitrary Stream emission came from historical DOM interaction, a timer, an observer, or a network source, so the integration must use `viewStateChanges` to stop its own DOM-derived interaction while paused. Do not translate this signal into an application Message. It describes which Model the DOM currently represents, not a change to application state.

#### Mounts Created by Historical Renders

A Mount acquired by a historical render is different: its Messages cannot reach update, change the live Model, or enter history. If the resumed live view reuses that element and declares a Mount there, Foldkit releases the replay acquisition before starting the live action with the live render's args and dispatch. Cleanup finishes before the replacement setup begins, so the old integration cannot tear down the new handle. Within the live render owner, a surviving Mount follows the latest live Block delivery frame, matching event handlers without ever borrowing a historical render's frame.

## Third-Party Libraries

Mount is especially useful when a library owns a rendered subtree. Charts, code editors, map renderers, and force-directed graphs all need a real element to render into and a way to release their resources.

### Acquisition and Cleanup

Construct the handle in an acquire Effect, return the Mount's result Message, and register teardown with `Effect.acquireRelease`. The Effect can finish after emitting its Message because Foldkit keeps its scope open until the element unmounts.

::Snippet{name="mountThirdPartyChart" label="Chart Mount with cleanup"}

#### Resource Construction

:::Warning{label="Construct the handle inside the acquire body"}
`Effect.acquireRelease` registers the release only after its acquire Effect succeeds. Constructing a chart, map, or other stateful handle before that Effect can leak the handle if interruption happens before registration. Make construction the acquire Effect's success value. For example: use `Effect.sync(() => new Thing(...))`, or put an asynchronous import and construction in the same Effect pipeline. Whatever the release needs must be produced by the acquire Effect.
:::

The Model owns the input data. The library owns its rendered subtree. Foldkit owns the lifecycle.

#### Unmount

:::Info{label="Unmount interrupts the work"}
When the element unmounts, Foldkit interrupts the Mount's fiber and runs registered finalizers. Any Messages produced after interruption are discarded, so update never receives a Mount Message for an element that no longer exists.
:::

When a foreign element already exposes a declarative property-and-event API, bind it with [CustomElement](/core/custom-element) instead.

## Handler Contracts and Composition

### Handler Construction and External Hosts

The Runtime runs the attached handler generator once while building the application Layer and obtains the element handler. Return it directly from the generator when construction has no dependencies. The constructor must not capture a DOM element or Mount args; Foldkit supplies those when each element is mounted. Each element receives its own Mount scope. Removing and reinserting an element reruns the real handler without rebuilding its provider.

Omit `handler` only when an external host owns the Mount implementation. That definition has no `.layer`; the host calls `toLayer` with its implementation Effect constructor at its assembly boundary. Ordinary application Mounts keep their implementation attached and include `.layer` in the feature's `EffectsLayer`.

Registering a Mount that the view never renders starts no element lifecycle, listeners, or DOM work. Its provided handler constructor still runs during application startup.

### Block Assembly and Child Placements

For an owned Block, create `NameDefinition = Block.makeDefinition('Name', { Model, Message })`, create Mounts through that Definition, and list them in `NameComposition = NameDefinition.makeComposition({ mounts })`. Author the canonical view with `NameComposition.makeView`, then pass the local handler recipes to `NameComposition.prepareBlock({ EffectsLayer })` inside the private producer and finish it with `Block.assemble`. A parent that includes the child Binding receives its Mount registrations and handler graph together. The root uses the same producer and finisher path before `Program.make` supplies host behavior.

For a direct array of child Models with declared Struct key fields, use `ParentDefinition.makeBinding` with `field` and a string-valued `key`. An exact array of closed Struct wrappers adds a distinct required `childField`, leaving its key on the wrapper. Custom writes, opaque, union, or open/index-signature wrappers, and non-array enumeration retain general keyed accessors. Each active key gets independent Mount ownership, and the parent includes the keyed Binding once under `bindings`.

### Mount Requirements in Reusable Views

An owned view receives a builder whose allowed Mounts are inferred from its Composition. Immediately after establishing `NameComposition`, derive `NameViewBuilder` with `Block.ViewBuilderFor<typeof NameComposition>` and use it for ordinary helpers on the same mounted or child embedding path. Keep it private unless another file uses it. The alias retains the Composition's Message, local Mounts, and child Bindings without constructing a runtime builder. When a helper must stay generic over a more specific compatible builder, use `<Builder extends NameViewBuilder>` and return the Html it builds; this preserves the caller's exact capability set. `NameComposition.makeView` remains the canonical owned view and leaves its `h` parameter inferred:

::Snippet{name="mountBlockView" label="Preserving a Block view's Mount requirements"}

The parent must include the child Binding under `bindings` before its builder can embed that child view. An owned child with `ViewInputs` uses `FeatureComposition.makeView.withInputs<ViewInputs>` and receives its builder third.

The Composition derives its builder type from the complete Mount collection, and application assembly includes those definitions. Missing Mounts fail at the composition boundary, and helpers cannot attach Mounts outside their builder's declared set. A shared helper can use `HtmlBuilder<Message>` for ordinary content. When forwarding Mount-bearing child Attributes across owners, pass a typed render callback that closes over the caller's inferred builder. A raw Mount-requirement annotation does not describe the scoped Binding capability. See [Builder ownership](/core/view#builder-ownership) for a Dialog example. The returned `Html` type stays the same.

Let TypeScript infer `mounts` arrays and composed spreads. Widening the array to `ReadonlyArray<Mount.LayeredMountDefinition>` discards the contracts required for registration checking, so application assembly rejects it. Forwarded attribute arrays preserve the same evidence: use `Attribute<Message, RequiredMounts>` or `ChildAttribute<RequiredMounts>` when an explicit annotation is necessary. `childAttributes` infers those requirements from its input, and `CustomElement.withMessage(h)` retains the builder's allowed Mounts.

A name-preserving annotation such as `ReadonlyArray<Mount.LayeredMountDefinition<Name, Message>>` still erases the per-instance args to `any`. Composition construction does not reliably reject that annotated union. Keep the actual Definitions inferred instead of annotating a registry with that broad alias. This is an explicit type-erasure limit; ordinary inferred registry and Mount invocation checks remain.

### Names and Runtime Identity

Name the Mount for the imperative work attached to the element, using a verb-first name such as `MeasurePanel`, `AnchorPopover`, or `PortalMenuBackdrop`. Compose `MeasurePanel.layer` directly in the feature's `EffectsLayer` export. Name an individual provider `MeasurePanelLayer` only when it is intentionally public or independently reused outside that bundle's assembly.

Mount names are local to their named Block. Definitions owned by different features receive different owned names even when their local names, args, and result Messages match. Each definition also retains a private runtime identity. Alternate implementations belong to the original definition's `toLayer`.

### Execution Testing

A whole-application execution test retains the real Layer-backed Mount handler and replaces the browser or library capability beneath it. The Mount still receives a live test element, performs its element-scoped transformation, and releases on unmount. Replacing the whole handler can acknowledge or orchestrate a Mount result, but that path does not test the replaced integration.
