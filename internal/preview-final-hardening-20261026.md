# Final preview hardening

## Frozen source

The approved small-win implementation is
`f5506b7e240a4d8987338f22427a2bd1ecdf9cb5`, after the preceding release handoff
`f6ead23c15`. Its fresh nine-package source digest is
`b8b162accc756093e0516fbc0d0c12378915370b2eb680514d377fc0086f2abe`.
The snapshot contains all 6,900 tracked files and 106 recorded generated seeds;
the generated Website outputs are not inputs to the public package builds.
Subsequent internal evidence edits do not change the package implementation.

## Consumer changes

- A second `OnMount` on one element throws during VNode construction, naming
  both Mounts before either handler starts. The guard applies to direct
  attributes, duplicate actions and spread child attribute groups. This enforces
  the existing single-Mount contract at runtime; it is not a compile-time count
  check. Combine element-owned work in one scoped Mount and register its cleanup.
- The [Block customization guide](../packages/website/src/page/core/block.md#customizing-a-block)
  groups factories, alternate embedded views, view inputs, headless attributes,
  handler selection and wrapper Blocks. Its checked snippet authors an alternate
  through the completed child Block and selects it through the original Binding.
  No new transformation API is added.

## Verification

Three regression cases first fail against the old last-wins behavior and then
pass with the guard. The affected Mount/Unmount/registration/Block suite passes
73 tests, including the existing two `OnMount`/`OnUnmount` order cases.

| Gate                | Result                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Core                | 3,801 tests, one existing skip; coverage gates pass                                                                                        |
| UI                  | 1,301 tests                                                                                                                                |
| Website             | Source/snippet checks, 1,495 tests and production build                                                                                    |
| Public contracts    | Core source, Program/route source, external accepted/rejected emission, strict relocation, compiler diagnostics and native completion pass |
| Compiler budgets    | All six unchanged ceilings pass                                                                                                            |
| Declarations        | 289 files; 288 byte-identical to fa96, with only four TSDoc lines added to `html/index.d.ts`; signatures unchanged                         |
| Installed consumers | All nine packages rebuilt/packed; Coverchart's source/lint/40 tests/build and SPA/SSG/SSR source/lint/tests/builds pass                    |
| Installed contracts | Testing/event/Binding/initialization checks pass, including nine initialization fixtures and five lifted-Command cases                     |
| Browser rehearsal   | Coverchart and all three scaffold modes pass; Workspace 32/32 without skips, flakes or errors                                              |
| Review              | Exact source commit independently reviewed; Daybreak addendum passes and closes the duplicate-Mount Low finding                            |

[Combined commands, source hashes, artifacts, gates and security evidence](benchmarks/final-hardening-20261026.json)
retain the exact records. Full logs are under
`/private/tmp/foldkit-duplicate-mount-verification-20261026` and
`/private/tmp/foldkit-mount-final-rehearsal-20261026`.

## Security and qualifications

[Daybreak's bounded addendum](preview-daybreak-hardening-20261026.md) reviews the
exact `f6ead23…f5506b7` delta. It confirms per-element/per-render isolation,
passive acquisition, context restoration, valid Mount/Unmount ordering, replay,
stale-delivery behavior and the fixed graph of the alternate-view example. The
earlier full review and inherited dependency/provenance qualifications retain
their scope. No manifest, lockfile, dependency or transport changed.

Eight library builds use official TypeScript 7.1.0-beta; the CLI uses its own
7.0.2 compiler. All nine local labels end in `-local.b8b162accc75`. Scaffold
resolution controls preserve `policyRelaxed: false`; SSG retains the explicit
unpublished UI metadata transport. These are local rehearsal controls, not
published installation instructions.

The initial sandbox-blocked registry attempt and stalled default-pnpm Website
test attempt are excluded. Their logs are retained; network-enabled package
installation and pinned-pnpm Website tests pass. Website keeps its 281/21
TypeDoc warnings and chunk-size warning. Browser logs retain native-config
warnings, expected favicon requests, the occupied preexisting MCP port and one
17.3 ms slow-view diagnostic. They do not prove MCP relay availability.

The actual Coverchart checkout retains its HEAD, full Git status and all 88
tracked-file hashes. Existing untracked content and unrelated processes are
preserved. Earlier rendering measurements retain their fa96 source pin; no new
rendering timing or bundle-size measurement is claimed for this guard.

Publication, preview integration, Ready promotion, registry/deployment acceptance
and the actual Coverchart migration remain held for user approval. The broader
foldkit-plus integration proposals remain open.
