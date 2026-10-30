# Scene

## Testing Through the View

`Scene` runs update and view together. It clicks buttons, types into inputs, presses keys, and checks the rendered VNode tree. The view runs after every step, so the test sees both state transitions and their rendered result.

Scene operates on VNodes directly. It needs no DOM, jsdom, or browser.

`scene` takes the same arguments as `story`: the Block's Layer, the root's constructor args when it has any, and then the steps. The Scene starts from the Model the constructor returns and renders it before the first step.

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

Use `Command.keepPending(Definition | instance)` when a Command is still running and the Scene must perform a later interaction or deliver a Message before its result arrives. The matcher must select exactly one pending Command.

::Snippet{name="testingKeepPendingCommand" label="Keep a Command pending across later events"}

The kept Command stays visible to `expectHas`, `expectExact`, and every resolver. `resolveAllExact` still requires the complete pending set, and the Scene fails at the end if the Command is never resolved. `keepPending` only lifts the rule that interactions throw while Commands are pending.

### Resolve and Inspect Commands

::Snippet{name="sceneCommandAssertions" label="Command assertions"}

| Step                                                 | Effect                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Command.argsOf(Def)(pending)`                       | Returns `Some` of the captured args when `pending` came from the Definition, and `None` otherwise. It leaves the pending Command unchanged and does not choose among several matches.                                    |
| `Command.at(path, Def)`                              | Narrows a matcher to the Block instance at `path`: an instance id, or `[collection, key]`. Use it when sibling instances have identical pending Commands.                                                                |
| `Command.resolve(Def, ResultMessage)`                | Resolves the pending Command from the given Definition by feeding `ResultMessage` through update. For a child Block's Command, pass the child’s own result Message; Foldkit routes it back to that instance.             |
| `Command.resolveAll([Def, ResultMessage], ...)`      | Resolves a batch of pending Commands, walking cascades. Each entry resolves exactly one matching dispatch in declaration order and unmatched entries carry forward; compose with Array.makeBy for N identical responses. |
| `Command.resolveAllExact([Def, ResultMessage], ...)` | Resolves a batch and throws unless every listed resolver matches within the call and no actual Commands remain unresolved. Repeated Definition entries consume repeated dispatches in declaration order.                 |
| `Command.expectExact(A, B)`                          | The pending Commands are exactly A and B (order-independent).                                                                                                                                                            |
| `Command.expectHas(A)`                               | A is among the pending Commands (subset check).                                                                                                                                                                          |
| `Command.expectNone()`                               | There are no pending Commands.                                                                                                                                                                                           |
| `Command.keepPending(A)`                             | Lets later Scene Messages arrive while the one exact matching invocation remains pending. Assertions, resolvers, `resolveAllExact`, and final completeness still include it.                                             |

### Match Command Names and Arguments

Prefer `Command.expectExact` as the default. It catches bugs where an interaction produces unexpected Commands. Use `Command.expectHas` when you only care about a subset of the pending Commands.

Each matcher accepts either a Command Definition or a Command instance. A Definition matches any pending Command from that declaration. An instance also checks structurally equal args. Pass a Definition when the test only cares that this Command was dispatched; pass an instance when its args are part of what the test is verifying. `Command.expectExact(FetchWeather({ zipCode: '90210' }))` fails if the runtime dispatched `FetchWeather({ zipCode: '99999' })`, where the same call with just `FetchWeather` would pass.

When a Scene helper needs to read captured args before resolving a Command, use `Command.argsOf` with the Definition. The [Story example](/testing/story#inspect-captured-command-arguments) shows the same helper for both Story and Scene.

## URL Changes

A routed root receives URL changes as Messages, through the `routing.onUrlChange` option of its Program. Scene does not run a Program, so it has no routing configuration. Deliver the URL change Message yourself with `deliver`, and pass the starting URL as the root's `{ url }` constructor arg.

::Snippet{name="sceneNavigation" label="Delivering a URL change"}

Resolving a navigation Command, such as one that pushes a URL, supplies only its completion Message. It does not change the URL or deliver `ChangedUrl`. Deliver that Message as a separate step when the test should continue through the URL change.

`deliver` uses the same boundary as an interaction: resolve pending Commands and Mounts first, or keep one pending with `Command.keepPending`.

## Mounts

Scene follows the renderer's element identity. A Mount starts when Snabbdom inserts its element. While Snabbdom patches that element in place, it keeps the Mount it was inserted with, even if `OnMount` changes or disappears; adding `OnMount` to an already-rendered element does not start a Mount. A Mount ends when its element is removed or replaced, and the test acknowledges that with `Mount.expectEnded`.

This applies to Mounts declared inside `@foldkit/ui` components too. Popovers, dialogs, and other components export their Mount Definitions under their `test` namespaces so a consumer test can name and resolve them.

### Mount Lifecycle Rules

- A patched element keeps its pending or resolved Mount across re-renders. A new element starts a new Mount, even when it has the same Mount Definition.
- Every mount that fires and unmounts during a scene must be acknowledged with `Mount.expectEnded`, even if it was already resolved. `resolve` handles a mount’s result Message; `expectEnded` handles its unmount. Unacknowledged unmounts throw at the end of the scene.
- Same-named Mounts are disambiguated by their current tree order. `Mount.resolve` resolves the first pending Mount; a second call resolves the next. Keyed moves keep each element's Mount with it.
- Interactions throw if there are unresolved mounts or unacknowledged unmounts when they try to dispatch a Message. Same contract as Commands.
- `scene` throws at the end if any mount remains unresolved.

### Resolve and Inspect Mounts

::Snippet{name="sceneMountAssertions" label="Mount assertions"}

| Step                                          | Effect                                                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mount.resolve(Def, ResultMessage)`           | Resolves the first pending Mount from the given Definition by feeding `ResultMessage` through update. For a Mount inside a child Block, pass the child’s own result Message; Foldkit routes it back to that instance. |
| `Mount.resolveAll([Def, ResultMessage], ...)` | Resolves a batch of pending mounts in order.                                                                                                                                                                          |
| `Mount.expectExact(A, B)`                     | The pending mounts are exactly A and B (order-independent).                                                                                                                                                           |
| `Mount.expectHas(A)`                          | A is among the pending mounts.                                                                                                                                                                                        |
| `Mount.expectNone()`                          | There are no pending mounts.                                                                                                                                                                                          |
| `Mount.expectEnded(A)`                        | A's element was removed or replaced. Required for every Mount that fired before its element was removed or replaced, regardless of whether it was resolved first; otherwise the scene throws at the end.              |

