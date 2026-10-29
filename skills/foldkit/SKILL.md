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
- Construct generic UI Blocks with `Component.makeBlock` once at module scope,
  then bind the exact completed result into the parent.
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
