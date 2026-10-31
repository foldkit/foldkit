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
- `packages/create-foldkit-app/templates/base/FOLDKIT.md` for the consumer
  conventions of the installed version, including Blocks and testing
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
- Every feature with state is a Block class. The class declares the contract
  (`class Search extends Block<Search, Args>()('Search', { Model, Message })`),
  and `Search.make(Effect.fn(...))` implements it and returns the `SearchLive`
  Layer that provides it.
- One file, one Block. A Block's file, named for it in camelCase
  (`search.ts`, `issueBoard.ts`, `application.ts` for the root), holds its
  Message and OutMessage unions, Model Schema, Command and Mount definitions,
  class, and `Live` Layer. Never split a Block across `message.ts`,
  `model.ts`, `update.ts`, `command.ts`, or `view.ts`, and do not add an
  `index.ts` barrel for it. When a Block grows too large to read, extract a
  feature that owns its own state, effects, or lifecycle into a child Block in
  its own file; render-only markup stays in the parent as view functions. The other source files are
  entries, `services.ts`, `route.ts`, and `domain/` modules shared by several
  Blocks.
- Use a stateful `@foldkit/ui` component as a child Block. Declare the
  instance in the parent constructor with
  `yield* new Dialog.Dialog('dialog', args)`, store it in the parent Model,
  and provide `Dialog.DialogLive` to the parent's Layer.
- Call a generic component factory once at module scope, such as
  `const ResultListbox = Listbox.makeBlock<Result>()`. It returns a class
  with its Layer attached as `ResultListbox.Live`. Never call the factory
  again to recover a Model or class.
- Call stateless render helpers directly with the caller's builder and Model.
  Do not turn a render helper into a Block merely for structural symmetry.
- Use `modifyFields` transformers directly when they depend only on that field's
  current value. Use `() => value` for replacement from a Message payload,
  Command result, or another Model field.

For any Block, child instance, OutMessage, view input, exposed handle,
Program, or Service Layer work, read
[references/composition.md](references/composition.md). It covers the
ownership model, the canonical class shape, children and their lifecycle,
testing a composed graph, and review invariants. Then inspect the matching
source in `packages/foldkit/src/blocks/` and an example for the installed
version instead of reconstructing an API from memory.

## Preserve ownership boundaries

Push back on mutation, two-way binding, imperative event handlers, Messages
named as instructions, effects performed by update or view, and workflow state
hidden in services. Propose the Foldkit form that keeps state transitions in
update and effects behind Commands, Subscriptions, Mounts, or a child Block
that owns a resource.

Errors from Commands become Messages. Model absence with `Option`, remote data
with `AsyncData`, and multi-state domain behavior with discriminated unions.
Use Schema types for Models, Messages, Routes, and domain unions. A parent
reads a child's state through `model.child.model`, changes it only by sending
the child a Message, and learns child facts through `.on` OutMessage handlers.
