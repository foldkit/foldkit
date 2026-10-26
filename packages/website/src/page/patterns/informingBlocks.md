# Informing Blocks

## Parent-Owned Changes {#overview}

### Preserve Child Ownership

A Block sometimes needs to react to a change it does not own. The URL may change, a server may push new data, or a sibling field may establish a new constraint. The parent observes that change, but the child still owns the state transition it causes.

Expose an `inform*` operation from the completed child Block, paired with an `InformedOf*` Message: `informJoined` selects `Message.InformedOfJoin`, for example. Select the Message constructor directly when its payload is the public input. Use a tuple producer when the inputs need mapping or refinement. The completed Block or registered Binding passes that Message through the child's update synchronously as part of the pure transition, so update owns the next Model and Commands. Composition derives delivery wrappers from its registered child Bindings. The parent does not declare those wrappers or construct child Messages to initiate this transition. It calls the projected `binding.inform*(...)` instead.

### Inform Every Child-Owned Change

Use `inform*` whenever a parent-owned fact changes the child Model. The notification branch returns only `{ model }` when it needs no Command or OutMessage; it does not echo an OutMessage to the parent. Keep pure selectors and derived view inputs as ordinary helpers because they do not change the child Model.

### Routing Example

The example below uses routing. A People Block owns its search input, results, and recent searches. The root owns the Route. When the URL resolves to a People Route, the root calls `people.informRouteChanged` through its Binding.

:::Info{label="Prerequisite"}
This page builds on the [Blocks](/core/block) pattern. Read that first for the local Message, generated delivery, and Binding boundaries.
:::

## The Child

### Keep the Message Private

People declares its Model, Message, and early `PeopleDefinition` in cycle-safe files. The internal `InformedOfRouteChange` Message carries only `typeof ApplicationRoute.People.Type`, the variant Schema query for the part of the application Route that the feature understands. Commands import that early definition and the Message constructors they produce; the completed Block imports the Commands and their handler recipes.

::Snippet{name="informingBlocksMessage" label="People Message contract"}

::Snippet{name="informingBlocksDefinition" label="Early People Definition"}

Update copies the route query into the input, records it in recent searches, and returns `FetchPeople` for the new results.

### Declare a Public Operation

`informRouteChanged` selects `Message.InformedOfRouteChange` directly in the Block’s `operations` record. Completion creates the callable operation without constructing a Message. That operation takes one constructor payload object for the Message fields, with constructor defaults honored, and passes the child-local fact through update synchronously. It does not enqueue another Runtime Message. Update owns the invariant, Model transition, and `FetchPeople` Command. The parent calls the projected Binding operation without manufacturing a child Message.

::Snippet{name="informingBlocksChild" label="Child informRouteChanged helper"}

:::Warning{label="Not an OutMessage"}
`InformedOfRouteChange` moves from parent to child through an `inform*` operation. An [OutMessage](/core/block#surfacing-facts) moves a fact from child to parent.
:::

## The Parent

### Define the Parent Folds

The People Binding declares its parent Model `field` once; Composition derives its child delivery. If People declares OutMessages, select its parent-owned policy with `withOutMessagePolicy` and register that full Binding. The selected Binding keeps the same projected operations, so `PeopleBinding.informRouteChanged` still produces and handles the public `InformedOfRouteChange` operation through the same boundary. The `ChangedUrl` handler matches the next Route and composes the resulting connected child Step with the pure `setRouteStep` through `Update.combineSteps`. The `makeUpdate` Model supplies the registered graph, and the projected operation retains the Binding and child update requirements for application composition.

::Snippet{name="informingBlocksParent" label="Parent route fold"}

:::Info{label="Multiple Blocks"}
When several page Blocks react to routing, match the next Route and return the `informRouteChanged` step for the page that owns that Route.
:::

### Handle Cold Loads Separately

:::Warning{label="Cold loads"}
`informRouteChanged` handles later URL changes. The parent excerpt uses `init: false` because it does not show startup. On a cold load, root init must pass the People Route through the registered Binding’s initialization recipe, or the Binding can declare an argument policy from shared ChildInitContext. See [Cold Loads and the Initial Route](/core/routing-and-navigation#cold-loads).
:::

### Reuse the Pattern for Other Causes

The [Routing example](/example-apps/routing) contains the complete search flow. [Routing and Navigation](/core/routing-and-navigation) covers the parser that produces these Routes.

The same pattern works when a [Subscription](/core/subscriptions) or [Command](/core/commands) tells the parent about a change the child must process. The cause changes, but ownership does not.
