# Current unified Block and direct Layer proof

Do not begin broad migration from this checkpoint. Ordinary authoring, selected
provider safety and public consumer checks pass. Two adapted Workspace compiler
workloads still exceed the unchanged instantiation ceilings. This is unfinished
work, not an approved deferral.

This isolated recovery is based on `c55fb523ec8537d940f39f6b53204d1b29f12da3`.
The earlier README, patches and measurements in this directory remain historical
records. The current receipt is
[`current-proof-20261104.json`](./current-proof-20261104.json).

## Recovered implementation

One public `Block.make` value owns the declared Schemas and typed authoring
helpers. Portable Composition builders remain independently authorable.
`makeLayer(effect)` completes an ordinary implementation Layer; the public
Block has no separate `.contract`, `.get` or `.makeBlock` projection.

The recovered combined proof retains:

- The compact child contract, raw Binding tuple and flat unified authoring
  surface, without the removed Binding-spec reconstruction machinery.
- `CanonicalUpdatePlan` with exact local and child-routing result channels.
- Private implementation facts associated with their exact selected public
  result. Program, Server, Story and Scene validate the selected pair and project
  its requirements. A different same-owner selection cannot supply its facts.
- Exact init/update/view Plan Source validation, distributing each constructor
  alternative before comparing its source. Erased Sources and crossed unions
  reject; aligned unions, generic producers and viewless Blocks pass.
- Ready Instance Schemas, current InMessage composition, legacy/unified child
  transport in both directions and the registered executable test reader.
- Subject-directed Story inference with the original overloads retained.

The final module boundary moves the existing unified declaration, completion
signature and factory into `experimental/contracted/unified.ts`. Contract and
runtime modules do not import it back. Twelve moved declarations, including both
factory overload/implementation entries, have equal tokens before and after the
move. Shared helper bodies match after ignoring the added export and a
formatter-added trailing generic comma on `NativeBody`. Public Block export
names are unchanged. This is a module ownership correction, not a new API stage
or a weaker validator.

The separately reviewed canonical Source ownership repair (`30069d58a0`) and
Layer-selection documentation (`3c515660a9`) are being integrated into the
preview. Their commit ancestry is not part of this c55-based spike. The Source
repair was restored here for the combined proof. Publication and Daybreak review
remain held.

## Fresh verification

Node 22.22.3 runs native TypeScript 7.1.0-beta for build and compiler workloads.
Strict compatibility consumers use the retained TypeScript 6.0.3 wrapper. Effect
and Vitest each resolve to one physical installation. The receipt records exact
compiler paths and hashes.

- Native emitting build and complete core source pass, including generic
  Query/KeyedQuery implementations and the recovered tests.
- Strict source and emitted consumers pass with `skipLibCheck: false`, exact
  optional properties and unchecked indexed access enabled. They cover exact
  selected requirements, pending host handlers, forged association, foreign
  pair rejection at all four hosts, Instance startup/ownership, legacy and
  selected required view inputs, contextual routing, and inferred low/high-level
  Stories. Existing rejected calls remain rejected.
- Exact Plan Source source/emitted controls pass: foreign owner, another Mount
  inventory, incompatible view Source, erased update/view Source and crossed
  constructor unions reject. Aligned unions, ordinary generic producers and
  viewless declarations pass.
- Split Instance and testing-subject consumers emit declarations. A relocated
  split consumer passes against a private copy of the built package, with no
  Foldkit source input. It retains exact Binding acquisition, startup and ready
  Model types.
- Eight runtime files pass 44 tests. They cover passive construction, deferred
  initialization, original host handlers, Commands, selected Subscriptions and
  Mounts, cleanup, page Flags/URL handling, both legacy transport directions,
  current InMessage composition, Instances and whole-variant children.
- The original runtime identity control acquires a valid Layer and rejects
  foreign update/view plans and a separately created Composition with identical
  owner and static metadata.
- Source formatting and whitespace checks pass. The moved-declaration/public
  export comparison passes with the cosmetic helper exception stated above.

The recovered suite contains 44 tests at the recorded file hashes. Earlier
reports' 43-test count is historical, not the fresh count. Initial recovery
failures came from omitted recorded test-reader and Viewless-fixture corrections;
those exact saved corrections were restored. One existing negative routing
fixture now names its configuration so both compilers attach the diagnostic to
the same call. No rejection assertion or contract was removed.

## Compiler results

All seven unchanged original workloads pass on the final built declarations.
Machine is 70,759 instantiations and 13,405 Types, below 83,700 and 18,800.

The unchanged retained driver adapts only authoring/completion syntax. Its AST
checks preserve graph shape, domain and handler bodies, operation sources and
assertion counts. It verifies original fixture and built-package hashes before
and after measurement. These are compiler counts, not editor or rendering times.

| Adapted workload | Instantiations |   Ceiling |   Types | Ceiling | Result |
| ---------------- | -------------: | --------: | ------: | ------: | ------ |
| Deep 8           |        371,285 | 1,152,618 |  48,897 |  55,843 | Pass   |
| Wide 100         |      2,057,610 | 3,132,298 |  71,315 | 216,662 | Pass   |
| Workspace 4      |      2,687,288 | 2,642,699 | 174,611 | 229,173 | Fail   |
| Workspace 8      |      4,999,644 | 4,515,010 | 264,339 | 299,721 | Fail   |

Workspace 4 exceeds its instantiation ceiling by 44,589, about 1.7%.
Workspace 8 exceeds it by 484,634, about 10.7%. Both Types counts pass. No fixture,
assertion or budget was changed. The remaining cost is unresolved.

The unchanged checker hash is
`bfd0baed03229435de3093cc79e56c546ff2aa5ce4da874f1cb4ca7732c8ffc4`.
The retained adapter hash is
`289ad36cddc5dfdb0345ffd211a0d50da81d3390950fa13025355e1e3f8606a5`.
Both match the saved proof. The receipt names the exact final performance
snapshot and preserves its transformation evidence and hashes.

## Reproduction and limits

From this isolated checkout after the locked dependencies are available:

```sh
node packages/foldkit/node_modules/typescript/bin/tsc -p packages/foldkit/tsconfig.build.json --incremental false --composite false
python3 probe/run-recovered-checks.py
node packages/foldkit/scripts/check-block-type-performance.ts
node internal/direct-block-performance/verify.mjs
```

The final driver intentionally exits nonzero for the two unchanged ceilings.
Focused fixtures and relocation preparation remain under `probe/`; their file
hashes and exact commands are in the receipt. The core source patch and final
source/declaration hash manifest accompany this report. Generated package copies
and dependency links are not release artifacts.

This recovery does not claim fresh actual whole-Workspace source, declaration,
Story/Scene or editor-workflow verification. Those earlier results remain
historical. The separate fixed Single/Multi UI-family experiment has not been
integrated or rerun here. Real Query/UI-family completion still needs its own
combined proof. No packed release, browser cohort, rendering benchmark or new
security review was run for this checkpoint.

TypeScript cannot distinguish distinct runtime values with identical structural
public contracts. Existing runtime identity checks remain necessary. This proof
does not claim runtime validation of erased generic Item/Value refinements.

Keep this checkpoint isolated. Resolve the two compiler costs and verify actual
families and the full application before deciding on repository migration.
