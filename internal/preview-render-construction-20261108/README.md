# Paired HTML construction experiment

The paired metadata and child-normalization prototype is not adopted. Its
primary optimized result is smaller than the duplicate-baseline variation in
the same batch. The patch and evidence are retained so the investigation does
not need to be repeated.

The candidate starts from `7cc7d90e68`. It combines precomputed built-in
element facts with one-pass primitive child normalization, preserving the
existing ownership and validation rules. All 507 affected tests, source and
emitted consumers, focused failure controls and nine unchanged compiler
ceilings pass. Those correctness results do not establish a performance gain.

| Workload  | Baseline A | Candidate | Baseline B | Candidate versus baseline midpoint | Median duplicate difference |
| --------- | ---------: | --------: | ---------: | ---------------------------------: | --------------------------: |
| Optimized |   338.7 ms |  332.8 ms |   344.4 ms |                           -8.75 ms |                     26.5 ms |
| Naive     |   797.6 ms |  734.1 ms |   755.2 ms |                           -42.3 ms |                    29.85 ms |

These are medians from one 12-round cyclic batch with all 72 samples retained.
The candidate is faster than its same-round baseline midpoint in seven of 12
optimized rounds and eight of 12 naive rounds. The secondary naive signal
does not justify adoption without a convincing primary result.

The original outer timing receipt is failed. After the unchanged driver exits
zero and cleanup completes, the wrapper rejects a caught revision-lookup
warning from the generated harness directory, which has no Git checkout. A
separate readback validates the retained samples and provenance. It does not
change the failed receipt or make this a passing timing gate. There was no
retry.

The [archive manifest](measurements/experiment/manifest.json) authenticates
every stored and decompressed artifact, including the complete patch, original
report and manifests, exact assets and maps, count-only coverage, ordinary
samples, failure receipts, controls and reproduction tools. Files are gzip
streams preserving their original bytes. Temporary symlink targets are
recorded as metadata rather than copied.

To reconstruct the candidate, apply the decompressed
`measurements/experiment/original/evidence/candidate.patch.gz` to a checkout of
the exact base. Install the normal locked dependencies. The retained tools
record the original temporary paths and executable identities; they are
evidence of that run, not a portable benchmark command.

The isolated pair excludes the later frame-cadence and view-default changes.
Its original final manifest's request for 400 rAF callbacks was an expectation
to test, not a property established for the later cadence implementation.
Current-source callback counts and ordinary rendering measurements require
their own controls. No speedup, equivalence or final-candidate performance
claim is inferred from this packet.
