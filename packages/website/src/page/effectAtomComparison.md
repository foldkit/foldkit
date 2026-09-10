# Foldkit vs React + Effect Atom

## Overview

This page is for people who have already chosen Effect. In Effect 4, [Effect Atom](https://github.com/Effect-TS/effect/tree/main/packages/atom) provides reactive state primitives through `effect/unstable/reactivity`, with view bindings such as `@effect/atom-react`, `@effect/atom-solid`, and `@effect/atom-vue`. The host framework still owns rendering and components.

Foldkit owns the application runtime and view layer. It renders through a virtual DOM built on [Snabbdom](https://github.com/snabbdom/snabbdom), and it includes routing, UI components, DevTools, and Story and Scene testing. Its architecture has one Model, a Message union, and an update function. Side effects return to the runtime as Commands and other lifecycle primitives.

The choice is therefore larger than where to store state. React with Effect Atom is a React application with a reactive Effect state layer. A Foldkit application uses a different runtime, view model, and testing model. They are different paradigms that happen to share Effect.

:::Info{label="Related page"}
This page assumes you are already using Effect. If you are coming from plain React, [Foldkit vs React](/react/foldkit-vs-react-side-by-side) covers the broader architectural differences.
:::

## What They Share

Both approaches can use Effect values, typed errors, Layers, structured concurrency, and Schema validation at application boundaries. In Effect Atom, an Effect can run inside an async atom or a function atom. In Foldkit, a Command wraps an Effect and returns its result as a Message.

Above that Effect foundation, their responsibilities differ. Effect Atom provides state and reactivity to a host view framework. Foldkit owns the runtime, rendering, routing, lifecycle primitives, and testing tools.

## Many Atoms vs One Model

An atom is a reactive container for a value. You can create state with `Atom.make`, derive an atom from other atoms, read it with `useAtomValue`, and write it with `useAtomSet`. The registry tracks dependencies and notifies the components that read a changed atom.

State is distributed by design, and that is the point. A feature can own its atoms, and a component can update any writable atom it imports. The cost of that locality is that no single value represents the state of the application and no single type lists every way it can change.

Foldkit centralizes state in the [Model](/core/model). The [Message](/core/messages) union lists the facts the application handles, and [update](/core/update) defines how those facts change the Model. Those are framework constraints, not conventions a team maintains by discipline. [Submodels](/core/submodel) split a large application into smaller state machines while preserving the same parent-to-child Message flow.

## How State Changes

The state models become concrete when a user adds or edits a todo.

### Effect Atom: setters at the call site {#atom-state}

A React component obtains a setter with `useAtomSet`. The setter can receive an updater closure:

::Snippet{name="atomCompareAtomState" label="Effect Atom state"}

In this example, the ways `todosAtom` changes live at its setter call sites. An atom application can instead expose named write functions or writable derived atoms. That centralization is an application convention. Foldkit requires every Model transition to pass through update.

### Foldkit: one Message union, one update {#foldkit-state}

The Foldkit version represents the same actions as Messages:

::Snippet{name="atomCompareFoldkitState" label="Foldkit state"}

`AddedTodo`, `ClearedDoneTodos`, and `SelectedFilter` appear in DevTools and in Story or Scene tests. “How can the todo list change?” is answered by one Message union and one update function. `Message.match` reports every place that must handle a newly added Message variant.

## Async State

Both provide a value type for in-progress Effect results, but the value lives in a different place.

### Effect Atom: AsyncResult {#atom-async}

`Atom.make` accepts an Effect directly. When the Effect needs Layer-provided services, `Atom.runtime` creates an atom runtime and `runtime.atom` runs the Effect with that context. The resulting atom contains an `AsyncResult`: `Initial`, `Success`, or `Failure`, with a `waiting` flag for refreshes. `AsyncResult.builder` renders those cases.

::Snippet{name="atomCompareAtomAsync" label="Effect Atom async"}

The Effect runs when the registry first evaluates the atom, and the registry stores the result and tracks dependencies. `Atom.family` creates keyed atoms. `Atom.swr` adds stale-time and revalidation behavior, while `AtomHttpApi` and `AtomRpc` integrate Effect clients. React bindings also provide Suspense hooks.

### Foldkit: remote state in the Model {#foldkit-async}

Foldkit stores remote state in the Model. [AsyncData](/core/async-data) represents six states: `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success`. A Command performs the request, and its result returns through update as a Message.

::Snippet{name="atomCompareFoldkitAsync" label="Foldkit async"}

`AsyncData` includes stale-while-revalidate and keep-stale-on-failure states. It does not provide a fetching registry or choose refresh policy. The application models a cache in the Model and decides when to run each Command. Remote data then shares the same Message timeline and tests as the rest of the Model.

Effect Atom gives you more data-fetching machinery out of the box. Foldkit gives remote state no separate architectural lane. That distinction matters when remote data starts interacting with the rest of the application.

## Side Effects and Lifecycle

Both can express side effects as Effect values. They differ in how an effect is connected to application state and lifetime.

### Effect Atom: effects live inside atoms {#atom-effect}

`runtime.fn` creates a callable atom for a mutation. Its `reactivityKeys` can refresh atoms that subscribe to matching keys. An atom can also acquire a listener and register its cleanup with `addFinalizer`; `useAtomMount` keeps that atom mounted for the component’s lifetime.

::Snippet{name="atomCompareAtomEffect" label="Effect Atom effects"}

Effects remain colocated with the atoms that perform them. Dependencies between a mutation and refreshed atoms can be declared through reactivity keys, which are runtime values rather than a TypeScript union checked for exhaustiveness.

### Foldkit: Commands and Subscriptions {#foldkit-effect}

Foldkit selects a lifecycle primitive based on what causes the work. A [Command](/core/commands) runs after a Message. A [Subscription](/core/subscriptions) runs while a Model condition holds. A [Mount](/core/mount) follows an element’s lifetime, and a [ManagedResource](/core/managed-resources) follows Model state while exposing a stateful handle to Commands.

::Snippet{name="atomCompareFoldkitEffect" label="Foldkit effects"}

The difference is locational. Effect Atom colocates effects with atoms, and any atom may run one. Foldkit assigns effects to a small set of lifecycle primitives based on what causes them. The `mouseRelease` Subscription starts and stops from Model state, then emits Messages so the resulting change still passes through update.

## The View Layer Is Still React {#the-view-layer}

Effect Atom changes the state layer, not React’s rendering rules. Components still use hooks, closures, and React’s memoization tools.

### Effect Atom plus React {#atom-view}

This version stores the todos in one array atom. It uses `memo` and `useCallback` to avoid rendering an unchanged row when the array changes:

::Snippet{name="atomCompareAtomView" label="Effect Atom view"}

Those optimizations are not required for correctness. A per-item atom could also give each row a narrower subscription. Either design still follows React’s hook and closure rules, and React Compiler can automate some memoization when the component satisfies its constraints.

### Foldkit {#foldkit-view}

The Foldkit item is a function that returns virtual DOM data. Its event handler dispatches a Message value:

::Snippet{name="atomCompareFoldkitView" label="Foldkit view"}

There is no component Hook state, dependency array, or callback identity to stabilize. When a view subtree is expensive, [view memoization](/core/view-memoization) skips it based on Model-derived inputs.

## One Timeline vs Many Cells

Every Foldkit state change is a Message processed by update. Foldkit DevTools records those Messages and the resulting Models, so it can replay the application timeline. This site runs on Foldkit; the DEV button in the bottom-right corner opens its DevTools.

Effect Atom’s registry holds the current value of many cells and updates their dependents. It does not define one app-wide union of named events, so there is no equivalent built-in Message timeline to replay. An application can add its own event model or logging when that history is useful.

## Testing

Foldkit’s update function is pure: given a Model and a Message, it returns the next Model and Commands. That shape supports two [testing](/testing) tools.

[Story](/testing/story) sends Messages through update, inspects the Model, and resolves Commands by supplying their result Messages. The test can assert that a Command was returned without executing its Effect.

::Snippet{name="atomCompareFoldkitStory" label="Foldkit Story test"}

[Scene](/testing/scene) renders the view, finds elements by accessible role or text, dispatches events through update, and resolves Commands inline.

::Snippet{name="atomCompareFoldkitScene" label="Foldkit Scene test"}

An Effect Atom application uses the testing tools of its host framework. In React, a user-facing test commonly renders a component with React Testing Library and jsdom, then waits for the atom’s Effect and React render to finish:

::Snippet{name="atomCompareAtomTest" label="React Testing Library test"}

Atom Effects can also be tested below the component boundary. The architectural difference is that Foldkit exposes Commands as returned values. The Story can name the requested effect without running it, while the React component test observes the Effect through the atom and rendered interface.

## Scaling Complexity

An Effect Atom application grows a graph of atoms. Adding an independent atom is local, derived atoms declare their dependencies, and fine-grained subscriptions limit which components update. Understanding a cross-feature change may require following atom reads, writes, and reactivity keys across files.

A Foldkit application grows its Model, Message union, and update logic. Exhaustive matching keeps the transition catalog complete, but a large update function eventually needs to be divided into [Submodels](/core/submodel). Submodel composition adds explicit parent-child wiring.

The trade-off is locality versus a central index. Effect Atom favors independently composable reactive cells. Foldkit favors an explicit state machine whose transitions share one runtime path.

## AI-Assisted Development

Foldkit’s closed Message unions and exhaustive updates give a coding agent a bounded list of state transitions and compile errors when a new variant is unhandled. The type system turns a new Message into a concrete to-do list. Commands, Subscriptions, and views also have distinct roles, which narrows where related code should live.

Effect Atom favors feature-local atoms, so an agent instead follows imports, derived dependencies, setters, and reactivity keys. That can make a local feature compact while requiring more repository search for changes that cross several atoms. Foldkit’s [AI tools](/ai/overview) document its framework-specific patterns for agents that do not already know them.

## Practical Trade-offs

Architecture aside, several practical factors affect the choice.

|                         | React + Effect Atom                                                     | Foldkit                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Ecosystem               | React components, tooling, and libraries                                | [Foldkit UI](/ui/overview), plus [Mount](/core/mount) and [CustomElement](/core/custom-element) for third-party integration |
| Incremental adoption    | Add atoms to an existing React application                              | Owns the application runtime, though [Embedding](/core/embedding) can mount it inside another page                          |
| Data fetching           | `AsyncResult`, SWR, Suspense, families, and Effect HTTP/RPC integration | [AsyncData](/core/async-data) for state, with fetching, caching, and refresh policy modeled through the Model and Commands  |
| Fine-grained reactivity | Components subscribe to the atoms they read                             | Top-down view evaluation with virtual DOM diffing and [view memoization](/core/view-memoization)                            |
| View model              | React components and JSX                                                | Typed view functions and an HTML builder DSL                                                                                |

## Conclusion

They share Effect. Above that foundation, they choose different application architectures.

Choose React with Effect Atom when you want Effect-native reactive state inside React, incremental adoption, fine-grained subscriptions, and its async atom tools. Choose Foldkit when you want the Elm Architecture to govern the whole application, including rendering, lifecycle, DevTools, and tests. Effect Atom composes a graph of reactive cells inside a host framework. Foldkit gives the application one state machine and makes the rest of its tools follow from that constraint.
