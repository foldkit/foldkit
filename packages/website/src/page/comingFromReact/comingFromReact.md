# Coming from React

If you know React, you already have the instincts for building declarative interfaces. Foldkit puts those instincts inside a different structure. React organizes behavior around components and Hooks. Foldkit organizes it around one Model, Messages, update, and a view.

Foldkit does not compete with React on the brevity of a small component, and it is not trying to. Its first counter is longer because it names the state machine before the application needs much of one. That gap is deliberate. The examples below keep adding behavior to the same counter so you can see what the structure buys as effects and time enter the picture.

## A Simple Counter

Here is a counter in React:

::Snippet{name="reactCounter" label="React counter" class="mb-4"}

The Foldkit version separates state, events, transitions, and rendering:

::Snippet{name="foldkitCounter" label="Foldkit counter" class="mb-6"}

For one number and one button, React is more compact. Foldkit’s structure starts paying for itself when the same state participates in timers, network requests, keyboard input, or several views. The rest of this page adds one of those concerns at a time.

## Adding Auto-Count

The next requirement is a play/pause button that increments the counter every second.

React uses an Effect to synchronize an interval with `isAutoCounting`:

::Snippet{name="reactCounterAutoCount" label="React counter with auto-count" class="mb-4"}

The Effect starts the interval when auto-counting is active and returns the cleanup that stops it. React runs the cleanup before the Effect starts again and when the component unmounts. The functional state updater keeps the interval from depending on a captured `count`.

Foldkit adds a Subscription and a `Ticked` Message:

::Snippet{name="foldkitCounterAutoCount" label="Foldkit counter with auto-count" class="mb-6"}

The Subscription emits `Ticked` while `isAutoCounting` is true. Foldkit scopes the Stream to that Model condition, so the runtime starts and stops it as the condition changes. The interval does not live in the view, and its ticks enter the application through the same update function as button clicks.

## Adding a Step Size

Now the user can choose how much each manual click and timer tick adds.

A naive React interval that reads `step` from its original closure keeps using that old value. Adding `step` to the Effect dependencies gives the interval the latest value, but also restarts the interval whenever the input changes. If the interval should keep its rhythm, React 19.2’s `useEffectEvent` lets the tick read the latest committed `step` without making `step` a synchronization dependency:

::Snippet{name="reactCounterStepSize" label="React counter with step size" class="mb-4"}

The distinction is meaningful in React. `isAutoCounting` controls whether the external interval exists, so it is an Effect dependency. `step` is data read when the interval fires, so the Effect Event reads its current value without restarting the interval. The Hooks linter enforces where an Effect Event may be called and keeps it out of the dependency array.

The Foldkit version adds `step` to the Model and handles `ChangedStep`:

::Snippet{name="foldkitCounterStepSize" label="Foldkit counter with step size" class="mb-6"}

Each `Ticked` Message is handled with the current Model, so `model.step` is current when update calculates the next count. The Subscription still depends only on whether auto-counting is active. There is no closure decision to make and no second mechanism for reading the latest value.

:::Info{label="The architectural difference"}
React synchronizes an external resource from component state, so the Effect must distinguish values that control the resource from values read when it emits. Foldkit’s Subscription controls the resource from a Model condition and emits Messages. Update reads the current Model when each Message arrives.
:::

`useEffectEvent` is a good answer to the React problem. Foldkit does not create that problem. The timer emits a fact, and update decides what that fact means using the current Model.

The Foldkit example can be tested below the view by passing Models and Messages directly to update. A view-level Scene test can exercise the same flow through the buttons and input. Neither test needs to wait for a real interval because `Ticked` is already a value the test can dispatch.

## Translating React Concepts

The mappings below are starting points, not one-to-one replacements:

| React ecosystem                                  | Foldkit                                                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `useState` / component state                     | Fields in the Model                                                                                         |
| `useReducer`                                     | The update function and Message union                                                                       |
| Event-driven side effect                         | A Command returned from update                                                                              |
| External event source tied to state              | A Subscription gated by Model dependencies                                                                  |
| DOM work tied to an element                      | `Mount.define` or `Mount.defineStream`                                                                      |
| Stateful resource shared with Commands           | ManagedResource                                                                                             |
| Context used for application state               | The Model                                                                                                   |
| Context used for services                        | Effect services and Layers                                                                                  |
| `useMemo` / `useCallback`                        | Often no equivalent; `createLazy` and `createKeyedLazy` skip expensive view work when needed                |
| Custom Hook                                      | A domain module, pure helper, lifecycle primitive, or combination of them                                   |
| JSX                                              | Typed HTML builder functions                                                                                |
| Component props                                  | Function parameters                                                                                         |
| Event handler                                    | A Message value or a function that constructs one                                                           |
| React Router / TanStack Router                   | Built-in typed routing                                                                                      |
| Next.js SSG / SSR                                | [Server rendering](/core/server-rendering), at build time or per request                                    |
| React Hook Form / Formik                         | Model, Messages, and [field validation](/core/field-validation)                                             |
| Headless UI / Radix UI                           | [Foldkit UI](/ui/overview)                                                                                  |
| Error Boundary for an unexpected rendering crash | [Crash view](/core/crash-view); expected Effect failures return as Messages and become explicit Model state |

