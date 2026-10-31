# Testing

## Story and Scene {#overview}

Story and Scene test two parts of a Foldkit application. Story calls update directly. Scene enters through the rendered view. Neither test runs a browser or executes the Effects inside Commands, so both stay deterministic and fast.

Both start from a Block's Layer. Foldkit builds the Block, runs its constructor, and starts the test from the Model the constructor returns. You never assemble a Model by hand to begin a test.

### Compare the Boundaries

|                | Story                                        | Scene                                              |
| -------------- | -------------------------------------------- | -------------------------------------------------- |
| Enters through | A Message                                    | An interaction or a delivered Message              |
| Observes       | Model changes, Commands, and OutMessages     | Rendered output, Commands, Mounts, and OutMessages |
| Best suited to | Update logic, edge cases, and Command wiring | User flows, view behavior, and accessibility       |

### Use Both Boundaries

Use both. Story proves the state machine behaves correctly. Scene proves that a person can reach that behavior through the view.

### Name Test Files by Boundary

Name each file for the boundary it tests:

- `story.test.ts` drives update.
- `scene.test.ts` drives the rendered view.
- When one folder has several tests of the same kind, prefix the subject: `login.story.test.ts`.
- Keep root-level Scene tests for flows that cross pages. Put a child Block's tests beside its file and prefix them with its name: `search.story.test.ts` and `search.scene.test.ts` beside `search.ts`.

See [Project Organization](/patterns/project-organization) for the full layout.

### Write Tests with @effect/vitest

`story` and `scene` return an Effect. Run each one with `it.effect` from `@effect/vitest`, which runs the Effect and fails the test when a step throws. Add `@effect/vitest` to the package's development dependencies if it is missing.

## Story

`story` takes a Block's Layer, then a list of steps. It sends Messages through update and keeps Commands as data until the test supplies their result Messages. See the [Story](/testing/story) page for the full API.

::Snippet{name="counterCommandsTest" label="Delayed-reset Story test"}

## Scene

`scene` takes the same Layer and renders the view after every step. Locators find elements by role, label, placeholder, and visible text. Interactions invoke the view's event handlers. Scene also tracks pending Commands and Mounts. See the [Scene](/testing/scene) page for the full API.

::Snippet{name="sceneWeatherFlow" label="Weather search Scene test"}

## Building the Test Layer

The Layer passed to `story` or `scene` must provide exactly one root Block. Everything that Block's constructor needs comes from that Layer:

- Provide each child Block's Layer with `Layer.provide`, the same way the application's entry does. Do not use `Layer.merge`; the test would then see several root Blocks and fail.
- Provide the services the constructor yields, such as an `HttpClient`, with `Layer.provide` as well. Command handlers never run in a Story or Scene, so a test can provide a real or a stub service. The constructor only needs one to exist.
- Pass the root's constructor args after the Layer when the Block takes them, such as `{ url }` for a routed root.

The weather Scene above provides `Http.layer` because the weather Block's constructor yields `HttpClient`.

## Testing a Parent and Its Children

A test of a parent Block runs the whole tree below it. The test reads the Model in its resolved form: each child instance appears as its own Model, so `model.notes` is an array of Note Models. `given` can change a child's state, but it cannot add or remove an instance. Do that with the Messages that add and remove instances in the application.

### Deliver a Message to a Child

`Block.deliver(Child, path, message)` addresses a Message to one child instance. The path is the instance id for a single instance, or `[collection, key]` for an instance created by `each`. Pass the result to `message` in a Story, or to `deliver` in a Scene.

When the child returns an OutMessage, the parent's `.on` handler runs exactly as it does at runtime.

::Snippet{name="testingChildBlocks" label="Delivering Messages to child instances"}

### Resolve a Child's Command

Resolve a child's Command with the child's own result Message, such as `Note.Message.SucceededSave()`. Foldkit routes the result back to the instance that returned the Command.

When sibling instances have identical pending Commands, a bare Definition matches more than one and the step throws. Select one instance with `Command.at(path, Definition)`, using the same path form as `Block.deliver`. The [Scene Commands section](/testing/scene#commands) shows `Command.at` in context.

### Test a Child Block on Its Own

A child Block is an ordinary Block, so it can be the root of its own test. Its Layer is the root Layer, and its OutMessages appear to `expectOutMessage`. Test the child's behavior in the child's own tests. Test the parent's `.on` handlers, the Messages the parent sends to its children, and anything that needs both together from the parent.

A Block whose view takes a view input cannot be the root of a Scene, because nothing would supply the input. Test it through a small test-only parent Block, as shown in [Blocks with a view input](/testing/scene#blocks-with-a-view-input).

## Streams and Subscriptions

Neither Story nor Scene runs a Block's `stream` or `subscriptions`. A test supplies the Messages those sources would produce: `message` in a Story, `deliver` in a Scene. For a child's Stream, address the Message with `Block.deliver`.

See [Deliver a Stream or Subscription Message](/testing/story#deliver-a-stream-or-subscription-message) for an example.

## Executing Effects

A Command handler is a function the Block's constructor returns, closing over the services the constructor yields. Story and Scene never call it. To test a handler's work, extract it as a function of those services and run it with test services. The [Story page](/testing/story#test-command-effects) shows an HTTP handler tested against a stub client.

Choose the lowest service boundary whose behavior the test needs to exercise. If an API service contains authentication or retry policy, keep that service and replace its transport. The [Commands guide](/core/commands) covers handler services in depth.
