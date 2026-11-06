# Testing

## Story and Scene {#overview}

Story and Scene test two parts of a Foldkit application. Story calls update directly. Scene enters through the rendered view. Neither test runs a browser or executes the Effects inside Commands, so both stay deterministic and fast.

For Vitest, use `it.effect` from a compatible `@effect/vitest` release and return the Story or Scene Effect directly. The integration manages execution, scoped cleanup, and test services. Keep ordinary synchronous tests synchronous, and use `it.live` when an execution test deliberately needs the live environment. With plain Vitest, return or await `Effect.runPromise`; returning a Fiber from `Effect.runFork` does not make the test runner wait for completion.

Pass the Block and its Layer directly in ordinary behavior tests. Use `withBlock` when a fixture needs acquired operations, a modified initialized Model, private registrations, or a custom multi-view renderer. A typed Vitest fixture may retain a Promise bridge to hold acquisition open while its callback runs.

### Compare the Boundaries

|                | Story                                        | Scene                                              |
| -------------- | -------------------------------------------- | -------------------------------------------------- |
| Enters through | A Message                                    | An interaction or lifecycle result                 |
| Observes       | Model changes, Commands, and OutMessages     | Rendered output, Commands, Mounts, and OutMessages |
| Best suited to | Update logic, edge cases, and Command wiring | User flows, view behavior, and accessibility       |

### Use Both Boundaries

Use both. Story proves the state machine behaves correctly. Scene proves that a person can reach that behavior through the view.

### Name Test Files by Boundary

Name each file for the boundary it tests:

- `story.test.ts` drives update.
- `scene.test.ts` drives the rendered view.
- When one folder has several tests of the same kind, prefix the subject: `login.story.test.ts`.
- Keep root-level Scene tests for flows that cross pages. Colocate page and Block tests with the code they exercise.

The names stay accurate whether update and view live together or in separate files. See [Project Organization](/patterns/project-organization) for the full layout.

## Story

`story` starts from a Model, sends Messages through update, and keeps Commands as data until the test supplies their result Messages. See the [Story](/testing/story) page for the full API.

### Test a Root or Child Update

Story can test a root update or a child update in isolation. Pass the chosen Block to the scoped `story` entry point at either level. Start with `init(...args)` or `given(model)` and provide the child implementation Layer when testing a public contract.

::Snippet{name="counterCommandsTest" label="Delayed-reset Story test"}

## Scene

`scene` renders the view after every step. Locators find elements by role, label, placeholder, and visible text. Interactions invoke the view's event handlers, while cause-named steps supply Subscription, ManagedResource, and CustomElement results. Scene also tracks pending Commands and Mounts. See the [Scene](/testing/scene) page for the full API.

### Test at the Owning Level

Scene can start at the root or a child Block. Pass required view inputs in `{ block, layer, viewInputs }`; `expectOutMessage` checks a child’s OutMessage directly. Both Story and Scene return Effects that own graph acquisition and cleanup. Their steps remain synchronous and do not execute handlers.

Choose the level by ownership. Test a Block's rendering, interactions, Commands, and OutMessages at the Block. Test parent folding, lifted Commands, route changes, and parent-computed ViewInputs at the root. Those behaviors cross the boundary and cannot be observed from the child.

::Snippet{name="sceneWeatherFlow" label="Weather search Scene test"}

## Executing Effects

