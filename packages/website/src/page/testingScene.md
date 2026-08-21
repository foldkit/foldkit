# Scene

## Testing Through the View

`Scene` runs update and view together. It clicks buttons, types into inputs, presses keys, and checks the rendered VNode tree. The view runs after every step, so the test sees both state transitions and their rendered result.

Scene operates on VNodes directly. It needs no DOM, jsdom, or browser.

Import the steps you need from `foldkit/scene`. Use named imports when the file contains only Scene tests. If a file contains both Story and Scene tests, import the namespaces from `foldkit` so `Story.given` and `Scene.given` stay distinct.

## Locators

Locators find elements by role, label, visible text, and other user-facing properties. A `Locator` resolves to one match. Interactions and assertions also accept a raw CSS selector when no accessible query fits.

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

`role` is the usual starting point. Its optional second argument narrows the match by accessible name or ARIA state.

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

For lists and repeated elements, the `all.*` factories return every match. Pick one with `first`, `last`, or `nth(index)`, or narrow the set with `filter`.

::Snippet{name="sceneMultiMatch" label="multi-match examples"}

| Filter option | Keeps matches where                                            |
| ------------- | -------------------------------------------------------------- |
| `has`         | The element contains a descendant matching the given Locator   |
| `hasNot`      | The element does not contain a descendant matching the Locator |
| `hasText`     | The element’s text content includes the given substring        |
| `hasNotText`  | The element’s text content does not include the substring      |

## Interactions

An interaction invokes the matched element's event handler. If the handler produces a Message, Scene feeds it through update and renders the next view.

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

Scene makes every fall-through interaction explicit. When a handler runs and returns `Option.none()`, follow the interaction with `expectIgnored()`. When it produces a Message, `expectHandled()` verifies that outcome. If another interaction starts or the scene ends before a fall-through is acknowledged, Scene fails and names the event and target. Each acknowledgement covers one interaction.

An element with no handler for that event throws immediately. That is different from a handler that deliberately returns `Option.none()`. For example: a read-only widget may keep its input handler but ignore edits. `expectIgnored()` proves the handler is still present and deliberately inert. `Command.expectNone()` or `expectNoOutMessage()` cannot distinguish that from a deleted handler.

Use `expectHandled()` to prove that `h.OnKeyDownPreventDefault` consumed a key. A handled `Space` does not scroll the page, and a handled `Enter` does not submit a surrounding form. This checks the user-facing contract without depending on the Message name.

The outcome belongs to the most recent interaction. `Command.resolve`, `Mount.resolve`, and a plain `expect` do not replace it. Keep `expectHandled()` or `expectIgnored()` next to the interaction it covers.

## Commands

When update returns Commands, Scene keeps them pending until the test supplies their result Messages. Update declares the work. The test declares what happened.

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

When a rendered view contains an `OnMount` attribute, Scene keeps that Mount pending until the test supplies its result Message. If the mounted element later leaves the tree, the test must also acknowledge the unmount with `Mount.expectEnded`.

This applies to Mounts declared inside `@foldkit/ui` components too. Popovers, dialogs, and other components export their Mount Definitions so a consumer test can name and resolve them.

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

A Subscription Message has no element to interact with. `Subscription.emit(message)` feeds a timer tick, WebSocket frame, global listener result, or other Subscription output through update and renders the next view.

::Snippet{name="sceneSubscriptionEmit" label="Subscription emit example"}

Use it only when the Message's cause lives outside the rendered tree. If the Message comes from a button, click the button. That interaction verifies the handler wiring that `emit` would skip. `emit` throws while Commands, Mounts, or unacknowledged unmounts are pending.

## Managed Resources

A [ManagedResource](/core/managed-resources) reports three lifecycle outcomes: acquisition succeeded, acquisition failed, or release completed. The `ManagedResource` steps feed the corresponding hook Message through update.

Drive the Model into the matching state before declaring an outcome. `acquire` and `failAcquire` throw unless `modelToMaybeRequirements` returns `Some`. `release` throws until it returns `None`.

These steps dispatch immediately and leave nothing pending. They are optional because Scene sees update and view, not the application's ManagedResources record. A scene may end while the Model still requests a resource, just as the runtime can wait for its acquire Effect to finish. If a lifecycle step contradicts the Model, it throws immediately.

Pass `acquire` exactly the arguments that `onAcquired` accepts. If `onAcquired` reads the acquired value, the test supplies it. If the hook ignores the value, the test supplies nothing.

::Snippet{name="sceneManagedResourceSteps" label="ManagedResource steps example"}

| Step                                        | Effect                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ManagedResource.acquire(entry, ...args)`   | Feeds `onAcquired(...args)` through update. The Model must request the resource.    |
| `ManagedResource.failAcquire(entry, error)` | Feeds `onAcquireError(error)` through update. The Model must request the resource.  |
| `ManagedResource.release(entry)`            | Feeds `onReleased()` through update. The Model must no longer request the resource. |

Scene does not model a `Some` to structurally different `Some` reacquisition. At runtime, that transition releases and reacquires the resource while the Model continues to request it. There is no Scene step for that transition yet.

## Custom Elements

A [CustomElement](/core/custom-element) maps declared CustomEvents to Messages through its `On*` attributes. `CustomElement.emit(spec, target, eventName, detail)` dispatches one of those events on a rendered element. The spec's event Schemas type the event name and detail.

The target must be in the rendered tree with that event handler attached. A missing element or handler throws.

::Snippet{name="sceneCustomElementEmit" label="CustomElement emit example"}

## OutMessages

When the update under test can return an OutMessage, Scene tracks the optional `outMessage` field. `expectOutMessage(expected)` asserts the emitted value. `expectNoOutMessage()` asserts that the field was absent.

::Snippet{name="sceneOutMessageAssertions" label="OutMessage assertions example"}

Scene replaces the tracked OutMessage after every update. A branch with no `outMessage` clears the previous value, so `expectNoOutMessage()` describes the current transition instead of inheriting an earlier result.

## Submodels with ViewInputs

A Submodel with ViewInputs has a `(model, viewInputs, h)` view. Scene expects `(model, h)`. `withViewInputs(view, defaults)` adapts the view once and returns a factory for Scene views.

::Snippet{name="sceneWithViewInputs" label="withViewInputs example"}

Each test can override any ViewInputs field except `toView`, so values vary while the renderer stays fixed. See `packages/ui/src/slider/scene.test.ts` for a complete example.

## A Complete Scene

Here’s a Scene test for a weather app. The user types a zip code, requests the weather, sees the loading state, and then sees the forecast.

::Snippet{name="sceneWeatherFlow" label="Scene weather example"}

The interactions use a label, a role, and a placeholder. The Command result stays beside the interaction that produced it.

## Story vs Scene

Use Story when the Message sequence and resulting Model are the contract. Use Scene when the interaction and rendered result are the contract. The [Testing overview](/testing) shows where each kind of test belongs in a project.
