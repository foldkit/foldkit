# Informing Blocks

## Parent-Owned Changes {#overview}

### Preserve Child Ownership

A Block sometimes needs to react to a change it does not own. The URL may change, a server may push new data, or a sibling field may establish a new constraint. The parent observes that change, but the child still owns the state transition it causes.

Declare ordinary parent inputs with `defineInMessageUnion`, keeping local Messages and OutMessages on `defineMessageUnion`. Add an `InformedOf*` variant to the child's `InMessage` Schema. For example, `InMessage.InformedOfJoin` generates `Binding.informOfJoin(...)`. Handle the notification in `Composition.makeInMessageUpdate`; that handler owns the next Model and Commands. The parent calls the generated Binding method, which applies the child transition synchronously. It does not construct a child-local Message or enqueue another Runtime Message.

### Inform Every Child-Owned Change

Use `informOf*` whenever a parent-owned fact changes the child Model. The notification branch returns only `{ model }` when it needs no Command or OutMessage; it does not echo an OutMessage to the parent. Keep pure selectors and derived view inputs as ordinary helpers because they do not change the child Model.

### Routing Example

The example below uses routing. A People Block owns its search input, results, and recent searches. The root owns the Route. When the URL resolves to a People Route, the root calls `PeopleBinding.informOfRouteChange`.

:::Info{label="Prerequisite"}
This page builds on the [Blocks](/core/block) pattern. Read that first for the local Message, generated delivery, and Binding boundaries.
:::

## The Child

### Separate Inputs From Local Messages

People declares its Model, Message, InMessage, and early `PeopleBlock` in cycle-safe files. `InMessage.InformedOfRouteChange` carries only the `PeopleRoute` alias derived from `ApplicationRoute.People`, the part of the application Route that the feature understands. Command results remain local Messages. Commands import the Block declaration and the Message constructors they produce; `layer.ts` imports the implementation pieces and completes the construction Layer.

::Snippet{name="informingBlocksMessage" label="People Message and InMessage contracts"}

::Snippet{name="informingBlocksDefinition" label="People Block declaration"}

The InMessage handler copies the route query into the input, records it in recent searches, and returns `FetchPeople` for the new results. Update handles the Command's completion.

### Handle the Notification

The Block generates `informOfRouteChange` from `InMessage.InformedOfRouteChange`. It takes the variant's payload object, with constructor defaults honored. Its InMessage handler owns the invariant, Model transition, and `FetchPeople` Command. Include the portable InMessage update in the implementation record alongside update and init.

::Snippet{name="informingBlocksChild" label="Receiving a route change"}

:::Warning{label="Not an OutMessage"}
`InMessage.InformedOfRouteChange` moves from parent to child through `informOfRouteChange`. An [OutMessage](/core/block#surfacing-facts) moves a fact from child to parent.
:::

## The Parent

### Define the Parent Folds

The People Binding declares its parent Model `field` once; Composition derives its child delivery. If People declares OutMessages, select its parent-owned policy with `withOutMessagePolicy` and register that full Binding. The selected Binding retains `PeopleBinding.informOfRouteChange` and its exact result channels. The `ChangedUrl` handler matches the next Route and composes the connected child Step with the pure `setRoute` through `Update.combineSteps`. The `makeUpdate` Model supplies the registered graph, and the generated method retains the Binding and InMessage update requirements for application composition.

::Snippet{name="informingBlocksParent" label="Parent route fold"}

:::Info{label="Multiple Blocks"}
When several page Blocks react to routing, match the next Route and return the `informOfRouteChange` Step for the page that owns that Route.
:::

### Handle Cold Loads Separately

:::Warning{label="Cold loads"}
`informOfRouteChange` handles later URL changes. The parent excerpt uses `init: false` because it does not show startup. On a cold load, root init must pass the People Route through the registered Binding’s initialization recipe, or the Binding can declare an argument policy from shared ChildInitContext. See [Cold Loads and the Initial Route](/core/routing-and-navigation#cold-loads).
:::

### Reuse the Pattern for Other Causes

The [Routing example](/example-apps/routing) contains the complete search flow. [Routing and Navigation](/core/routing-and-navigation) covers the parser that produces these Routes.

The same pattern works when a [Subscription](/core/subscriptions) or [Command](/core/commands) tells the parent about a change the child must process. The cause changes, but ownership does not.
