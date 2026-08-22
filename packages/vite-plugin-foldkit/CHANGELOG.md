# @foldkit/vite-plugin

## 0.16.2

### Patch Changes

- a477ac8: Speed up callable tagged constructors whose type-side fields can be copied directly, such as primitives, literals, and unions of those identity types. Structs, Arrays, child Messages, checked fields, contextual fields, opaque schemas, oneOf unions, schemas that redefine `_tag`, and other composite fields continue through Schema validation. In a warmed Node 22.22.3 benchmark on Effect 4.0.0-rc.109, `ClickedReset()` fell from 177.8 ns to 30.5 ns per call and `ClickedItem({ id })` fell from 257.5 ns to 73.7 ns per call.

  The Vite plugin now includes SchemaAST in its forced Effect prebundle for this runtime dependency.

  The fast path assumes typed object inputs whose provided payload fields are own data properties. Primitive inputs, payload accessors, and inherited payload fields fall back to Schema validation. Both paths ignore an inherited `_tag`. Calls that bypass TypeScript can now construct eligible variants with wrong primitive field types or missing required fields. Stateful accessor Proxy traps are outside the fast-path equivalence boundary. Decode untrusted input through the Schema as before.

## 0.16.1

### Patch Changes

- f9f2b22: Align the published READMEs with Foldkit's current positioning, terminology, and documentation links. Clarify the Vite plugin's Model-preserving hot reload and hydration build-id guidance.

## 0.16.0

### Minor Changes

