# Informing Blocks

## Overview

A Block sometimes has to react to a change it does not own. The URL changes, a server pushes new data, or a sibling establishes a new constraint. The parent sees that change first, but the child owns the state the change affects.

The parent tells the child by sending it a Message. The child declares an `InformedOf*` Message for the fact, and the parent returns it under `messages`, created with the instance's `send`:

- The parent decides when the child needs to hear about the change.
- The child's update decides what the change means: the next Model, any Commands, and any OutMessages.

The parent never writes the child's Model, even when it knows exactly what the child would do. Keeping the transition in the child's update means one handler owns it, whether the fact arrives at startup, after a navigation, or from a Command result.

:::Info{label="Complete application"}
The [Routing example](/example-apps/routing) runs on this pattern. Its People page Block takes the starting Route as a constructor argument, loads results with a `start` Command, and reloads them when the root sends it `InformedOfRouteChange` after a navigation.
:::

## When to Inform a Child

Send an `InformedOf*` Message whenever a parent-owned fact changes the child's Model. The child's handler returns `{ model }` when the fact needs no Command, and it does not report the same fact back to the parent as an OutMessage.

If the child only needs a value to render, pass it to `view` as a [view input](/core/block#callback-dispatch-boundaries) or compute it with a selector. Neither changes the child's Model, so neither needs a Message.

## Routing Example

A People Block owns a search input, the results for the current query, and a list of recent searches. The root owns the Route. When the URL resolves to a People Route, the People Block has to copy the query into its input, record it in its history, and fetch new results.

### The Child

People declares `InformedOfRouteChange` beside its other Messages. The Message carries a `PeopleRoute`, the variant of the application Route that People understands:

::Snippet{name="informingBlocksMessage" label="People Messages"}

`FetchPeople` is declared at module level and names its result Message:

::Snippet{name="informingBlocksCommand" label="FetchPeople Command"}

The People constructor takes the starting Route as an argument. It builds the starting Model from that Route and returns `FetchPeople` under `start`, so a cold load fetches results as soon as the instance appears. The `InformedOfRouteChange` handler performs the same transition for later navigations:

::Snippet{name="informingBlocksChild" label="People reacting to InformedOfRouteChange"}

Both paths produce the same Model shape and the same Command. The constructor covers the Route the application starts on, and the handler covers every Route after it.

:::Warning{label="Not an OutMessage"}
`InformedOfRouteChange` moves a fact from parent to child. An [OutMessage](/core/block#surfacing-facts) moves a fact from child to parent.
:::

### The Parent

The root takes the URL as its constructor argument. It parses the starting Route, passes the People Route to `new People(...)`, and holds the instance in its Model. When `ChangedUrl` arrives, it compares the previous and next Routes with `Transition` and sends `InformedOfRouteChange` when the application enters a People Route or stays on one with a different query:

::Snippet{name="informingBlocksParent" label="Root sending InformedOfRouteChange"}

The root's update returns its own next Model and the Messages for People. The Runtime delivers `InformedOfRouteChange` to the People instance after the root's update returns, and the People handler returns `FetchPeople` for the Runtime to perform.

When several page Blocks react to routing, match the next Route and send the Message to the page that owns it. [Cold Loads and the Initial Route](/core/routing-and-navigation#cold-loads) covers seeding the starting Route, and [Route Transitions](/core/routing-and-navigation#route-transitions) covers `Transition`.

## Other Causes

The same pattern applies when a [Subscription](/core/subscriptions) or a [Command](/core/commands) tells the parent about a change the child must process. The parent handles its own Message and sends the child an `InformedOf*` Message. The cause changes, and the child still owns the transition.
