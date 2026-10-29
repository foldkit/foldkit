# Scene

## Testing Through the View

`Scene` runs update and view together. It clicks buttons, types into inputs, presses keys, and checks the rendered VNode tree. The view runs after every step, so the test sees both state transitions and their rendered result.

Scene operates on VNodes directly. It needs no DOM, jsdom, or browser.

Import the steps you need from `foldkit/scene`. Use named imports when the file contains only Scene tests. If a file contains both Story and Scene tests, import the namespaces from `foldkit` so `Story.given` and `Scene.given` stay distinct.

## Locators

### Locator Factories

Locators find elements by role, label, visible text, and other user-facing properties. A `Locator` resolves to one match. Interactions and assertions also accept a raw CSS selector when no accessible query fits.

::Snippet{name="sceneLocators" label="Locator API"}

| Locator                  | Finds                                                                                           | Example                            |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `role(role, options?)`   | Elements by ARIA role (explicit or implicit). Options narrow by accessible name and ARIA state. | `role('button', { name: 'Save' })` |
| `label(text)`            | Form controls by their aria-label or associated \<label> text.                                  | `label('Email')`                   |
| `placeholder(text)`      | Inputs by their placeholder attribute.                                                          | `placeholder('Search...')`         |
| `text(target, options?)` | Elements whose rendered text matches a string or `RegExp`.                                      | `text('Welcome back')`             |
| `altText(text)`          | Images and similar elements by their alt attribute.                                             | `altText('Profile photo')`         |
| `title(text)`            | Elements by their title attribute (tooltip text).                                               | `title('Delete')`                  |
| `testId(id)`             | Elements by data-testid: the escape hatch for tests.                                            | `testId('cart-item-3')`            |
| `displayValue(value)`    | Form controls by their current value.                                                           | `displayValue('US')`               |
| `selector(css)`          | Elements by CSS selector. Use when no accessible query fits.                                    | `selector('.chart-legend')`        |

### Text locators

#### String and Regular Expression Matching

`text` accepts a string or `RegExp`. By default, a string matches either the element's full text or one of its direct text nodes. Pass `{ exact: false }` to find the string anywhere in the element's full text.

A `RegExp` always tests the element's full text, including text from nested elements. The `exact` option has no effect on a `RegExp`. Scene does not trim or normalize the text, and text from hidden descendants still counts.

Scene starts every regular expression match at index zero and leaves the expression's `lastIndex` unchanged. Global and sticky expressions therefore produce the same results every time a query runs.

#### Ancestor and Descendant Matches

When an ancestor and one of its descendants both match, `text` returns the descendant. `all.text` returns both in traversal order. Neither query returns text VNodes.

### The role Locator

`role` is the usual starting point. Its optional second argument narrows the match by accessible name or ARIA state.

::Snippet{name="sceneRole" label="Role locators"}

| Option     | Type                                                            | Matches                                                                                                                                             |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | `string \| RegExp`                                              | Accessible name (aria-label, aria-labelledby, label[for], or text content). Strings match exactly; regular expressions match against the full name. |
| `level`    | `number`                                                        | Heading level (for role: "heading")                                                                                                                 |
| `checked`  | `boolean \| 'mixed'`                                            | aria-checked or the checked attribute                                                                                                               |
| `selected` | `boolean`                                                       | aria-selected                                                                                                                                       |
| `pressed`  | `boolean \| 'mixed'`                                            | aria-pressed                                                                                                                                        |
| `expanded` | `boolean`                                                       | aria-expanded                                                                                                                                       |
| `disabled` | `boolean`                                                       | aria-disabled or the disabled attribute                                                                                                             |
| `current`  | `boolean \| 'page' \| 'step' \| 'location' \| 'date' \| 'time'` | aria-current. `true` matches `"true"` only, `false` matches a missing attribute or `"false"`, and a token matches itself.                           |

### Selector locators

`selector`, `all.selector`, and the selector strings accepted by interactions and assertions query the rendered view rather than a browser DOM. They support this CSS subset:

