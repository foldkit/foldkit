# Oxlint Plugin

## Foldkit Rules {#overview}

Foldkit projects use `oxlint` for general linting and `@foldkit/oxlint-plugin` for architecture and API conventions specific to Foldkit.

## Scaffolded Projects

[Create Foldkit app](/get-started) includes `.oxlintrc.json`, a `lint` script, `oxlint`, and `@foldkit/oxlint-plugin`. Generated projects extend the recommended Foldkit preset:

::Snippet{name="oxlintConfig" label="Configuration for oxlint"}

Override an individual rule in the project's `rules` block when an application needs a narrower policy. The complete rule set is grouped by the part of the architecture it protects below.

The scaffold also includes `.oxlintrc.effect.json`, `@effect/tsgo`, and `oxlint-tsgolint`. The `lint` script runs Effect's type-aware correctness rules after the Foldkit rules and treats warnings as failures.

## Effect Imports

### foldkit/prefer-effect-module-names {#prefer-effect-module-names}

The recommended and all presets require PascalCase modules imported from `effect` to keep their exported names. Write `import { Match, Schema, String } from 'effect'`, not abbreviated or trailing-underscore aliases such as `Match as M`, `Schema as S`, or `String as String_`.

When an Effect module shares a name with a JavaScript or TypeScript global, keep the Effect import unchanged and qualify the global through `globalThis`, such as `globalThis.String`, `globalThis.Array`, or `globalThis.Record`. If an existing local or public binding must retain the module name, give the Effect import an explicit prefix such as `Order as EffectOrder`. Aliases for lowercase functions and type-only imports remain valid.

#### Automatic Fixes

The rule safely fixes a binding and its references when the exported name is available. It reports without fixing when a rename could change binding resolution, compete with another alias for the same exported name, change an object shorthand key or named re-export, or discard a comment in the import specifier.

#### Disabling the Rule

Disable the rule when a project deliberately keeps Effect module aliases:

::Snippet{name="lintDisableEffectModuleNames" label="Disabling one Oxlint rule"}

## Server Portability

### foldkit/no-nonportable-server-globals {#no-nonportable-server-globals}

The recommended and all presets enable this rule in `entry.server.ts`, `entry.server.tsx`, TypeScript files under a `server` directory, and `prerender.ts` or `prerender.tsx`. Test files, fixtures, and files under `test`, `tests`, or `fixtures` directories are excluded.

