# Manifesto

## The Architecture Problem

Most frontend frameworks solve rendering and leave the rest to you. Where does state live? How do side effects work? How are errors handled? Those are your problems. The framework doesn’t have an opinion.

The consequence is predictable. Every team builds a custom architecture from whatever libraries and patterns seem right at the time. State scatters across hooks, contexts, stores, and URL params. Side effects hide in callbacks, middleware, and dependency arrays. Conventions vary project to project, and the accepted best practices shift every couple of years.

This is why large, well-architected React codebases are vanishingly rare. Building and maintaining a large React application requires that one or two Staff-level people have a strong, bespoke architectural vision, make that vision clear to all contributors, and enforce alignment to it over years. This is not the norm.

React isn’t bad. It’s great. It’s also insufficient.

What if there were no decisions to make about how to structure your application? Not because someone took choice away, but because the right answer was the only answer. What if frontend architecture was solved?

That’s Foldkit.

## Power Through Constraints

Every Foldkit app has the same architecture. Not by convention. By design.

State lives in the Model. Events are Messages. Every state change flows through update. Side effects are described as data and executed by the runtime: Commands for one-shot effects, Mount for imperative DOM work bound to a live element, Subscriptions for Streams gated by a slice of your Model, ManagedResources for stateful handles gated by a slice of your Model. These aren’t conventions. This is the only path. You can’t scatter state across components because there are no component-local state hooks. You can’t hide side effects in the view because the view is a pure function.

This might sound limiting. It’s the opposite. When architectural decisions are off the table, development gets more interesting. The questions shift from implementation to behavior. Not “How should we manage side effects in this component?” but “How should this feature behave?” Not “What tool should we use for streams and how should we wire them up to our components?” but “What Model state does this Subscription depend on?”

Your focus elevates from implementation to behavior: the stuff that actually makes your application unique.

## Readable by Design

Any developer can walk into any Foldkit app and immediately know where to look. All state is in the Model. All events are Messages. All transitions are in update. All side effects are described as data and executed by the runtime. This isn’t a claim about team discipline or code review. It’s a structural guarantee. The architecture makes it impossible to organize your app in a way that is opaque to a new reader.

No other TypeScript framework can make this claim. Most frameworks are readable if the team is disciplined. Foldkit apps are readable by construction.

The same property that makes Foldkit apps legible to new developers makes them legible to AI. When patterns are predictable and explicit (one state tree, one update loop, typed everything), AI assistants produce reliable code without constant correction. This isn’t a feature designed for AI. It’s a natural consequence of the architecture.

## Build Your Product, Not Your Architecture

Frontend development should be about solving domain problems, not architectural ones. Time spent debating state management, hand-selecting libraries for basic functionality, and carefully enforcing conventions is pure overhead. Now, you can just spin up a Foldkit application and start modeling behavior.

So here’s the big claim: Foldkit models the frontend so you can model everything else. State, events, transitions, effects, streams, resource management. All accounted for. All connected. All typed. All in one place.

Frontend architecture is solved. The only question left is, what are you going to create?

See you on GitHub,

Devin