- A tag name, `#id`, or `.class` matches an element with that tag, id, or class. Tag names are case-sensitive.
- `[attr]`, `[attr="value"]`, and `[attr^="prefix"]` match attributes. Values may use double or single quotes and may contain whitespace.
- `:not(...)` excludes elements matching one compound selector, such as `path[d]:not([d=""])`. Its argument cannot contain a descendant combinator or a selector list. `:not()` can be nested or repeated.
- Whitespace between compound selectors matches descendants, as in `header a`.

Anything else, such as `>`, `,`, or `:first-child`, throws an error that lists this syntax.

### Scoping

`within(parent, child)` scopes a single locator to a parent element. `inside(parent, ...steps)` scopes a whole block of steps. Every assertion or interaction inside the block resolves within the parent’s subtree. Use `within` for one-off scoped queries; use `inside` when several steps share the same scope. Nested `inside` calls compose.

::Snippet{name="sceneScoping" label="Scoped locators"}

### Multi-Match

For lists and repeated elements, the `all.*` factories return every match. Pick one with `first`, `last`, or `nth(index)`, or narrow the set with `filter`.

::Snippet{name="sceneMultiMatch" label="Multiple matches"}

| Filter option | Keeps matches where                                            |
| ------------- | -------------------------------------------------------------- |
| `has`         | The element contains a descendant matching the given Locator   |
| `hasNot`      | The element does not contain a descendant matching the Locator |
| `hasText`     | The element’s text content includes the given substring        |
| `hasNotText`  | The element’s text content does not include the substring      |

## Interactions

### Interaction Steps

An interaction invokes the matched element's event handler. If the handler produces a Message, Scene feeds it through update and renders the next view.

::Snippet{name="sceneInteractions" label="Interactions"}

| Step                                   | Invokes                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `click(target)`                        | `OnClick` (runs target and ancestor handlers until propagation stops)                                                         |
| `doubleClick(target)`                  | `OnDoubleClick` (bubbles to ancestors)                                                                                        |
| `contextMenu(target)`                  | `OnContextMenu` (bubbles to ancestors)                                                                                        |
| `pointerDown(target, options?)`        | `OnPointerDown` with optional `{ pointerType, button, screenX, screenY, clientX, clientY, pointerId }` (bubbles to ancestors) |
| `pointerUp(target, options?)`          | `OnPointerUp` with optional `{ pointerType, screenX, screenY }` (bubbles to ancestors)                                        |
| `hover(target)`                        | `OnMouseEnter` (falls back to `OnMouseOver`)                                                                                  |
| `unhover(target)`                      | `OnMouseLeave` (falls back to `OnMouseOut`)                                                                                   |
| `focus(target)`                        | `OnFocus`                                                                                                                     |
| `blur(target)`                         | `OnBlur`                                                                                                                      |
| `focusEnter(target)`                   | `OnFocusEnter`                                                                                                                |
| `focusLeave(target)`                   | `OnFocusLeave`                                                                                                                |
| `type(target, text)`                   | `OnInput` with the given text                                                                                                 |
| `typeContentEditable(target, text)`    | `OnInput` on a `Contenteditable` host, with the given rendered text                                                           |
| `change(target, value)`                | `OnChange` with the given value, for `<select>` and similar                                                                   |
| `beforeInput(target, inputType, data)` | `OnBeforeInput` or `OnBeforeInputPreventDefault`, with the given `inputType` and `Option` data                                |
| `keydown(target, key, modifiers?)`     | `OnKeyDown` or `OnKeyDownPreventDefault` with optional `{ shiftKey, ctrlKey, altKey, metaKey }`                               |
| `submit(target)`                       | `OnSubmit`                                                                                                                    |

### Input and Inspection Steps

Pass `Option.some(text)` to `beforeInput` for an edit that carries text and `Option.none()` for one that does not, such as a backward deletion.

`tap(fn)` runs a function for side effects (like ad-hoc assertions on raw VNodes or accumulated Commands) without breaking the step chain.

### Click Propagation and Default Actions

`click` keeps default action and propagation separate, like the browser. A target `OnClick` with `propagation: 'Stop'` skips ancestor click handlers but still submits a surrounding form when the clicked element is a submit button. Add `defaultAction: 'Prevent'` to suppress that submission. When neither control is present, Scene dispatches every click Message from the target through its ancestor chain, then dispatches the form's submit Message when applicable.

