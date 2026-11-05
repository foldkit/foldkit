# Blocks/Layers review follow-ups

Work is based on merged preview `f0c3c102d33b6f4db3826743c2a29dc08c2d57df`
in `/private/tmp/foldkit-unified-recovery-20261103`, on
`codex/blocks-review-followups-20261104`. The eleven user-edited files were
snapshotted before branching and retained byte-for-byte during the branch
change. Their patch and hashes are under
`/private/tmp/foldkit-review-followups-20261104/user-edits-before.*`.

The rejected constructor-local child-authoring experiment changed no production
files. Its untracked code was removed from the separate spike checkout and
archived with its decision record. Module-scope Bindings and ordinary Layer
construction are retained.

## Implementation

- [x] Rotate concrete application contracts to `block.ts`, construction to
      `layer.ts`, and extracted handler bundles to `effectsLayer.ts`.
- [x] Put complete compact Blocks in `block.ts`; retain explicit feature barrels
      and child folders under their owner's `blocks/` directory.
- [x] Apply feature-owned named helper imports without wrapping ordinary handlers.
- [x] Match dedicated Symbol descriptions to Block names and keep key/declaration
      statements adjacent. Verify private/exported identity decisions.
- [x] Prototype both explicit Message generic spellings without changing production
      Step typing. Preserve exact channels and the current annotation spelling.
- [x] Rename the three public ManagedResource requirement lists, reject legacy
      keys and preserve ordinary resource/runtime APIs.
- [x] Verify the concrete opaque-child codec boundary and retain inferred local
      decoder/encoder Services with the advanced explicit bounds.
- [x] Complete the repository-wide Story/Scene behavior-test migration and record
      legitimate fixture, domain, Service and benchmark exceptions.
- [x] Finish active guidance and generated InMessage documentation.
- [x] Finish strict TypeScript 6 declaration nameability for exported field
      helpers and the final source-free snippet check.
- [ ] Complete integrated formatting, lint, types, runtime, declaration consumers,
      compiler ceilings, builds and release checks.
- [ ] Review the exact committed diff, push through the required hook, integrate
      with preview and refresh relevant GitHub feedback.

Publication remains held for the user's review and approval. This follow-up is
separate from #1884's test-only contribution.

This report retains the convention checkpoint's component evidence. The
[November 5 review](preview-review-20261105.md) records the combined candidate,
incoming fixes, final checks and publication boundary.

## API conclusions

The explicit `makeStep<ChangedUrl>(producer)` and
`makeStep.fromMessage<ChangedUrl>(producer)` overload experiment does not preserve
the required inference. With no defaults, TypeScript requires every type argument.
Defaulting the hidden producer/output parameters loses exact Service and
OutMessage channels and rejects an existing returned Step. The current precise
Message-parameter annotation passes Source, emitted and relocated native/TS6
checks. No additional currying stage or generic API is adopted. The bounded
report is `step-message-generics/REPORT.md` in the private evidence directory.

The public ManagedResource lists are `effects.managedResources`,
`operations.<name>.managedResources` and
`inMessageOutputs.<tag>.managedResources`. Resource handles, registry entries,
Runtime resource Contexts and acquisition/release APIs keep their names and
identities. The breaking rename has a minor changeset and migration instructions.

Local Schema codec requirements infer automatically. An opaque child's complete
dispatch Schema can contain additional private descendant requirements that the
parent's local Message Schema cannot expose. `codec.decoding` and `codec.encoding`
publish those additional bounds. The framework proof covers Source, emitted,
relocated and runtime provisioning, including an actual paired Program DevTools
decoder. Normal Message serialization stays self-contained; no codec API change
is adopted. See `framework/REPORT.md` in the private evidence directory.

## Key visibility evidence