- 7dc94b6: Harden experimental server rendering and hydration, and raise the supported Node version.

  Security: the server serializer treated any property named `innerHTML` as trusted raw HTML, so a `CustomElement.define` property (or an internal `Prop({ key: 'innerHTML', value })`) named `innerHTML` could inject markup into a server-rendered page. Provenance is now recorded per property write, so only the value `h.InnerHTML` wrote reaches the raw-HTML sink, and a generic property written after it takes the name over rather than inheriting its trust.

  A custom element's declared properties are client-only in the server HTML, including properties named after a global attribute such as `id`, `title`, `lang`, `dir`, `tabIndex`, `hidden`, `inert`, and `draggable`. They no longer reflect through the native property maps, so component state the view never rendered cannot reach the markup. `h.Id`, `h.Title`, and the other attribute builders set the reflected attribute every element has, and still serialize.

  A plain-text `<noscript>` carrying markup is rejected. With scripting disabled, the state noscript exists for, a browser parses `<noscript>` content as HTML, so a `<` that opens a tag or comment would become live markup for exactly the users noscript targets. Plain text still round-trips; author intended fallback markup with `h.InnerHTML`.

  A rendered root that would not close cleanly is rejected, for renders that are not hydratable as well. An unterminated element inside the root (an unclosed `<textarea>`, `<script>`, comment, or `<plaintext>`, typically from an incomplete `InnerHTML` fragment) would otherwise swallow the Flags payload, the client entry, and the rest of the served document.

  A `<noscript>` that changes the rest of the page when a browser parses it with scripting disabled is rejected. Its content is raw text while scripting is enabled and ordinary HTML when it is not, so fallback markup that leaves a `<form>` or `<table>` open pulls the markup that follows the `<noscript>` inside itself, erasing it for exactly the visitors the fallback was written for. The render is parsed both ways and the trees compared, so this holds for a `<noscript>` that arrives inside an `h.InnerHTML` fragment too.

  A static render is checked against the tree the view wrote, not only a hydratable one. Hydration is what would otherwise rebuild a subtree the parser reshaped, so without it a `<div>` inside a `<p>`, a bare `<tr>` in a `<table>`, or text foster-parented out of one is simply lost with nothing left to notice. The hydration-marker check stays conditional, since only a hydratable render emits a stamp.

  `injectIntoTemplate` parses the finished page, with scripting enabled and disabled, and requires the placeholder's parent to hold exactly what the template and the rendered markup say it should. The rendered root is checked in a neutral context before it reaches a template, which cannot see what happens once it is spliced somewhere with a restrictive content model: a `<form>` root placed inside another `<form>` is dropped outright, a `<table>` foster-parents what it cannot hold, and a subtree can be reshaped below a root that itself survives. The check covers static output too, where a dropped subtree is lost with no hydration to rebuild it, and it identifies the injection by the position its placeholder held, so a second application's root elsewhere in the document is not counted against it.

  The `html` field of a public `RenderedApplication` is validated as protocol data rather than trusted because its TypeScript shape is structurally constructible. Hydratable HTML must parse as exactly one top-level element carrying one nonempty root stamp and build stamp, optionally followed by one matching top-level JSON Flags script. Static HTML may contain one element, text, or comment root, or no body output. Additional top-level text or elements, missing build ownership, ambiguous handoff markers, and source that the parser drops, splits, moves, or reconstructs are refused before insertion. Only the HTML parser's five ASCII whitespace characters are ignorable between top-level nodes; a non-breaking space and other visible Unicode whitespace remain application content and cannot sit outside the owned root.

  Where the placeholder may sit is now stated rather than inferred, and everything outside that set is refused by name. The placeholder must reach `<body>` through flow containers only (`div`, `main`, `section`, `article`, `aside`, `header`, `footer`); a `<form>`, `<table>`, `<select>`, foreign content, or a `<template>`'s content is rejected. Rendered markup that declares a shadow root, through `<template shadowrootmode>` or the older `shadowroot`, is rejected too: a browser turns it into a shadow root while parsing, moving the content out of the light DOM, so the served page and the tree hydration reconciles stop describing the same thing. Attach shadow roots from a custom element instead.

  A view rooted at `<html>`, `<head>`, `<body>`, or `<frameset>` is rejected, for static output as well as hydratable output. A browser builds those elements from the document it parses, so the start tag is dropped, merged, or replaces the body once the rendered markup is spliced into a template, and the served root is never the element the view wrote.

  A rendered `<template>` that declares a shadow root is refused by `renderToString` itself rather than only by `injectIntoTemplate`, so a page that never passes through the injector is covered too. The scan descends into template content and parses with scripting enabled and disabled, so a declaration nested inside an ordinary template, or inside a `<noscript>` where the content is live markup only when scripting is off, is refused as well.

  An `h.InnerHTML` fragment cannot reach outside the application root. An `<html>`, `<head>`, `<body>`, or `<frameset>` tag inside one is not rendered where it is written: a browser merges its attributes onto the page's own elements and hoists its content, so the result is neither the markup the view wrote nor anything the application owns. A fragment parse drops those tags, which is why the check runs against a whole page.

  An `h.InnerHTML` fragment containing any `<script>` is refused during server rendering. A script parsed with the served page and one created by assigning `innerHTML` have different execution and type-specific processing rules, so the two paths cannot be made equivalent by serialization alone. The conservative refusal includes classic and module scripts, import maps, speculation rules, and inert data blocks such as JSON-LD. Build the script as an ordinary view element or place it in the HTML template.

  A live HTML `<base>` element is refused anywhere in rendered application markup, whether declared as a view element or supplied through `h.InnerHTML`, and `injectIntoTemplate` applies the same check to a structurally constructed `RenderedApplication`. A browser applies `<base>` before hydration, including one parsed in body or in a scripting-disabled `<noscript>`, so it can redirect the relative client entry written after the root to another origin. Put `<base>` in the template head under host control. An ordinary inert template may still contain one.

  `xmp`, `noembed`, and `noframes` are treated as raw-text elements, and trusted `h.InnerHTML` inside a `textarea` or `title` is refused when it carries that element's closing sequence, which would end the element and put the rest of the fragment in the document. A carriage return in raw-text or comment content is refused, since neither position has an escape and HTML input preprocessing rewrites it before the tokenizer runs, and an unpaired surrogate is refused anywhere a value is serialized, since encoding the page as UTF-8 replaces it with U+FFFD.

  A view that names two owners for one element's content is refused. `h.InnerHTML` and a client-only custom-element property named `innerHTML` each take the whole of an element's content, so either one conflicts with declared children, a controlled value on a `textarea`, `output`, or `select`, and an element that holds no content at all. Trusted raw HTML disagrees with the server serializer in those combinations, while a client-only property replaces the DOM nodes the differ still expects to patch and leaves their vnodes detached.

  A controlled `h.Value` on a `textarea` or `output` also conflicts with declared children because assigning the value replaces the content those child vnodes describe. These are compatibility changes to the HTML builder itself, not only to server rendering: every refusal happens where the element is built, so a client-only application rendering one of these views now fails there rather than producing markup its next render contradicts.

  A raw `h.Attribute` and a typed builder naming the same attribute are refused. The two are owners of one piece of state and their served form has no source spelling: `h.Attribute('checked', '')` beside `h.Checked(false)` served a checked box the client immediately cleared, and dropping the attribute instead left the served element with `defaultChecked` false where a fresh render parses the attribute and has it true, so `form.reset()`, `:default`, and an attribute selector read the two pages differently. The same held for `disabled`, `open`, `selected`, `muted`, and for a controlled `value` beside a raw one. HTML attribute names are matched ASCII-case-insensitively, so `h.Attribute('MULTIPLE', '')` is the same attribute as `h.Attribute('multiple', '')`.

  A typed reflected builder on an HTML element whose native interface does not own that property remains client-only. For example: `h.Type('button')` in a reusable attribute bundle creates an expando when the consumer spreads it onto a `div`, just as it did before server rendering existed, and the server omits it rather than turning it into live attribute state. Use the typed builder on an element that owns the property when the value must appear in markup, or use `h.Attribute` when a raw attribute is intentional.

  A raw attribute standing on its own still counts. A controlled `<select>` reads a raw `value`, `multiple`, or `size` when deciding which option matches and whether nothing may be selected, with `size` parsed the way a browser parses it: leading whitespace skipped, the leading digit run taken, and a value past the unsigned long range leaving the element on its own default. A select with no options at all may carry a value that matches nothing, since a served empty select and a fresh one both hold no selection.

  The numeric attribute builders refuse values a browser reads differently depending on whether they arrive as parsed markup or as a property assignment. A negative `maxLength` throws on assignment while the attribute parses; `size = 0` throws and falls back to 20 only on an input, while the same value remains valid on a select or horizontal rule; `NaN` and `Infinity` become 0 through the property and the attribute's own default through the parser; and past 2^31 the property conversions wrap while the attribute clamps. This covers `h.Maxlength`, `h.Minlength`, `h.Size`, `h.Cols`, `h.Rows`, `h.Colspan`, `h.Rowspan`, `h.Span`, `h.Start`, and `h.Tabindex`, which takes any integer in the signed long range, and `h.High`, `h.Low`, and `h.Optimum`, which take any finite number.

  A string builder that lands on a numeric property is refused the same way, decided by the element rather than by the builder. `h.Value` is a string on an input and a number on a `<meter>`, a `<progress>`, or an `<li>`, where `0x10` is 16 to a property assignment and invalid to the parser, and a leading `+`, surrounding whitespace, `Infinity`, and an empty string each part the two. `h.Max` and `h.Min` on a meter or progress read the same way.

  A nonempty controlled value on `<input type="file">` is refused. The served attribute is ignored while assigning the property throws `InvalidStateError`, so the view crashed on a fresh render and on hydration. The type is read from `h.Type` or from a raw `type` attribute.

  A typed attribute builder inside SVG or MathML is refused, `h.Attribute` being the mechanism foreign content uses. A foreign element has none of the HTML interface members those builders write except `id`, `tabIndex`, and `autofocus`, which were measured in Chromium to reflect there: `h.Href` on an SVG `<a>` throws on assignment because `SVGAElement.href` is readonly, `h.Title` sets a value no attribute reflects, and server rendering wrote an attribute for both. The serializer no longer emits them for foreign content either.

  Dynamic HTML tag names are normalized to lowercase before element-specific serialization. An uppercase `SELECT` now receives the same controlled-value handling as the `HTMLSelectElement` a fresh client render creates. SVG and MathML tag names remain case-sensitive and must use their canonical spelling. Server rendering refuses a spelling the HTML parser would adjust because `createElementNS` preserves the authored name, and hydration compares foreign tag names exactly.

  The accepted values were measured in Chromium, and `check:dom-state-parity` re-measures them: it serializes each view, applies the same view's attributes and properties to a fresh element the way the client does, and requires the two to agree.

  `h.Style` now has one server and client representation per effective CSS declaration. The builder normalizes camel-case properties, declaration names, `cssFloat`, WebKit-prefixed properties, and custom properties beginning `--`; rejects duplicate aliases, `cssText`, Snabbdom lifecycle controls, non-string values, `!important`, and syntax that can escape into another declaration; and refuses a raw `style` attribute beside it. The client writes and removes only properties the view owns, preserving declarations a Mount or custom element added. Hydration seeds equivalent server declarations so an unchanged page causes no style mutations, while a strict CSP that blocked the parsed style attribute is repaired through property-level CSSOM writes. The server and client promise the same effective declarations, not identical `style` attribute bytes or mutation history.

  Trusted `h.InnerHTML` in a `pre`, `listing`, or `textarea` is always prefixed with one newline, which the document parser then consumes. Checking whether the fragment began with a literal newline missed the ones tokenization produces from a character reference (`&#10;`, `&#xA;`, `&NewLine;`) and from input preprocessing turning CR or CRLF into LF.

  `OPTIONS` reaches the server entry in the Vite dev host and the generated production host alike for application resources. Vite answered every preflight itself, with `Access-Control-Allow-Origin` and `Vary: Origin` headers a deployed host has no counterpart for, so a cross-origin request worked all through development and failed once deployed. A preflight is a question about a resource, so the application answers it: an entry can allow one origin for one route and refuse it for another, which no host-level setting could express. Ownership follows `Access-Control-Request-Method`, so a preflight for an application `POST` reaches the entry even when its path looks like a static asset. An `OPTIONS` request without both `Origin` and `Access-Control-Request-Method` is not a CORS preflight and reaches the entry regardless of its path. The generated entries answer one with 204 and an `Allow` header, and that is where an application's CORS policy goes. Preflights for Vite-owned source modules, assets, the client, and HMR stay under Vite's CORS policy.

  The dev host wraps Vite's installed CORS middleware in place. It observes the response headers that middleware changes, retains them for Vite-owned and proxy-owned responses, and restores application responses to their pre-CORS state before applying the entry's own headers. The application render middleware remains after Vite's source, asset, proxy, and fallback ownership, so Vite keeps the resources it can serve while an application request that falls through reaches the entry with the same CORS boundary as production.

  The methods a host still refuses itself are the ones the WHATWG `Request` constructor rejects: `CONNECT`, `TRACE`, and `TRACK`, answered 405 with `Allow`. Forwarding one turns a malformed request into a 500. On Node only `TRACE` reaches that rule, since the HTTP parser rejects `TRACK` with a 400 before any handler runs and `CONNECT` arrives on its own event. `Server.HOST_METHOD_ANSWERS` is now `{ refusedStatus, allow }`, and `Server.isHostSettledMethod` names those three.

  Two roots stamped with one `runtimeId` are refused, by `injectIntoTemplate` when a page is assembled and by the runtime when one boots. The id pairs a root with its Flags payload and keys the Model and scroll position hot reloading preserves, so a page holding two would have them take each other's state. Hydrating more than one page-owning application is not supported: each rewrites the document's metadata and installs its own navigation listeners.

  Attribute values now escape carriage returns (as `&#13;`, matching text) so a `\r` or `\r\n` round-trips through the HTML parser instead of collapsing to `\n`, and a NUL character in any serialized text or attribute is rejected as unrepresentable rather than silently corrupted.

  A hydration whose root is not in the document rebuilds rather than reusing it. A caller that resolves the stamped root itself can hand over a detached element, and patching one directly let the differ match it by tag and keep it, so a page the build id had just rejected survived with its DOM state intact and the replacement root's Mount never ran.

  A controlled property is reasserted once the element's children exist, not only on a later patch. The props module runs while an element is being created, and a `<select>`'s `value` setter has nothing to match until its `<option>`s are there, so a fresh render left the select on the browser's default while the server, which marks the matching option, served the right one. Both now settle on the Model's value at the same point.

  Controlled `value`, `checked`, `selected`, and `muted` properties synchronize both current and parsed default DOM state. Hydration, a fresh render, `form.reset()`, attribute selectors, and a later transition to uncontrolled children or a raw attribute therefore agree. Removing a reflected typed property restores the browser's native default or the remaining raw attribute instead of leaving the old property value behind. A same-valued client-only property still writes when it takes ownership, after the typed builder's default state is cleared.

  Hydration seeds unchanged reflected typed properties before the props module patches them. It does not rewrite an equivalent parsed attribute, so an unchanged resource URL does not reload an iframe and an unchanged `h.Id` does not invoke an upgraded custom element's `attributeChangedCallback` a second time merely because the element was adopted. Stale live state is still rewritten to the Model. On an autonomous custom element, typed global builders use the native attribute path rather than a component-defined property setter, while properties declared through `CustomElement.define` remain client-only.

  Hydration replaces a Custom Element host when the view declares light DOM as text, children, or trusted `h.InnerHTML`. The new host and its content are built while detached, then connected in the same state as a fresh render. The old host disconnects, and the new host has a new DOM identity. A browser can connect the old element before parsing its server content, and `connectedCallback` can insert and retain a matching node ahead of it. A positional or markup comparison cannot distinguish the component node from the view node. Clearing children in place can also run a child's `disconnectedCallback` while the adopted host is live, allowing it to mutate state hydration already sampled. Hydration takes its final attribute and text snapshot after these planned lifecycle effects. A view that declares no content still adopts the host and preserves component-built light DOM. Component callbacks must keep structural DOM writes within their own host or shadow root; hydration does not reconcile arbitrary structural changes they make to ancestors or siblings.

  Hydration compares trusted `h.InnerHTML` in an inert document and marks an equivalent parsed subtree as already owned before patching. The probe therefore does not upgrade custom elements or run their constructors, and adoption preserves the existing child identities. Fresh creation and a changed value use the native `Element.innerHTML` setter for `h.InnerHTML`; a client-only custom property named `innerHTML` still uses the component's own setter.

  Hydration runs the initial `insert` hooks in the order a fresh render does. The differ fires the hooks of nodes it creates when the patch ends, and hydration fired the adopted ones after that, so a parent that adopted one child and created its sibling ran the sibling's Mount first. A Mount that depends on a sibling being initialized worked on a fresh boot and broke on a hydrated one; now both run children-first in tree order.

  Hydration verifies logical identity, not just position, for the root as well as for every adopted child. A hydratable render stamps a keyed or identity-bearing element with a digest of its key and view identity, which hydration compares and then strips, so a reordered or stale keyed list rebuilds instead of adopting the wrong DOM node and transferring one row's user-typed state to another. The digest keeps raw keys (a row id, an account identifier, an email address) and the build's source paths out of the served markup, distinguishes key types so the number `1` and the string `'1'` never collide, and is emitted only for a hydratable render. An element keyed by a symbol cannot be compared across the server and the client, so a hydratable render refuses it: key hydratable elements by a string or a number.

  Build skew is detectable. Hydration could adopt a stale page's `<input name="email">` for a new build's `<input name="ssn">`, carrying what the visitor typed into a field that means something else. A hydratable render now stamps a build id on the rendered root, and hydration compares it against the client's own before it accesses the Flags payload text or adopts DOM. A page from another deployment is refused: startup stops, and the page is contained so its links, forms, and controls stop responding rather than acting on a deployment whose code is not running.

  This is a breaking change to both entry points. `renderToString` takes a `buildId` and fails with the new `MissingBuildId` when a hydratable render is given none; its options are now a union, so `isHydratable: false` takes no id and every other render requires one. `Runtime.hydrate` requires a non-empty `buildId` and no longer accepts a bare `hydrate(application)`: an absent id would equal the absent marker on a page served before build ids existed, which reads a page from an unknown deployment as one of this build's own. `@foldkit/vite-plugin` compiles the value into application code as `import.meta.env.FOLDKIT_BUILD_ID`, from its new `buildId` option or from the `FOLDKIT_BUILD_ID` environment variable, and the entries pass it along. The standalone `foldkitSsr` export compiles the same value itself, including the fixed development id, rather than relying on the aggregate `foldkit` plugin to have installed a separate define.

  ```ts
  // src/entry.server.ts
  Server.renderToString(config, {
    flags,
    buildId: import.meta.env.FOLDKIT_BUILD_ID,
  })

  // src/entry.ts
  Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
  ```

  The id comes from the deployment and nothing is derived from the project. Foldkit cannot see what decides a view's output (the constants it imports, the configuration it reads, the arguments its caller passes), and a digest of whatever files sit in the project would both miss inputs and turn a value published in the page into an oracle for the secrets among them. Use a value the deployment already has, such as a commit, a release tag, or a container digest, and give the client build and the server build the same one. The id is published in the HTML every visitor receives, so it must never contain a secret, and two deployments must never share one. A render that nothing will hydrate (`isHydratable: false`) needs no id. Only a build takes the id from the deployment. The dev server compiles a fixed one because one live source session supplies both transforms and has no deployment identity to derive.

  The comparison settles before the Flags payload text is accessed, parsed, or decoded, before `init` runs, and so before any Command, Subscription, or ManagedResource this boot would start. A page from another deployment carries that deployment's Flags, which the current Schema may well accept while every value in them means something else, so startup stops rather than reading them. Every hydration refusal contains the page: build skew, a missing, duplicated, malformed, or Schema-incompatible Flags payload, a root stamped more than once, more than one root with no container to choose between them, and a served root that lost its stamp, which is where a generated client lands when neither the stamp nor its `#root` placeholder survives. Containment marks the document's body `inert` and opens a nondismissable modal shield above existing top-layer content, including dialogs in closed shadow roots. The shield takes focus after opening so physical keyboard input cannot target stale body handlers. Author-owned dialogs remain open behind it, and containment itself does not call `close` or dispatch `cancel`. Nothing moves, so no upgraded custom element reconnects and no embedded browsing context reloads. This blocks native page interaction without claiming a script or global-event sandbox: existing capture handlers, browser-generated top-layer events, timers, and stale scripts can still run. A page a server never rendered is left alone, since a missing container there is an application whose element does not exist rather than a handoff to refuse. `MissingBuildId`, `HydratableRenderOptions`, and `StaticRenderOptions` are exported from `foldkit/experimental/server`, and `HydrateOptions` from `foldkit/runtime`. The last two were documented as shipping from there while the packed declarations omitted them; `check:packed-ssr-consumer` now typechecks a consumer that imports every documented type against the packed declarations, which a source path resolves whether or not the barrel re-exports them.

  A view identity carries the module path and function name alone, and a release gate now holds it to that. Mixing a digest of the module's source into one would make a changed view rebuild its own subtree, but the identity is emitted into the client bundle every visitor downloads, so a truncated hash of a whole source file would ship a check against that file's contents: a build that correctly tree-shook a low-entropy server-only value out of the client would still publish a digest of the source that held it, and the value could be recovered by hashing candidates until one matched. `check:packed-ssr-consumer` asserts against a real built bundle that no identity carries one. The deployment's build id is what catches a page from a build whose views mean something else, and it reveals nothing about the source.

  The SSR hosts take the origin they serve from configuration rather than from the request: the generated production host from `ORIGIN` (defaulting to the configured port on localhost), and the Vite dev host from the new `origin` plugin option, defaulting to the origin the dev server itself resolved. An HTTP request target may be an absolute URL or a network-path reference such as `//elsewhere.example/page`, and resolving one of those against the `Host` header hands the server entry an origin the client chose, which an entry that derives redirects, canonical URLs, or tenant selection from `Request.url` would then take from the request. A target that resolves anywhere but the configured origin is refused with 400. The Vite dev host applies the same rule and preserves its configured `base` prefix and the browser's query string when Vite middleware rewrites the internal request path.

  A request target carrying credentials (`http://user:pass@host/page`) is refused with 400. `URL.origin` ignores userinfo, so such a target read as same-origin and then made `new Request(url)` throw, turning a malformed request into a 500.

  A missing static asset returns 404 rather than the application shell. Browsers fetch scripts and stylesheets with `Accept: */*`, which accepts HTML, so a hashed asset from a previous deployment was answered with the shell at 200 and a stale deployment read as a blank page instead of the 404 it is. `Server.classifyRequest` reads the path first and the request's `Sec-Fetch-Dest` second, and a refusal that turned on the header declares it in `Vary` so a cross-site script request cannot seed a shared-cache 404 for a real page. `Server.classifyRequest` reads the path a static file server would resolve, so `/assets/app%2Ejs` is classified as the asset it names rather than as a page. `Server.varyWith` merges a field name into an existing `Vary`. The Vite dev host keeps application responses under application CORS ownership, preserving `Vary` fields contributed by other non-CORS middleware, while Vite's `Vary: Origin` applies only to Vite-owned responses. The generated production host uses the same response helpers.

  `foldkit` now requires Node >= 20.19, the floor its HTML parser dependencies need. This is an intentional breaking change: Node 18 reached end of life in April 2025.

  `@foldkit/vite-plugin` sets its `foldkit` peer floor to `>=0.148.0`, the first release whose server rendering carries these fixes, in place of `^0`, which accepted versions without the server export at all and failed at import. It imports the server API from the explicit `foldkit/experimental/server` subpath, and its own Node engine floor rises to `>=20.19.0` to match the `foldkit` it requires. The plugin receives a minor release so an existing `^0.15.0` consumer stays on the compatible `0.15` line instead of resolving a patch whose Foldkit peer it cannot satisfy. The release workflow no longer broadens the peer floor back to `^0` while versioning, and release gates assert the packed floor and exercise the old and new ranges through a normal npm install.

