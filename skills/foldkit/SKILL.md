---
name: foldkit
description: Use whenever working with Foldkit. Triggers on imports from `foldkit`, files in a Foldkit project, or prompts mentioning Foldkit. Loads the framing and points at the vendored foldkit subtree for the canonical conventions, source code, and examples.
---

# Foldkit

Foldkit is a complete TypeScript frontend framework built on Effect and the Elm
Architecture. Model the application's behavior with Foldkit's own state,
Message, update, effect, lifecycle, routing, UI, validation, testing, and
devtools primitives. Do not introduce another application architecture or move
state transitions and side effects outside Foldkit's seams.

## Work from the installed version

Treat the project's installed declarations and matching vendored source as the
authority. A consumer project should keep the Foldkit repository at
`repos/foldkit/`, pinned to the installed release tag. For a canary version,
pin the full commit hash named by the version. When working in the Foldkit
repository itself, use the same paths without the `repos/foldkit/` prefix.

Start with the nearest current exemplar:

- `examples/` for focused applications and feature integrations
- `packages/typing-game/client/src/` for a production multi-page application
- `packages/website/src/` for routing, pages, and documentation examples
- `packages/foldkit/src/` and emitted declarations for exact behavior and types
- `AGENTS.md` for naming, state modeling, code style, and file organization

List directories before following a path from prose because examples move. A
consumer's `FOLDKIT.md` is a scaffolder snapshot and may lag behind its
installed package. Replace a stale snapshot from
`repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md`; preserve
the consumer's own `AGENTS.md`.

If the subtree is missing, recommend adding it before substantial Foldkit work.
For a stable release:

