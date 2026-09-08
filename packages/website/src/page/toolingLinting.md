# Oxlint Plugin

## Foldkit Rules {#overview}

Foldkit projects use `oxlint` for general linting and `@foldkit/oxlint-plugin` for architecture and API conventions specific to Foldkit.

## Scaffolded Projects

[Create Foldkit app](/get-started) includes `.oxlintrc.json`, a `lint` script, `oxlint`, and `@foldkit/oxlint-plugin`. Generated projects extend the recommended Foldkit preset:

::Snippet{name="oxlintConfig" label="oxlint config"}

Override an individual rule in the project's `rules` block when an application needs a narrower policy. The complete rule set is grouped by the part of the architecture it protects below.

## Effect Imports

### foldkit/prefer-effect-module-names {#prefer-effect-module-names}

The recommended and all presets require PascalCase modules imported from `effect` to keep their exported names. Write `import { Match, Schema, String } from 'effect'`, not abbreviated or trailing-underscore aliases such as `Match as M`, `Schema as S`, or `String as String_`.

When an Effect module shares a name with a JavaScript or TypeScript global, keep the Effect import unchanged and qualify the global through `globalThis`, such as `globalThis.String`, `globalThis.Array`, or `globalThis.Record`. If an existing local or public binding must retain the module name, give the Effect import an explicit prefix such as `Order as EffectOrder`. Aliases for lowercase functions and type-only imports remain valid.

The rule safely fixes a binding and its references when the exported name is available. It reports without fixing when a rename could change binding resolution, compete with another alias for the same exported name, change an object shorthand key or named re-export, or discard a comment in the import specifier.

Disable the rule when a project deliberately keeps Effect module aliases:

```json
{
  "rules": {
    "foldkit/prefer-effect-module-names": "off"
  }
}
```

## Server Portability

### foldkit/no-nonportable-server-globals {#no-nonportable-server-globals}

The recommended and all presets enable this rule in `entry.server.ts`, `entry.server.tsx`, TypeScript files under a `server` directory, and `prerender.ts` or `prerender.tsx`. Files ending in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` are excluded.

The rule catches direct runtime reads of common browser-only globals: `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. It also catches static property reads and destructuring from the global `globalThis` object.

Local bindings, parameters, and type-only `typeof` queries remain valid. `Request`, `Response`, `Headers`, `fetch`, and `URL` remain available for host code. A host-specific file can use an Oxlint disable comment or a narrower config override when it deliberately depends on one deployment target.

This rule is a portability guardrail, not a security boundary or an exhaustive catalog of browser APIs. It does not follow aliases, resolve dynamic property names, inspect dependencies, or match filenames outside the patterns above.

## Message Naming and Construction {#message-rules}

### foldkit/no-noop-message {#no-noop-message}

Rejects catch-all Messages that make update branches and traces less meaningful. Name the event that happened instead.

::Snippet{name="lintNoNoopMessage" label="foldkit/no-noop-message example"}

### foldkit/no-empty-object-tagged-call {#no-empty-object-tagged-call}

Catches no-field variants called with an unnecessary empty object. The rule recognizes namespaces whose names end in Message, Route, or State, plus unions declared in the same file with Foldkit's union helpers. Call those constructors with no arguments.

::Snippet{name="lintNoEmptyObjectTaggedCall" label="foldkit/no-empty-object-tagged-call example"}

### foldkit/prefer-callable-message-constructor {#prefer-callable-message-constructor}

Prevents constructing Messages by typing or casting object literals. Use the callable Schema constructor instead.

::Snippet{name="lintPreferCallableMessageConstructor" label="foldkit/prefer-callable-message-constructor example"}

## Command Shape {#command-rules}

### foldkit/command-binding-matches-name {#command-binding-matches-name}

Keeps a Command binding name in sync with the name passed to Command.define.

::Snippet{name="lintCommandBindingMatchesName" label="foldkit/command-binding-matches-name example"}

### foldkit/command-define-pascal-const {#command-define-pascal-const}

Requires the const holding a Command.define result to be a non-empty PascalCase identifier that matches the Command name.

::Snippet{name="lintCommandDefinePascalConst" label="foldkit/command-define-pascal-const example"}

### foldkit/no-hand-rolled-command-struct {#no-hand-rolled-command-struct}

Rejects Command structs assembled by hand. Command.define attaches the identity, args, and tracing metadata a plain object literal skips.

::Snippet{name="lintNoHandRolledCommandStruct" label="foldkit/no-hand-rolled-command-struct example"}

## Model Updates {#model-update-rules}

### foldkit/no-empty-commands-array {#no-empty-commands-array}

Catches a literal empty array assigned to `commands`. An ordinary update, init, boot, or component helper omits `commands` when it statically has no Commands. Computed collections remain valid, as does `commands: optionalCommands ?? []` where the next operation requires an array.

The rule can remove the property when doing so will not disturb comments, spreads, or duplicate `commands` keys. It still reports the unsafe cases without a fix.

