---
'foldkit': patch
---

Trim runtime dispatch overhead on the queue-drain hot path.

- `orderByPriority` now partitions a batch in a single forward pass with two small array allocations, instead of two `Array.filter` calls plus `Array.appendAll` plus `Array.map`. Per-call cost in the runtime microbenchmark drops from ~1.9µs to ~1.2µs (-40%).
- `yieldToBrowser` reuses one `MessageChannel` for the runtime's lifetime, scoped via `Effect.acquireRelease`. Previously every burst-budget yield allocated a fresh channel and closed it on cancel.
- `burstStartedAt` and `currentMessage` are now plain closure variables in the queue-drain fiber. They were `Ref`s but were never touched by another fiber, so the per-message `Ref.get`/`Ref.set` pair was pure overhead.
- The DevTools store, installed at most once during boot, is cached in a closure variable instead of stored in a `Ref` that was read on every message and every render-loop tick.
- `processMessage` guards its `Effect.forEach` over `commands` with an `Array.isReadonlyArrayEmpty` check. Most Messages produce zero Commands.

Internal microbenchmark (`RUN_RUNTIME_BENCH=1 pnpm vitest run src/runtime/dispatchBench.test.ts`) on a happy-dom shell, 5000 external Messages per run, 8 measured runs per trial, 4 trials:

- External burst total wall-clock: ~168.8 ms -> ~135.8 ms median (-19.5%)
- Dispatch throughput: ~29.6k msg/s -> ~36.8k msg/s (+24%)
- `orderByPriority` (batch=100): ~1.92µs -> ~1.17µs per call (-40%)

No public API change. View functions, Commands, Mounts, Subscriptions, and DevTools all behave identically.
