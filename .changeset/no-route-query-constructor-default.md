---
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Add the `foldkit/no-route-query-constructor-default` rule, which flags
`Schema.withConstructorDefault` on `Route.query` fields. A field that carries a
constructor default becomes optional in the tagged struct's constructor-input
type, and `Route.mapTo` consumes that type on its encode side. It no longer
matches the required field that `Route.query` parses, so the `Route.query` plus
`Route.mapTo` pipe stops typechecking with an opaque error. The rule reports the
offending `withConstructorDefault` call directly so the fix is obvious: drop the
default and model the missing parameter with `Option`. Scaffolded apps enable
the rule alongside the other Foldkit rules.
