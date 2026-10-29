---
'foldkit': minor
'@foldkit/ui': minor
'create-foldkit-app': patch
'@foldkit/markdown': patch
---

Declare decoded types beside their Schemas and use the named types in explicit value annotations throughout active examples, documentation, and scaffold templates. A Schema and its decoded type share a name; the type declaration follows the Schema without a blank line. Schema-valued API arguments continue to use `typeof SchemaName`, and owned callback parameters remain inferred.

Expose same-named decoded aliases for `CalendarDateFromIsoString` and `VirtualList.ApplyScrollOutcome`. Existing generic and recursive contracts retain their precise types. This convention does not change runtime behavior or require consumers to rewrite compatible annotations.