## 0.15.0

### Minor Changes

- 664a8bd: Add an `ssr` option that serves server-rendered pages from the Vite dev server: `foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })`. With the option set, plain `vite` covers the whole development story. The client entry, HMR, and assets flow through Vite untouched. The plugin loads the server entry through Vite's SSR module loader, converts incoming Node requests to Web `Request` values, and sends the returned Web `Response` with its status, headers, cookies, and body intact. Server-side edits take effect without a restart. No separate dev server process is needed. The server entry fulfils the `EntryModule` contract from `foldkit/experimental`; pass `containerId` when the template's container element is not `id="root"`.

## 0.14.0

### Minor Changes

- da05bfc: Bump Effect to `4.0.0-rc.109` (from `4.0.0-rc.108`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.109`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.109` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.109 @effect/platform-browser@4.0.0-rc.109
  pnpm add -D @effect/vitest@4.0.0-rc.109
  ```

## 0.13.1

### Patch Changes

- ac3a34f: Stop treating page-lifecycle events as a commitment. A page-owning app no longer tears itself down, or reloads itself, on an event the document can survive.

  Fixes an app going permanently blank when the user clicks a download link. `Runtime.run` started the program with `BrowserRuntime.runMain`, which interrupts the runtime on `beforeunload`. Chrome fires `beforeunload` for a click on a download link: it starts a navigation and converts it to a download once it sees the response, so the navigation is abandoned and the document lives on. By then the interrupt had already run the render finalizer, which puts the container element back empty. The file downloaded, the URL never changed, nothing was logged, and the app was gone until a manual reload.

  None of this is specific to Chrome, or to downloads. Browsers fire `beforeunload` when a navigation starts rather than when it commits, so any navigation that does not replace the document leaves the same result. A response that comes back `204 No Content` has the same shape, as does a navigation the user cancels. The download link is the case that was reported.

  `run` now starts the program with a `Runtime.makeRunMain` runner that registers no page-lifecycle interrupt. Error reporting is unchanged. A real navigation still ends the runtime, because the document goes with it.

  **Behavior change:** a page-owning app restored from the browser's back/forward cache no longer reloads the page. The runtime survives the freeze with its Model, its DOM, and its listeners intact, so a back-navigation now returns the app as the user left it, which is what the cache is for. The reload was there to rescue a page the `beforeunload` interrupt had already emptied, and that interrupt is gone. Two things do come back changed: an app that wants fresh data on restore has to ask for it, with a `pageshow` Subscription that dispatches a Message when `persisted` is set, and an app holding its own WebSocket gets it back closed, since the browser closes sockets on the way into the cache.

  One thing goes with the interrupt: a runtime's finalizers, meaning ManagedResource releases and Subscription and Mount teardowns, no longer get a best-effort run when the tab closes or the page navigates away. Nothing promised they would, and upstream calls that interrupt best-effort. An app that flushed state from a release should flush it as the state changes, or from a `pagehide` Subscription.

  The DevTools bridge no longer announces a disconnect on `beforeunload` either. It reported a live app as gone after a download-link click, and the MCP relay ignored that app until the next reload. A page that really goes away closes its Vite HMR socket, and the plugin already prunes the runtime on that close. Because the freeze into the back/forward cache closes that socket too, the bridge now re-announces the connection on a restore, so a resumed app comes back visible to the DevTools MCP tools instead of staying pruned.

  `foldkit` no longer imports `@effect/platform-browser`, so it is dropped from the package's dependencies and from its peer dependencies. Installing `foldkit` no longer asks for it. Apps still need it at the pinned version wherever they use it directly: `@foldkit/devtools` declares it as a peer dependency, and Effect's browser services such as `BrowserKeyValueStore` and `BrowserCrypto` come from it. `@foldkit/vite-plugin` adds `effect/Runtime` to the namespaces it force-includes in Vite's dependency optimizer, so a dev server prebundles what the compiled runtime now references.

## 0.13.0

### Minor Changes

- 3feb9ba: Bump Effect to `4.0.0-rc.108` (from `4.0.0-beta.107`), the first Effect v4 release candidate. Foldkit's peer dependencies now require `effect@4.0.0-rc.108` and `@effect/platform-browser@4.0.0-rc.108`.

  Pin your Effect packages to `4.0.0-rc.108` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.108 @effect/platform-browser@4.0.0-rc.108
  pnpm add -D @effect/vitest@4.0.0-rc.108
  ```

## 0.12.3

### Patch Changes

- 87e9dbf: Bump Effect to `4.0.0-beta.107` (from `4.0.0-beta.106`). Foldkit's peer dependencies now require `effect@4.0.0-beta.107` and `@effect/platform-browser@4.0.0-beta.107`.

  Pin your Effect packages to `4.0.0-beta.107` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.107 @effect/platform-browser@4.0.0-beta.107
  pnpm add -D @effect/vitest@4.0.0-beta.107
  ```

## 0.12.2

### Patch Changes

- 84050fc: Bump Effect to `4.0.0-beta.106` (from `4.0.0-beta.105`). Foldkit's peer dependencies now require `effect@4.0.0-beta.106` and `@effect/platform-browser@4.0.0-beta.106`.

  Pin your Effect packages to `4.0.0-beta.106` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.106 @effect/platform-browser@4.0.0-beta.106
  pnpm add -D @effect/vitest@4.0.0-beta.106
  ```

## 0.12.1

### Patch Changes

- 40ccffe: Bump Effect to `4.0.0-beta.105` (from `4.0.0-beta.103`). Foldkit's peer dependencies now require `effect@4.0.0-beta.105` and `@effect/platform-browser@4.0.0-beta.105`.

  Pin your Effect packages to `4.0.0-beta.105` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.105 @effect/platform-browser@4.0.0-beta.105
  pnpm add -D @effect/vitest@4.0.0-beta.105
  ```

## 0.12.0

### Minor Changes

- c9b3dd3: Let the Foldkit Vite plugin mount the installed DevTools overlay automatically. Development dependencies stay out of production builds, while a regular dependency makes `show: 'Always'` sufficient to include the overlay in production. Keep `@foldkit/devtools` in generated applications' development dependencies.

  Installing `@foldkit/devtools` is now the whole opt-in: an application that never configured `devTools` gets the overlay in development as soon as the package is present. Set `devTools: false` to turn DevTools off, or uninstall the package to drop the overlay alone.

  This removes `DevToolsConfig.overlay`, the `DevToolsOverlay` export from `foldkit/runtime`, and the bare `overlay` export from `@foldkit/devtools`. Remove the overlay import and configuration field when upgrading. The Vite plugin now owns that integration through `@foldkit/devtools/vite`.

  Upgrade `foldkit`, `@foldkit/vite-plugin`, and `@foldkit/devtools` together. The plugin injects the overlay only when the installed `@foldkit/devtools` exposes `@foldkit/devtools/vite`, so an older copy skips the overlay instead of failing the build. Thanks @artile for the report.

  ## Migration

  Drop the `overlay` import and the `overlay` field. The Vite plugin mounts the overlay whenever `@foldkit/devtools` is installed, so `devTools` now carries configuration alone.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      position: 'BottomLeft',
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      position: 'BottomLeft',
    },
  })
  ```

  An application whose only `devTools` field was `overlay` drops the object entirely and still gets the overlay in development.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: { overlay },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
  })
  ```

  Shipping the overlay in production keeps `show: 'Always'` and moves `@foldkit/devtools` from `devDependencies` to `dependencies`. Dependency placement is the build-time boundary, and `show` controls whether the runtime mounts it.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })
  ```

  An application that imported `DevToolsOverlay` from `foldkit/runtime` to type its own wiring no longer needs the type.

