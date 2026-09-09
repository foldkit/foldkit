# Mount

## Overview

Most Foldkit code is declarative. The [view](/core/view) is a pure function from Model to Html. It does not reach into the DOM, hold element references, or run side effects.

Mount is the escape hatch for work whose cause is a particular element existing in the DOM. `OnMount` supplies the live `Element`, starts the work when that element enters the DOM, and tears it down when the element leaves.

Use `Mount.define` for work that produces one Message when it starts. Its `execute` receives the live element and the rendered view's state, then returns an `Effect<Message>` that emits that Message. Its scope remains open until unmount so cleanup registered with `Effect.acquireRelease` runs at the right time. Use `Mount.defineStream` when listeners or observers on the element must emit a continuing `Stream<Message>`.

Both forms require at least one declared result Message. When no result needs to change the Model, return a descriptive `Completed*` Message and leave the Model unchanged in update. The Message keeps the effect visible to DevTools, Scene tests, and replay.

:::Info{label="Functional core, imperative shell"}
The view describes what should be on screen. `OnMount` handles imperative work at the boundary between the virtual DOM and a live element. Results still return to update as Messages, and setup stays paired with cleanup inside the Mount's Effect or Stream.
:::

:::Info{label="Mounts surface in tests"}
Scene records every `OnMount` in the rendered view as a pending Mount. A test must acknowledge or resolve each one with a declared result Message. See [Scene](/testing/scene) for the full contract.
:::

## When to Reach for Mount

Choose a lifecycle primitive by what causes the work:

- A [Command](/core/commands) runs because update just handled a Message. Use it for one-time work such as navigation, network requests, storage, analytics, or focusing an input after `OpenedDialog`.

- A Mount runs because an element exists, and the work needs that live `Element`. Use it to measure geometry, portal a node, attach an element observer, or instantiate a library in a specific container.

- A [Subscription](/core/subscriptions) listens to an external event source while dependencies derived from the Model remain active. Timers, document events, system theme changes, and WebSocket messages fit this shape.

- A [ManagedResource](/core/managed-resources) owns a stateful handle whose lifetime follows a Model condition and whose operations are performed by Commands.

- A [CustomElement](/core/custom-element) renders a native web component with declarative properties and `CustomEvent`s. Use Mount only when the foreign element requires an imperative API instead.

:::Info{label="Check the cause, not the timing"}
Work that happens when an element appears is not necessarily caused by that element. For example: when `OpenedDialog` makes a search input visible, focusing it is still caused by the Message. Return a `FocusInput` Command from that Message's update handler. Reach for Mount only when the work is inseparable from the live element and its lifetime.
:::

## Side Effects on Mount

A Mount follows the lifetime of a DOM node, not a VNode. Foldkit reconstructs VNodes on every render, but the differ reuses an existing DOM node when its tag and identity still match. A reused node keeps its Mount running. A replaced node closes the old Mount's scope, runs its finalizers, and starts a fresh Mount on the new node.

View-function identity and stable keys keep that lifecycle attached to the right logical element. This matters in mapped lists, where an unkeyed reorder can reuse the same DOM position for different data. Key each item by a stable Model identifier so its DOM node and Mount move together.

Portal-to-body is a small example. When an overlay enters the DOM, its Mount moves the live element to `document.body` so it can escape clipping ancestors. When the element unmounts, the paired release removes it.

::Snippet{name="mountPortalToBody" label="portal-to-body example"}

:::Info{label="Two rules for Mount work"}
First, `execute` must use the live element. If it does not read or write that element, a Message or Model condition is probably the real cause. Second, the work must be safe to repeat whenever that element is inserted again. DOM measurement, paired DOM manipulation, observers, and element-owned library instances fit these rules.
:::

:::Warning{label="Attach one Mount per element"}
A VNode has one `insert` and `destroy` hook. If the same element receives `[h.OnMount(A), h.OnMount(B)]`, the second action silently replaces the first and `A` never runs. Combine both behaviors in one Mount and register both releases in its scope.
:::

:::Warning{label="Mounts re-run during DevTools time-travel"}
DevTools re-renders historical Models. Elements inserted during replay run their Mounts again, and elements removed during replay run their finalizers. Keep Mount work replay-safe and local to the element. External mutations such as network calls, storage writes, and analytics belong in Commands.
:::

## Per-Instance Args {#args}

A Mount often needs an input that differs by element instance, such as an initial scroll position, chart data, or a stable host id. Declare those under `args`, using the same Schema record shape a [Command](/core/commands) takes. `args`, `messages`, and `execute` are all named fields on one config object. `execute` receives the runtime fields `element` and `viewStateChanges` alongside the declared args, so those names are reserved and rejected under `args`:

::Snippet{name="mountDefineArgs" label="Mount args definition"}

