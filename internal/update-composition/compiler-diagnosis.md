# TypeScript 7.1 parallel checker boundary

The native update-composition declarations expose an order-sensitive cost in
TypeScript `7.1.0-beta`. The final source uses Machine's `public.js` entry,
matching the package's Machine subpath, while Query and Server also use their
public entries. This diagnosis measures the original aggregate entry, the
previous alternate namespace ordering, and the final public-entry order without
changing source declarations or compiler budgets.

## Final fresh run

The recorded run used Node `v26.13.0` and TypeScript `7.1.0-beta`, with the
built declarations at SHA256
`1921c034e9d336c5134b03d48579e70d5b1dbe9e38dbd942568cd4ccc85b137a` and the
source aggregate index at SHA256
`de2bf364cee8c53b8627d059acda3cc633e7c0aed7926988007cc0204dadc1a4`.
Counts are deltas from the unchanged fixture baseline. Single-threaded runs
subtract their own baseline.

| Declaration variant                                         | Machine instantiations | Machine Types | Normal budget    |
| ----------------------------------------------------------- | ---------------------: | ------------: | ---------------- |
| Original `Machine -> machine/index.js`, Query, Server order |                100,507 |        22,715 | Fail             |
| Previous `Machine -> machine/index.js`, Server, Query order |                 70,759 |        13,405 | Pass in this run |
| Canonical public entries in Machine, Query, Server order    |                 70,759 |        13,405 | Pass             |
| Unchanged ceilings                                          |                 83,700 |        18,800 | —                |

All three variants measured `70,759` instantiations and `13,405` Types in the
single-threaded diagnostic. The earlier pre-final run at
`/private/tmp/foldkit-update-compiler-OqWE3y/results.json` measured the previous
Machine/Server/Query order at `109,397` instantiations and `26,828` Types. That
variant is sensitive to checker partitioning across runs; the final public
entry is the maintained source form, and the supported compiler gate checks
that form.

The comparison does not show a semantic type-work reduction: single-threaded
counts are equal. It records a pinned-toolchain parallel-checker behavior. The
reproducible script copies the already-built declarations and unchanged
fixtures into a fresh temporary directory, measures all three export variants,
checks that their single-threaded counts agree, compares their ESM namespace
members and value kinds in fresh Node processes, and runs all seven normal
fixtures using the canonical public entries. It does not rebuild or modify
canonical source, emitted declarations, fixture inputs, compiler flags, or
budgets.

## Canonical fixture results

The final public-entry run passed all seven unchanged fixtures:

| Fixture                    | Instantiations |   Types | Result |
| -------------------------- | -------------: | ------: | ------ |
| `deep-composition-8`       |        658,804 |  52,595 | Pass   |
| `wide-composition-100`     |      1,392,196 |  80,494 | Pass   |
| `command-requirements-200` |        340,025 |  63,104 | Pass   |
| `wide-subscriptions-100`   |        548,577 |  24,507 | Pass   |
| `workspace-composition-4`  |      2,559,768 | 209,809 | Pass   |
| `workspace-composition-8`  |      4,314,931 | 280,773 | Pass   |
| `machine-search`           |         70,759 |  13,405 | Pass   |

The core build and official seven-fixture gate also passed in
`/private/tmp/foldkit-compiler-gate-final.log`. The fresh diagnosis receipt,
per-variant logs, and copied declarations are under
`/private/tmp/foldkit-update-compiler-Dw6DUO`; the machine fixture and budgets
were not changed.

## Reproduce

After the normal core build, run:

```sh
node internal/update-composition/compiler-diagnosis.mjs
```

The script requires the package-pinned TypeScript `7.1.0-beta`, records the
Node and TypeScript versions and source/declaration hashes, and writes the
fresh JSON receipt to `internal/update-composition/compiler-diagnosis.json` as
well as the temporary workspace. Only the canonical public-entry variant is
used for the seven-fixture gate.