### Patch Changes

- c947f47: Bump Effect to `4.0.0-beta.103` (from `4.0.0-beta.102`). Foldkit's peer dependencies now require `effect@4.0.0-beta.103` and `@effect/platform-browser@4.0.0-beta.103`.

  Pin your Effect packages to `4.0.0-beta.103` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.103 @effect/platform-browser@4.0.0-beta.103
  pnpm add -D @effect/vitest@4.0.0-beta.103
  ```

  `SchemaIssue.InvalidValue` dropped its `actual` argument in this Effect release and now takes annotations as its only argument. Decode failures for `CalendarDateFromIsoString` and `Url` are migrated to the new signature and carry their detail on the `message` annotation, which is the key the default formatter reads. Those two failures previously passed their detail as `description`, which the formatter ignored, so the messages now read as intended instead of falling back to a generic one. If you construct `SchemaIssue.InvalidValue` in your own schemas, drop the leading `Option` argument and move any detail to `message`.

## 0.11.3

### Patch Changes

- 1aa5a2d: Force-include `effect/Boolean` in the dep optimizer. Foldkit's compiled dist imports the `Boolean` namespace from bare `'effect'`, so a consumer that never names it in their own source got a prebundled `effect.js` without it and crashed at runtime in dev.

## 0.11.2

### Patch Changes

- d16d7f7: Bump Effect to `4.0.0-beta.102` (from `4.0.0-beta.101`). Foldkit's peer dependencies now require `effect@4.0.0-beta.102` and `@effect/platform-browser@4.0.0-beta.102`.

  Pin your Effect packages to `4.0.0-beta.102` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.102 @effect/platform-browser@4.0.0-beta.102
  pnpm add -D @effect/vitest@4.0.0-beta.102
  ```

