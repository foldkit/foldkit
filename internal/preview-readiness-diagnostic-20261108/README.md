# Website readiness diagnostic

One fresh run of the complete Website suite passed all 22 tests on their first
attempt with five workers. It used the actual repository config, existing
assertions and timeouts, a dedicated port and diagnostic trace retention. No
failed trace was produced, so this is a valid non-reproduction of the earlier
intermittent hydration timeout, not evidence that the timeout is fixed.

The [outcome report](measurements/REPORT.md) and
[reproduction inventory](measurements/README.md) preserve all setup attempts,
the complete test results, source/tool hashes, logs and cleanup checks.
Two external-config attempts stopped before tests; the valid run used the
repository config directly with CLI overrides. No timeout, readiness marker,
client warmup or snippet registry changed.

Earlier successful-retry traces showed a large eager client-module graph.
Those traces do not establish why a failed first attempt timed out. A causal
diagnosis still needs the first failed attempt's network and console timeline.
Do not repeat passing runs to claim the intermittent problem is resolved.
