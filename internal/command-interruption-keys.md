# Keyed Command cancellation

## Confirmed failure

A named Command with `{ id, revision }`, `keyFields: ['id']` and a callback
reading `revision` was accepted, although its Interrupt constructor accepted only
`id`. Starting produced `draft:7`; cancellation produced `draft:undefined` and
returned `NotFound`. Even a valid callback using `JSON.stringify(args)` saw the
full invocation record on start and only selected fields on cancellation.

## Repair and consumer contract

Both `Definition.makeCommand` and `Command.define` infer the selected tuple
before typing `toKey`. Required finite literal positions guarantee their fields;
uncertain union, broad, optional and rest positions do not. Public
`Command.InterruptOption` uses the same rule. A precise extracted singleton
policy keeps its selected field required. Broad policies must handle uncertain
fields as optional. Narrow mixed or differently keyed policy unions before
constructing the Command. Generic payload Schemas and safe generic policy
forwarding remain supported.

Runtime snapshots `keyFields` and passes only selected own properties to the
same key function for invocation and interruption. That record has no prototype.
Handlers, invocation metadata and Interrupt args retain their original objects.
No new helper or application wiring is required. The repository selector audit
found no consumer depending on unrelated callback fields.

The equivalent `Schema.Struct.Type<Fields>` projection avoids repeatedly
expanding the same decoded args through the general Schema interface. It keeps
the safety repair within the original compiler ceilings. It does not weaken
handler construction, result Messages or Service checks.

## Verification

The focused runtime suite passes 15 tests, including actual registry
interruption, decoded args, selected own/inherited properties and captured key
fields. Source and relocated declarations cover owned and primitive definitions,
attached and host-owned handlers, literal and uncertain tuples, extracted
policies, generic payloads, exact Interrupt args and Services. Restoring the
original production code fails all three new runtime regressions and accepts
five selector-invalid fixtures that the repaired source and declarations reject.

All six fixed compiler fixtures pass in the combined candidate. Workspace four-
and eight-group Types are 205,020 and 278,605 against ceilings of 206,314 and
280,523. No ceiling changed. Builds and measurements use package-local official
TypeScript 7.1.0-beta; the root TypeScript 6 shim is not equivalent evidence.

[Active interruption guidance](../packages/website/src/page/core/commands.md)
and the [previous-preview upgrade guide](../packages/website/src/page/previewUpgrade.md)
record the breaking annotation tightening. The final-overload diagnostic
limitation remains [separately documented](command-diagnostic-assessment.md).

Exact patch and mutation evidence:
`/private/tmp/foldkit-command-key-fields/REPORT.md`.
Combined release gates:
`/private/tmp/foldkit-release-ready-20261025/verification/`.