- 0a40d2d: Shut the DevTools MCP relay down when the Vite dev server closes in middleware mode, and keep it alive across a dev server restart. The plugin hung its shutdown off `server.httpServer`, which is null when Vite runs as middleware, so with `devToolsMcpPort` set the relay's WebSocket server stayed bound and held the process open. Under Vitest that showed up as a `close timed out after 10000ms` delay on every run. Restarting a dev server also used to kill the relay for the rest of the session, because Vite binds the replacement server's relay while the server it replaces still owns the port, and the resulting `EADDRINUSE` was reported as a conflict with another project. The relay now retries the bind for a few seconds so the port hands over, and a genuine conflict reports the same message once the retries are spent. Binding runs alongside the HMR bridge rather than ahead of it, so a contended port never delays model preservation. Connected MCP clients are terminated as part of shutdown, so no socket the relay opened outlives the server. The MCP server already reconnects on a dropped connection.

## 0.11.1

### Patch Changes

- 95118d8: Bump Effect to `4.0.0-beta.101` (from `4.0.0-beta.97`). Foldkit's peer dependencies now require `effect@4.0.0-beta.101` and `@effect/platform-browser@4.0.0-beta.101`.

  Pin your Effect packages to `4.0.0-beta.101` to match. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.101 @effect/platform-browser@4.0.0-beta.101
  pnpm add -D @effect/vitest@4.0.0-beta.101
  ```

## 0.11.0

### Minor Changes

- 36ae509: Automatic branch identity through an owned differ and view-function branding.

  Foldkit now ships its own differ, forked from snabbdom 3.6.3, with two independent identity axes on every vnode. `key` keeps its one job, matching siblings in dynamic lists. A new framework-managed `identity` field joins the differ's compatibility check exactly where the selector is consulted: when the identity differs, the node is replaced instead of patched, so DOM state (focus, scroll, uncontrolled input values, an open `details` element) no longer bleeds across a logical identity change. Identity never enters the keyed index, and duplicate identities among siblings are harmless because the compatibility check only ever matches compatible vnodes. An explicit key does not override identity: two different view functions sharing a key replace, matching React, where a keyed element of a different component type remounts.

  The Vite plugin brands every function return in application modules with that function's id (module path plus function name) when the returned value is a vnode with no identity yet. Identity therefore attaches at view-function boundaries, where provenance exists at runtime, and never depends on branch syntax: if/else, switch, Effect Match, and ts-pattern all behave identically. Match arms written as inline handlers are covered too, because each handler is its own function. The remaining manual rules are the ones only your data can provide: key dynamic list items by a stable Model identifier, and extract a same-tag inline ternary into named view functions when you want an identity boundary, exactly as in React.

  Builds without the plugin keep the previous positional-plus-key semantics. `create-foldkit-app` ships the plugin by default. The `snabbdom` dependency is gone; the vendored fork lives inside foldkit with its functional changes documented, and a new dependency-free `foldkit/brand` entry hosts the branding helper the plugin injects.

  `@foldkit/ui` and `@foldkit/devtools` now brand their own compiled output at package build time, so their internals carry view-function identity even in consumer apps, where prebuilt dist loads from node_modules beyond the Vite transform's reach. The transform skips already-branded modules. With identity in place everywhere the plugin or the build step reaches, redundant manual branch keys are removed across ui, devtools, the examples, the website, typing-game, and the starter template; the keys that remain are data-borne list and instance keys, which stay yours to write.

  Upgrading an existing app: build with `@foldkit/vite-plugin` (every `create-foldkit-app` project already does; without the plugin everything keeps the previous positional-plus-key behavior, so upgrading is safe either way). Existing manual branch keys and the wrapper elements that exist only to carry them are now redundant and can be deleted whenever convenient. One behavior change to check: a shared key no longer makes two different view functions patch into each other at the same position; they replace, matching React's remount on a changed component type, so if you relied on that continuity, render both states through one view function. `foldkit()` now returns an array of plugins, which `plugins: [foldkit()]` already handles because Vite flattens nested plugin arrays.

  Two kinds of keys stay, and both carry a fact only your data knows. Mapped list items: rows built by one view function are identical to the differ, so key each by its id, `entries.map(entry => h.keyed('li')(entry.id, [], [...]))`, and reordering moves DOM instead of rewriting row contents. And the same situation stretched over time: a detail page renders every article through one `articlePageView(article)` call at the same position, so without a key navigating from one article to the next patches the old page's DOM, scroll position included, into the new one; key the root by what it is showing, `h.keyed('article')(article.slug, ...)`. The keying guide on the website shows both.

### Patch Changes

- 41057af: The view-identity transform no longer un-brands a consumer module whose own path merely contains the `packages/foldkit/` segment (a workspace named `foldkit`, or a vendored fork holding application code). When the installed foldkit package resolves, the plugin's precise package-root gate is authoritative and the coarse path fragment is left to the resolution-failed fallback, so such a module keeps its branch identity instead of silently losing it.

## 0.10.1

### Patch Changes

- 96167d1: Bump Effect to `4.0.0-beta.97` (from `4.0.0-beta.88`). Foldkit's peer dependencies now require `effect@4.0.0-beta.97` and `@effect/platform-browser@4.0.0-beta.97`.

  Consumers should align their Effect packages to `4.0.0-beta.97` exactly during the v4 beta window:

  ```
  pnpm add effect@4.0.0-beta.97 @effect/platform-browser@4.0.0-beta.97
  pnpm add -D @effect/vitest@4.0.0-beta.97
  ```

## 0.10.0

### Minor Changes

- 1795e0e: Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

  Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
  pnpm add -D @effect/vitest@4.0.0-beta.88
  ```

