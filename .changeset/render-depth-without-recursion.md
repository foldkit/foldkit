---
'foldkit': patch
---

Refuse a deeply nested view with the documented depth-limit error instead of a stack overflow. `renderToString` caps nesting at 1000 levels, but the check ran inside recursive walks, so reaching it depended on the available call stack. On Node 22, a view nested just under the limit could crash server rendering with `RangeError: Maximum call stack size exceeded`. At greater depths, the reserved-content or controlled-select traversal could overflow before reaching the guard, so the `SerializationError` carried a `RangeError` instead of the depth-limit message.

The limit is now checked in a pass that does not recurse, before serialization walks the view. Serialization and the check for reserved hydration attributes keep their own work stacks, so views at the boundary render consistently and a view past it gets the depth-limit error however deep it is. Deep markup inside a trusted `h.InnerHTML` is not counted toward the limit.

The depth check now runs before serialization, so it takes precedence over errors discovered while serializing the view. For example, a view past the limit gets the depth-limit error even when an earlier controlled `<select>` has no matching option. The count also includes children the serializer does not write, so elements nested past the limit inside a raw-text element such as `<script>`, `<style>` or `<noscript>` get the depth-limit error instead of the error that refused those children.

The limit, the error message, `SerializationError`, and the rendered markup of every view within the limit are unchanged.
