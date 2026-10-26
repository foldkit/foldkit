---
'foldkit': patch
---

Accept Effect DateTime and TimeZone data in nested ViewInputs without treating their inspection-protocol methods as application callbacks. Preserve rejection of added application callbacks, including callback-bearing values inside arrays, Options, and unions, with precise diagnostic paths.

Retain the OutMessage attached with `Update.withOutMessage` after homogeneous and nested connected `Update.combineSteps` results. Preserve the inferred Model, Command requirements, registration evidence, and checks against discarding a registered child policy's OutMessage.