## 0.9.1

### Patch Changes

- 1457f17: Clarify the DevTools MCP port-in-use error by reminding users that changing `devToolsMcpPort` requires setting `FOLDKIT_DEVTOOLS_MCP_PORT` to the same value for the MCP server.

## 0.9.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 7487083: Bump the `ws` dependency from ^8.20.0 to ^8.21.0.

## 0.8.3

### Patch Changes

- 2eec70f: Dedupe `foldkit` and any installed `@foldkit/ui` / `@foldkit/devtools` to a
  single resolved copy via `resolve.dedupe`. Without this, a bundler can load
  `foldkit` more than once (its subpaths split across pre-bundled and source
  copies, or `@foldkit/ui` resolving its own copy). A duplicate instance gives
  foldkit's Schema and tagged-message constructors separate identities, so decode
  and tag matching fail across the boundary. The optional packages are deduped
  only when the consumer has installed them.

## 0.8.2

### Patch Changes

- 9b8d246: Relax the `vite` peer range to `^7.0.0 || ^8.0.0`. The plugin works with vite 7; the previous `^8.0.0` was stricter than necessary.

## 0.8.1

### Patch Changes

- 5a059e7: Sort imports so `@`-scoped packages land in a trailing group after unscoped
  third-party imports. Internal formatting only; no API or behavior change.

