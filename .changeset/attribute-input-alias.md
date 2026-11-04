---
'foldkit': minor
'@foldkit/ui': patch
---

Include published `ChildAttribute` values in `Attribute<Message, MountRequirements>`, and use that alias throughout ordinary, keyed, textarea, and CustomElement builders. This improves typechecking of shared attribute bundles across many Message types while preserving the registered Mount requirements of both local and child attributes. CustomElements also retain Mount capabilities supplied through a registered child Binding.

`Attribute` now describes every element input, so narrow with `'_tag' in attribute` before reading a local discriminator. Use the new `TaggedAttribute` type for raw-only producers passed to `childAttributes`; already-published ChildAttributes retain their existing dispatcher. DragAndDrop and Slider's raw producers use that narrower contract. Runtime attribute processing is unchanged.
