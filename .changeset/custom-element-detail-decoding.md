---
'foldkit': minor
---

Decode each CustomElement event's `detail` against its declared Schema before invoking the event callback. Invalid details are reported to the console and dispatch no Message, Schema transformations run at the browser boundary, and undeclared fields are removed during decoding.

When a Schema rejects the nullish detail of a payload-less `CustomEvent`, retry with an empty object so `Schema.Struct({})` remains the natural declaration for events without a payload. Schemas that accept the raw nullish value receive it unchanged.

CustomElement event declarations now require Schemas that decode without Effect services because browser event handlers run synchronously. Replace any decoding-service-dependent event Schema with a service-free decoding boundary Schema; encoding services remain supported.

`Scene.CustomElement.emit` now accepts the encoded side of the declared event Schema, matching the detail supplied by the browser before runtime decoding.
