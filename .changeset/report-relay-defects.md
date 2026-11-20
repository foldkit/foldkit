---
'@foldkit/vite-plugin': patch
---

Print unexpected errors from the DevTools MCP relay. Before, an unexpected error stopped the relay and the dev server printed nothing about it. For example, with `effect` 4.0.3 or later the relay did not start and printed no output.

The dev server now prints `[foldkit:devTools] MCP relay failed with an unexpected error` followed by the error on stderr. Stopping or restarting the dev server does not print this line.

Thanks @Makisuo for the report and the diagnosis.
