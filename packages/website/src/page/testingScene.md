# Scene

## Testing Through the View

`Scene` tests features through the rendered view. Where [Story](/testing/story) sends Messages directly to update, Scene clicks buttons, types into inputs, presses keys, and asserts on the rendered VNode tree. The view function runs on every step, so if it crashes or renders the wrong thing, the test catches it.

Scene operates on the VNode tree directly. No DOM, no jsdom, no browser. Tests are pure, deterministic, and fast.

Import the steps you need from `foldkit/scene`. A test file usually needs only one of the two testing modules, so named imports keep the call sites short. When a single file tests both a story and a scene, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `given` and `given` stay distinguishable.

## Locators

Locators find elements the way users find them: by role, by label, by visible text. Each factory returns a `Locator` that resolves to a single match; interactions and assertions accept either a Locator or a raw CSS selector string.

::Snippet{name="sceneLocators" label="locator examples"}

| Locator                | Finds                                                                                           | Example                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `role(role, options?)` | Elements by ARIA role (explicit or implicit). Options narrow by accessible name and ARIA state. | `role('button', { name: 'Save' })` |
| `label(text)`          | Form controls by their aria-label or associated \<label> text.                                  | `label('Email')`                   |
| `placeholder(text)`    | Inputs by their placeholder attribute.                                                          | `placeholder('Search...')`         |
| `text(text)`           | Elements by visible text content.                                                               | `text('Welcome back')`             |
| `altText(text)`        | Images and similar elements by their alt attribute.                                             | `altText('Profile photo')`         |
| `title(text)`          | Elements by their title attribute (tooltip text).                                               | `title('Delete')`                  |
| `testId(id)`           | Elements by data-testid: the escape hatch for tests.                                            | `testId('cart-item-3')`            |
| `displayValue(value)`  | Form controls by their current value.                                                           | `displayValue('US')`               |
| `selector(css)`        | Elements by CSS selector. Use when no accessible query fits.                                    | `selector('.chart-legend')`        |

### The role Locator

`role` is the most common locator. It accepts a second argument of state options that narrow the match. All options are optional:

::Snippet{name="sceneRole" label="role examples"}

| Option     | Type                 | Matches                                                                                                                                             |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | `string \| RegExp`   | Accessible name (aria-label, aria-labelledby, label[for], or text content). Strings match exactly; regular expressions match against the full name. |
| `level`    | `number`             | Heading level (for role: "heading")                                                                                                                 |
| `checked`  | `boolean \| 'mixed'` | aria-checked or the checked attribute                                                                                                               |
| `selected` | `boolean`            | aria-selected                                                                                                                                       |
| `pressed`  | `boolean \| 'mixed'` | aria-pressed                                                                                                                                        |
| `expanded` | `boolean`            | aria-expanded                                                                                                                                       |
| `disabled` | `boolean`            | aria-disabled or the disabled attribute                                                                                                             |

### Scoping

`within(parent, child)` scopes a single locator to a parent element. `inside(parent, ...steps)` scopes a whole block of steps. Every assertion or interaction inside the block resolves within the parent’s subtree. Use `within` for one-off scoped queries; use `inside` when several steps share the same scope. Nested `inside` calls compose.

::Snippet{name="sceneScoping" label="scoping examples"}

### Multi-Match

For lists and repeated elements, the `all.*` factories (`all.role`, `all.text`, `all.label`, and so on, one per single-match factory) return a `LocatorAll` that resolves to every match. Pick one with `first`, `last`, or `nth(index)`, or narrow with `filter`:

::Snippet{name="sceneMultiMatch" label="multi-match examples"}

| Filter option | Keeps matches where                                            |
| ------------- | -------------------------------------------------------------- |
| `has`         | The element contains a descendant matching the given Locator   |
| `hasNot`      | The element does not contain a descendant matching the Locator |
| `hasText`     | The element’s text content includes the given substring        |
| `hasNotText`  | The element’s text content does not include the substring      |

## Interactions

