# @foldkit/prettier-plugin-view

Proof-of-concept Prettier plugin that formats TypeScript with hugging
brackets and leading commas, in the spirit of `elm-format`. Spike for FOL-286.

## What it does

For every `ArrayExpression`, `ObjectExpression`, and `CallExpression` that
breaks across lines, the plugin emits:

```
[ first
, second
, third
]
```

instead of Prettier's default

```
[
  first,
  second,
  third,
]
```

Short expressions still collapse to a single line. Object literals keep
their flat-mode inner spaces (`{ a: 1, b: 2 }`).

The plugin engages globally — every TypeScript file Prettier processes,
not just files matching a view glob. Drop the `plugins` entry in
`.prettierrc` to disable.

## Install

```bash
pnpm add -D @foldkit/prettier-plugin-view
```

`.prettierrc`:

```json
{
  "plugins": ["@foldkit/prettier-plugin-view"]
}
```

## Configuration

| option                 | default                                    | description                                                                                                     |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `foldkitViewArrays`    | `'on'`                                     | Set to `'off'` to leave array formatting untouched.                                                             |
| `foldkitViewObjects`   | `'on'`                                     | Set to `'off'` to leave object literal formatting untouched.                                                    |
| `foldkitViewCallScope` | `'all'`                                    | `'all'` hugs every call. `'allowlist'` only hugs calls whose callee identifier appears in `foldkitViewCallees`. |
| `foldkitViewCallees`   | view-DSL set (`div`, `span`, `keyed`, ...) | Comma-separated list of callee names recognized when `foldkitViewCallScope='allowlist'`.                        |

## Status

This is a spike. The plugin is **not** published. It's idempotent on every
TypeScript file in the Foldkit monorepo (926/926) and produces parseable
output, but the layout has known rough edges. See `../../packages/prettier-plugin-foldkit-view/notes.md`
in the repo root for the design writeup, and `artifacts/` for before/after
samples on the test corpus.

## Scripts

```bash
pnpm build              # compile TS → dist/
pnpm test               # vitest
pnpm spike:capture      # regenerate before/after artifacts under artifacts/
```

## What it doesn't handle

- `ArrayPattern` and `ObjectPattern` (destructuring) — left as standard Prettier.
- `TSTupleType`, `TSObjectType`, etc — type-side syntax untouched.
- JSX. Plugin only intercepts ECMAScript node types, not JSX nodes.
- Function parameter lists. Those are `params` arrays on functions, not
  `CallExpression.arguments`. Standard Prettier formatting applies.
- Calls with type arguments (`foo<T>(...)`), optional chaining (`foo?.()`),
  and `new (foo())()` fall back to standard Prettier.
- Object literals that need surrounding parens (arrow body, expression
  statement) fall back. The hugged output of those forms produced invalid
  TypeScript in early experiments.
- Sparse arrays, spread elements, and dangling comments inside otherwise-empty
  containers fall back.
- Line-leading own-line comments inside an array/object/call list fall back.
  This is conservative — handling them would require pulling each comment's
  doc out and threading it through our hugged layout.
