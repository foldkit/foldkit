---
'foldkit': minor
---

`Attribute<Message>` now includes `ChildAttribute`, and element constructors take `ReadonlyArray<Attribute<Message>>` instead of `ReadonlyArray<Attribute<Message> | ChildAttribute>`. Nothing changes at runtime, and every attribute array that compiled before still compiles.

Before, each element constructor wrote the union `Attribute<Message> | ChildAttribute` itself. That union has no alias, so passing an `Attribute<never>` bundle (from `inertHtml` or a library) to an element made TypeScript compare all of the attribute variants one by one, once for every Message type in the app. In an app with a few hundred view Message types, this filled the checker's relation cache. Type checking then took many gigabytes, and later comparisons failed with TS2859 "Excessive complexity comparing types" in unrelated files. Because `ChildAttribute` is now part of the alias, that comparison is a single check of the alias's type argument.

Code that reads `_tag` from a value typed `Attribute<Message>` must now rule out `ChildAttribute` first, for example with `'_tag' in attribute`. Within Foldkit, the tagged variants are the internal `TaggedAttribute<Message>`.