Making split-feature owner keys private produces TS2527 on independent inferred
Command, Composition, init, update, view and Layer exports. Restoring those key
exports makes whole Workspace, Website, Auth, Job Application, Counters and
Typing Game declaration emission pass. Compact keys without an external consumer
stay private. Existing public key exports needed by library/relocated consumers
are retained. No key is widened to `symbol`.

The first private emitter configuration omitted an explicit `rootDir`; its
generated source-adjacent declaration files were archived without touching
tracked ambient declarations or user files. Corrected configurations emit only
to the private evidence directory. This was a verification setup error, not a
published or candidate API defect.

## User review notes

User comments are retained for review. The implementation addresses the file
roles, helper imports, key adjacency/visibility, generated `requestOpen`, and
Story/Scene questions. The existing direct Model-first saved-view deletion
handler remains direct; it does not need a Step wrapper. ChangedUrl keeps its
precise Message annotation after the generic prototype's failed channel checks.
The inlined browser-environment loader and Workspace Command handler bodies are
preserved by AST parity checks.

## Convention checkpoint verification

The framework contribution has 59 focused runtime cases, strict Source and
source-free emitted/relocated controls on both compilers, five caught/restored
mutants, and focused lint/format. Its first private compiler run omitted
declaration maps and did not match the normal build. The mapped build exposed a
Workspace type-count regression. Moving the exact requirement-name validation
into a dependency-free type leaf preserves every check and makes all eight
unchanged compiler ceilings pass in the canonical repository build. Declaration
maps and workload bodies remain unchanged.

Independent review also exercised disjoint operation/output unions and optional
configuration properties. The legacy-name check now examines every present
alternative rather than only common required properties. Permanent negative
controls fail before this correction; valid optional `managedResources`
declarations remain accepted. Strict Source and relocated emitted consumers
cover both compilers. The correction changes rejection only, without widening
the effect or registration contracts.

The initial application migration batches preserve Website, Typing Game and
cache behavior. The complete results, exceptions and exact commit will be
recorded after integration checks.

The application audit covers 167 test/support files across 35 examples, Website,
Typing Game and scaffold templates. Its final AST check finds no handwritten
application transitions outside the unchanged Pixel Art timed benchmark. The
full affected suites pass 1,771 cases across 70 files. Intentional `given`
fixtures may extract pure initialization; nested or Model-dependent child
delivery retains scoped `withBlock` and the public lifting helper. Pure domain,
routing and Service execution tests retain their focused form. All 165 original
case titles in the changed logical test files remain present.

The complete integrated public declaration gate passes, including the real
Counters application. Whole-repository typechecking passes. Further checks are
still in progress; these results are not a final release approval.

Exporting the exact existing Message-free field-helper interface fixes TypeScript
6 declaration nameability. The permanent fixture fails before the export and
passes after it on both compilers, including strict source-free relocation.
All 61 complete active snippets pass Source and declaration emission on both
compilers. The protected 13 posts and 34 historical snippet files are unchanged.

The generated-CLI smoke check and packed SSR consumer pass. The latter verifies
critical browser behavior in Chromium, Firefox and WebKit. A temporary
verification copy accidentally exposed shared dependency directories to
`pnpm exec`'s automatic installation. The affected core and CLI directories were
archived and their exact dependency links restored from frozen workspace
metadata. All 51 relevant projects now resolve one physical Effect 4.1.0. The
local Markdown failure from the duplicate runtime disappears without a Source
change. Subsequent isolated checks use real private dependency directories,
individual canonical links and direct Node execution.

## New feedback

The November 5 refresh finds no new discussion comments or review threads on
#1655 after the previously assessed October 30 report. Contributions #1886,
#1888, #1889, #1890, #1891 and #1893 are integrated after this convention
checkpoint. The conditional-parent workflow in main-targeted #1892 is repaired
through existing Dialog completion signals. Issue #1887 is addressed by the
Scene integration. The [feedback report](preview-feedback-integration-20261105.md)
records original attribution, separate maintainer repairs and verification.