Interactions exercise the view by invoking event handlers on matched elements. Each one captures the dispatched Message, feeds it through update, and re-renders. They accept either a Locator or a CSS selector string.

::Snippet{name="sceneInteractions" label="interaction examples"}

| Step                               | Invokes                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `click(target)`                    | `OnClick` (bubbles to ancestors)                                                                 |
| `doubleClick(target)`              | `OnDoubleClick` (bubbles to ancestors)                                                           |
| `contextMenu(target)`              | `OnContextMenu` (bubbles to ancestors)                                                           |
| `pointerDown(target, options?)`    | `OnPointerDown` with optional `{ pointerType, button, screenX, screenY }` (bubbles to ancestors) |
| `pointerUp(target, options?)`      | `OnPointerUp` with optional `{ pointerType, screenX, screenY }` (bubbles to ancestors)           |
| `hover(target)`                    | `OnMouseEnter` (falls back to `OnMouseOver`)                                                     |
| `focus(target)`                    | `OnFocus`                                                                                        |
| `blur(target)`                     | `OnBlur`                                                                                         |
| `type(target, text)`               | `OnInput` with the given text                                                                    |
| `change(target, value)`            | `OnChange` with the given value, for `<select>` and similar                                      |
| `keydown(target, key, modifiers?)` | `OnKeyDown` or `OnKeyDownPreventDefault` with optional `{ shiftKey, ctrlKey, altKey, metaKey }`  |
| `submit(target)`                   | `OnSubmit`                                                                                       |

`tap(fn)` runs a function for side effects (like ad-hoc assertions on raw VNodes or accumulated Commands) without breaking the step chain.

## Assertions

`expect(locator)` creates an inline assertion step against a single element. Every matcher has a `.not` variant that inverts the assertion.

Property, state, and accessibility matchers require the Locator to match an element, including their `.not` variants. Use `.toBeAbsent()` or `.not.toExist()` when the intended assertion is that no element matches.

::Snippet{name="sceneAssertions" label="assertion examples"}