```sh
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

For a commit-addressed canary, use its source commit as the final Git ref instead
of a release tag. After an upgrade, use the same command with `pull` in place of
`add`.

## Architecture decisions

- Keep the Model as the single source of truth. Messages record facts, update
  computes the next Model and Commands, and the Runtime performs effects.
- Declare each Schema's same-named decoded type on the next line with no blank
  line, such as `type Model = typeof Model.Type`. Use the alias in explicit
  value annotations and retain `typeof Model` when an API needs the Schema
  type. Let owned callbacks infer their parameters.
- Prefer Foldkit and Effect modules over hand-rolled equivalents or outside
  libraries. Check `create-foldkit-app` and current examples first.
- Import every file's UI component namespaces together from `@foldkit/ui`, such as `import { Button, Dialog, Listbox } from '@foldkit/ui'`. Use the owning namespace for views, passive Blocks, factories, Layers, types, multi-select variants, and test matchers: `Button.view`, `Dialog.DialogBlock`, `Listbox.makeBlock`, `Listbox.layer`, `Combobox.Multi`, and `Listbox.test`. Alias a namespace only for a genuine local collision; never import a component subpath or alias one of its members. Construct generic UI Blocks once at module scope, bind the passive contract, and provide its construction Layer to the parent.
- Treat Listbox and Combobox as the Schema-backed selection families. Pass Combobox its Item Schema. Use `Listbox.makeBlock()` for plain strings, `Listbox.makeBlock(ValueSchema)` when items are values directly, or `Listbox.makeBlock(ItemSchema, ValueSchema)` for richer view items; `Listbox.Multi` has the same forms. Value is the runtime Message and OutMessage boundary. Item is a view-only witness that adds no serialization or Service requirement. Omit `itemToValue` only when the actual items satisfy Value; otherwise extract Value explicitly. Do not use a type-argument-only Listbox call or apply this rule to Menu, RadioGroup, Tabs, and other generic factories.
- When a feature's view grows into several files, make `view/view.ts` its composer and expose it through an explicit `view/index.ts` barrel. Keep route, page, and demo render fragments under `view/`; keep Model, Message, contracts, init, update, and other non-rendering responsibilities outside it.
- Keep Story and Scene specifications declarative: use immutable fixtures, `messageWith` for current-Model inputs, and observable assertions. Never use mutable outer captures or `mockImplementation` closures to pass values between steps; first establish a genuine DSL gap if those forms cannot express the behavior.
- Compare a Story sequence with `models(steps(...), (before, after) => ...)`, after its `init` or `given` step. Bind the final Model returned by `story` immutably when another Story or Scene needs it. The runner verifies all Commands are resolved before returning; a later `given` carries state without pending work or graph resources.
- Do not use decorative section-header comments such as `// MODEL`, `// OUT MESSAGE`, or `// VIEW`. Use file boundaries, names, and blank lines; reserve `// NOTE:` for a genuine timing, browser, or external constraint.
- Put each Block's own child folders under its `blocks/` directory and expose them through an explicit barrel. Keep domain and helper modules separate from those child folders.
- Declare each Block's independent key, InitArgs/Context, view and operation contracts once. Use `defineInMessageUnion` plus `Composition.makeInMessageUpdate` for ordinary parent requests and notifications, keeping local Messages and OutMessages on `defineMessageUnion`. Export its passive `FooBlock` contract and construction `layer`; acquire `FeatureComposition.acquireChildren()` inside `FeatureBlock.makeLayer(Effect.gen(...))` and return acquired `children`.
- For standard string-keyed child arrays, use `ChildBlock.Instance` ready storage and the owning `makeFieldsStep` with passive `Binding.create` requests. Follow [Instance-array creation](references/composition.md#create-children-in-instance-arrays) for exact Binding configuration, retained init Commands, and storage limits. Keep existing init helpers for other representations.
- Pass the selected `{ block, layer }` pair to Block-aware Story and Scene entry points so they own construction and cleanup without running handlers. Provide normal test Layers and keep ordinary steps synchronous.
- Use stateful Foldkit UI Blocks through a parent Binding. Call stateless render
  helpers directly with the caller's builder and Model. Do not turn a render
  helper into a Block merely for structural symmetry.
- Use `modifyFields` transformers directly when they depend only on that field's
  current value. Use `() => value` for replacement from a Message, operation
  result, Command result, or another Model field.

For any Block, Program, child Binding, child startup policy,
Mount capability, OutMessage policy, handler recipe, or Service Layer work,
read [references/composition.md](references/composition.md). It contains the
decision tables, canonical stages, and safety invariants for that surface. Then
inspect the matching source and example for the installed version instead of
reconstructing an overload from memory.

## Preserve ownership boundaries

Push back on mutation, two-way binding, imperative event handlers, Messages
named as instructions, effects performed by update or view, and workflow state
hidden in services. Propose the Foldkit form that keeps state transitions in
update and effects behind Commands, Subscriptions, Mounts, or ManagedResources.

Errors from Commands become Messages. Model absence with `Option`, remote data
with `AsyncData`, and multi-state domain behavior with discriminated unions.
Use Schema types for Models, Messages, Routes, and domain unions. Keep public
child state behind the child's operations and accessors; a parent integrates a
child through its Binding and OutMessages.

Experimental Query can own retained fetch data, freshness, cancellation, and
per-key retention. Derive displayed data through `read`; avoid a second canonical
cache in the parent. Use `staleTime` with `requestLoadIfStale` and an Effect Clock
timestamp supplied in a Message. KeyedQuery's `maxSettledEntries` protects pending
entries; its `pendingArgs` and `requestCancel` support selected obsolete work.
Opt into `notifyOnCompletion` and fold accepted results through the Binding when
coordinating further requests. Keep URL policy, debounce, paging, sorting, and
provider cooldowns in the application. Read the matching Query guide and source
before relying on cancellation ordering or retention limits.

## Block file and authoring boundaries

In split features, read the contract and typed helpers from `block.ts`, static relationships from `composition.ts`, and construction from `layer.ts`. A separate local handler bundle belongs in `effectsLayer.ts`. A split feature's `block.ts` exports the authoring helpers used by its implementation. Named-import those helpers in init, update, command, composition and other implementation modules instead of repeating `FeatureBlock.make*`. A compact feature destructures helpers beside its Block declaration. Retain qualification only when multiple owners would otherwise be unclear. Keep helper aliases out of the feature barrel.

Application behavior uses the Story/Scene DSL; acquired update functions are not a substitute runner. See [the composition reference](references/composition.md) for generated InMessage methods, exact runtime capability bounds and synchronous, service-free serialization.
