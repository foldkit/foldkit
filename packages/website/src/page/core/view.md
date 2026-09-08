# View

## Model In, HTML Out {#overview}

The view function turns the Model into HTML. Given the same Model, it produces the same output. It does not modify state or run Effects.

Event attributes complete the loop. They produce Messages for the runtime to dispatch, and update decides what those Messages mean. The view remains a pure description of what the user should see and which facts an interaction can report.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), view is the meal on the table. The Model records the current facts; view presents them.

::Snippet{name="counterView" label="view example"}

:::Info{label="No hook rules"}
React functional components can hold local state and run effects through hooks, which introduces ordering rules. A Foldkit view has neither hooks nor local state. It is a function from Model to Html.
:::

## The Document

A `makeApplication` view returns a `Document`, not bare HTML. The Document contains the body to patch into the application container and the document-level state that should track the Model.

| Field       | Type                       | Required | What the runtime does with it                                                                  |
| ----------- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `title`     | `string`                   | Yes      | Writes it to `document.title`, so the browser tab tracks the current page.                     |
| `body`      | `Html`                     | Yes      | Patches it into the application container.                                                     |
| `lang`      | `string`                   | No       | Syncs it to `lang` on `<html>`. Omit it and the current value stands.                          |
| `dir`       | `'Ltr' \| 'Rtl' \| 'Auto'` | No       | Syncs it to `dir` on `<html>`, lowercased. Omit it and the current value stands.               |
| `canonical` | `string`                   | No       | Syncs it to `<link rel="canonical">`, creating the tag if absent. Defaults to the current URL. |
| `ogUrl`     | `string`                   | No       | Syncs it to `<meta property="og:url">`, creating the tag if absent. Defaults to `canonical`.   |

Every field is a function of the Model, just like `body`. There is no imperative `setTitle` or separate head-management API. Return the values you want, and the runtime makes the document match after each render.

