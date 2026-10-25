---
'foldkit': minor
---

Add optional `makeVariantBinding` from `foldkit/variantBinding` for a child whose complete tagged Model Schema is a direct member of the parent `Schema.Union`. Derive presence and replacement from that tag while preserving native registration, delivery, context, dynamic initialization and lifecycle behavior. Parent Schemas must include the actual child Model Schema; nested or wrapped variants continue to use general accessors.
