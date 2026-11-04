# Scene family construction channels

An automated review on [PR #1883](https://github.com/foldkit/foldkit/pull/1883#discussion_r4465702652)
identified a candidate-only type gap. A shared family provider can have no
construction Error or Service requirements while constructing one specialization
requires a Service or fails. Both paired Scene overloads returned only the
provider Layer's channels. Execution already acquired the specialization, so
those signatures could incorrectly permit an Effect to run without its Service.

Both returns now derive `TestEffect` from `SelectedLayeredRoot`, matching Story
and `withBlock`. Required view inputs, exact Item payloads, initializer arguments,
routing and ordinary Layer requirements remain intact. The runner audit found
no other paired overload using the incomplete raw-Layer projection.

The permanent Catalog family fixture exercises routed and unrouted Scenes with
required view inputs. Before the fix, direct Source and emitted controls fail
six exact channel assertions and four rejection directives. Afterward native
TypeScript and TypeScript 6.0.3 Source and strict relocated consumers pass, with
382 inputs and no framework Source reads. All 904 existing helper tests and five
actual family execution checks pass. The original eight compiler cases pass
without fixture or ceiling changes.

The normal Effect lint configuration excludes missing-error diagnostics only
for rejected declaration fixtures, whose purpose is to assert those invalid
assignments. Their TypeScript rejection controls remain enabled. Accepted
consumers and application code retain the diagnostic. The complete Effect lint
run passes, and a temporary ordinary-path copy of the same assignments still
fails with the missing-error diagnostic. The control is removed afterward.

Only the Scene declaration and its source map change in the emitted package.
Every runtime JavaScript file is byte-identical, so the retained rendering
batches still cover the runtime.
The proof remains in
`/private/tmp/foldkit-scene-family-construction-20261104/receipt.json`.
Auto-merge was disabled while validating the finding. Exact-commit review and the
normal full push hook remain required before restoring integration.