A `makeElement` view returns `Html` directly. An embedded app does not own the page, so it cannot declare the title or document metadata. Everything outside this section applies to both kinds of view. See [Runtime](/core/runtime#make-element) for when to use each one.

### Language and Direction

`lang` and `dir` sync to the `<html>` element. Drive them from the Model when the application can switch languages at runtime, just as `title` tracks the current page.

::Snippet{name="documentLanguage" label="Localized document example"}

`dir` accepts `'Ltr'`, `'Rtl'`, or `'Auto'`. The runtime writes the corresponding lowercase attribute value. `Auto` delegates to the browser's first-strong-character heuristic. If the Model stores direction rather than deriving it, use the `TextDirection` Schema exported by `foldkit/html`.

Neither field has a default. If view omits one, the runtime leaves the existing attribute alone. An application that never sets `lang` therefore keeps the value from `index.html`.

The runtime can only synchronize these fields after the first render. Served HTML still determines what a crawler sees on first paint. If language is known per request, stamp `<html lang>` into the HTML shell and let the runtime keep it current after startup. Use the `Lang` attribute on an individual element when only one passage differs from the page language.

### Canonical and Share URLs

`canonical` and `ogUrl` keep `<link rel="canonical">` and `<meta property="og:url">` current as the route changes. If both are omitted, they resolve to the current URL. If only `canonical` is set, `ogUrl` uses the same value.

Set them explicitly when the address bar does not identify the page you want indexed or shared. For example: later pages in a paginated list may point to the first page as canonical.

On a server render, the default is the full request URL, including its query string. Set `canonical` explicitly when a query parameter is not part of the page's identity, such as a tracking parameter or session token. Otherwise, a crawler can treat each query variant as a separate canonical page.

## Typed HTML Helpers

Every view receives `h`, an `HtmlBuilder` typed to the application's Message union. Elements, attributes, and handlers all come from this builder:

::Snippet{name="htmlHelpers" label="HTML helpers example"}

The Message type follows the builder. If `h.OnClick` receives a Message outside the application union, TypeScript rejects it. The root runtime supplies its builder, and `Submodel.defineView` supplies one for each child view.

Element builders that accept children take attributes first and optional children second. Omit the children argument when there are no children: `h.div([h.Class('divider')])`. Attributes remain required, so `h.div([])` represents an element with neither attributes nor children. `h.keyed` follows the element's rule, with the key before the attributes and children. Void elements such as `h.img` and `h.br` accept attributes only. A textarea is not void, but `h.textarea` and `h.keyed('textarea')` also accept attributes only; set their live content with `h.Value`, never children or `h.InnerHTML`. The `foldkit/no-empty-children-array` [lint rule](/tooling/oxlint-plugin#no-empty-children-array) catches a trailing `[]` that carries no information.

Application code cannot construct a builder. It only enters through a view parameter, which keeps its Message type aligned with the boundary that dispatches its handlers. Extracted view helpers should take `h: HtmlBuilder<Message>` as their last parameter. A helper that works under any parent can introduce a `ParentMessage` generic and accept `h: HtmlBuilder<ParentMessage>`.

At module scope, where no view builder exists, `foldkit/html` exports `inertHtml`. It is an `HtmlBuilder<never>`, so it can build elements and styling attributes but cannot express a Foldkit event handler. Its `Attribute<never>` values can be used with any Message type, which lets a library publish reusable, handler-free attribute bundles. Import it as `ih` to distinguish it from the live builder passed to view. Markup built with `ih` may still vary with runtime data; inert means that it cannot dispatch a Message. Inside a view, use the builder supplied to that view.

Inert HTML is inert to Foldkit dispatch, not to the browser. A raw DOM attribute can still trigger browser behavior. The [crash view](/core/crash-view), for example, uses `h.Attribute('onclick', 'location.reload()')` because its `HtmlBuilder<never>` cannot dispatch into a stopped update loop.

:::Warning{label="Raw HTML, script sources, and script attributes need trusted content"}
Several inputs run whatever you pass them, in the browser and in server-rendered HTML alike, and Foldkit does not sanitize them:

- `h.InnerHTML` and `h.Srcdoc` render their strings as raw HTML.
- A property named `innerHTML` from `CustomElement.define` writes raw HTML when the client assigns it, even though server rendering does not serialize that property.
- `h.Attribute` writes a raw DOM attribute, including URL and event-handler attributes, without the sanitization a typed builder may apply.
- A raw `onclick`-style attribute runs its string as script.
- Text or `h.InnerHTML` inside a `script` or `style` element is emitted as trusted raw-text content. Script content executes, and style content can load resources and change the page.
- The `src` of a `<script>` or `<iframe>`, and the `data` of an `<object>`, load and run whatever they point at, an `http(s)` or `data:` URL included.

Only ever pass content you control to these. A value built from user input, a URL parameter, or an API response is a cross-site scripting vector here, so build the markup from trusted inputs, or use `h` elements instead of raw HTML.
:::

`h.Href`, `h.Src`, `h.Action`, and `h.Formaction` neutralize a `javascript:` or `vbscript:` URL (control-character obfuscation included) to an empty value, which stops the classic scheme-based injection on a link or form. That is a safety net, not a guarantee that any URL is safe: a `<script>` or `<iframe>` still runs an `http(s)` or `data:` source it is handed, so a URL that loads code must be trusted content like the sinks above.

## Event Handling

Event attributes return Messages instead of mutating state. Pass a Message directly for a simple event, or use a function that translates event data into a Message:

::Snippet{name="eventHandling" label="event handling example"}

`h.OnClick` takes a Message. `h.OnInput` takes a function because the input value becomes part of the Message. Both remain declarative: view reports what happened, and update decides what follows.

Clicks allow the browser default and bubble to ancestors unless you say otherwise. Pass a second argument when the view owns either part of that browser contract. For example, an expand button inside a clickable tree row can use `{ defaultAction: 'Prevent', propagation: 'Stop' }`. The button dispatches its expansion Message without also dispatching the row's selection Message. The controls are independent, so use either one or both.

## Complex Handlers

A handler can do more than return a one-line Message. The constraint is purity, not size. It may branch on event data, read Model-derived state from view scope, and return `Option<Message>` when only some events should dispatch:

::Snippet{name="eventHandlingComplex" label="complex handler example"}

For `OnKeyDownPreventDefault`, returning `Some` claims the key. Foldkit suppresses the browser's default action and dispatches the Message. Returning `None` leaves the key to the browser.

Handlers never run Effects or decide consequences. The example classifies Enter with an active result as `SelectedResult`; update decides what selection changes. When a translator grows, extract it to a named pure function and pass that function to the attribute.

## Focus Regions

Use `OnFocusEnter` and `OnFocusLeave` when several elements share one focus state. Put both attributes on their common ancestor. Foldkit dispatches when focus crosses that ancestor's boundary and ignores moves between its descendants.

Imagine a text editor and its formatting toolbar. Focusing the editor dispatches `EnteredEditorRegion`. Moving from the editor into a toolbar button dispatches nothing, so the toolbar stays visible. Moving from either one to an element outside the region dispatches `LeftEditorRegion`.

::Snippet{name="eventHandlingFocusBoundary" label="Focus region example"}

The attributes use the bubbling `focusin` and `focusout` events, so the common ancestor does not need a `tabindex`. Foldkit reads the related target and performs the containment check inside its own event handler. View code receives no DOM event or element.

These attributes report transitions only after their listeners attach. Hydration preserves focus on an adopted element, but Foldkit does not invent an `OnFocusEnter` Message for an earlier event it did not observe. Use `:focus-within` when focus only affects presentation. If Model state must reflect focus that may already exist during hydration, reconcile `document.activeElement` from a Mount after the element exists.

## Event Handler Side Effects

Most side effects can run after the browser event returns, through a Command, Subscription, or Mount. A few browser APIs only work synchronously inside the originating user gesture. Foldkit exposes dedicated attributes for those cases, so the framework still owns the effect and the view callback stays pure.

Two constraints account for most uses. `event.preventDefault()` must run before the browser commits its default action. On iOS Safari, `.focus()` must run during the gesture to open the on-screen keyboard.

`OnClick` accepts `defaultAction`, `propagation`, and `focusSelector` controls. Foldkit applies them synchronously before dispatching the Message. `OnKeyDownPreventDefault` lets a translator decide whether to claim a key event. `OnPastePreventDefault` passes the clipboard's `text/plain` payload to its translator; `Some` suppresses the default insertion and dispatches the Message, while `None` leaves the paste alone. `OnCopyText` and `OnCutText` write Model-derived text to the clipboard and suppress the browser's default payload; the cut variant also dispatches a Message.

::Snippet{name="eventHandlerSideEffects" label="event handler side effects example"}

The iOS keyboard case has one extra constraint: the target must already exist when the user taps. An input inside a closed dialog does not. Keep an always-present, visually hidden text input as a keyboard warmup and pass its selector as `focusSelector` to `OnClick`. The same attribute dispatches the Message that opens the dialog. Update can then return a `Dom.focus` Command to move focus to the real input after it mounts, while iOS keeps the keyboard open.

These controls and attributes are narrow browser-integration primitives, not a general escape hatch. Use them only when the browser requires synchronous work inside a gesture. Anything that can wait belongs in the normal lifecycle, usually a Command.

The basic loop is now complete: a Message reaches update, update returns a Model, and view renders it. The next step is side effects. [Commands](/core/commands) describe one-shot work for the runtime to execute.