:::Info{label="If you know Redux"}
The Model-View-Update pattern will feel familiar. The Model resembles the store, Messages resemble actions, and update resembles a reducer. Foldkit’s update also returns Commands, and its Message union is exhaustively matched.
:::

## FAQ

:::Faq{id="faq-reusable-components" question="How do I make reusable “components”?"}
Write view functions that take the Model data they need and return Html. They do not own hidden state or lifecycle. A feature that needs its own state machine can be a [Submodel](/core/submodel), with its own Model, Message union, update, and view.
:::

:::Faq{id="faq-multiple-instances" question="How do I create multiple components with their own state?"}
Represent each instance in the Model. Use separate fields for a fixed number of instances or a collection keyed by a stable Model identifier for a dynamic number:

::Snippet{name="multipleInstances" label="Model example" class="mb-4"}

Each `Accordion.Model` is a Submodel. The parent delegates a child Message to the matching instance and writes the child Model back. See the [Shopping Cart example](/example-apps/shopping-cart) for a larger composition.
:::

:::Faq{id="faq-routing" question="How does routing work?"}
Foldkit has built-in typed routing with bidirectional parsers. A route definition parses a URL and builds the corresponding URL. See [Routing & Navigation](/core/routing-and-navigation).
:::

:::Faq{id="faq-forms" question="What about forms?"}
Form values and validation state live in the Model. Inputs dispatch Messages, and update applies changes. Foldkit’s [field validation](/core/field-validation) module models `NotValidated`, `Validating`, `Valid`, and `Invalid` fields. [Foldkit UI](/ui/overview) provides headless controls such as Combobox and Listbox. See the [Form example](/example-apps/form).
:::

:::Faq{id="faq-ui-components" question="What about Headless UI, Radix, or Shadcn?"}
[Foldkit UI](/ui/overview) provides headless components including Dialog, Combobox, Listbox, Menu, and Popover. Each component has its own Model, Messages, and update, and the application integrates it as a Submodel. You provide markup and styling; the UI package provides interaction state, keyboard behavior, and accessibility attributes.
:::

:::Faq{id="faq-react-compiler" question="What about React Compiler?"}
React Compiler 1.0 became stable in October 2025. It automatically memoizes supported components and Hooks and reports Rules of React violations through compiler-powered lint rules. Existing React applications can adopt it incrementally.

The compiler changes how React optimizes renders. It does not choose the application’s state model or replace the synchronization work performed by Effects. Foldkit views can skip expensive subtrees with [createLazy and createKeyedLazy](/core/view-memoization), using Model-derived inputs as the cache key. See [Foldkit vs React](/react/foldkit-vs-react-side-by-side) for the fuller comparison.
:::

:::Faq{id="faq-data-fetching" question="How do I fetch data?"}
Return a Command from the update handler for the Message that starts the request. The runtime executes the Effect and dispatches the Command’s result Message. Update then stores the result in the Model, commonly using [AsyncData](/core/async-data).

Independent requests are not ordered or cancelled automatically. When an earlier response could arrive late, include the request context in its result Message and accept it only if it still matches the current Model. [Coming from TanStack Query](/react/coming-from-tanstack-query#out-of-order-responses) shows the complete pattern. See the [Weather example](https://github.com/foldkit/foldkit/blob/main/examples/weather/src/main.ts#L153-L232) for a working request flow.
:::

:::Faq{id="faq-ssr" question="Does Foldkit do SSR like Next.js?"}
Yes. [Server rendering](/core/server-rendering) runs the same program on the server and in the browser. `renderToString` produces HTML during a build for SSG or per request for SSR, and `Runtime.hydrate` adopts it in place. After hydration, routing, update, and Commands run in the browser until the next full page load.
:::

:::Faq{id="faq-testing" question="How do I test my app?"}
Foldkit includes two testing APIs that use the same update and view pipeline as the runtime.

[Story](/testing/story) tests the state machine. It dispatches Messages, inspects the Model, and resolves Commands by providing their result Messages. [Scene](/testing/scene) tests through the rendered VNode tree, locating elements by accessible role, label, or text and dispatching their events.

When a test resolves Commands inline, both APIs stay synchronous and need no jsdom or network mocks. See the [Weather example](/example-apps/weather) for Story and Scene tests of the same application.
:::

:::Faq{id="faq-where-to-start" question="I’m sold. Where do I start?"}
Start with [Get Started](/get-started), then read the [Counter Example](/core/counter-example) for a detailed walkthrough of Model, Messages, update, and view.
:::