UI components export their Mount Definitions as `Popover.test.AnchorPopover`, `Listbox.test.AnchorListbox`, and so on. Resolve them with the result Message from the component's class, such as `Popover.Popover.Message.CompletedAnchorPopover()`.

## Streams and Subscriptions

Scene does not run a Block's `stream` or `subscriptions`. Deliver the Message the source would produce with `deliver`, such as a timer tick or a WebSocket frame. Scene runs update and renders the next view. For a child instance's source, address the Message with `Block.deliver(Child, path, message)`.

::Snippet{name="testingSubscription" label="Delivering a Message a Subscription produces"}

`deliver` does not check whether the Subscription would be running for the current Model. A test can deliver a tick to a stopped timer, which represents a tick that was already on its way when the timer stopped. When the test needs to prove the Subscription is active, assert on the Model or the view that its `dependencies` read.

Use `deliver` only for a Message whose real cause is not a user interaction. If the same Message can come from a button, test that path with `click` so the test exercises the handler wiring. `deliver` throws while Commands, Mounts, or unacknowledged unmounts are pending.

## Custom Elements

A [CustomElement](/core/custom-element) maps declared CustomEvents to Messages through its `On*` attributes. `CustomElement.emit(spec, target, eventName, detail)` dispatches one of those events on a rendered element. The spec's event Schemas type the event name and detail.

The target must be in the rendered tree with that event handler attached. A missing element or handler throws.

::Snippet{name="sceneCustomElementEmit" label="Emitting from a CustomElement"}

## OutMessages

When the Block under test declares an OutMessage, Scene tracks every OutMessage its update returned during the latest step. Make a child Block the root of its own Scene to assert on the OutMessages it reports to its parent. `expectOutMessage(expected)` asserts that the step emitted exactly one. `expectOutMessages(first, second, ...rest)` asserts several in runtime order. `expectNoOutMessage()` asserts that it emitted none.

::Snippet{name="sceneOutMessageAssertions" label="OutMessage assertions"}

A single interaction can drive several updates. A click may invoke a target handler, ancestor handlers, and then a form's submit handler. Scene collects their OutMessages in that same order, and `expectOutMessages` asserts the whole sequence.

Scene replaces the tracked sequence after every step that drives update. A step whose updates omit `outMessage` clears the previous sequence, so `expectNoOutMessage()` describes the current transition instead of inheriting an earlier result. Assertions and other steps that do not drive update leave the sequence in place.

## Blocks with a View Input

A Block whose view takes an input from its parent cannot be the root of a Scene, because nothing would supply that input. Test it through a small test-only parent Block. The parent creates the child in its constructor and renders it with an input built from its own constructor args, so each test passes the input it needs as the Scene's args.

::Snippet{name="sceneWithViewInputs" label="Testing a Block with a view input"}

Keep the child's markup in the child. When the input includes a callback such as `toView`, write it in the test parent the same way the application's parent does, so the test renders the same markup and the same Messages.

## A Complete Scene

Here’s a Scene test for a weather app. The user types a zip code, requests the weather, sees the loading state, and then sees the forecast.

::Snippet{name="sceneWeatherFlow" label="Weather search Scene test"}

The interactions use a label and a role. The Command result stays beside the interaction that produced it.

## Story vs Scene

Use Story when the Message sequence and resulting Model are the contract. Use Scene when the interaction and rendered result are the contract. The [Testing overview](/testing) shows where each kind of test belongs in a project.
