# Preview API adoption audit

## Status and scope

This audit covers the preview preparation commit based on `31d8aad9fe4555112b3cf8e2d948badeee9ced0d`, including the concurrent work reviewed before that commit. It covers all example source, the Typing Game client, Website application source and active snippets, `packages/ui` source and fixtures where the APIs apply, and the create-app SSR/SSG templates. Generated output, installed dependencies, and published historical blog material are outside the count.

All three focused helpers take producer callbacks and expose `.fromMessage` for payload-only producers. `Composition.makeUpdate` is record-only, and the owned ManagedResource registry exposes `.layer`. The application migration and intentional exceptions below have been inspected. Final source checks pass all 53 repository configurations; core/UI source and relocated-declaration harnesses pass. Independent review verifies the repaired wide contextual Room update and all 28 adversarial return-channel cases. Workspace emits 110 declarations and passes strict relocated consumption through its private two-file boundary. Final performance and artifact evidence are recorded separately in the release handoff; approval remains required.

The audit combines a TypeScript AST inventory, focused text searches, and manual
review of semantic candidates. Counts cover the named repository roots; they are
not a universal claim about downstream programs. Published historical blog
material and its dedicated snippets remain unchanged.

## Subsequent testing adoption

Parent Stories now use `toParentMessage` from `foldkit/test` when they need to
supply a decoded child fact through its actual Binding. The migration removes
mapper-only `embedView` calls and hand-authored generated envelopes across the
examples, Typing Game and Website. Nested tests wrap one exact Binding at a time.
Five UI white-box wrappers remain because their Bindings are private; no
production exports were added solely for those tests. [Contract and exceptions](test-parent-message-assessment.md).

Workspace's Board rollback, Issue Detail save and Project Settings save Stories
now deliver concurrent Messages while the original Command remains pending.
They explicitly resolve that Command afterward. Direct pending-state fixtures
remain for unsolicited/mismatched completions, the pending state itself, or
unrelated lifecycle work. [Adoption and semantics](story-concurrency.md).

Extracted own-field edits followed by an emitting connected operation retain a
purposeful `Parameters<typeof operation>[0]` input annotation. The bounded
alternatives did not infer that contract; no broader helper was added. [Split-file proof and decision](extracted-step-inference-assessment.md).

Auth's two complete tagged child variants now use `makeVariantBinding` from
`foldkit/variantBinding`. Their policies, initializer calls, Commands and owner
placements are unchanged. No other scoped consumer has the helper's exact
whole-variant shape. Nested/wrapped/custom relationships retain accessors.
[Assessment and measured optional cost](variant-binding-assessment.md).

## Final initialization and delivery adoption

The optional `initAndAppend` leaf replaces six repeated append writers:
Workspace's Issue Detail, Board and Project Settings, plus Job Application's
Education, Work History and Skills Entry collections. Each Binding already
owns `init.instances` and `init.toItem`. Counters and the keyed-init guide keep
explicit writers because they also change the next ID. Other storage,
replacement and mixed parent transitions retain explicit `Binding.init`.
[Scope and proof](dynamic-child-append.md).

Workspace's existing conflict Scene now keeps one exact save Command pending,
delivers its registered activity Subscription and verifies the teammate comment
before resolving the conflict. `Story.messageWith` and registered Subscription
emission are documented and verified through installed public contracts; existing
Stories need no conversion when they already have the Message or intentionally
simulate a different input source. [Contracts](testing-event-delivery.md).

The Command selector sweep found no callback reading outside its selected keys.
No application migration is needed for the tighter cancellation contract.
[Source, emitted and runtime proof](command-interruption-keys.md).

The final ordinary Workspace root emits 115 declarations (13,222,561 bytes) and
passes strict relocation. This supersedes the earlier audit's serialization
count; it does not promise unlimited whole-application declaration scaling.

## Composition update records

The current AST inventory finds no callback-taking or no-argument
`Composition.makeUpdate` call in the scoped consumers. It distinguishes literal
records from the six shared generic UI handler records.

