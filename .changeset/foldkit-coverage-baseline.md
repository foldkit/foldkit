---
'foldkit': patch
---

Add a v8 coverage provider and wire coverage into the `test` script with baseline thresholds. Coverage now runs in CI and the pre-push hook through the existing `pnpm test` path, so a drop below the baseline fails the build. Thresholds sit a few points under the current numbers to leave headroom for normal run-to-run variance, and ratchet up as coverage improves.
