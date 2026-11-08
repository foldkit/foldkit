# Child Layer editor costs

## Finding

The multi-second Website diagnostic cost is already present when the editor
infers the imported child implementation Layers. Inferring the root's init,
update, view, Subscriptions and effects in a plain record is substantially
cheaper in this capture. The root completion call and provider composition do
not introduce another multi-second boundary.

This narrows the next investigation to child implementation inference. It does
not identify a particular child, TypeScript alias or framework optimization.
No framework type or application annotation was changed by this measurement.

## Controls

The existing request-scoped native profile now separates two inputs that its
earlier `imports` control collected together:

- `root-inputs` references the real root builders in a plain record.
- `child-layers` references the real child construction Layers in another
  plain record.

Both retain the same imports at the real Website `layer.ts` URI. Neither calls
root completion or provider composition. The other five controls preserve their
existing source shape. Every control runs in a fresh server with exact clean
diagnostics, checked source hashes and bounded server cleanup.

| Control                                | Diagnostic, ms | Profile window, ms | Sampled CPU, ms |
| -------------------------------------- | -------------: | -----------------: | --------------: |
| Passive Block only                     |        431.820 |            529.596 |           1,950 |
| Root inputs only                       |        901.777 |          1,034.926 |           2,350 |
| Child Layers only                      |      3,971.861 |          4,086.313 |           5,750 |
| Root inputs and child Layers           |      4,415.754 |          4,549.442 |           6,770 |
| Root completion, children unprovided   |      4,497.285 |          4,683.369 |           6,420 |
| Complete provided root                 |      4,520.799 |          4,714.776 |           6,240 |
| Complete root, opened before profiling |      4,292.793 |          4,485.258 |           5,180 |

These are single profiled observations, not medians or unprofiled latency
estimates. They cannot establish a speedup, regression or exact incremental
cost. Independent cold controls share dependencies internally, so their values
must not be added together. Sampled Go CPU can exceed wall time because the
compiler runs concurrent work.

The child-Layer profile contains 950 ms of cumulative checker samples and
650 ms of project samples. Broad runtime allocation and page activation
dominate flat samples, as in the earlier capture. Opening the complete source
before profiling leaves a 4.29-second diagnostic with only 10 ms of project
samples. Project loading does not explain the multi-second checker request.
Cumulative groups overlap and must not be added.

## Evidence

The [retained packet](measurements/input-controls/manifest.json) maps all 24
files to their original paths, byte counts and SHA-256 values. It includes the
capture, all seven compressed native profiles, decoded summaries, exact
generated documents, measured tools, guard tests and the failed guard mutation.
Compressed text receipts retain their original decompressed hashes.

The measured source starts from `7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`
with the cadence source later committed as `5c96e577cc`. The editor uses the
existing emitted-package declarations; no shared package build ran during
capture. The separate cadence source change is not a compiler optimization.

- Workload: `6f2d8d3ae1dff3474b7df96b129639f980cfec133616b4eb46c317ec2a739fc7`.
- Measured tool: `c91413f96bf2525aebfcedfa951f2a33d129c17f7bd926dd6941257375db4c9c`.
- Lockfile: `3659249b317572543f8f9e01f4997a099f4fa32ee6285825694fe4b83ebd582f`.
- Node: `26.13.0`, executable SHA-256
  `533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4`.
- Native TypeScript: `7.1.0-beta`, executable SHA-256
  `29f5eb8daa5c8cf6ef1c0cb79fbcf47c0cfdf26edabdf148bb779d0b2d56cebc`.

All seven generated source hashes match their independently regenerated
documents. The tools and workload stay unchanged across the capture. Ten Node
tests pass. Replacing the child-only document with the root-only document makes
the guard test fail at the expected control-source assertion; that mutation
is restored before profiling. Output format version 8 identifies the expanded
control set. Existing format-7 captures remain historical evidence.

The raw capture's descriptive `workload.layerProfile.controls` object lists the
original five controls. Its measurements, profiles, documents and hash checks
contain all seven. The current tool also describes the two added controls; the
retained tool snapshot preserves the bytes used for measurement.

Run the current tool from the repository root after stopping builds, compiler
gates and browser benchmarks:

```sh
NODE_DISABLE_COMPILE_CACHE=1 node packages/foldkit/scripts/profile-block-language-service.ts --scenario layer-profile --runs 1 --timeout-ms 60000 --profile-dir /tmp/foldkit-layer-profiles
```

Use a fresh, nonexistent profile directory. The tool checks compiler identity,
source hashes, profile paths, clean diagnostics and shutdown. The retained tool
copies are snapshots of the measured bytes, not alternate entry points.

## Next investigation

Separate the child exports to identify the expensive implementation subgraph,
then test a bounded framework change against that source. Preserve exact
requirements, host-handler evidence, registrations and portable builder
inference. Application annotations and weaker completion validators are not
supported by these profiles.

The earlier named completion projection was tested and rejected because it
changed only 26 instantiations and two types. Repeating that encoding is not
the next experiment. Any new encoding needs unchanged compiler ceilings,
source-free declaration consumers and balanced fresh-server editor samples.