| Surface                      | Literal records | Record references | `withContext` |
| ---------------------------- | --------------: | ----------------: | ------------: |
| Examples                     |              61 |                 0 |             0 |
| Typing Game client           |               2 |                 0 |             1 |
| Website application          |              13 |                 0 |             0 |
| UI package                   |              41 |                 6 |             0 |
| Create-app SSR/SSG templates |               2 |                 0 |             0 |
| Active Website snippets      |              84 |                 0 |             2 |

This scan recognizes the actual `*Composition.makeUpdate` calls and their
contextual form. Active snippets are selected from non-blog page references;
these counts do not include the historical snippet directory wholesale.

The three contextual sites are [Typing Game Room](../packages/typing-game/client/src/page/room/update/update.ts), [parent state in update](../packages/website/src/snippet/blockParentStateInUpdate.ts), and [curried update context](../packages/website/src/snippet/updateCurriedContext.ts). Their context parameters remain at the context factory rather than being hidden by casts or repeated generic argument lists. The migration rule likewise preserves optional, default, and rest parameters at that boundary when present.

The record migration keeps exact Message payloads at each handler and passes compatible Steps or named handlers directly. Message-free and routed-only Compositions use `{}`. Ordinary handlers that return only raw local results still return those results directly. They do not need `makeStep`, `makeFieldsStep`, or another wrapper merely because the outer update is record-authored. Definition-owned Steps remain necessary when one handler combines local branches with connected Binding recipes, because the Step preserves the connected result channels and registration evidence.

## Step authoring helpers

### Examples and Typing Game

All 35 example applications and the Typing Game were inspected. The literal
handler-result inventory reviewed 291 candidates, including Workspace's
concurrent work. It converted 249 single-purpose handlers: 159 fields-only,
49 no-op, 23 Commands-only, and 18 OutMessage-only. Four additional extracted
handlers now retain their exact Message contracts. Five old OutMessage value
calls and the Board's dynamic OutMessage adapter use producer callbacks.

Payload-only producers use `.fromMessage`; producers reading the Model retain it.
Compatible existing Steps and Binding operations remain direct record entries.
The 39 cohesive mixed results remain direct. Three guarded results also remain:

- Workspace `FailedAddComment` preserves Model identity for a stale failure.
- Workspace `FailedSaveProject` preserves Model identity for a stale failure.
- Todo `AddedTodo` preserves the Model for empty input and produces a Command on
  the accepted path.

Crash View and State Machine had no eligible focused-helper conversions. This is
an intentional assessment, not a missing compilation target.

### Website and active snippets

The Website migration converted 46 literal handler results and then inspected
nonliteral candidates separately. Search's stale-query guard uses a fields
producer, route-change coordination passes a combined Step directly, link
handling uses a payload-only Commands producer, and Note Player input validation
uses a payload-only fields producer. The one-use Example Detail source-display
wrapper was folded into its handler. Block Page now has a normal Definition
module used by its authoring helpers.

Cohesive mixed transitions remain direct: Search keyboard/query behavior,
playback, theme/browser-environment reactions, and root init/route coordination.
Coming from React retains its whole-record `Record.set` demonstration rather
than inventing field-transform semantics for a different Model shape.

A further 39 single-purpose handlers in 17 active teaching snippets now use the
focused helpers. Five snippets used a Composition without declaring it; they now
create their graphless Composition beside the Definition. A strict 14-snippet
check includes the new Message-producer example and complete affected examples.
Other source snippets are deliberate contextual excerpts. Historical examples
and labelled bad/before comparisons are preserved.

### Generic UI kernels and scaffolds

Listbox and Combobox now supply genuine per-Message handler records through a
private `makeUpdateHandlers` helper. The six completed variants no longer delegate
every tag to one aggregate internal dispatcher. Normal open/close operations do
not inherit an unrelated `Selected` OutMessage. Independent review checked the
original/next Model distinction, Command construction, Animation ordering, and
the existing generic selected-value refinement boundary.