## Assertions

### Single-Element Assertions

`expect(locator)` creates an inline assertion step against a single element. Every matcher has a `.not` variant that inverts the assertion.

Property, state, and accessibility matchers require the Locator to match an element, including their `.not` variants. Use `.toBeAbsent()` or `.not.toExist()` when the intended assertion is that no element matches.

::Snippet{name="sceneAssertions" label="Assertions"}

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

### Accessible Names and Descriptions

Accessible-name and accessible-description matching excludes hidden descendant content. A hidden node directly referenced by `aria-labelledby` or `aria-describedby` contributes its full subtree text.

### Collection Assertions

For `LocatorAll` (from `all.*`), use `expectAll(locatorAll)` for count-based assertions:

| Matcher           | Asserts that                           |
| ----------------- | -------------------------------------- |
| `.toHaveCount(n)` | The locator matches exactly n elements |
| `.toBeEmpty()`    | The locator matches zero elements      |

## Handled and Ignored Interactions

### Acknowledge Handler Outcomes

Scene makes every fall-through interaction explicit. When a handler runs and returns `Option.none()`, follow the interaction with `expectIgnored()`. When it produces a Message, `expectHandled()` verifies that outcome. If another interaction starts or the scene ends before a fall-through is acknowledged, Scene fails and names the event and target. Each acknowledgement covers one interaction.

### Missing and Ignored Handlers

An element with no handler for that event throws immediately. That is different from a handler that deliberately returns `Option.none()`. For example: a read-only widget may keep its input handler but ignore edits. `expectIgnored()` proves the handler is still present and deliberately inert. `Command.expectNone()` or `expectNoOutMessage()` cannot distinguish that from a deleted handler.

### Prevented Default Actions

Use `expectHandled()` to prove that `h.OnKeyDownPreventDefault` consumed a key. A handled `Space` does not scroll the page, and a handled `Enter` does not submit a surrounding form. This checks the user-facing contract without depending on the Message name.

The outcome belongs to the most recent interaction. `Command.resolve`, `Mount.resolve`, and a plain `expect` do not replace it. Keep `expectHandled()` or `expectIgnored()` next to the interaction it covers.

## Commands

When update returns Commands, Scene keeps them pending until the test supplies their result Messages. Update declares the work. The test declares what happened.

### Pending Command Rules

- Pending Commands accumulate in the order `update` returns them, across as many steps as the test takes.
- Resolving a Command feeds its result Message through `update`; new Commands produced by that update join the pending list.
- `Command.resolveAll` walks cascades within the batch. If resolving Command A produces Command B and B’s resolver is in the same call, B resolves without a separate step.
- `Command.resolveAllExact` walks the same cascades while requiring every listed resolver to match within that call and every actual Command to be resolved.
- Interactions throw if there are unresolved Commands when they try to dispatch a Message.
- `scene` throws at the end if any Command remains unresolved.

Use `Command.keepPending(Definition | instance)` when one ordinary Command is still running and the Scene must perform a later interaction or deliver a Subscription Message before its result arrives. The matcher must select one exact pending invocation. An instance can select its args and bound child occurrence.

::Snippet{name="testingKeepPendingCommand" label="Keep a Command pending across later events"}

The kept Command remains visible to `expectHas`, `expectExact`, and every resolver. `resolveAllExact` still requires the complete pending set, and the Scene still fails at the end until the Command is resolved. The exemption applies only to Scene's boundary check for later Messages; Runtime behavior and the Command value are unchanged.

### Resolve and Inspect Commands

::Snippet{name="sceneCommandAssertions" label="Command assertions"}