This is a syntax-only rule. It flags any literal property named `commands`, even when the object is unrelated to an update result. If `commands: []` is genuine domain data, suppress the rule on that property with `// oxlint-disable-next-line foldkit/no-empty-commands-array`.

::Snippet{name="lintNoEmptyCommandsArray" label="foldkit/no-empty-commands-array example"}

### foldkit/no-spread-in-evo {#no-spread-in-evo}

Rejects object spreads inside an evo updater. Evolve nested fields with a nested evo instead.

::Snippet{name="lintNoSpreadInEvo" label="foldkit/no-spread-in-evo example"}

## Routing {#routing-rules}

### foldkit/no-hardcoded-route-strings {#no-hardcoded-route-strings}

Rejects hardcoded path and URL strings passed to link and navigation helpers. Build them from the Route module so they stay in sync with the routes.

::Snippet{name="lintNoHardcodedRouteStrings" label="foldkit/no-hardcoded-route-strings example"}

## View Keying and Accessibility {#view-rules}

### foldkit/no-array-index-view-keys {#no-array-index-view-keys}

Rejects the array index as a view key. Key by a stable Model identifier, or reordering the list patches the wrong rows.

::Snippet{name="lintNoArrayIndexViewKeys" label="foldkit/no-array-index-view-keys example"}

### foldkit/keyed-required-for-mapped-rows {#keyed-required-for-mapped-rows}

Requires an identity-bearing mapped row element to be wrapped in keyed, so the runtime patches the right rows when the list reorders or shrinks.

::Snippet{name="lintKeyedRequiredForMappedRows" label="foldkit/keyed-required-for-mapped-rows example"}

### foldkit/require-rel-for-external-link {#require-rel-for-external-link}

Requires target="\_blank" links to carry a rel with noopener or noreferrer.

::Snippet{name="lintRequireRelForExternalLink" label="foldkit/require-rel-for-external-link example"}

### foldkit/no-raw-dom-event-attributes {#no-raw-dom-event-attributes}

Rejects raw DOM event attributes. Use the typed event helpers so handlers dispatch Messages through the runtime.

::Snippet{name="lintNoRawDomEventAttributes" label="foldkit/no-raw-dom-event-attributes example"}

### foldkit/no-empty-children-array {#no-empty-children-array}

Catches an inline empty array in the children slot, on element builders and on keyed. The argument is optional, so an element with no children omits it. The shorter form needs the Foldkit release that made children optional, so bump `foldkit` alongside the plugin.

::Snippet{name="lintNoEmptyChildrenArray" label="foldkit/no-empty-children-array example"}

## Purity Boundaries {#purity-rules}

### foldkit/no-impure-call-at-decision-time {#no-impure-call-at-decision-time}

Flags these direct calls unless they appear inside a recognized callback that Effect or a Foldkit lifecycle primitive defers until execution:

- `Date.now()`
- `Date()` (which ignores its arguments)
- zero-argument `new Date()`
- `Math.random()`
- `performance.now()`
- `crypto.randomUUID()`
- `crypto.getRandomValues()`

The rule reports the call wherever it is written. Assigning its result to a local variable before passing that variable to a Command does not defer it. Neither does writing the call directly in the Command args. JavaScript obtains the value before constructing the Command in both cases.

Obtain time or randomness inside the Command's `execute` callback instead. Use `Clock` or `Random` for time and ordinary randomness. For UUIDs and cryptographic randomness, use the `Crypto.Crypto` service with the platform's Crypto layer. Return the value in the result Message.

The rule recognizes the deferred callback positions in Effect and Stream. It also recognizes these Foldkit lifecycle callbacks when they are declared inline:

- `execute` in `Command.define`, `Mount.define`, and `Mount.defineStream`
- `dependenciesToStream` in `Subscription.make`
- `acquire` and `release` in `ManagedResource.make`

Not every function passed to Effect is deferred. The rule still checks functions stored as Effect values, `Effect.fromOption`'s `onNone`, callbacks passed to `Effect.run*`, transform callbacks after the body of `Effect.fn` or `Effect.fnUntraced`, and callbacks passed to Effect APIs whose names end in `Eager`. It also checks the surrounding lifecycle builders and their synchronous Model projections. For example, `Subscription.make`'s builder and `modelToDependencies` are not execution callbacks.

The recommended and all presets disable this rule in runtime entry files (`entry.ts`, `entry.tsx`, `entry.client.ts`, `entry.client.tsx`, `entry.server.ts`, and `entry.server.tsx`), where Flags and host integrations obtain outside values. The `.tsx` forms support JSX hosts, such as a React application that embeds Foldkit; Foldkit views still use the Html builder.

The presets also disable the rule in TypeScript files under a `server` directory and in `prerender.ts` or `prerender.tsx`. Those files belong to the host rather than the Foldkit application state machine, so their request handlers and build scripts do not return values through Messages. Test files remain excluded with the rest of the Foldkit rules.