| Matcher                                     | Asserts that the element                                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.toExist()`                                | Is present in the tree                                                                                                                             |
| `.toBeAbsent()`                             | Is not present in the tree                                                                                                                         |
| `.toBeVisible()`                            | Is not hidden via the hidden attribute, aria-hidden, display: none, or visibility: hidden                                                          |
| `.toBeEmpty()`                              | Has no text content or child elements                                                                                                              |
| `.toHaveText(value)`                        | Has text content equal to the given string or matching the given regex                                                                             |
| `.toContainText(value)`                     | Has text content including the given substring or matching the regex                                                                               |
| `.toHaveAccessibleName(name)`               | Has the given accessible name (resolves aria-labelledby, aria-label, label[for], native host-language sources, accessible text content, and title) |
| `.toHaveAccessibleDescription(description)` | Has the given accessible description (resolves aria-describedby)                                                                                   |
| `.toBeDisabled()`                           | Has aria-disabled or the disabled attribute                                                                                                        |
| `.toBeEnabled()`                            | Is not disabled                                                                                                                                    |
| `.toBeChecked()`                            | Has aria-checked="true" or the checked attribute                                                                                                   |
| `.toHaveValue(value)`                       | Has the given current form-control value                                                                                                           |
| `.toHaveAttr(name, value)`                  | Has the given attribute set to the given value                                                                                                     |
| `.toHaveId(id)`                             | Has the given id                                                                                                                                   |
| `.toHaveClass(name)`                        | Has the given CSS class                                                                                                                            |
| `.toHaveStyle(name, value)`                 | Has the given inline style property                                                                                                                |

Accessible-name and accessible-description matching excludes hidden descendant content. A hidden node directly referenced by `aria-labelledby` or `aria-describedby` contributes its full subtree text.

For `LocatorAll` (from `all.*`), use `expectAll(locatorAll)` for count-based assertions:

| Matcher           | Asserts that                           |
| ----------------- | -------------------------------------- |
| `.toHaveCount(n)` | The locator matches exactly n elements |
| `.toBeEmpty()`    | The locator matches zero elements      |

## Handled and Ignored Interactions

An interaction that falls through must be acknowledged. Scene fails when a handler produced no Message and no `expectIgnored()` followed, either at the next interaction or when the scene ends, and the failure names the event and the target it was dispatched on. One acknowledgement covers one fall-through, so two in a row need one each. Saying nothing is not a position Scene lets you hold: a test that leaves a fall-through unsaid passes whether the interaction is correctly inert or its handler regressed.

An interaction on an element with no handler for that event throws, so a Scene test cannot silently target the wrong element. A handler that runs and returns `Option.none()` is a different case: the event falls through, nothing changes, and the step is a no-op. `expectHandled()` asserts the preceding interaction's handler produced a Message; `expectIgnored()` asserts it did not.

Reach for these when inertness is the behavior under test. A read-only widget that stops committing changes no Model, emits no OutMessage, and alters no DOM, so `expectNoOutMessage()` and `Command.expectNone()` hold just as well against a build whose handler was deleted. Only `expectIgnored()` distinguishes "correctly inert" from "no longer wired up".

`expectHandled()` is also how to assert that a key is consumed. A handler that returns a Message is what makes `h.OnKeyDownPreventDefault` call `preventDefault()`, so a handled keydown is one whose browser default is suppressed: `Space` does not scroll the page and `Enter` does not submit a surrounding form. Prefer it over asserting which Message was produced. The Message is the mechanism a component happens to use; being consumed is the contract, and the assertion survives renaming the Message.

Only interaction steps set the outcome. `Command.resolve`, `Mount.resolve`, and a plain `expect` leave it alone, so the value is the last interaction rather than the last step. Keep the assertion next to the interaction it covers.

## Commands

When `update` returns Commands (see [Commands](/core/commands)), Scene tracks each as pending until the test resolves it with the result Message its Effect would resolve to at runtime. `update` declares the Command, the test declares its outcome.

Command tracking has a few semantics worth knowing:

- Pending Commands accumulate in the order `update` returns them, across as many steps as the test takes.
- Resolving a Command feeds its result Message through `update`; new Commands produced by that update join the pending list.
- `Command.resolveAll` walks cascades within the batch. If resolving Command A produces Command B and B’s resolver is in the same call, B resolves without a separate step.
- `Command.resolveAllExact` walks the same cascades while requiring every listed resolver to match within that call and every actual Command to be resolved.
- Interactions throw if there are unresolved Commands when they try to dispatch a Message.
- `scene` throws at the end if any Command remains unresolved.

::Snippet{name="sceneCommandAssertions" label="command assertions example"}

| Step                                                 | Effect                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Command.resolve(Def, ResultMessage)`                | Resolves the first pending Command with the given name by feeding `ResultMessage` through update. For a child Submodel Command, pass the child’s raw result Message; resolve replays the Command’s own `mapMessages` wrapping automatically. |
| `Command.resolveAll([Def, ResultMessage], ...)`      | Resolves a batch of pending Commands, walking cascades. Each entry resolves exactly one matching dispatch in declaration order and unmatched entries carry forward; compose with Array.makeBy for N identical responses.                     |
| `Command.resolveAllExact([Def, ResultMessage], ...)` | Resolves a batch and throws unless every listed resolver matches within the call and no actual Commands remain unresolved. Repeated Definition entries consume repeated dispatches in declaration order.                                     |
| `Command.expectExact(A, B)`                          | The pending Commands are exactly A and B (order-independent).                                                                                                                                                                                |
| `Command.expectHas(A)`                               | A is among the pending Commands (subset check).                                                                                                                                                                                              |
| `Command.expectNone()`                               | There are no pending Commands.                                                                                                                                                                                                               |

Prefer `Command.expectExact` as the default. It catches bugs where an interaction produces unexpected Commands. Use `Command.expectHas` when you only care about a subset of the pending Commands.