## 0.8.0

### Minor Changes

- 575b2ff: Bump Effect to `4.0.0-beta.78` (from `4.0.0-beta.66`). Foldkit's peer dependencies now require `effect@4.0.0-beta.78` and `@effect/platform-browser@4.0.0-beta.78`.

  beta.68 removed `Random.nextUUIDv4`, so the browser examples that generate UUIDs now use the platform-backed `Crypto` service's `randomUUIDv4`. Behavior is unchanged apart from UUIDs now coming from cryptographic platform randomness.

  Consumers should align their Effect packages to `4.0.0-beta.78` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.78 @effect/platform-browser@4.0.0-beta.78
  pnpm add -D @effect/vitest@4.0.0-beta.78
  ```

## 0.7.0

### Minor Changes

- f1d8c31: Republished against foldkit 0.102.0. No source change to the plugin itself, but foldkit's exact-pinned peer dependency means consumers must install matching versions. Pin foldkit and @foldkit/vite-plugin together: this version of @foldkit/vite-plugin expects foldkit 0.102.0 or later.

## 0.6.0

### Minor Changes

- f10dffc: Bump Effect to `4.0.0-beta.66` (from `4.0.0-beta.64`). Foldkit's peer dependencies now require `effect@4.0.0-beta.66` and `@effect/platform-browser@4.0.0-beta.66`.

  beta.66 tightened `Effect.gen`'s `Yieldable` constraint, so an internal call site in `ManagedResource.tag` that yielded a raw `Option` now bridges through `Effect.fromOption`. Behavior is unchanged.

  Consumers should align their Effect packages to `4.0.0-beta.66` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.66 @effect/platform-browser@4.0.0-beta.66
  pnpm add -D @effect/vitest@4.0.0-beta.66
  ```

## 0.5.2

### Patch Changes

- e81110d: Pre-bundle `effect/Scope` so dev mode does not crash on foldkit internals that reference `Scope.Scope` in Effect signatures.

## 0.5.1

### Patch Changes

- dbfb1ec: Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

  Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

  ```bash
  pnpm add effect@4.0.0-beta.64
  pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
  ```

  Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).

## 0.5.0

### Minor Changes

- 61dc3fb: Drop Vite 7 from peer dependencies. The plugin now requires Vite ^8.0.0; consumers on Vite 7 must upgrade.

## 0.4.1

### Patch Changes

- 283f7ac: Fix a per-dispatch latency regression on apps with large Models. The runtime previously called `Schema.toEquivalence(Model)` and `Schema.encodeUnknownSync(Model)` synchronously inside `processMessage` on every dispatch where the model reference changed. Both walk the entire model graph (the structural-equivalence walk has no reference-equality short-circuit at field or element boundaries), so on a model carrying a 10k-item array they cost ~50ms and ~95ms respectively. With both gated only on `currentModel !== nextModel`, every keystroke in a search field whose route lived on the model paid ~140ms of HMR-preservation overhead even with `devTools: false` and `freezeModel: false`.

  The fix drops the structural-equivalence guard (subscribers already dedupe via `Stream.changesWith` on their dependency projections, which is the correct place) and defers the model encoding through a 200ms debounce. A burst of dispatches coalesces into a single encode that runs after the user pauses; a `vite:beforeFullReload` listener flushes the latest pending model synchronously so the plugin still has fresh state before the page reloads. The `PreserveModelMessage` schema gains an optional `isHmrReload` flag the runtime sets to `true` on the flush path, so a fresh entry created during an HMR boundary is correctly marked as eligible for restoration.

  Also fixes a separate latency bug in the message drain loop: `burstStartedAtRef` was reset on every `Effect.forever` iteration, so Command-chained dispatches (each iteration handling a single message) never accumulated enough wall-clock time to exceed `FRAME_BUDGET_MS`, and the runtime never yielded to the browser between batches. A long Command chain would process all messages in one microtask burst with a single render at the end. The drain loop now polls first and only resets the burst timer when `Queue.take` actually blocked (the queue was idle), so the budget accumulates across consecutive batches and the runtime yields once it crosses the 5ms threshold. Cumulative dispatches now visibly stream through the renderer at ~60fps instead of appearing all at once.

