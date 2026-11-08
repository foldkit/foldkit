# HTML definition-table emitted audit receipt

## Scope

Read-only equivalence audit of the already-emitted baseline and candidate HTML
modules. No source, build output, browser state, or repository checkout was
modified. No build, compiler, test runner, formatter, or browser was started.

The preserved `audit.mjs` is a compact combined reproduction of the emitted
checks. It intentionally uses `Reflect.apply` with erased representative
payloads so one loop can cover all 313 public Attribute constructors without a
duplicated implementation manifest. It was written after the observations
below and was not rerun during the active push hook.

## Exact inputs

| Input | SHA-256 |
| --- | --- |
| Baseline `src/html/index.ts` | `3b2464b443db3614e03dda8e9285fbada713788d906c8c198ab23e7469eb06ac` |
| Candidate `src/html/index.ts` | `99424407549f6df602f055f3adf7c6f8a528b38f9f7d7002e1ba281d4baebc64` |
| Candidate `src/html/attributeConstruction.test.ts` | `0fd22257bc05b818c5167a9d22bd4aace9579da3cd8e4806298c80d557d2e878` |
| Baseline `dist/html/index.js` | `655c5d1a4ada635700726bf89288d8e43c963502c2084b05c9ee4acdeefd35b1` |
| Candidate `dist/html/index.js` | `fca0c7e28dd04cac97205e02245d382e69dcf14ff91f86b70496918dad2fa6a5` |
| Node executable | `362e3f002a58b6619e17f460d5bfccde65575d4da15c71022be3ca8fc9eb2993` |
| TypeScript parser used by the separate static audit | `d3f3cd2b04b7f466f4484df921b744223f7bd1f3e353ec9110bdf52695b983d5` |

Toolchain: Node `v26.13.0`, V8 `14.6.202.34-node.40`, `darwin arm64`.
The static parser reported TypeScript `6.0.3` from the workspace path
`node_modules/.pnpm/@typescript+typescript6@6.0.2/node_modules/@typescript/typescript6/lib/typescript.js`.

## Observed emitted results

- Complete baseline/candidate builder own-key order matched.
- Exactly 313 capitalized public Attribute constructors were compared.
- For every constructor, name, arity, function own keys, `name` and `length`
  descriptors, and function prototype matched.
- For every constructed Attribute, own-key order, property descriptors, object
  prototype, `_tag`, payload shape, shared payload/function identities, and
  fresh-result behavior matched.
- `OnClick` with and without options and `OnCancelPreventDefault` with present
  and absent payloads matched.
- `Prop` and `OnCustomEvent` remained exported raw constructors and remained
  absent from the generated builder constructor inventory.
- The first direct deep comparison reported only `OnMount`. That is an
  expected cross-module artifact: baseline and candidate were imported as two
  modules and each owns a distinct private `MountOccurrencePath` symbol.
  A separate normalized comparison established identical outer keys
  `['_tag', 'action']`, captured-action keys
  `['name', 'f', 'Symbol(MountOccurrencePath)']`, descriptors, name, callback
  identity, and empty occurrence path. The preserved recipe normalizes private
  symbol keys by description while retaining their position and descriptors.
- Final interpretation: 313/313 constructor contracts matched; zero semantic
  failures after the documented OnMount symbol normalization.

## Separate static inventory receipt

- 315 baseline handler keys and 315 candidate definition keys; zero
  missing/extra.
- Every candidate `apply` expression was structurally identical to the
  baseline handler at the same tag. Three initial text differences were only
  line wrapping in IME handlers; syntax-tree comparison found zero differences.
- Factory families exactly matched the baseline payload inventory: 240 value,
  44 message, 21 callback, and the individual OnClick, OnCopyText, OnCutText,
  OnCancelPreventDefault, AllowDrop, Attribute/DataAttribute, and OnMount
  cases.
- 313 baseline/candidate constructor positions and arities; zero mismatches.
- `HtmlElements`, `HtmlAttributes`, and `HtmlBuilder` public type declarations
  were unchanged under normalized syntax comparison.
- 213 element keys/tag strings and all void/non-void classifications matched;
  zero missing, extra, wrong-tag, or wrong-void entries. The exact void set was
  `area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr`.

## Interpretation limit

This receipt establishes equivalence for the exact source and emitted hashes
above. It makes no speed, allocation, startup, memory, or general performance
claim. It does not replace the planned source/emitted and focused behavior
gates after the candidate is integrated.
