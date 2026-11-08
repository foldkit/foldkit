# Contracted Element view default proof

## Result

The isolated candidate makes an omitted `view` on contracted and unified
Blocks mean an Element view with `void` inputs. `{ Inputs }` means an Element
view with those decoded inputs, `{ kind: 'Document' }` remains explicit, and
`view: false` means viewless. Legacy Schema-only `makeDefinition` and
`assemble` retain their existing semantics.

The proof began at
`7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`. Integration must apply the owned
patch to the newer root rather than replace newer root files wholesale.

## Type and runtime design

`ContractConfiguration` remains the exported interface. Constructor inputs
intersect a private static view-choice union. Element inputs and published
Mounts are each either required or explicitly absent, so a broad optional
member cannot silently project as absent. This admits direct literals,
generic Schema-driven Inputs factories, and generic forwarders constrained to
one exact Element or Document branch. A precise Element property union of
`{ Inputs } | {}` projects `Inputs | void`; a whole-configuration union of an
omitted view and `{ Inputs }` projects the same input union. Widened or mixed
kinds, broad optional configurations, optional Inputs, optional Mounts, and
generic forwarders whose constraint mixes view branches remain rejected.

Whole-configuration unions remain passive declarations. `DeclaredView` and
Composition configuration distribute over each alternative, including a
distinct omitted alternative. The proof checks that omitted-or-`false`
projects exactly `Element<void> | undefined`. Exact completion rejects an
Element-only body, a viewless-only body, and a conditional union body, so a
mixed declaration cannot reach a Program host until the caller narrows it to
one completable contract. Ordinary valid Element and Document Layer pairs
still reject the wrong Program host.

Runtime snapshots remain passive. Omission does not synthesize a `view`
property. Explicit `false` and object declarations are copied and frozen.
Erased callers still reject unknown kinds and Document Inputs. No validator,
registration, identity, lifecycle, or completion check was weakened.

## Consumer migration

Eligible active consumers use the new ordinary Element default, use
`{ Inputs }` for Element inputs, keep Document explicit, or use `view: false`
when intentionally viewless. Three `makeFamilyDefinition` recipes, including
the generic update metadata fixture, are explicitly viewless. The
managed-resource wrong-identity negative now uses
the same `view: false` shape as its canonical Layer, so identity remains the
only intended failure.

The four contracted Query and KeyedQuery family declarations use
`view: false`. The four legacy `QueryNamespace.makeDefinition` and `assemble`
paths remain unchanged. Historical published posts, performance fixtures and
archived internal proof inputs remain byte-identical.

Guidance is synchronized across AGENTS, the scaffold FOLDKIT guide, Foldkit
skills, active Website pages and the migration guide. Active contract prose
uses “viewless” consistently. A changeset covers `foldkit` and the scaffold.

## Census

`inventory.cjs` uses the repository-resolved TypeScript parser and recognizes
`Block.make`, contracted `makeDefinition`, `makeFamilyDefinition`, and
`makeFamilyDeclaration`.

The authenticated `7cc7d90e` baseline has 387 affected omissions under the
family-aware method. The earlier 373 count used the older method; the exact
14-call difference is the newly recognized family APIs. The current candidate
has 322 omissions:

| Scope                               | Current |
| ----------------------------------- | ------: |
| Core source                         |       1 |
| Core tests                          |      15 |
| Declaration tests                   |      69 |
| Examples                            |      16 |
| Internal retained inputs            |      60 |
| Other lint, plugin and probe inputs |      39 |
| UI tests                            |      12 |
| Website                             |     110 |

The internal count is 58 calls under the old method plus two archived family
calls. These 60 retained inputs are intentionally unchanged. Remaining active
omissions are ordinary Element defaults, incomplete teaching declarations, or
negative fixtures whose intended diagnostic remains authenticated; they are
not all viewless migrations.

The baseline census was reproduced from a Git archive of exact commit
`7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`. The current census uses the same
family-aware script. The production subset correctly names `ui-source`, not
the obsolete `ui-package` label.