The rule catches direct runtime reads of common browser-only globals: `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. It also catches static property reads and destructuring from the global `globalThis` object.

#### Exceptions and Limits

Local bindings, parameters, and type-only `typeof` queries remain valid. `Request`, `Response`, `Headers`, `fetch`, and `URL` remain available for host code. A host-specific file can use an Oxlint disable comment or a narrower config override when it deliberately depends on one deployment target.

This rule is a portability guardrail, not a security boundary or an exhaustive catalog of browser APIs. It does not follow aliases, resolve dynamic property names, inspect dependencies, or match filenames outside the patterns above.

## Message Naming and Construction {#message-rules}

### foldkit/no-noop-message {#no-noop-message}

Rejects catch-all Messages that make update branches and traces less meaningful. Name the event that happened instead.

::Snippet{name="lintNoNoopMessage" label="Rule: foldkit/no-noop-message"}

### foldkit/no-empty-object-tagged-call {#no-empty-object-tagged-call}

Catches no-field variants called with an unnecessary empty object. The rule recognizes namespaces whose names end in Message, Route, or State, plus unions declared in the same file with Foldkit's union helpers. Call those constructors with no arguments.

::Snippet{name="lintNoEmptyObjectTaggedCall" label="Rule: foldkit/no-empty-object-tagged-call"}

### foldkit/prefer-callable-message-constructor {#prefer-callable-message-constructor}

Prevents constructing Messages by typing or casting object literals. Use the callable Schema constructor instead.

::Snippet{name="lintPreferCallableMessageConstructor" label="Rule: foldkit/prefer-callable-message-constructor"}

## Command Shape {#command-rules}

### foldkit/command-define-pascal-const {#command-define-pascal-const}

Requires a `Command.define(...)` declaration to use a nonempty PascalCase `const` whose name matches the declared Command name.

::Snippet{name="lintCommandDefinePascalConst" label="Rule: foldkit/command-define-pascal-const"}

### foldkit/no-hand-rolled-command-struct {#no-hand-rolled-command-struct}

Rejects Command structs assembled by hand. `Command.define` attaches the identity, args, and tracing metadata a plain object literal skips. Declare the Command, list it under the Block's `Command`, and implement it under the constructor's `commands`.

::Snippet{name="lintNoHandRolledCommandStruct" label="Rule: foldkit/no-hand-rolled-command-struct"}

## Commands and Effects {#command-effect-rules}

### foldkit/acquire-release-constructs-in-acquire-body {#acquire-release-constructs-in-acquire-body}

Requires the acquire Effect passed to `Effect.acquireRelease` to construct its resource lazily. Returning a handle captured from an outer binding, or wrapping an eagerly constructed resource in `Effect.succeed`, leaves a window where interruption can leak the resource before its release action is registered.

The Effect type tracks the resource value, failure, and requirements, but not whether the resource was constructed before the acquire Effect began. That timing distinction cannot be enforced by the `Effect.acquireRelease` API or TypeScript alone, so the lint rule checks the construction shape.

::Snippet{name="lintAcquireReleaseConstructsInAcquireBody" label="Rule: foldkit/acquire-release-constructs-in-acquire-body"}

### foldkit/prefer-command-mapmessage {#prefer-command-mapmessage}

Lifts a Command result Message with `Command.mapMessage` or `Command.mapMessages`, not by mapping the Effect inside `Command.mapEffect`. Mapping the Effect dispatches correctly in production but records nothing on the message-mapping chain, so Story and Scene `resolve` see the original Message. A child instance's Commands already route their results back to that child; this rule applies to explicit Message transformations within a Block or a standalone utility.

`Command.mapEffect` is appropriate when the result Message stays the same and the Effect's execution changes, such as providing a service, adding retry or delay behavior, or changing its error or requirement channel. Its type preserves the result Message; use the Message-specific helpers when the result itself changes.

::Snippet{name="lintPreferCommandMapmessage" label="Rule: foldkit/prefer-command-mapmessage"}

## Model Updates {#model-update-rules}

### foldkit/no-empty-commands-array {#no-empty-commands-array}

#### Reported Shape

Catches a literal empty array assigned to `commands`. An update handler or Step omits `commands` when it statically has no Commands. Computed collections remain valid, as does `commands: optionalCommands ?? []` where the next operation requires an array.

#### Fixing Empty Commands

The rule can remove the property when doing so will not disturb comments, spreads, or duplicate `commands` keys. It still reports the unsafe cases without a fix.

#### Syntax Scope

This is a syntax-only rule. It flags any literal property named `commands`, even when the object is unrelated to an update result. If `commands: []` is genuine domain data, suppress the rule on that property with `// oxlint-disable-next-line foldkit/no-empty-commands-array`.

::Snippet{name="lintNoEmptyCommandsArray" label="Rule: foldkit/no-empty-commands-array"}

### foldkit/no-spread-in-modify-fields {#no-spread-in-modify-fields}

Rejects object spreads inside a modifyFields updater. Evolve nested fields with a nested modifyFields instead.

::Snippet{name="lintNoSpreadInModifyFields" label="Rule: foldkit/no-spread-in-modify-fields"}

## State Modeling {#state-modeling-rules}

### foldkit/no-switch-on-message-tag {#no-switch-on-message-tag}

Rejects a `switch` on a Message or state `_tag`. Use the tagged union’s `match` helper for exhaustive dispatch, or Effect `Match` when the union has no matcher, so adding a variant produces a type error instead of a silent fall-through. Matchers are also the idiomatic Foldkit form: they organize behavior around named variants and keep low-level `_tag` branching out of application logic.

::Snippet{name="lintNoSwitchOnMessageTag" label="Rule: foldkit/no-switch-on-message-tag"}

### foldkit/prefer-option-over-nullable-in-model {#prefer-option-over-nullable-in-model}

Requires a direct field in the `Model` Schema to represent absence with `Schema.Option`, not a nullable, undefined, or optional Schema field. The rule stays scoped to `const Model = Schema.Struct({...})`, leaving wire and API Schemas free to preserve nullable input formats.

::Snippet{name="lintPreferOptionOverNullableInModel" label="Rule: foldkit/prefer-option-over-nullable-in-model"}

