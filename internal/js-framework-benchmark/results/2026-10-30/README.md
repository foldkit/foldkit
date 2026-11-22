# Local benchmark results, 2026-10-30

This batch runs seven keyed implementations through js-framework-benchmark at `ca8715d9ae84916fd24de3a79457d8c328f9b766`. These are local results collected for the Foldkit performance page. Official results are maintained [upstream](https://krausest.github.io/js-framework-benchmark/index.html).

- [Run metadata](./run.json) records the machine, software versions, source and bundle hashes, entry selection, commands, and sample counts.
- [Raw results](./results.json) preserve the upstream result objects and every sample, including min, max, mean, standard deviation, and median.
- The [entry README](../../README.md) explains how to rebuild and rerun the comparison.

The performance page reports median CPU `total` values in milliseconds and median browser memory in MiB. Memory comes from `performance.measureUserAgentSpecificMemory()` after a forced major collection. It includes memory beyond the JavaScript heap.

The upstream script and paint timing fields are preserved in the raw output. The public timing tables use `total`, following the upstream guidance that script-only timing is experimental. Transfer-size measurements use the upstream default of one sample; their first-paint observation is not a repeated startup benchmark.

CPU cases run sequentially in the upstream runner's fixed order for each operation, in visible Chrome. This batch is not position-balanced. Memory cases run separately in seven isolated headless Chrome instances, one per entry, using the same settings for every entry. System memory pressure was normal during collection. Headless concurrent memory measurements are a separate configuration from the headed timing pass. Hardware, browser scheduling, and run order can affect results. Compare entries within this batch rather than combining these samples with other machines or upstream published results.

The Foldkit entry uses an unreleased workspace build based on 0.170.0, with `createKeyedLazy({ evict: 'AbsentFromRender' })` to remove cached rows absent from a successful render. The source commit in the metadata identifies the implementation tested. This option addresses the retention reported in [issue #1536](https://github.com/foldkit/foldkit/issues/1536).
