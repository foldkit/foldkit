---
'foldkit': minor
---

Export `FOLDKIT_BUILD_ATTRIBUTE` from `foldkit/experimental/server`. Its value is `data-foldkit-build`, the deployment marker on a hydratable application root. Browser tests can use the constant to wait for the client to remove the marker after successful adoption. A refused handoff retains the marker.
