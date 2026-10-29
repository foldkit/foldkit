# Schema type alias adoption

The active repository uses a decoded type immediately after its Schema, with
the same name and no blank line. Explicit decoded-value annotations use that
name. Schema-valued contracts use `typeof Foo`, and owned callback parameters
remain inferred.

This pass follows `c99819972004ec57718344626ec153c2412a522c` on
`codex/workspace-example`. It applies the convention to implementation code,
ordinary runtime tests, all example apps, Website source and snippets, Typing
Game, scaffold templates, package READMEs and active agent guidance. Generated
Website demonstration source and its highlight anchors also follow it.

## Contracts and exceptions

Local aliases describe each Block's owned contracts. Consumer aliases derived
from completed Blocks preserve the checked assembly boundary. Extracted Message
and Route handlers use precise variant aliases beside the owning union.

Generic UI and Query contracts retain their parameterized refinements. Recursive
Canvas, Markdown and file-tree contracts retain the declarations their recursion
requires. One-off nested field projections remain direct Schema queries.
Compiler and declaration contract fixtures retain queries that exercise their
typing contract. Lint provenance fixtures retain the source shapes they test.
Published historical material, dated experiment evidence and labeled Before or
incorrect examples are unchanged.

The existing public exports additionally carry same-named decoded aliases for
`CalendarDateFromIsoString` and `VirtualList.ApplyScrollOutcome`. Package entry
points and runtime behavior are unchanged. This is an authoring convention;
consumers do not need to rewrite compatible annotations to upgrade. The shipped
skill package is `0.18.63`.

## Verification

Evidence is under `/private/tmp/foldkit-schema-alias-20261028`; package and
application inventory details are under
`/private/tmp/foldkit-schema-alias-adoption-20261028`.

- All 53 workspace source configurations pass. Four unused-import or namespace
  annotation errors found during the first sweep were repaired and rechecked.
- Script, Lustre benchmark, performance harness and UI browser-fixture source
  configurations pass. The final variant cleanups pass Workspace, UI and Vite
  plugin checks.
- All nine public packages build. Core and UI source/relocated emitted
  declaration harnesses pass with the native compiler.
- A packed external consumer accepts the public Schema/type pairs and rejects
  incompatible values on TypeScript 6.0.3 and 7.1.0-beta, with strict options and
  `skipLibCheck: false`.
- Effect lint excludes the deliberate Machine requirement-erasure rejection
  fixture from `missing-effect-context`, matching its existing behavioral-test
  override. The TypeScript rejection assertion is unchanged and remains checked
  by the source/emitted harness; no production lint rule is weakened.
- Formatting, all three lint passes, Website API generation and client/SSR
  builds pass. Server rendering verifies the organization guide, preview guide
  and Home examples. API generation reports zero errors and 22 link warnings;
  no browser hydration or complete application runtime-suite claim is made.

Erased JavaScript is compared structurally against the base. Executable
implementation bodies are unchanged. The exceptions are displayed source strings
and highlight anchors in `demoCodePlugin.ts`, plus removal of unused runtime
imports and sorting of imported members. A full runtime suite is unnecessary for
these type-only implementation edits; existing Story and Scene behavior was not
rewritten.

## Open compiler-performance release check

The six Block compiler fixtures retain identical instantiation/type counts.
The unchanged Machine fixture exceeds its existing ceiling: 110,086
instantiations and 27,144 types against limits of 83,700 and 18,800. This failure
also reproduces with the packed core from before this migration. Machine's
emitted declarations are byte-identical between those artifacts.

Temporary controls isolate the added work to Query exports reached through the
`foldkit/experimental` barrel. Importing the public Machine subpath or removing
Query from a temporary copy of the barrel yields 71,432 instantiations and
13,728 types. Neither control changes the live fixture or budget. The raw paired
runs, package hash and exact controls are in `machine-budget-diagnosis.md` in the
evidence directory.

The alias migration introduces no measured compiler-count regression. The
broad-barrel overhead is an open release check requiring a deliberate fix or
reviewed measurement decision; it is not a passing gate. Publication remains
held for approval.
