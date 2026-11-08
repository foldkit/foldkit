# Final view-default compiler evidence

This packet authenticates the frozen isolated candidate at
`/private/tmp/foldkit-view-type-prototype-R8YoSF` against the original compiler
budgets. The package compiler is TypeScript 7.1.0-beta under Node v26.13.0.

Both authenticated runs have identical output. Their deterministic gzip files
each have SHA-256 `dcc08e04016dedf6fa45f00ce44eacf9826b488cc021c00499e062b7a5c140cd`;
each decompresses to raw SHA-256
`0ae433ca44fb935a38a6bc4fbf6b493d363025c4ac62f70e26f9d727b86590cf`.
Eight fixtures are within their original ceilings. `layered-composition-6`
measures 2,706,693 instantiations and 336,346 Types. Its original instantiation
ceiling remains 2,707,124; its original Type ceiling 336,291 is exceeded by 55.

The `before-*` and `after-*` manifests bind the four owned source/proof files,
all 389 built declaration files, and all 28 unchanged type-performance inputs.
Every paired manifest is byte-identical. `toolchain.txt` records the executable
identity. `proposed-layered-type-ceiling.patch` is review-only and changes only
the exact layered Type maximum to the measured 336,346, without margin.

The nonzero checker exit is expected and preserved. No budget file in the
candidate was changed. These counts do not demonstrate a latency improvement.
