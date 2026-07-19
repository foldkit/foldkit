# Vendored snabbdom fork

Forked from [snabbdom](https://github.com/snabbdom/snabbdom) v3.6.3 (MIT, see
`LICENSE` in this directory). TypeScript reconstructed from the published build
output merged with its declaration files.

## Why a fork

Foldkit's differ needs two independent identity axes. `key` stays user-facing
and matches siblings across renders. `identity` is framework-managed, stamped
by `foldkit/brand`; a mismatch replaces the node instead of patching it.
Identity never enters the keyed index. It participates in the four adjacency
probes of `updateChildren`, exactly where upstream consults `sel`, so an
identity-bearing unkeyed sibling can move diagonally the way upstream moves a
sel-matched one, and duplicate identities among siblings stay safe because the
probes only ever match compatible vnodes. Upstream cannot express this because
`key` does both sibling matching and node identity, so giving branch arms
distinct keys would also change how siblings match.

Identity belongs in the probes rather than in a post-match check. React can
match children by slot alone because JSX conditionals leave a hole: a false
`{condition && view}` still occupies a child slot. Foldkit child arrays are
compact, a conditional spread really changes the array length, so position
alone would pair a shifted sibling with the wrong new vnode and replace it on
every toggle. Matching by identity in the probes is what preserves named view
siblings across conditional insertions and removals without manual keys.

Upstream's one-vnode-per-position contract is unchanged: the differ treats
vnodes as single-use, and the runtime's `dedupeSharedVNodes` pass
(`src/vdom.ts`) clones any reused vnode before a tree reaches `patch`, so
plain view values shared across positions stay safe without differ-level
handling.

This is vendored hot-path code. It deliberately keeps upstream's algorithms,
structure, and style rather than the repo's Effect idioms, so diffs against
upstream stay reviewable.

## Functional changes from upstream v3.6.3

- `VNode` gains an optional `identity?: string` field (`vnode.ts`). It is never
  read from `VNodeData`; `foldkit/brand` mutates it in place, set-if-absent.
- `sameVnode` additionally requires `vnode1.identity === vnode2.identity`
  (`init.ts`). With identity absent on both sides the comparison is
  `undefined === undefined` and behavior is unchanged.
- In `updateChildren`'s keyed-lookup path, the create-versus-move decision uses
  the full `sameVnode` check instead of upstream's selector-only comparison, so
  differing identity, and also a differing `data.is`, creates a new element
  instead of moving and patching (`init.ts`). This is deliberately stricter
  than upstream, which skips the `data.is` check on this path.
- Dev-only guard: `updateChildren` scans the new children at entry, and the
  old children when it first builds the key index, for duplicate sibling keys,
  and emits one `console.warn` per patch naming the duplicated key and the
  parent selector (`init.ts`). Gated on `import.meta.hot`, plus an internal
  test-only toggle `__overrideDuplicateKeyWarning`; production builds pay only
  the gate check.

## Removals relative to upstream

Only the surface Foldkit uses is vendored:

- Not vendored: `thunk`, `jsx`, `helpers/attachto`, `fragment` from `h.ts`, and
  the runtime `props` module (Foldkit ships its own `src/propsModule.ts`;
  `props.ts` here carries only the `Props` type).
- `VNodeData` drops the `attachData` field (helpers are not vendored) and the
  thunk-only `fn` and `args` fields.
- Upstream's `modules/` subdirectory is flattened into this directory, one file
  per upstream module.

## Robustness fixes relative to upstream

- `isDocumentFragment` calls the optional DOMAPI method with optional chaining
  instead of a non-null assertion, so a custom DOMAPI without fragment support
  cannot crash (`init.ts`).
- The `requestAnimationFrame` feature check guards `typeof window` before
  touching it, so importing the style module in a runtime without a `window`
  global does not throw (`style.ts`).

## Non-functional adaptations

- Formatting follows the repo Prettier config.
- Type-level adjustments for this repo's stricter compiler flags
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`): non-null assertions on index reads,
  a few widened local types, and `s['destroy']` style index access. No runtime
  behavior change.
- `toVNode` reads `Attr.name` / `Attr.value` instead of upstream's
  `attr.nodeName` / `attr.nodeValue`. Identical per the DOM spec; happy-dom
  (the repo test environment) returns `''` / `null` for the `nodeName` /
  `nodeValue` aliases.