- Updated dependencies [283f7ac]
  - foldkit@0.82.8

## 0.4.0

### Minor Changes

- 40f43a9: Foldkit now targets Effect 4. **This is a breaking change.** For Effect 4's own breaking changes (Schema, Stream, Context.Service, etc.), see Effect's release notes.

  ## Upgrade

  ```bash
  pnpm add effect@4.0.0-beta.59 foldkit@latest
  pnpm add -D @foldkit/vite-plugin@latest @foldkit/devtools-mcp@latest
  ```

  Pin `effect` to the exact version foldkit declares (`4.0.0-beta.59`). The pin is intentional during the v4 beta window — letting `effect` drift to a newer beta can break foldkit's runtime until foldkit re-pins.

  ## Foldkit changes

  ### Container element needs an `id`

  The DOM element you pass as `container` to `Runtime.makeProgram` must have a non-empty `id` attribute. `Runtime.run` errors with a clear message if it's missing. Most apps already use `<div id="root"></div>`; if yours doesn't, add an id.

  The id scopes HMR model preservation per-runtime. Foldkit's DevTools overlay manages its own container internally, so it doesn't conflict with your app. If you mount multiple Foldkit runtimes in the same page yourself, give each container a unique id.

  ### `@foldkit/vite-plugin` auto-includes Effect namespaces

  The plugin now adds the full set of `effect/*` namespaces foldkit references to `optimizeDeps.include`. v4 promoted previously nested names (`SchemaIssue`, `SchemaTransformation`, `Result`, `Cause`) to top-level exports that consumers rarely mention by name, and Vite's optimizer scans only your source. Without the force-include, foldkit's transitive imports would be missing from the prebundle and crash at runtime in dev. The plugin handles it transparently — no `optimizeDeps.include` entries needed in your config.

  ### `@foldkit/devtools-mcp` resilience

  The MCP server no longer dies on startup if no Foldkit dev server is running on the relay port. It boots regardless; tool calls return a clear "Not connected to a Foldkit dev server" error string until the relay is reachable. Restarting your dev server no longer requires manually reconnecting the MCP server in your host.

  ### `@foldkit/devtools-mcp` MCP tool registration fixed

  Tool schemas now register correctly with strict MCP hosts (Claude Code, Cursor). Previously the server emitted a wrapper schema that hid `inputSchema.type === "object"` one level too deep, and hosts silently dropped every tool.

  ### `create-foldkit-app` optional flags

  The `--name`, `--example`, and `--package-manager` CLI flags are now optional. Running with no flags drops into an interactive picker for each. Pass any subset of flags to skip the matching prompts.

### Patch Changes

- Updated dependencies [60283c8]
- Updated dependencies [40f43a9]
- Updated dependencies [98519e1]
  - foldkit@0.82.0

## 0.3.2

### Patch Changes

- 7036191: Show a helpful error when the DevTools MCP port is already in use. Previously the relay logged a generic "failed to start" line with the raw `EADDRINUSE` error, which made it hard to tell why an agent could not connect to Foldkit DevTools via MCP. The plugin now explains that another Foldkit project is likely bound to the port, and suggests either stopping that project or setting a different `devToolsMcpPort` in vite config.

  The success log was also moved into the WebSocket server's `listening` event, so "MCP relay listening on ..." no longer prints when the bind ultimately fails.

## 0.3.1

### Patch Changes

- 15d77a6: Broaden the `foldkit` peer dependency from `^0.76.0` to `^0` so future foldkit minor releases don't trigger an unwanted major version cascade in dependent packages. The repo's `version-packages` script now resets these peer dep ranges back to broad form after `changeset version` runs, preventing the narrowing that was causing `onlyUpdatePeerDependentsWhenOutOfRange` to fire on every minor.
- Updated dependencies [c5d56cb]
  - foldkit@0.76.1

## 0.3.0

### Minor Changes

- 6426adb: Add DevTools MCP support so AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP) can connect to a running Foldkit app. Agents read the current Model, list and inspect Message history, replay to past states, and dispatch Messages into the runtime. The runtime's own Message Schema is published as JSON Schema so the agent discovers exactly what it can dispatch, and every payload is validated against the Schema before reaching the update loop.

  ## Migration

  The `devtools` config field on `Runtime.makeProgram` is now `devTools` (capital T). Type `DevtoolsConfig` is now `DevToolsConfig`.

  ```diff
   Runtime.makeProgram({
  -  devtools: { position: 'BottomRight' },
  +  devTools: { position: 'BottomRight' },
   })
  ```

  If you import the type directly:

  ```diff
  -import type { DevtoolsConfig } from 'foldkit'
  +import type { DevToolsConfig } from 'foldkit'
  ```

  ## What's new
  - **`foldkit/devtools-protocol`** (new entry point) exposes the typed `Request`/`Response`/`Event` Schemas and a browser-side WebSocket bridge that streams DevTools store updates to the relay.
  - **`DevToolsConfig.Message`** is a new optional field. When set to your app's `Message` Schema, the runtime publishes it as JSON Schema to the agent and validates every dispatched payload against it before reaching the update loop. Without it, dispatch is rejected; the read-only tools still work.
  - **`@foldkit/vite-plugin`** accepts a new `devToolsMcpPort` option. When set, the plugin opens a WebSocket relay on that port that forwards traffic between connected browser tabs and any external MCP client. Without it, HMR behavior is unchanged. The relay only runs at dev time; production builds never include it.
  - **`@foldkit/devtools-mcp`** is a new package: an MCP server that runs as a Node child process spawned by your AI agent. Run `npx @foldkit/devtools-mcp init` in your project root to register it. See [foldkit.dev/ai/mcp](https://foldkit.dev/ai/mcp) for the full guide.
  - **`create-foldkit-app`** scaffolds new projects with `@foldkit/devtools-mcp` installed as a dev dependency, a `.mcp.json` registering the server, and a `vite.config.ts` that passes `devToolsMcpPort: 9988` to the Foldkit plugin.

### Patch Changes

- Updated dependencies [6426adb]
  - foldkit@0.76.0

## 0.2.4

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.2.3

### Patch Changes

- 6b6895d: Skip full-reload for file changes outside the module graph (e.g. editor temp files, MCP tool logs) by checking the `modules` array before sending the reload signal.

## 0.2.2

### Patch Changes

- 4b81a10: Update GitHub URL from `devinjameson/foldkit` to `foldkit/foldkit` following org transfer.