Calling the Definition with an args record creates the MountAction passed to `OnMount`. That call never runs `execute`. The runtime calls it when the element enters the DOM, so nothing `execute` does happens inside the pure view that built the action. `Mount.defineStream` takes the same fields, and its `execute` returns a `Stream<Message>` instead.

Args are only per-instance inputs. Module constants stay in lexical scope, app-wide services come from Foldkit `Resources`, Model-owned handles come from `ManagedResources`, and Effect services remain available through `yield*` inside `execute`.

:::Info{label="Args surface in DevTools and tests"}
DevTools shows the args beside the Mount name. Scene tests can target one instance by passing the same args record to `Mount.expectHas` or `Mount.resolve`. See [Scene](/testing/scene) for the Definition and instance matcher contract.
:::

:::Warning{label="Args are captured at mount"}
`execute` receives the args from the render that inserts the element. Later renders create new MountActions, but a reused DOM node does not run `execute` again. Name values for that lifecycle, such as `initialScroll` or `seedValue`, rather than implying that they stay current.
:::

When a later Message changes the Model and should trigger new DOM work, return a Command from that Message's update handler. A Subscription is appropriate when a Model dependency controls the lifetime of an external stream or a paired DOM state, or when a browser event must be handled synchronously, such as calling `preventDefault` inside its listener. Mount args are not reactive properties for either case.

## Paused Historical Views

Time travel pauses the rendered view, not the application. The live Model, history, Commands, Subscriptions, and ManagedResources continue normally behind the historical DOM. A Mount owns imperative behavior attached to an element in that rendered view, so its `execute` input includes `viewStateChanges`, a `Stream<'Live' | 'Paused'>`.

### Observing the View State

The Stream begins with the rendered view state at the moment the Mount is acquired, followed by changes. That initial state is retained while `execute` performs asynchronous setup, so a Mount inserted by a historical render receives `Paused` first even if it consumes the Stream only after setup finishes. The Stream stays open for the Mount's lifetime and reports only `Live` when time travel is unavailable. A surviving live Mount is not restarted, interrupted, or reacquired when the view pauses. On resume, Mounts receive `Live` only after Foldkit has patched the latest live view back into the DOM.

Custom renderers without time travel can pass `Mount.liveViewStateChanges` as the required second argument to a low-level `MountAction.f` call. It emits `Live` immediately and stays open.

### Keeping Imperative UI Read-only

Use the Stream to update state owned by the imperative integration itself. For example, a rich-text editor can call its read-only API while the historical view is installed, then restore editing when the live view returns:

::Snippet{name="mountViewStateChanges" label="Making an editor read-only during time travel"}

### Live and Historical Mounts

A Mount acquired by the live view keeps participating in the live application while a historical view is displayed. Its asynchronous setup can complete, and its external streams can keep producing Messages. Foldkit cannot tell whether an arbitrary Stream emission came from historical DOM interaction, a timer, an observer, or a network source, so the integration must use `viewStateChanges` to stop its own DOM-derived interaction while paused. Do not translate this signal into an application Message. It describes which Model the DOM currently represents, not a change to application state.

A Mount acquired by a historical render is different: its Messages cannot reach update, change the live Model, or enter history. If the resumed live view reuses that element and declares a Mount there, Foldkit releases the replay acquisition before starting the live action with the live render's args and dispatch. Cleanup finishes before the replacement setup begins, so the old integration cannot tear down the new handle. Within the live render owner, a surviving Mount follows the latest live Submodel `toParentMessage` wiring, matching event handlers without ever borrowing a historical render's wiring.

## Third-Party Libraries

Mount is especially useful when a library owns a rendered subtree. Charts, code editors, map renderers, and force-directed graphs all need a real element to render into and a way to release their resources.

Construct the handle in an acquire Effect, return the Mount's result Message, and register teardown with `Effect.acquireRelease`. The Effect can finish after emitting its Message because Foldkit keeps its scope open until the element unmounts.

::Snippet{name="mountThirdPartyChart" label="OnMount example"}

:::Warning{label="Construct the handle inside the acquire body"}
`Effect.acquireRelease` registers the release only after its acquire Effect succeeds. Constructing a chart, map, or other stateful handle before that Effect can leak the handle if interruption happens before registration. Make construction the acquire Effect's success value. For example: use `Effect.sync(() => new Thing(...))`, or put an asynchronous import and construction in the same Effect pipeline. Whatever the release needs must be produced by the acquire Effect.
:::

The Model owns the input data. The library owns its rendered subtree. Foldkit owns the lifecycle.

:::Info{label="Unmount interrupts the work"}
When the element unmounts, Foldkit interrupts the Mount's fiber and runs registered finalizers. Any Messages produced after interruption are discarded, so update never receives a Mount Message for an element that no longer exists.
:::

When a foreign element already exposes a declarative property-and-event API, bind it with [CustomElement](/core/custom-element) instead.