This direct-call catalog does not prove that a file is pure. It recognizes static global member paths and ignores locally shadowed globals. It does not follow a method alias such as `const now = Date.now` to a later `now()` call, nor does it inspect a helper's call graph.

::Snippet{name="lintNoImpureCallAtDecisionTime" label="foldkit/no-impure-call-at-decision-time example"}

### foldkit/no-module-level-mutable-state {#no-module-level-mutable-state}

Rejects module-level let and var bindings, which hold state outside the Model. Move the data into the Model, or scope a live handle to a lifecycle primitive like Mount or ManagedResource.

::Snippet{name="lintNoModuleLevelMutableState" label="foldkit/no-module-level-mutable-state example"}

### foldkit/no-disabling-dev-guardrails {#no-disabling-dev-guardrails}

Flags turning off the freezeModel or slow dev guardrails. Fix the mutation or slow phase they caught instead of silencing the feedback.

::Snippet{name="lintNoDisablingDevGuardrails" label="foldkit/no-disabling-dev-guardrails example"}

## Submodel Wiring {#submodel-rules}

### foldkit/no-empty-to-parent-out-message {#no-empty-to-parent-out-message}

Flags an inline `toParentOutMessage` mapper that directly returns `undefined`. That mapper forwards nothing to the parent, so omit the property.

Partial forwarding is valid. Match every child OutMessage variant. Return a parent OutMessage for each variant you want to forward, and return `undefined` for each variant that stops at this Submodel.

The rule fixes straightforward object literals. If removal could disturb a comment, spread, dynamic computed property, or duplicate `toParentOutMessage` key, it reports the problem without changing the code. It does not inspect async functions, generators, getters, setters, or mappers referenced by name.

::Snippet{name="lintNoEmptyToParentOutMessage" label="foldkit/no-empty-to-parent-out-message example"}

### foldkit/got-submodel-message-name {#got-submodel-message-name}

Requires wrapper Messages around Submodel Messages to use the Got\*Message convention.

::Snippet{name="lintGotSubmodelMessageName" label="foldkit/got-submodel-message-name example"}

### foldkit/got-prefix-requires-submodel-payload {#got-prefix-requires-submodel-payload}

Reserves the Got\* prefix for Submodel wrappers. Any Got-prefixed Message must include a child Message payload named message.

::Snippet{name="lintGotPrefixRequiresSubmodelPayload" label="foldkit/got-prefix-requires-submodel-payload example"}

### foldkit/wrap-child-output-in-got-message {#wrap-child-output-in-got-message}

Requires child Command and Subscription output to be wrapped through a Got\*Message constructor, preserving the one-wrap-per-level Submodel convention.

::Snippet{name="lintWrapChildOutputInGotMessage" label="foldkit/wrap-child-output-in-got-message example"}

### foldkit/got-wrapper-carries-only-routing {#got-wrapper-carries-only-routing}

Keeps a Got wrapper payload to the child Message plus routing keys: message, id, or keys ending in Id.

::Snippet{name="lintGotWrapperCarriesOnlyRouting" label="foldkit/got-wrapper-carries-only-routing example"}

### foldkit/no-child-message-construction-in-root {#no-child-message-construction-in-root}

Rejects constructing a child Message variant from a parent. Expose a child-owned update capability that applies the internal fact, then integrate it with `Update.foldChild` or `Update.foldChildStep`. A child-owned view, Command, or Subscription may still construct that child's Messages; the boundary is ownership, not file spelling. See [Informing Submodels](/patterns/informing-submodels) for the complete pattern.

::Snippet{name="lintNoChildMessageConstructionInRoot" label="foldkit/no-child-message-construction-in-root example"}

### foldkit/selection-submodel-factory-at-module-scope {#selection-submodel-factory-at-module-scope}

Requires selection component factories, such as Combobox, Listbox, Menu, and Tabs, to be created at module scope so their identity stays stable across renders.

::Snippet{name="lintSelectionSubmodelFactoryAtModuleScope" label="foldkit/selection-submodel-factory-at-module-scope example"}

## Lifecycle Handles {#lifecycle-rules}

### foldkit/mount-factory-must-use-element {#mount-factory-must-use-element}

Requires a Mount's `execute` to read or write its element. If it never touches the element, the cause was misidentified and Mount is the wrong primitive.

::Snippet{name="lintMountFactoryMustUseElement" label="foldkit/mount-factory-must-use-element example"}

### foldkit/no-duplicate-onmount-per-element {#no-duplicate-onmount-per-element}

Rejects two OnMount handlers on one element, where the second silently overwrites the first.

::Snippet{name="lintNoDuplicateOnmountPerElement" label="foldkit/no-duplicate-onmount-per-element example"}

## DOM and UI Helpers {#dom-ui-rules}

### foldkit/lazy-view-stable-references {#lazy-view-stable-references}

Requires lazy view slots to be declared at module scope so their references stay stable and the memoization actually hits its cache.

::Snippet{name="lintLazyViewStableReferences" label="foldkit/lazy-view-stable-references example"}