Each matcher accepts either a Command Definition (matches by name) or a Command instance (matches by name AND structural-equal args). Pass a Definition when the test only cares that the Command was dispatched; pass an instance when the args are part of what the test is verifying. `Command.expectExact(FetchWeather({ zipCode: '90210' }))` fails if the runtime dispatched `FetchWeather({ zipCode: '99999' })`, where the same call with just `FetchWeather` would pass.

## Mounts

When a rendered view contains an `OnMount` attribute (see [Mount](/core/mount)), Scene tracks the mount as pending until the test acknowledges it with the result Message its Effect would resolve to at runtime. The mechanic mirrors Command resolution: the view declares the Mount, the test declares its outcome.

Many UI components in `@foldkit/ui` declare mounts internally (popovers positioning their panels, modal components portaling backdrops to the body, components that hand the live element to a third-party library). When the test renders any of these, the same `OnMount` shows up in the VNode tree, and Scene treats it as a pending mount. Acknowledging it advances the test through the same path the user takes: the view renders, the mount fires, the result Message updates the Model.

Mount tracking has a few semantics worth knowing:

- Pending mounts persist across re-renders. Resolving a mount does not re-pend it on the next render.
- Every mount that fires and unmounts during a scene must be acknowledged with `Mount.expectEnded`, even if it was already resolved. `resolve` handles a mount’s result Message; `expectEnded` handles its unmount. Unacknowledged unmounts throw at the end of the scene.
- Same-named mounts in the tree are disambiguated by occurrence. `Mount.resolve` resolves the first pending occurrence; a second call resolves the next.
- Interactions throw if there are unresolved mounts or unacknowledged unmounts when they try to dispatch a Message. Same contract as Commands.
- `scene` throws at the end if any mount remains unresolved.

::Snippet{name="sceneMountAssertions" label="mount assertions example"}

| Step                                          | Effect                                                                                                                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mount.resolve(Def, ResultMessage)`           | Resolves the first pending mount with the given name by feeding `ResultMessage` through update. For a mount inside a child Submodel, resolve replays the boundary lift automatically, so you pass the child’s raw result Message. |
| `Mount.resolveAll([Def, ResultMessage], ...)` | Resolves a batch of pending mounts in order.                                                                                                                                                                                      |
| `Mount.expectExact(A, B)`                     | The pending mounts are exactly A and B (order-independent, by name).                                                                                                                                                              |
| `Mount.expectHas(A)`                          | A is among the pending mounts (subset check).                                                                                                                                                                                     |
| `Mount.expectNone()`                          | There are no pending mounts.                                                                                                                                                                                                      |
| `Mount.expectEnded(A)`                        | A has disappeared from the rendered tree. Required for every Mount that fires and then unmounts during the scene, regardless of whether it was resolved first; otherwise the scene throws at the end.                             |

UI components export their Mount definitions (`Popover.AnchorPopover`, `Listbox.AnchorListbox`, and so on) so consumer tests can name them in `Mount.resolve`.

## Subscriptions

Messages caused by a DOM event enter a scene through interactions, and Messages caused by a Command or Mount enter through `resolve`. A Message whose real cause is a [Subscription](/core/subscriptions) (a timer tick, a WebSocket frame, a global listener) has no element in the rendered tree, so `Subscription.emit(message)` feeds it through update directly and re-renders like any other step.

::Snippet{name="sceneSubscriptionEmit" label="Subscription emit example"}

Reach for it only when the Message's cause lives outside the rendered tree. If the Message has a DOM affordance, click the actual button instead; the interaction proves the handler wiring that `emit` skips. Like interactions, `emit` throws if unresolved Commands, unresolved Mounts, or unacknowledged unmounts are pending.

## Managed Resources

A [ManagedResource](/core/managed-resources) dispatches lifecycle Messages through its declared hooks: `onAcquired(value)` when acquisition succeeds, `onAcquireError(error)` when it fails, and `onReleased()` after release. The `ManagedResource` steps declare those outcomes the way `Command.resolve` declares a Command result, feeding the hook's Message through update.

Each step checks the current Model against the entry's `modelToMaybeRequirements` gate first, mirroring the runtime's `None` to `Some` and `Some` to `None` transitions: `acquire` and `failAcquire` throw unless the Model requests the resource (`Some`), and `release` throws while it still does. A scene therefore has to drive the Model transition through real steps before declaring the lifecycle outcome. The runtime's third transition, the `Some` to `Some` re-acquire when the requirements change structurally (which dispatches `onReleased` and then `onAcquired` while the Model still requests the resource), has no step yet.

Unlike Commands and Mounts, these steps leave nothing pending: each dispatches its Message through update immediately, so there is nothing to resolve or acknowledge at the end of the scene. The steps are also never required. Scene only sees `update` and `view`, not the application's ManagedResources record, so driving the Model into the requesting state without ever calling `acquire` is legal and ends the scene in the in-flight state, the same state the runtime sits in while its own `acquire` Effect runs. The gates work the other way around: any step you do call throws immediately when the current Model contradicts the lifecycle outcome it declares.

`acquire` takes exactly the arguments the entry's `onAcquired` declares. A handler that consumes the acquired value, like `socket => Connected({ socketId: socket.socketId })`, requires the value here (what the entry's `acquire` Effect would have produced). A handler that ignores it, like `() => Connected()`, takes none, so a test never fabricates a resource value nobody reads.

::Snippet{name="sceneManagedResourceSteps" label="ManagedResource steps example"}

| Step                                        | Effect                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ManagedResource.acquire(entry, ...args)`   | Feeds `onAcquired(...args)` through update. The Model must request the resource.    |
| `ManagedResource.failAcquire(entry, error)` | Feeds `onAcquireError(error)` through update. The Model must request the resource.  |
| `ManagedResource.release(entry)`            | Feeds `onReleased()` through update. The Model must no longer request the resource. |