The remaining UI audit added 16 useful conversions in eight files: ten
fields-only Steps and six no-op Steps. Payload-only fields use `.fromMessage`;
Slider's root specialization retains its fresh Definition owner. Guarded mixed
transitions, connected Dialog/Menu/Popover kernels, Tooltip visibility folding,
Toast entry transforms, and compatible named transitions remain intact.
Scaffold SSR/SSG updates already use records; their boot/navigation results
remain cohesive mixed transitions.

### Current syntax inventory

These are call-site counts, not counts of transitions requiring conversion.
Point-free helper references and generic factory arguments add adoption beyond
this table.

| Surface                 | Fields | Fields `.fromMessage` | Commands | Commands `.fromMessage` | OutMessage | OutMessage `.fromMessage` | No-op |
| ----------------------- | -----: | --------------------: | -------: | ----------------------: | ---------: | ------------------------: | ----: |
| Examples                |    136 |                   101 |       24 |                       7 |         13 |                         9 |    62 |
| Typing Game             |      3 |                     3 |        6 |                       0 |          0 |                         2 |    17 |
| Website application     |     42 |                    37 |        6 |                       2 |          1 |                         1 |    20 |
| UI package              |     15 |                     4 |        9 |                       0 |          2 |                         0 |    20 |
| Active Website snippets |     41 |                    15 |        9 |                       1 |          1 |                         1 |    14 |
| SSR/SSG scaffolds       |      0 |                     0 |        0 |                       0 |          0 |                         0 |     0 |

No audited application exposes `FieldTransforms` merely to describe its internal
producer. Extracted Message-dependent handlers use the exact owning variant
when there is no surrounding record to provide contextual typing. Explicit
`any` generic arguments or targets remain a TypeScript erasure boundary; the
migration does not use them to evade callback validation.

## ManagedResource handler Layers

All four eligible full registries now use their owned aggregate `.layer`:

- [Managed Resource Layer example](../examples/managed-resource-layer/src/application.ts)
- [WebSocket Chat example](../examples/websocket-chat/src/layer.ts)
- [Website playground](../packages/website/src/page/playground/playground.ts)
- [Website Note Player](../packages/website/src/page/home/notePlayerDemo/notePlayerDemo.ts)

The active Layer snippet uses the same form. Empty registries expose
`Layer.empty`. Mixed or host-owned registries keep explicit entry providers.
The registry key `layer` is reserved and the aggregate metadata is not a resource
entry. The removed `ManagedResource.handlersLayer` helper has no compatibility
alias.

## Record and HashMap child Bindings

No eligible application storage was found for `makeMapBinding`. The only scoped `readAll`/`writeAt` custom keyed Bindings are three UI test fixtures backed by arrays: two nested/drag-and-drop occurrence fixtures in [dragAndDrop/test.test.ts](../packages/ui/src/dragAndDrop/test.test.ts) and one keyed Toast slot fixture in [toast/publicFixture.test.ts](../packages/ui/src/toast/publicFixture.test.ts). Their custom array replacement and fixture-specific wrapper behavior do not match the Record/HashMap helper.

The HashMaps in [api-cache](../examples/api-cache/src/model.ts) and Website snippet disclosure state are domain caches, not collections of child Block Models. Converting them into Bindings would change ownership rather than remove adapter boilerplate. Other Website `Schema.Record` fields hold domain data such as file contents, disclosure flags, or release metadata and are likewise ineligible.

The active [keyed map fields snippet](../packages/website/src/snippet/blockKeyedMapFields.ts) contains the two intended `makeMapBinding` examples: a direct `Schema.Record` child field and a wrapped `Schema.HashMap` child field. This is documentation coverage, not evidence of a production consumer that needed conversion.

## Pending Command argument inspection

