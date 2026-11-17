---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Prevent DevTools stack overflows when inspecting Models or Messages containing Effect `Chunk` or `BigDecimal` values. Chunks display as arrays of their converted elements, and BigDecimals display as decimal strings without modifying their normalization caches. Circular references display as `[Circular]`.

Prevent history recording from overflowing on cyclic Models, including normalized BigDecimals. Changes in a shared value are reported at every Model path where it appears.

The Vite plugin prebundles `effect/Chunk` and `effect/BigDecimal` alongside the application's Effect imports so development builds share one Effect dependency graph.