## Routing {#routing-rules}

### foldkit/no-hardcoded-route-strings {#no-hardcoded-route-strings}

Rejects hardcoded path and URL strings passed to link and navigation helpers. Build them from the Route module so they stay in sync with the routes.

::Snippet{name="lintNoHardcodedRouteStrings" label="Rule: foldkit/no-hardcoded-route-strings"}

### foldkit/no-route-query-constructor-default {#no-route-query-constructor-default}

Rejects `Schema.withConstructorDefault` inside `Route.query`. Constructor defaults run only when a Schema constructs a value with `make`; route query parameters are decoded and encoded, so the annotation does not supply a default for a missing parameter. Use `Schema.withDecodingDefaultKey` when an absent key should decode to a value, or `Schema.OptionFromOptional` when absence belongs in the Route.

::Snippet{name="lintNoRouteQueryConstructorDefault" label="Rule: foldkit/no-route-query-constructor-default"}

## View Keying and Accessibility {#view-rules}

### foldkit/no-array-index-view-keys {#no-array-index-view-keys}

Rejects the array index as a view key, and as the key passed to a keyed instance factory from `yield* Child.each('field', args)`. Key by a stable Model identifier, or reordering the list patches the wrong rows and attaches state to the wrong instances.

::Snippet{name="lintNoArrayIndexViewKeys" label="Rule: foldkit/no-array-index-view-keys"}

### foldkit/keyed-required-for-mapped-rows {#keyed-required-for-mapped-rows}

Requires an identity-bearing mapped row element to be wrapped in keyed, so the runtime patches the right rows when the list reorders or shrinks.

::Snippet{name="lintKeyedRequiredForMappedRows" label="Rule: foldkit/keyed-required-for-mapped-rows"}

### foldkit/require-rel-for-external-link {#require-rel-for-external-link}

Requires target="\_blank" links to carry a rel with noopener or noreferrer.

::Snippet{name="lintRequireRelForExternalLink" label="Rule: foldkit/require-rel-for-external-link"}

### foldkit/no-raw-dom-event-attributes {#no-raw-dom-event-attributes}

Rejects raw DOM event attributes. Use the typed event helpers so handlers dispatch Messages through the runtime.

::Snippet{name="lintNoRawDomEventAttributes" label="Rule: foldkit/no-raw-dom-event-attributes"}

### foldkit/no-empty-children-array {#no-empty-children-array}

Catches an inline empty array in the children slot, on element builders and on keyed. The argument is optional, so an element with no children omits it. The shorter form needs the Foldkit release that made children optional, so bump `foldkit` alongside the plugin.

::Snippet{name="lintNoEmptyChildrenArray" label="Rule: foldkit/no-empty-children-array"}

## Purity Boundaries {#purity-rules}

### foldkit/no-prevent-default-in-stream-operator {#no-prevent-default-in-stream-operator}

#### Why Downstream Cancellation Is Late

Flags `preventDefault()` inside callbacks passed to `Stream.map`, `Stream.mapEffect`, `Stream.filterMap`, `Stream.filterMapEffect`, `Stream.filter`, `Stream.filterEffect`, or `Stream.tap`. A DOM event placed into a callback-backed Stream is queued before downstream operators run, so cancellation there happens after the native listener returns and may be too late for the browser.

#### Synchronous Cancellation

