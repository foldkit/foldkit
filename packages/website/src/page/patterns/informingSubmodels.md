# Informing Submodels

## Parent-Owned Changes {#overview}

A Submodel sometimes needs to react to a change it does not own. The URL may change, a server may push new data, or a sibling field may establish a new constraint. The parent observes that change, but the child still owns the state transition it causes.

Export an `inform*` helper from the child. The helper runs an internal child Message through update and returns the next child Model and Commands. The parent folds that helper with `Update.foldChild`, so it never imports or constructs the internal Message.

Use `inform*` when the child must derive a transition or return Commands. Use a silent [`reflect*` helper](/core/submodel#reflecting-external-state) when the child only needs to conform one of its values to an external source.

The example below uses routing. A People Submodel owns its search input, results, and recent searches. The root owns the Route. When the URL resolves to a People Route, the root calls `People.informRouteChanged`.

:::Info{label="Prerequisite"}
This page builds on the [Submodels](/core/submodel) pattern. Read that first if the `Got*Message` wrapping convention is unfamiliar.
:::

## The Child

People declares an internal `ChangedRoute` Message carrying only `PeopleRoute`, the part of the application Route that the feature understands.

Update copies the route query into the input, records it in recent searches, and returns `FetchPeople` for the new results.

`informRouteChanged` is the public entry point. It calls `update(model, ChangedRoute({ route }))`, keeping the Message constructor private.

::Snippet{name="informingSubmodelsChild" label="child code"}

:::Warning{label="Not an OutMessage"}
`ChangedRoute` moves from parent to child through an `inform*` helper. An [OutMessage](/core/submodel#surfacing-facts) moves a fact from child to parent.
:::

## The Parent

The root defines one fold for regular People Messages and another for `informRouteChanged`. Both folds use the same `read`, `write`, and `toParentMessage` boundary. The `ChangedUrl` handler stores the next Route, then composes the relevant child step with `Update.combine`.

::Snippet{name="informingSubmodelsParent" label="parent code"}

:::Info{label="Multiple Submodels"}
When several page Submodels react to routing, match the next Route and return the `informRouteChanged` step for the page that owns that Route.
:::

:::Warning{label="Cold loads"}
`informRouteChanged` handles later URL changes. On a cold load, root init parses the initial URL and passes the People Route to child init. See [Cold Loads and the Initial Route](/core/routing-and-navigation#cold-loads).
:::

The [Routing example](/example-apps/routing) contains the complete search flow. [Routing and Navigation](/core/routing-and-navigation) covers the parser that produces these Routes.

The same pattern works when a [Subscription](/core/subscriptions) or [Command](/core/commands) tells the parent about a change the child must process. The cause changes, but ownership does not.
