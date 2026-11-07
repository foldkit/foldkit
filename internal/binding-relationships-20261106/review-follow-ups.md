# Adoption review follow-ups

The exact-commit review of `bf92d1da26453a7c80031d9480935967886880a4`
identified a Typing Game test helper shadowing its case payload. The helpers now
read `messageInHome` and `messageInRoom`; the existing 14 Story tests and the
client typecheck pass. No application behavior changed.

The Job Application point-free fixture transformations and Query Sync's inline
OutMessage folds and inferred literal collections are preserved user edits.
Query Sync's source typecheck passes.

## Workspace dispatch context

`IssueDetailsBinding.delivery.toUpdateContext` supplies the current canonical
Issue from the parent's Workspace. The child owns its editable draft and
baseline. Passing that Issue as dispatch context keeps canonical server data
owned by the parent.

`initSelectedIssueDetailIfMissing` creates a retained editor only after
`maybeConfirmedIssue` finds its Issue. Workspace has no Issue-deletion operation.
Snapshot merging retains current Issues, and revalidation/failure preserve the
retained Workspace. The assertion therefore expresses an application invariant.
If Issue deletion is added later, its invalidation path must retire the editor.
The resolved inline question is removed; no extra silent fallback is added.

## Evidence and documentation

The unlabelled failing pre-fix `source-proof.current.log` is removed. The final
source receipt is `adoption-source.log`; `adoption-declarations.log` records the
TypeScript 6/7 relocated checks. Prototype-era receipts remain historical and
are identified as such in the main report.

The documentation now distinguishes Message-free custom keyed relationships
from Message-bearing delivery requiring a key Schema; view-only Listbox Item
Schemas from serialized selection Codecs; and required-field examples from the
storage-specific migration rule. Imported lint helper provenance names the
parent Block, and the npm README's Counter source link targets an existing
integrated commit.

## Combined lint gate

The first ordinary push attempt stopped before upload on import-member ordering
and the new fixture's broad `any` extractor. Imports follow the lint rule's local
binding-name ordering. The fixture now infers each `ContractGraph` parameter,
retaining its exact Service, constructor-error and program-requirement
assertions. Source and TypeScript 6/7 emitted-consumer checks, including the
missing-effects mutation control, pass after that change. These repairs change
only type authoring and import ordering. The normal push gate is rerun.
