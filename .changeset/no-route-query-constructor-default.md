---
'@foldkit/oxlint-plugin': minor
---

Add the `no-route-query-constructor-default` rule, which flags `Schema.withConstructorDefault` inside `Route.query`. Constructor defaults run only during Schema construction, while query parameters are decoded and encoded, so the annotation does not provide a default for a missing parameter. Use `Schema.withDecodingDefaultKey` for a real decoding default or `Schema.OptionFromOptional` to preserve absence.
