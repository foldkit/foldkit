# @foldkit/oxlint-plugin

## 0.7.0

### Minor Changes

- 504344b: Replace `m` with `defineMessageUnion` in `foldkit/message`. `defineMessageUnion` declares a whole Message union from one record of fields per variant instead of naming each variant once as a constructor and again in the union list.

  The result is a Schema, so it decodes and nests in a Model. Its focused Message surface is exhaustive `match` plus one callable constructor per variant. Each constructor is itself a schema, which is what `Command.define` needs for its `messages` list. Use `Message.match` for exhaustive dispatch. Effect `Match` remains available for partial matching, fallbacks, and one handler shared across several tags.

  This removes the `m` export. Declare Message and OutMessage as separate `defineMessageUnion()` unions, even when two variants happen to carry the same fields. Constructors stay on their owning union namespace rather than being exported as sibling bindings.

  Update `@foldkit/oxlint-plugin` to recognize `defineMessageUnion()` declarations in the Message naming rules. Remove `message-binding-matches-tag`, since variants no longer have separate constructor bindings whose names can drift from their tags.

  Update `create-foldkit-app` templates to declare and match Messages with the new API.

  ```typescript
  import { Schema as S } from 'effect'
  import { Update } from 'foldkit'
  import { defineMessageUnion } from 'foldkit/message'
  import { evo } from 'foldkit/struct'

  const Model = S.Struct({ count: S.Number })
  type Model = typeof Model.Type

  export const Message = defineMessageUnion({
    ClickedReset: {},
    ChangedCount: { count: S.Number },
  })
  export type Message = typeof Message.Type

  type UpdateReturn = Update.Return<Model, Message>

  export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
      ClickedReset: () => [evo(model, { count: () => 0 }), []],
      ChangedCount: ({ count }) => [evo(model, { count: () => count }), []],
    })
  ```

- e041379: Add `foldkit/no-nonportable-server-globals` to both presets. The rule catches common browser-only globals in `entry.server.ts`, `entry.server.tsx`, TypeScript files under a `server` directory, and `prerender.ts`. Colocated files ending in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` are excluded.

  The curated list covers `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. The same names are caught when read through a static `globalThis` property or destructured directly from `globalThis`.

  Local bindings, parameters, and type-only `typeof` queries remain valid. `Request`, `Response`, `Headers`, `fetch`, and `URL` remain available for host code. The Foldkit-owned rule composes with any `no-restricted-globals` policy in the consuming project instead of replacing it.

  This is a portability guardrail, not an exhaustive list of browser APIs or a security boundary. Lint may newly fail when a recognized server file reads one of the listed globals at runtime.

## 0.6.0

### Minor Changes

- 23423bd: Adds `foldkit/no-empty-children-array`, which flags a builder call that passes an inline empty array as children. The argument is optional, so `h.div([h.Class('divider')], [])` should be written `h.div([h.Class('divider')])`, and `h.keyed('li')(key, [attrs], [])` should be written `h.keyed('li')(key, [attrs])`. Calls that pass a variable, a call, a conditional, or a non-empty array are left alone, and so is any method that is not an element builder. An array whose only content is a comment is also left alone, since dropping the argument would delete the comment with it.

  The rule is on at error severity in `recommended`. The fix it asks for needs the `foldkit` release that made children optional, so bump `foldkit` alongside the plugin. On an older `foldkit`, omitting the argument does not compile.

## 0.5.0

### Minor Changes