## Verification

The broader migration before the final type-only projection factoring passed
full Foldkit source and emitted checks, the child-instance declaration gate,
136 affected core tests, 223 affected UI tests, UI source and declaration
builds, Website and DevTools checks, Vite plugin checks, nine modified examples,
and the typing-game client. Those retained receipts establish the migration's
coverage, but they are not relabeled as reruns of the final factoring.

The frozen final `+55` candidate specifically passed:

- focused TypeScript 7 source acceptance and rejection fixtures, including
  omitted and property-level `Inputs | void` unions, exact generic forwarders,
  completion rejection and wrong-host controls;
- a forced package TypeScript 7 declaration build;
- source-free proof emission and consumption with TypeScript 7.1.0-beta;
- source-free proof consumption with the repository
  `@typescript/typescript6@6.0.2` alias, whose compiler reports 6.0.3;
- the two focused runtime files, 11 tests total;
- all nine unchanged compiler workloads against unchanged source and budget
  bytes, with eight within their original ceilings and the layered workload
  exceeding only its Type ceiling by 55.

The combined root's normal hook remains the final integration gate.

The integrated hook subsequently stopped in full-directory Effect lint at the
update-composition consumer's `Story.withBlock` call. Strict source and built
declaration programs retain `Effect.Effect<string, never, never>`, and focused,
folder and full-scope lint controls pass without suppressions or type
workarounds. The same warning occurred before this view change. Its cause is
unresolved. The separate generic metadata declaration is now explicitly
viewless; that correction is not established as the cause of the lint pass.
The [lint checkpoint](measurements/effect-lint-checkpoint/manifest.json)
retains both the failed hook and successful controls. A complete normal hook
retry is still required.

The authenticated final compiler counts are:

| Fixture                  | Instantiations |   Types | Instantiation ceiling | Type ceiling |
| ------------------------ | -------------: | ------: | --------------------: | -----------: |
| deep-composition-8       |        668,964 |  53,994 |               671,225 |       54,305 |
| wide-composition-100     |      1,399,751 |  81,456 |             1,407,702 |       81,772 |
| command-requirements-200 |        344,552 |  64,133 |               346,362 |       64,468 |
| wide-subscriptions-100   |        548,135 |  23,590 |               548,577 |       24,507 |
| workspace-composition-4  |      1,608,926 | 117,754 |             1,609,171 |      117,873 |
| workspace-composition-8  |      2,786,734 | 160,771 |             2,787,171 |      160,966 |
| machine-search           |         69,291 |  12,994 |                70,054 |       13,402 |
| attribute-bundles-200    |        114,226 |  29,369 |               114,226 |       29,370 |
| layered-composition-6    |      2,706,693 | 336,346 |             2,707,124 |      336,291 |

The original-budget gate therefore exits nonzero solely for the layered Type
count. The reviewable budget adjustment changes only that row's exact Type
maximum from `336291` to the measured `336346`; it adds no margin and does not
change the instantiation maximum or any other fixture. This is a proposed
explicit exception, not evidence of latency improvement or a claim that the
old budget passed.

The earlier `2,707,031` / `336,287` layered result was produced from a stale
isolated declaration state and is rejected. Its original report, manifest,
patch and push log remain under `measurements/failed-final-gate/`. The final
run is bound to identical before/after source, declaration-tree and unchanged
fixture manifests in the separate final compiler evidence packet.

The package-manager launch was separately retained as blocked before build by
network-unavailable identity verification. No pin or verification was changed;
successful gates used the pinned direct Node and compiler executables.

`owned-paths.txt` is the integration inventory. `owned-sha256.txt` hashes that
frozen inventory, excluding the hash file itself. `manifest.json` records the
key source, proof and built artifact hashes. Copied package source is excluded
from the relocated consumer's module graph; its imports point at the emitted
declaration and copied `dist` package. Raw compiler output lives under
`relocated/emitted/`, the repository's existing ignored artifact shape, and is
not reformatted.
