---
'foldkit': patch
---

Register a Mount's fiber and cleanup before its setup runs. If setup synchronously removes its host through a Foldkit DOM patch, the acquired resource is released and Messages emitted after removal are suppressed. Replacement Mounts wait for the previous cleanup before starting, and Block occurrence and DevTools tracking use the registered fiber.

Thanks to [EduSantosBrito](https://github.com/EduSantosBrito) for reporting and reproducing the lifecycle issue in [#1853](https://github.com/foldkit/foldkit/pull/1853).