- 5d77a97: Take every `Command.define` input as a named field, and fold interruption into it.

  `Command.define` took its inputs positionally, with the result Messages as a variadic tail and the Effect supplied by a second call. That signature had no room to grow: a rest parameter has no trailing slot, so the one Command modifier that exists, interruption, had to live in its own namespace as `Command.Interruptible.define`. Namespaces do not compose. A second modifier would have had nowhere to go, and the positional `toKey` in the interruptible form was the only argument whose meaning a reader could not recover from its shape.

  Inputs are now named fields on a config object: `args` declares the args Schema, `messages` lists the Messages the Command can produce, `execute` holds the Effect, and `interrupt` opts into interruption. `Command.Interruptible.define` is removed; `Command.Interruptible` remains for the outcome vocabulary (`Outcome`, `Interrupted`, `NotFound`), which update functions still match on.

  `interrupt: true` keys every invocation by the Command name, which is what a single-instance flow wants. `interrupt: { keyFields, toKey }` derives the key part from selected args so concurrent invocations can be interrupted independently. `keyFields` gives `toKey` its parameter type and declares the exact args the `Interrupt` constructor requires, so the annotation the positional form required is no longer needed.

  ## Migration

  Move each positional argument to its field, wrap the result Messages in an array, and move the Effect from the second call into `execute`.

  ```ts
  // before
  const FetchWeather = Command.define(
    'FetchWeather',
    { zipCode: S.String },
    SucceededFetchWeather,
    FailedFetchWeather,
  )(({ zipCode }) => Effect.gen(function* () { ... }))

  // after
  const FetchWeather = Command.define('FetchWeather', {
    args: { zipCode: S.String },
    messages: [SucceededFetchWeather, FailedFetchWeather],
    execute: ({ zipCode }) => Effect.gen(function* () { ... }),
  })
  ```

  A Command with no args omits `args` and gives `execute` a bare Effect.

  ```ts
  // before
  const LockScroll = Command.define('LockScroll', CompletedLockScroll)(
    Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
  )

  // after
  const LockScroll = Command.define('LockScroll', {
    messages: [CompletedLockScroll],
    execute: Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
  })
  ```

  Interruptible Commands move to `Command.define` with an `interrupt` field. The `Interrupt` constructor and its outcome Message are unchanged.

  ```ts
  // before
  const UploadFile = Command.Interruptible.define(
    'UploadFile',
    { uploadId: S.Number, file: S.instanceOf(File) },
    ({ uploadId }: UploadKey) => String(uploadId),
    SucceededUploadFile,
    FailedUploadFile,
  )(({ uploadId, file }) => Effect.gen(function* () { ... }))

  // after
  const UploadFile = Command.define('UploadFile', {
    args: { uploadId: S.Number, file: S.instanceOf(File) },
    messages: [SucceededUploadFile, FailedUploadFile],
    interrupt: {
      keyFields: ['uploadId'],
      toKey: ({ uploadId }) => String(uploadId),
    },
    execute: ({ uploadId, file }) => Effect.gen(function* () { ... }),
  })
  ```

  An interruptible Command that omits `toKey` becomes `interrupt: true`.

  One edge to know about: `interrupt` is discriminated by the literal `true`, so hoisting the config into a variable without `as const` widens it to `boolean` and fails to compile. The error names the widening directly, and writing the config inline at the definition site, which is the normal form, is unaffected.

## 0.4.0

### Minor Changes

- a25f769: Ship `recommended.json` and `all.json` preset files so a JSON `.oxlintrc.json` can extend a preset directly instead of hand-copying rule lists: `{ "extends": ["./node_modules/@foldkit/oxlint-plugin/recommended.json"] }`. The files are generated at build time from the same source as `configs.recommended` / `configs.all`, ship in `files`, and are reachable through the `./recommended.json` and `./all.json` export subpaths. Consumers pick up new rules with a version bump instead of a config diff.

  Both presets now scope every foldkit rule off in test files (`**/*.test.ts`, `**/*.test.tsx`) via an `overrides` entry. Foldkit rules police application definitions that tests exercise rather than write, and some invert in tests (a route-parsing test must build the URL the router under test parses; a Command test double is hand-rolled by design). Scoping them off by default keeps the ruleset stable as new rules ship in batches, and a rule that wants test coverage can opt in explicitly.

### Patch Changes

- 8dd1906: Drop `RadioGroup` from the `selection-submodel-factory-at-module-scope` rule. RadioGroup is now a stateless controlled render helper with no `create` factory, so the rule covers Combobox, Listbox, Menu, and Tabs.

## 0.3.0

### Minor Changes

- 2d3e621: Add 16 convention rules, taking the plugin from 8 to 24. Rule designs come from [`@mpsuesser/oxlint-plugin-foldkit`](https://github.com/mpsuesser/oxlint-plugin-foldkit) by Marc Suesser (MIT), curated for Foldkit in #607 by @artile, and reimplemented here from behavior specs in house style.

  - Command shape: `command-define-pascal-const`, `no-hand-rolled-command-struct`
  - Submodel wiring: `wrap-child-output-in-got-message`, `got-wrapper-carries-only-routing`, `no-child-message-construction-in-root`, `selection-submodel-factory-at-module-scope`
  - Model updates: `no-spread-in-evo`
  - View keying and accessibility: `no-array-index-view-keys`, `keyed-required-for-mapped-rows`, `require-rel-for-external-link`, `no-raw-dom-event-attributes`
  - Routing: `no-hardcoded-route-strings`
  - Lifecycle: `mount-factory-must-use-element`, `no-duplicate-onmount-per-element`, `lazy-view-stable-references`
  - Dev config: `no-disabling-dev-guardrails`

  Every rule lives in `src/rules/` with a colocated unit test and a real-oxlint integration fixture. The generated `recommended` preset (every rule at error) and `all` preset now carry the package specifier, so consumers can spread either into their oxlint config and have the plugin resolve. Nothing is enabled in the scaffold preset; adopting any of these stays opt-in per app, so existing projects see no change.

## 0.2.0

### Minor Changes

- 2d23b39: Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level `let` and `var` declarations (including `export let`), which hold state outside the Model. Ambient `declare let` declarations are not flagged. Scaffolded projects enable the rule in their generated `.oxlintrc.json`.

  Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit` by Marc Suesser.

## 0.1.0

### Minor Changes

- 86b2250: Publish the Foldkit oxlint plugin and scaffold new apps with oxlint and the Foldkit-specific lint rules.