| Step                                                 | Effect                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Command.argsOf(Def)(pending)`                       | Projects the exact captured args when `pending` has the Definition's source identity. It returns `Option`, leaves the pending value unchanged, and does not select among matching occurrences.                                                  |
| `Command.resolve(Def, ResultMessage)`                | Resolves the first pending Command from the given Definition by feeding `ResultMessage` through update. For a child Block Command, pass the child’s raw result Message; resolve replays the Command’s own `mapMessages` wrapping automatically. |
| `Command.resolveAll([Def, ResultMessage], ...)`      | Resolves a batch of pending Commands, walking cascades. Each entry resolves exactly one matching dispatch in declaration order and unmatched entries carry forward; compose with Array.makeBy for N identical responses.                        |
| `Command.resolveAllExact([Def, ResultMessage], ...)` | Resolves a batch and throws unless every listed resolver matches within the call and no actual Commands remain unresolved. Repeated Definition entries consume repeated dispatches in declaration order.                                        |
| `Command.expectExact(A, B)`                          | The pending Commands are exactly A and B (order-independent).                                                                                                                                                                                   |
| `Command.expectHas(A)`                               | A is among the pending Commands (subset check).                                                                                                                                                                                                 |
| `Command.expectNone()`                               | There are no pending Commands.                                                                                                                                                                                                                  |
| `Command.keepPending(A)`                             | Lets later Scene Messages arrive while the one exact matching invocation remains pending. Assertions, resolvers, `resolveAllExact`, and final completeness still include it.                                                                    |

### Match Command Names and Arguments

Prefer `Command.expectExact` as the default. It catches bugs where an interaction produces unexpected Commands. Use `Command.expectHas` when you only care about a subset of the pending Commands.

Each matcher accepts either a Command Definition or a Command instance. A Definition matches the originating declaration, including after a Binding qualifies its displayed name. An instance also checks structurally equal args, and a bound instance selects its composition path. Pass a Definition when the test only cares that this Command was dispatched; pass an instance when its args are part of what the test is verifying. `Command.expectExact(FetchWeather({ zipCode: '90210' }))` fails if the runtime dispatched `FetchWeather({ zipCode: '99999' })`, where the same call with just `FetchWeather` would pass.

When a Scene helper needs to read captured args before resolving a Command, use `Command.argsOf` with the original Definition. The [Story example](/testing/story#inspect-captured-command-arguments) shows the same projection over both Story and Scene simulations. Keep occurrence selection explicit; `argsOf` returns every source match when mapped across the pending list.

## Navigation

`Navigation.changedUrl` delivers a URL through the Scene's configured `routing.onUrlChange`. Scene applies the resulting Message through update and renders the next view. Use the same callback or canonical Message constructor that the Program uses.

Inside a Scene test, import the named helpers from `foldkit/scene` and the shown Commands, `Message`, initial Model, update, and view from your search feature. The feature increments its request id when input changes; its URL-change handler returns `FetchSearch`.

::Snippet{name="sceneNavigation" label="Search through URL-change delivery"}

Resolving `ReplaceSearchUrl` supplies its completion Message. It does not execute the navigation Effect or deliver a URL change. The explicit `Navigation.changedUrl` step lets the Scene continue through the routing handler and resulting fetch.

### Pending work

URL delivery uses the same pending-work boundary as an interaction or Subscription emission. Resolve pending Commands and Mounts and acknowledge ended Mounts first. To deliver a URL before a navigation Command completes, use `Command.keepPending` for that exact invocation. The event leaves the Command pending; resolve it afterward. Kept Commands still participate in assertions and final completeness.

Navigation delivery tracks OutMessages and reconciles Mounts through the ordinary Scene machinery. It does not acknowledge an ignored interaction or change the last interaction's handled/ignored outcome.

### URL resolution

Relative references resolve against `http://localhost/` by default, independently of the test host. Set `routing.origin` when origin matters, for example `https://search.example:444`. An origin may have a trailing slash; it must not contain credentials, a path, a query, or a fragment.

Root-relative paths, query references such as `?q=foldkit`, and fragments such as `#results` use that fixed origin root on every step. Absolute URLs retain their own origin. Scene does not remember a current URL or emulate browser history. It rejects invalid URL input and requires routing configuration before navigation steps can be used.

## Mounts

Scene follows the renderer's element identity. A Mount starts when Snabbdom inserts its element. While Snabbdom patches that element in place, it keeps the Mount it was inserted with, even if `OnMount` changes or disappears; adding `OnMount` to an already-rendered element does not start a Mount. A Mount ends when its element is removed or replaced, and the test acknowledges that with `Mount.expectEnded`.

