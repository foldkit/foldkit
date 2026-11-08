# Shared HTML definitions hardening and current integration

This packet is separate from the immutable measured candidate under
`../html-definitions-20261107/`. It does not replace or relabel that candidate's
published-54 bundle or runtime measurements.

## Two proof layers

The published-54 hardening layer uses
`/private/tmp/foldkit-html-definition-twins-20261107/candidate`. Relative to the
measured candidate, the runtime source change is private typing only:

- `VoidElementTag` names the 13 HTML void tags.
- `ElementDefinitions` requires every `HtmlElements` key exactly once and
  requires the correct `true` or `false` literal for each key.
- `attributeConstruction.test.ts` adds representative callable metadata and
  captured `OnMount` result-shape assertions.

The rebuilt `dist/html/index.js` and public `dist/html/index.d.ts` are
byte-identical to the measured candidate. The declaration source map differs
because it embeds the hardened private source text. Both rebuilt benchmark
asset trees are byte-identical to the measured candidate:

- naive JavaScript: `6a755cb350d4f2bee7c3ef0f3225614818636438f042932dfa689bbf1732b93b`
- optimized JavaScript: `7fdf905c52e487e15ec39be6ebde8b61996cdb158f6b86fa2e6ff62ac30dd7b4`

Therefore the frozen size and 72-sample runtime receipts continue to describe
the hardened runtime JavaScript. This is byte inheritance, not a new timing
claim.

The current-integration layer uses disposable twins at
`/private/tmp/foldkit-html-current-twins-20261108/{baseline,candidate}`. Both
start from exact commit `3f0a41b9279c5296020871303c8bcec2358cb368`; the only candidate differences
are `packages/foldkit/src/html/index.ts` and the added
`packages/foldkit/src/html/attributeConstruction.test.ts`. All four workspace
self-links resolve inside their own twin. Current integration results are not
reported as published-54 bundle totals. The current build happened to reproduce
the same four JavaScript assets byte-for-byte, but its receipt remains a
separate current-commit observation:

| variant | baseline raw | candidate raw | raw delta | baseline gzip | candidate gzip | gzip delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| naive | 475,519 | 462,740 | -12,779 | 147,123 | 142,804 | -4,319 |
| optimized | 482,112 | 469,333 | -12,779 | 148,452 | 144,175 | -4,277 |

The corresponding Brotli-11 deltas are -3,638 and -3,545 bytes. Exact hashes
and paths are in `current-assets.json`.

## Verification results

All commands used Node 26.13.0 at
`/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node` and the
package-local TypeScript 7.1.0-beta compiler.

- The hardened published-54 package passes source checking, an 18-file focused
  HTML/capture/CustomElement/Mount/SSR/hydration run (546 tests), a clean
  package build, the full emitted-declaration gate, and the child-instance
  source/emitted/relocated/negative controls.
- The exact-current candidate passes the same source check and 546 focused
  tests, a clean package build, the full current emitted-declaration gate,
  child-instance controls, and all nine unchanged compiler workloads with
  unchanged ceilings.
- The current baseline and candidate dist trees each contain 1,167 files and
  differ only in `html/index.js`, `html/index.d.ts`, and
  `html/index.d.ts.map`. The declaration-file difference is the expected
  private tagged-constructor binding shrinking to the two raw variants; the
  full emitted-declaration gate proves the exported signatures and consumer
  contracts remain usable.
- Missing and extra keys in both the Attribute and element authority tables
  fail the source checker at the intended contract. Both classification
  directions are covered: `br: false` rejects a void element as non-void, and
  `div: true` rejects an ordinary element as void.
- An undefined ordinary Attribute factory and factories supplied for either raw
  `Prop` or raw `OnCustomEvent` each fail the source checker.
- Wrong shared-factory name and arity mutations each fail the callable metadata
  runtime assertions.
- Every mutation restores the exact original source bytes in a `finally` block.

An initial focused-test invocation resolved the package Vitest config from the
repository root, so its relative setup path was wrong. It was discarded as a
harness invocation error. The retained `focused-tests.log` uses the package as
its working directory and passes all 546 tests.

The first current asset invocation also correctly rejected an absent local
`@foldkit/vite-plugin` dist entry in the fresh archive twins. Each plugin was
then built from its own current source, preserving the self-link invariant; the
retained `current-assets-build.log` is the passing build.

## Constructor audit packet

`audit/` preserves the independent audit recipe and receipt supplied after the
measured batch. It records 313 constructor metadata/result-shape comparisons,
the 315-entry Attribute inventory, the 213-entry element/void inventory, raw
`Prop` and `OnCustomEvent` behavior, builder key order, and `OnMount` private
symbol normalization. Its receipt explicitly records that the recipe was
reconstructed from the observed two-stage audit and was not rerun during the
active push hook. It applies to the measured candidate hashes documented there;
the hardened type/test-only delta is established independently by emitted
JavaScript and asset equality plus the retained mutation and focused-test logs.

## Evidence layout

- `logs/` contains successful command, working-directory, timestamp, exit and
  output receipts for both proof layers.
- `mutations/` contains the targeted failure output for each restored negative
  control.
- `recipes/` contains the exact logging, mutation and hardened asset-build
  scripts.
- `audit/` contains the durable independent constructor-audit packet.
- `manifest.json` and `manifest.sha256` enumerate the final packet after all
  current integration receipts are frozen.

Five captured logs contain intentional trailing or blank output that fails the
repository whitespace checker when stored as plain text. They are preserved
byte-for-byte as deterministic gzip streams: the current compiler-workload and
both focused-test logs, plus the wrong-arity and wrong-name mutation logs.
`verification.json` records each stored gzip hash and the decompressed byte
length and SHA-256, so compression does not silently normalize the capture.
