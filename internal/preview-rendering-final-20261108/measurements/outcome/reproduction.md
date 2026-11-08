# Reproduction guidance

This is a private evidence packet, not a CI benchmark. Reproduction requires a
deliberately quiet local window and the exact pinned tools recorded in the v5
freeze receipt. Do not reinterpret a rerun as the same campaign or combine its
samples with the retained 72.

## Read back this packet

1. Verify `final-files.sha256` from the packet root. Its paths are relative to
   the packet, so run the check with the packet as the current directory.
2. Verify `current-maps-logs/manifest.json`. Each entry records raw bytes/hash,
   stored gzip bytes/hash and decompressed hash.
3. Verify `archives/manifest.json`, then extract
   `archives/fresh-v5-evidence.tar.gz` and
   `archives/frozen-protocol-lineage.tar.gz` into a private temporary directory.
4. Verify the extracted v5 evidence's `pre-timing-stage-files.sha256` (45
   entries, SHA-256 `420ba2a030fa7fc787f7a4ded68e76310eda8d4cb713e439ae3d3fb25243e45a`)
   and `fresh-stage-files.sha256` (51 entries, SHA-256
   `890dc2e07d2c4303fe6fe9ef026c21e967da1e58462a85320955bfb760a59c62`).
5. Read `key-receipts/v5-validity-analysis.json` for the 72 rounded totals,
   paired analysis and measurement limitations. The capture receipt remains
   `capture-complete-pending-readback`; the separate validity analysis is the
   authenticated readback and classifies stderr.

## Recreate the source and assets

`source-provenance.json` identifies exact current commit
`6f1c988e1096b7285066892e8eabac74cda131ea` and tree
`34036283c1913ceb5a3b5a202ca2ac541f95e5d3`. The repository-sized packet omits
the redundant whole-repository archive. Recreate it, when needed, with:

```sh
git -C <foldkit-checkout> archive --format=tar 6f1c988e1096b7285066892e8eabac74cda131ea | gzip -n > current-source-6f1c988.tar.gz
```

The provenance receipt records expected stored and decompressed-tar hashes. The
main source identity is `a471adb24d750ab9e8d8312edad53ff6f26d961b`.

The fresh v5 evidence archive includes the ordinary assets, hidden-map twins,
source maps, build/map logs and all receipts. Canonical exact-main map and old
capture evidence is also available in the repository at:

`internal/preview-final-20261107/rendering/measurements/official-workcount-cpu-20261108`

Its exact files and hashes are frozen in the candidate receipt and reference
authority. Prefer verifying those immutable references rather than creating a
second canonical copy.

## Absolute original paths after extraction

The packet's own `final-files.sha256` uses relative paths and is portable. The
two v5 stage manifests inside the evidence archive intentionally preserve the
absolute paths used during capture, for example:

`/private/tmp/foldkit-final-rendering-evidence-6f1c988-v5/...`

If that original directory still exists, run those manifests there unchanged.
After extracting elsewhere, do not edit the retained manifest. Instead create a
temporary remapped stream while positioned in the extraction parent:

```sh
sed 's#  /private/tmp/foldkit-final-rendering-evidence-6f1c988-v5/#  ./foldkit-final-rendering-evidence-6f1c988-v5/#' \
  foldkit-final-rendering-evidence-6f1c988-v5/fresh-stage-files.sha256 \
  | shasum -a 256 -c -
```

Use the same substitution for `pre-timing-stage-files.sha256`. This remaps only
the check location; it does not alter the authenticated manifest. Paths in
receipts that point to the original Foldkit checkout or canonical repository
evidence remain provenance facts. Verify those against a checkout containing
the recorded Git object and canonical evidence path; do not rewrite them as if
they were packet-relative.

## Canonical command order for a new campaign

Use the exact Node path frozen in the receipt and a new evidence root/config.
Do not reuse or rewrite retained receipts.

1. `freeze-candidate.mjs config.json`
2. `BUILD_SLOT_GRANTED=1 assets.mjs config.json`
3. `reference-authority.cjs config.json`
4. `preflight.mjs config.json`
5. `coverage.mjs config.json`
6. `analyse-coverage.cjs config.json`
7. `verify-coverage.mjs config.json`
8. `offline-negative-controls.mjs config.json`
9. After independent review and an explicit quiet-window grant:
   `QUIET_WINDOW_CONFIRMED=1 TIMING_SLOT_GRANTED=1 timing.mjs config.json`
10. Only after browser/server cleanup: `analyse-timing.mjs config.json`

Before each browser stage, confirm only scoped benchmark processes and the
configured ports. Do not kill unrelated applications. Run exactly one six-slot
by 12-round cyclic batch, preserve failures, and do not discard warmups,
samples or outliers. Keep standard instrumentation unchanged. A new run must
report its own source/tool/asset hashes and cannot inherit this campaign's
performance conclusion.