## Custom Elements

A [CustomElement](/core/custom-element) converts declared CustomEvents into Messages through its `On*` event attributes. `CustomElement.emit(spec, target, eventName, detail)` dispatches such an event on a rendered element: the event name and detail are typed by the spec's event Schemas, and the Message comes out of the same mapping the browser event would run. The element must be in the rendered tree with the event's attribute attached; a missing element or missing handler throws.

::Snippet{name="sceneCustomElementEmit" label="CustomElement emit example"}

## OutMessages

When the update under test is a Submodel's three-tuple update, Scene tracks its `Option<OutMessage>` the same way Story does. `expectOutMessage(expected)` asserts the OutMessage is `Some(expected)`; `expectNoOutMessage()` asserts there is none.

::Snippet{name="sceneOutMessageAssertions" label="OutMessage assertions example"}

The tracked value is the third element of the most recent update result that had one. An update branch that returns a two-tuple leaves the previous value in place, so keep every branch of an OutMessage-returning update on the three-tuple shape, returning `Option.none()` when there is nothing to report.

## Submodels with ViewInputs

A Submodel that declares `ViewInputs` has a `(model, viewInputs, h)` view, which does not match the `(model, h)` shape `scene` takes. `withViewInputs(view, defaults)` closes the gap: pass the view and its full default inputs once, and the returned factory produces a scene view.

::Snippet{name="sceneWithViewInputs" label="withViewInputs example"}

The factory's overrides accept every `ViewInputs` field except `toView`, so tests vary value inputs while the renderer stays pinned. The published Submodels in `packages/ui/src/` are tested exactly this way; `packages/ui/src/slider/scene.test.ts` is the canonical example.

## A Complete Scene

Here’s a Scene test for a weather app. The user types a zip code, clicks Get Weather, sees a loading state, and then the forecast appears:

::Snippet{name="sceneWeatherFlow" label="Scene weather example"}

Every interaction targets an element the way a user would: by label, by role, by placeholder. Every assertion reads like a sentence. Commands are resolved inline, just like in Story.

## Story vs Scene

Story and Scene are complementary. Story tests the state machine: does this sequence of Messages produce the right Model? Scene tests the contract: does this feature work from the user’s perspective?

Use Story for update logic, edge cases, and Command wiring. Use Scene for user flows, view rendering, and accessibility. A well-tested app uses both.