The canonical Typing Game join test now uses `Command.argsOf(SavePlayerSession)` twice to compare the exact captured persistence arguments from the public `informJoined` operation and the canonical `SucceededJoinRoom` transition. The test retains its exact `HandlerOf<typeof SavePlayerSession>` requirement assertion and checks both Model evolution and absence of an OutMessage.

The active [testing Command arguments snippet](../packages/website/src/snippet/testingCommandArgs.ts) keeps the qualified testing contracts `Story.Command.argsOf(Paint)` and `Scene.Command.argsOf(Paint)`. Those names teach where the projection lives in each simulation API.

Other testing mechanisms remain where they assert a different contract:

- `Command.resolveAllExact` continues to check the complete pending Command sequence, including Definition identity and result Messages.
- The private UI drag-and-drop test helper keeps `__commandMatches` because it needs a boolean identity match while selecting among pending commands and preserving its Binding-specific helper contract.
- Cardinality and keyed occurrence selection remain explicit; `argsOf` projects arguments from one Command and does not choose the occurrence for the caller.

## Verification and limits

The semantic application migration passes formatting and application lint for
its 60 changed files. Focused application runtime coverage passes 270 tests:
Workspace 160, Typing Game 29, Pixel Art 38, WebSocket Chat 20, Managed Resource
Layer 13, and Generative Art 10. These results preserve the exact scope of those
runs; they do not replace the final coherent source sweep.

The new focused-helper lint controls fail 11 of 19 cases with the original
plugin and pass all 19 after the ownership fix. The full plugin suite passes
622 tests, including the serialization-boundary controls. Local alias/import ownership limits remain documented.

The generic UI repair passes source/build, renderer branding, 305 focused
runtime tests, and independent behavioral review. Website source checking passes
against its matching artifacts. The complete Website runtime run passes 1,480 tests in 38 files against the
matching UI artifacts. A test fixture reuses its already prepared stable
manifest rather than repeatedly spawning pnpm for identical input; deployment
assertions and timeouts are unchanged. Verification uses the repository-pinned
cached pnpm, excluding a stalled default-Corepack run. The full UI suite passes
1,298 tests in 67 files.

The complete core runtime suite passes 3,700 tests, with one intentional skip.
Coverage gates pass: Statements 91.00%, branches 85.07%, functions 89.32%, and
lines 91.26%. Three stale runtime fixtures now use records while retaining their
original runtime identity/presence tests. Raw full-Message completion is now
explicitly rejected, matching the removed manual-routing escape hatch.

The final source sweep passes all 53 configurations with stable framework source and artifact hashes. It covers all examples, Typing Game, Website, UI, internal harnesses and Vite fixtures. The final sweep caught seven private harness/fixture files using the callback or no-argument form; those now use records. TodoMVC passes its existing exhaustive handler record directly, preserving the benchmark’s hot-path design. The profiling wrapper remains attached to every named handler. Vite's complete suite passes 331 tests with three intentional skips; the sandbox-blocked loopback run is excluded.

Three Typing Game helpers now follow `handle<MessageTag>` naming: `handleUpdatedRoom` and the two `handlePressedKey` helpers. Their context and curried calling contracts are unchanged; the adapters perform real argument adaptation. Targeted source/lint and all 29 Typing Game tests pass.

The final combined encoding passes all five unchanged compiler ceilings twice. Independent source and emitted controls reject invalid recipes, raw/recipe unions, erased channels and wrong registration. Faster unsafe controls were rejected before integration. The final shared declarations match the reviewed pin. The private Workspace boundary emits 110 declarations (11,452,935 bytes) and passes physically relocated strict consumption; it does not establish unlimited serialization or an editor speedup.

All nine packages are packed locally, and the isolated Coverchart and SPA/SSG/SSR consumers pass source, lint, tests, builds and browser checks. The actual Coverchart repository is unchanged. Workspace’s complete production browser suite passes 32 cases. Final fingerprints, post-freeze nonsemantic changes, performance measurements and approval gates belong in the [release handoff](next-preview-release-handoff.md). This report does not promote the published Ready snapshot.