To test a Command's work, execute its Effect with the application's real handler Layer and controlled service providers. The [Commands guide](/core/commands#testing-the-handler-through-its-services) shows an HTTP test that runs the real request, decoding, and result Message mapping.

Choose the lowest service boundary whose behavior the test needs to exercise. If an API service contains authentication or retry policy, retain that service and replace its transport. The same principle applies to Subscription Streams, Mount integrations, and ManagedResource acquisition and cleanup. [Testing through service boundaries](/core/layers#testing-through-service-boundaries) explains how to compose these providers at the application root.

Replacing an entire handler tests a narrower orchestration path and excludes the replaced implementation. Story and Scene already supply results explicitly; execution tests use Effect and Layer composition to run the application's handlers.

## Migrate an Existing Test Suite

The Blocks preview changes where tests get identity, generated delivery, and lifecycle declarations. Keep tests at the same Story or Scene boundary, then replace hand-written observations with the declarations carried by the composed application.

### Match Commands by Source Identity

A bound child Command has a placement-qualified display name such as `Application/Pins/ReadPins`. Do not compare that string, or compare `command.name` with `Definition.name`. Story and Scene match the original Definition by its source identity, so the same matcher keeps working after the Command is registered below a Binding. Pass an instance for exact args; a bound instance also selects its composition path.

When the Command belongs to a child Block, supply its raw child result Message. The pending Command retains the generated delivery chain and Story or Scene replays it before calling the parent update.

::Snippet{name="testingMigrationCommandBefore" label="❌ Command test before Blocks"}

::Snippet{name="testingMigrationCommandAfter" label="✅ Command test with source identity"}

The parent Message union no longer declares `GotPinsMessage`. Composition owns generated child envelopes, and tests do not fabricate their placement or occurrence fields.

### Send a Child Fact Without a View

Use `messageIn(binding, childMessage)` in a Block-aware Story to test direct child delivery or OutMessage policy. A keyed Binding takes its decoded key before the Message. The passive step resolves the original Binding against that Story’s acquired graph.

::Snippet{name="testingHeadlessChildMessage" label="Test a parent policy without rendering the child"}

The helper uses synthetic generation `0` for pure replay. It does not select a live occurrence, create an absent child or override Runtime admission. Normal parent dispatch still applies presence, delivery context and OutMessage policy. For an advanced direct transition fixture, `toParentMessageFor(block)` binds delivery to the acquired parent. Pass a selected child Binding as its second argument to map nested Messages against that same graph. A Message built from an independently acquired child has different provenance. Keep production parent code on Binding operations, and retain Command/Subscription replay for facts originating from those sources.

### Register Scene Subscription Sources

`Subscription.emit` identifies both the registered source and its raw Message. Use a Block-aware Scene against the selected implementation that owns the registry, then select the entry that declared the Message. Private lifecycle registries remain implementation details. An advanced acquired fixture can pass its concrete registry to a synchronous Scene. For a child entry, pass the child's Message; Scene derives every generated parent delivery from the registry.

::Snippet{name="testingMigrationSubscriptionBefore" label="❌ Subscription test before registered sources"}

::Snippet{name="testingMigrationSubscriptionAfter" label="✅ Subscription test with a Scene registry"}

The scaffolded `tsconfig.json` includes `src/**/*`, which keeps `*.test.ts` files in the project typecheck. Preserve that coverage when customizing TypeScript project references or include patterns, so a changed Story or Scene signature fails during `typecheck` instead of waiting for the test runner.

### Test Completed UI Blocks Through Public Contracts

Stateful UI components expose their declared Schemas and operation contracts through a public Block. Provide the component’s `layer` for construction. Scoped Story and Scene tests acquire the executable init, update, and operations. Derive a named alias such as `type FooModel = typeof FooBlock.Model.Type` once, then use `FooModel` in annotations. Let the parent Binding and Composition initialize the child so its startup Commands are retained.

Command and Mount Definitions intended for Story and Scene live under the component's `test` namespace. Resolve the original public Definition with a result Message from the selected public Block contract.

::Snippet{name="testingMigrationUiBefore" label="❌ UI component test with the legacy module API"}

::Snippet{name="testingMigrationUiAfter" label="✅ UI component test with a Block contract"}

The [Block guide](/core/block) covers connected Steps, owner-specific builder aliases, and child initialization. The [Mount guide](/core/mount#mount-requirements-in-reusable-views) covers reusable mounted view helpers. Component pages document helpers that drain a component's whole pending lifecycle when one public operation is clearer than several individual resolvers.