Use [`Dom.streamFromEventFilterMapPreventDefault`](/core/dom#filtered-events-and-synchronous-cancellation) instead. Its `filterMapEvent` mapper returns `Option.some(value)` for a handled event or `Option.none()` for an event the browser should handle normally. Foldkit calls `preventDefault()` for handled events before the native listener returns.

#### Static Analysis Scope

The rule recognizes inline callbacks and functions declared in the same module. It is intentionally conservative about the Stream's source. Suppress it when the value is not a DOM event or the Stream is deliberately executed synchronously inside a native listener.

::Snippet{name="lintNoPreventDefaultInStreamOperator" label="Rule: foldkit/no-prevent-default-in-stream-operator"}

### foldkit/no-impure-call-at-decision-time {#no-impure-call-at-decision-time}

#### Calls the Rule Flags

The rule flags these direct calls unless they appear inside a recognized callback that Effect or a Foldkit lifecycle primitive defers until execution:

- `Date.now()`
- `Date()` (which ignores its arguments)
- zero-argument `new Date()`
- `Math.random()`
- `performance.now()`
- `crypto.randomUUID()`
- `crypto.getRandomValues()`

The rule reports the call wherever it is written. Assigning its result to a local variable before passing that variable to a Command does not defer it. Neither does writing the call directly in the Command args. JavaScript obtains the value before constructing the Command in both cases.

#### Deferred Execution Boundaries

Obtain time or randomness inside the Command handler instead. Use `Clock` or `Random` for time and ordinary randomness. For UUIDs and cryptographic randomness, use the `Crypto.Crypto` service and supply the platform Crypto Layer at the application root. Return the value in the result Message. A Block constructor can yield the service once; obtain the changing value inside the Command handler that closes over it.

Inside a Block implementation, the rule separates the slots by when they run:

- `update` handlers, OutMessage handlers spread in through `instance.on({ ... })`, `view`, and Subscription `dependencies` run at decision time. The rule reports calls in them even though they sit inside the `Effect.fn` constructor.
- `commands` and `mounts` handlers and Subscription `stream` functions run when the Runtime executes them, so time and randomness calls are allowed there.

The rule also recognizes the deferred callback positions in Effect and Stream. Not every function passed to Effect is deferred. The rule still checks functions stored as Effect values, `Effect.fromOption`'s `onNone`, callbacks passed to `Effect.run*`, transform callbacks after the body of `Effect.fn` or `Effect.fnUntraced`, and callbacks passed to Effect APIs whose names end in `Eager`.

#### Preset Exclusions

The recommended and all presets disable this rule in runtime entry files (`entry.ts`, `entry.tsx`, `entry.client.ts`, `entry.client.tsx`, `entry.server.ts`, and `entry.server.tsx`), where Flags and host integrations obtain outside values. The `.tsx` forms support JSX hosts, such as a React application that embeds Foldkit; Foldkit views still use the Html builder.

The presets also disable the rule in TypeScript files under a `server` directory and in `prerender.ts` or `prerender.tsx`. Those files belong to the host rather than the Foldkit application state machine, so their request handlers and build scripts do not return values through Messages. Test files remain excluded with the rest of the Foldkit rules.

#### Limits of Static Analysis

This direct-call catalog does not prove that a file is pure. It recognizes static global member paths and ignores locally shadowed globals. It does not follow a method alias such as `const now = Date.now` to a later `now()` call, nor does it inspect a helper's call graph. Block recognition is syntactic and file-local; see [How the Rules Recognize Blocks](#block-recognition).

::Snippet{name="lintNoImpureCallAtDecisionTime" label="Rule: foldkit/no-impure-call-at-decision-time"}

### foldkit/no-module-level-mutable-state {#no-module-level-mutable-state}

Rejects module-level let and var bindings, which hold state outside the Model. Move the data into the Model, or scope a live handle to a Mount or to a child Block that acquires it in its constructor.

::Snippet{name="lintNoModuleLevelMutableState" label="Rule: foldkit/no-module-level-mutable-state"}

### foldkit/no-disabling-dev-guardrails {#no-disabling-dev-guardrails}

Flags `slow: false` in the options passed to `Program.make` or `Program.makeElement`. Fix the slow phase the warning caught, or tune its thresholds with an object, instead of silencing the feedback.

::Snippet{name="lintNoDisablingDevGuardrails" label="Rule: foldkit/no-disabling-dev-guardrails"}

## Block Wiring {#block-rules}

### How the Rules Recognize Blocks {#block-recognition}

Several rules look inside a Block implementation. A Block is a class that extends `Block<Self, ...>()('Name', contract)`, with `Block` imported from `foldkit` or `foldkit/block`, including namespace imports and aliases. A generic factory may bind the declaration to a const instead of declaring a class, as in `const TabsClass = Block<Tabs<Value>>()('Tabs', contract)`.

The implementation is the object returned by the constructor passed to that class's `make`, either directly or through `Effect.fn(...)`, `Effect.fn('name')(...)`, or `Effect.fnUntraced(...)`. The recognition is syntactic and file-local. A `make` call on a Block class imported from another module is not checked, and a constructor stored in a separate variable before it reaches `make` is not followed. Pass the constructor inline.

### foldkit/block-name-matches-variable {#block-name-matches-variable}

Requires a Block class declaration to carry its literal Block id as its class name and to pass itself as the `Self` type parameter. The Layer returned by `make`, including through `.pipe(...)`, is named `<BlockId>Live`. The root follows the same rule: `Application` and `ApplicationLive`.

A generic factory that binds the declaration to a const keeps its own local name, and its Layer still uses the Block id: `const TabsLive = TabsClass.make(...)`. Dynamic Block ids are left for the developer to review. The rule reports without changing the source, because whether the class name or the Block id should change depends on the Block's public identity.

::Snippet{name="lintBlockNameMatchesVariable" label="Rule: foldkit/block-name-matches-variable"}

### foldkit/selection-block-factory-at-module-scope {#selection-block-factory-at-module-scope}

Requires selection component factories, such as `Listbox.makeBlock<Item>()` and the Combobox, Menu, and Tabs equivalents, to be created once as module-scope variable initializers. Each call creates a new Block class, so a factory called inside a function gives the parent a different class every time.

::Snippet{name="lintSelectionBlockFactoryAtModuleScope" label="Rule: foldkit/selection-block-factory-at-module-scope"}

## Lifecycle Handles {#lifecycle-rules}

### foldkit/mount-factory-must-use-element {#mount-factory-must-use-element}

Requires each handler under a Block's `mounts` to use the `element` it receives. If a handler never touches the element, the cause was misidentified and Mount is the wrong primitive.

::Snippet{name="lintMountFactoryMustUseElement" label="Rule: foldkit/mount-factory-must-use-element"}

### foldkit/no-duplicate-onmount-per-element {#no-duplicate-onmount-per-element}

Rejects two OnMount handlers on one element, where the second silently overwrites the first.

::Snippet{name="lintNoDuplicateOnmountPerElement" label="Rule: foldkit/no-duplicate-onmount-per-element"}

## DOM and UI Helpers {#dom-ui-rules}

### foldkit/lazy-view-stable-references {#lazy-view-stable-references}

Requires lazy view slots to be declared at module scope so their references stay stable and the memoization actually hits its cache.

::Snippet{name="lintLazyViewStableReferences" label="Rule: foldkit/lazy-view-stable-references"}

## HTML Builder Recognition

Rules that inspect HTML builder calls recognize:

- The `h` parameter of a Block's `view`.
- A parameter annotated with `HtmlBuilder` (from `foldkit/html`, or `Html.HtmlBuilder` from `foldkit`), directly or through a local type alias.
- A type alias imported from a relative module that exports `type X = HtmlBuilder<...>`, followed through explicit re-export barrels.
- `inertHtml` members.

Extracted view helpers keep the same checks for duplicate `OnMount` attributes, empty children, keys, event attributes, and links. The resolver does not follow package path aliases, wildcard re-exports, JavaScript declarations, or declaration-only modules, and a type name ending in `ViewBuilder` does not establish ownership by itself. Annotate a helper at those boundaries with `HtmlBuilder` when lint recognition is needed.

## Removed Rule IDs

Oxlint reports an unknown rule ID in an explicit configuration. Delete these IDs from the project's `rules` block:

| Removed rule ID                                 | Replacement                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `foldkit/command-binding-matches-name`          | `foldkit/command-define-pascal-const` covers Command declaration names.                                                   |
| `foldkit/require-fold-for-child-update-result`  | None. A parent changes a child only by returning `model.child.send(...)` under `messages`.                                |
| `foldkit/no-manual-composition-routing`         | None. Foldkit routes a child instance's Messages to it without parent wiring.                                             |
| `foldkit/no-child-message-construction-in-root` | None. A parent constructs the child's Message and passes it to `model.child.send(...)`.                                   |
| `foldkit/no-direct-block-state-update`          | None. The parent Model holds the child instance, and the instance's Model changes only through its own update.            |
| `foldkit/no-empty-to-parent-out-message`        | None. A parent handles child OutMessages with `...child.on({ ... })` and returns its own OutMessage when it forwards one. |
| `foldkit/no-binding-write-coordination`         | None. Parent reactions to a child live in its `.on` handlers.                                                             |
| `foldkit/no-completed-block-model-in-schema`    | None. A parent Model Schema names the child class directly, as in `search: Search`.                                       |
