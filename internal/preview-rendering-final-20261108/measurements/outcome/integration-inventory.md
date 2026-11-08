# Integration inventory

## Preserve as one unit

- `report.md`: outcome, limits and failed-history classification.
- `reproduction.md`: readback and future-campaign procedure.
- `archives/fresh-v5-evidence.tar.gz`: complete successful chain, including
  source assets/maps, all six functional outputs, four raw coverage captures,
  authority, guard, 45 controls, all 72 timing totals and cleanup receipts.
- `source-provenance.json`: exact current commit/tree, the omitted source
  archive's stored/decompressed hashes and deterministic recreation command.
- `archives/frozen-protocol-lineage.tar.gz`: protocol versions, design proofs,
  durable old inputs, cadence guard packet and actual-shape review.
- `archives/failed-v3-evidence.tar.gz`: original v3 setup/guard evidence,
  including the failed local-listen attempt.
- `archives/failed-v4-evidence.tar.gz`: complete fresh v4 chain through its
  producer analysis; it intentionally has no passing guard or timing receipt.
- `archives/v5-status-review.tar.gz`: independent actual-v4-shape proof and v5
  two-line status-contract review.
- `current-maps-logs/`: gzip storage copies plus raw/stored/decompressed hashes.
- `key-receipts/`: small direct-access copies of configs, frozen identities,
  authority, functional/count/guard/control receipts, timing stdout/stderr,
  validity analysis and both pre/post-timing manifests.

## Canonical references not redefined here

The repository's official exact-main packet remains authoritative at
`internal/preview-final-20261107/rendering/measurements/official-workcount-cpu-20261108`.
The v5 freeze and reference authority name every used file with stored and raw
hashes. This outcome packet does not relabel itself as the canonical main
packet or as a formal CI baseline.

## Integration constraints

- Copy the packet without changing archive or receipt bytes.
- Keep `source-provenance.json` with the packet; do not add the redundant
  whole-repository source archive unless an environment cannot access the
  recorded Git object.
- Keep failed v3/v4 artifacts and successful v5 artifacts distinguishable.
- Do not replace the capture receipt's pending-readback status; the separate
  validity-analysis receipt supplies the successful readback classification.
- Keep the 69-byte stderr and its exact-known pre-work classification.
- Keep reported driver medians distinct from medians reconstructed from rounded
  samples.
- Do not claim per-run bucket/count data, MessageChannel arming-task CPU,
  end-to-end lifecycle CPU, a cross-campaign speedup/regression, or a formal
  confidence interval.
- Record root CI green as parent-verified context, separate from benchmark
  evidence.
