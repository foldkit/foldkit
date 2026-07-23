---
'@foldkit/oxlint-plugin': minor
---

Add the `no-route-query-constructor-default` rule, which flags `Schema.withConstructorDefault` on `Route.query` fields. A constructor default makes the field optional in the tagged struct's constructor-input type, and `Route.mapTo` consumes that type on its encode side, so it no longer matches the required field `Route.query` parses and the `Route.query` plus `Route.mapTo` pipe stops typechecking with an opaque error. The rule reports the offending call directly so the fix is obvious: drop the default and model the missing parameter with `Option`. Enabled on app route code alongside `no-hardcoded-route-strings`.