This applies to Mounts declared inside `@foldkit/ui` components too. Popovers, dialogs, and other components expose their original Mount Definitions under their public `test` namespaces so a consumer test can name and resolve them.

### Mount Lifecycle Rules

- A patched element keeps its pending or resolved Mount across re-renders. A new element starts a new Mount, even when it has the same Mount Definition.
- Every mount that fires and unmounts during a scene must be acknowledged with `Mount.expectEnded`, even if it was already resolved. `resolve` handles a mount’s result Message; `expectEnded` handles its unmount. Unacknowledged unmounts throw at the end of the scene.
- Same-named Mounts are disambiguated by their current tree order. `Mount.resolve` resolves the first pending Mount; a second call resolves the next. Keyed moves keep each element's Mount with it.
- Interactions throw if there are unresolved mounts or unacknowledged unmounts when they try to dispatch a Message. Same contract as Commands.
- `scene` throws at the end if any mount remains unresolved.

### Resolve and Inspect Mounts

::Snippet{name="sceneMountAssertions" label="Mount assertions"}

| Step                                          | Effect                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Mount.resolve(Def, ResultMessage)`           | Resolves the first pending Mount from the given Definition by feeding `ResultMessage` through update. For a Mount inside a child Block, resolve replays the boundary lift automatically, so you pass the child’s raw result Message. |
| `Mount.resolveAll([Def, ResultMessage], ...)` | Resolves a batch of pending mounts in order.                                                                                                                                                                                         |
| `Mount.expectExact(A, B)`                     | The pending mounts are exactly A and B (order-independent, by source identity).                                                                                                                                                      |
| `Mount.expectHas(A)`                          | A is among the pending mounts by source identity.                                                                                                                                                                                    |
| `Mount.expectNone()`                          | There are no pending mounts.                                                                                                                                                                                                         |
| `Mount.expectEnded(A)`                        | A's element was removed or replaced. Required for every Mount that fired before its element was removed or replaced, regardless of whether it was resolved first; otherwise the scene throws at the end.                             |

UI components expose their Mount Definitions as `Popover.test.AnchorPopover`, `Listbox.test.AnchorListbox`, and so on. These are the original declarations, so source-identity matching survives placement-qualified runtime names. The [testing migration cookbook](/testing#migrate-an-existing-test-suite) shows the completed Block and public test namespace together.

## Subscriptions

`Subscription.emit` supplies a declared Subscription output, such as a timer tick, WebSocket frame, or global listener result. Register the complete application's Subscriptions in the `scene` config, then pass the exact entry and its raw Message to run update and render the next view. `Scene.subscriptions(ApplicationComposition, localSubscriptions?)` combines the root declarations with the registered children's placement-qualified entries without building Layers or running Streams. A completed feature Block already exposes its complete `.subscriptions` registry. A Scene with no `subscriptions` config accepts no Subscription Message.

::Snippet{name="testingSubscription" label="Emitting declared Subscription Messages"}

Each Subscription entry's `messages` collection is its emission contract. `emit(entry, message)` accepts only a raw Message declared by that registered entry and validates its payload at runtime. An entry with `messages: []` has no Message that Scene can emit.

For a lifted Subscription, pass the child Message. Scene replays the entry's generated delivery through every child boundary before calling the update under test. The entry argument always makes the event source explicit, including when several Subscriptions declare the same Message.

`emit` supplies an output from the registered Subscription graph; it does not check whether the current Model activates the entry. This allows a test to represent an event that was already queued when its Subscription became inactive. Assert activity before emitting when the test needs to prove that the Runtime would be listening.

Use `emit` for a Subscription-origin fact. If the same Message can come from a button or another DOM interaction, use that interaction when testing the DOM-origin path. The interaction verifies the handler wiring that `emit` would skip. `emit` throws while Commands, Mounts, or unacknowledged unmounts are pending.

### Subscription Activity

`Subscription.expectActive(entry)` and `Subscription.expectInactive(entry)` check the entry's [`when` predicate](/core/subscriptions#gating-an-entry-on-the-model), every parent lift gate, and the presence of lifted children against the current Model. Pass the registered entry or its original child entry. Select the bound entry when the same child source has multiple registrations. Entries with `messages: []` can also be inspected.

The assertion checks whether the Model permits the Runtime to run the Stream. It does not build handler Layers, start the Stream, or inspect conditions inside its handler. An ungated entry whose handler returns `Stream.empty` reports active.

## Managed Resources

A [ManagedResource](/core/managed-resources) reports three lifecycle outcomes: acquisition succeeded, acquisition failed, or release completed. The `ManagedResource` steps feed the corresponding hook Message through update.

### Match the Model's Resource State

Drive the Model into the matching state before declaring an outcome. `acquire` and `failAcquire` throw unless `modelToMaybeRequirements` returns `Some`. `release` throws until it returns `None`.

These steps dispatch immediately and leave nothing pending. They are optional because Scene sees update and view, not the application's ManagedResources record. A scene may end while the Model still requests a resource, just as the runtime can wait for its acquire Effect to finish. If a lifecycle step contradicts the Model, it throws immediately.

### Supply Lifecycle Results

Pass `acquire` exactly the arguments that `onAcquired` accepts. If `onAcquired` reads the acquired value, the test supplies it. If the hook ignores the value, the test supplies nothing.

::Snippet{name="sceneManagedResourceSteps" label="ManagedResource steps"}

| Step                                        | Effect                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ManagedResource.acquire(entry, ...args)`   | Feeds `onAcquired(...args)` through update. The Model must request the resource.    |
| `ManagedResource.failAcquire(entry, error)` | Feeds `onAcquireError(error)` through update. The Model must request the resource.  |
| `ManagedResource.release(entry)`            | Feeds `onReleased()` through update. The Model must no longer request the resource. |

Scene does not model a `Some` to structurally different `Some` reacquisition. At runtime, that transition releases and reacquires the resource while the Model continues to request it. There is no Scene step for that transition yet.

## Custom Elements

A [CustomElement](/core/custom-element) maps declared CustomEvents to Messages through its `On*` attributes. `CustomElement.emit(spec, target, eventName, detail)` dispatches one of those events on a rendered element. The spec's event Schemas type the event name and detail.

The target must be in the rendered tree with that event handler attached. A missing element or handler throws.

::Snippet{name="sceneCustomElementEmit" label="Emitting from a CustomElement"}

## OutMessages

When the update under test can return an OutMessage, Scene tracks every OutMessage produced by the latest update-producing step. `expectOutMessage(expected)` asserts that the step emitted exactly one. `expectOutMessages(first, second, ...rest)` asserts several in runtime order. `expectNoOutMessage()` asserts that it emitted none.

::Snippet{name="sceneOutMessageAssertions" label="OutMessage assertions"}

A single interaction can drive several updates. A click may invoke a target handler, ancestor handlers, and then a form's submit handler. Scene collects their OutMessages in that same order.

Scene replaces the tracked sequence after every step that drives update. A step whose updates omit `outMessage` clears the previous sequence, so `expectNoOutMessage()` describes the current transition instead of inheriting an earlier result. Assertions and other steps that do not drive update leave the sequence in place.

## Blocks with ViewInputs

To test a completed UI Block with render inputs, embed it through a local parent Binding and supply those inputs in the parent view. Author the parent view with `makeView.withInputs` when tests need to vary its inputs. `withViewInputs(view, defaults)` adapts that parent-owned view to Scene's `(model, h)` signature.

::Snippet{name="sceneWithViewInputs" label="Testing an embedded Block with view inputs"}

Each test can override the parent view inputs. Keep the embedded Block's `toView` callback in the parent renderer so the same markup and dispatch boundary are used across cases. A feature's own tests may adapt its private authored view directly.

## A Complete Scene

Here’s a Scene test for a weather app. The user types a zip code, requests the weather, sees the loading state, and then sees the forecast.

::Snippet{name="sceneWeatherFlow" label="Weather search Scene test"}

The interactions use a label, a role, and a placeholder. The Command result stays beside the interaction that produced it.

## Story vs Scene

Use Story when the Message sequence and resulting Model are the contract. Use Scene when the interaction and rendered result are the contract. The [Testing overview](/testing) shows where each kind of test belongs in a project.
