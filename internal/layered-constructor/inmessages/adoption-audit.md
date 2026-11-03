# InMessage adoption audit

Ordinary application boundaries are migrated. All example, Website, and Typing
Game Definitions that previously exposed parent operations now declare
InMessages and provide an exhaustive receiver. UI’s direct aliases also use
InMessages: Dialog, Popover, HoverIntent, Slider, Animation, Calendar, Combobox,
DatePicker, Listbox, Menu, Toast, and VirtualList. Library adapters retain their
existing public argument shapes. Query's direct aliases also use InMessages.

Active direct-operation teaching snippets are migrated. The generic-picker
snippet retains its scalar library adapter. The remaining factory exceptions
are explicit below; they preserve positional, defaulting, or generic adapters.

## Inventory method and current totals

The inventory parses production `makeDefinition` / `makeFamilyDefinition` calls
with independent `key` and `Init` contracts. It counts an `operations` record once
at its authored location, resolves Toast and VirtualList's local map helpers,
and counts Query's shared maps once across silent and notifying modes. Tests,
historical release snippets, and the retained native Query implementation are
excluded. A matching `rg` pass checks for declarations outside those calls.

Before this phase, 39 production Definition declarations used 93 operation-map
entries. The current source has these remaining declarations:

| Area                 | Remaining Definition declarations | Remaining shared-map entries |
| -------------------- | --------------------------------: | ---------------------------: |
| Examples             |                                 0 |                            0 |
| Website application  |                                 0 |                            0 |
| Typing Game          |                                 0 |                            0 |
| UI                   |                                11 |                           29 |
| Query and KeyedQuery |               4 mode declarations |                            6 |

Query's four mode declarations reuse a one-entry Clock adapter map and a
five-entry keyed argument adapter map. These numbers describe
shared declarations and authored map entries. They do not count distinct
behaviors or independently executed test scenarios. The first adoption pass migrated 32 entries across 24 Definitions. The direct
UI follow-through migrates 20 more entries across 10 Definitions. UI’s remaining
29 entries are scalar, positional, defaulting, or generic adapters; none are
straightforward aliases. Query's follow-through migrates six more entries:
five no-argument Query requests and KeyedQuery reset. The remaining 35 entries
across UI and Query are adapters. The Query production proof's latest receipt
is recorded in [its verification results](../query-production/verification/latest.json).

The active snippet inventory originally contained 11 Definitions with 12
operation entries. Ten of those Definitions, containing 11 entries, now use
InMessages. Only the one-entry generic-picker adapter remains.

## Adopted application boundaries

| Definition                             | Current generated Binding methods                 | Preserved ownership                                                                   |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Job Application PersonalInfo           | `requestRevealErrors`                             | Local field edits and async email validation stay in update                           |
| WorkHistory and WorkHistoryEntry       | `requestRevealErrors` each                        | Parent broadcasts to keyed entries; validation rules are unchanged                    |
| Education and EducationEntry           | `requestRevealErrors` each                        | Parent broadcasts to keyed entries; validation rules are unchanged                    |
| Skills and SkillsEntry                 | `requestRevealErrors` each                        | Parent broadcasts to keyed entries; validation rules are unchanged                    |
| Routing People                         | `informRouteChange`                               | Received route changes retain the existing search/history and Fetch behavior          |
| UI Showcase Ui                         | `requestOpenMobileMenu`, `requestCloseMobileMenu` | Receivers invoke the same connected Dialog transitions                                |
| Workspace CommandPalette               | `requestOpen`, `requestClose`                     | Shared Steps also serve the local keyboard shortcut and result selection              |
| Workspace CreateIssue                  | `requestOpen`, `requestClose`                     | Optional status retains its `Todo` default; create results stay local                 |
| Workspace IssueBoard                   | `informIssueMove`, `informIssueMoveFailure`       | Existing move and rollback announcements are unchanged                                |
| Workspace IssueDetail                  | `informIssueChange`, `requestSave`                | Save shares its Step with form/retry facts; reconciliation and completions stay local |
| Workspace IssueList                    | `requestClearFilters`                             | Incoming request and local `ClickedClearFilters` share the exact emitting Step        |
| Workspace NotificationCenter           | `informActivity`                                  | Existing notification creation/deduplication remains child-owned                      |
| Website ApiReference and ExampleDetail | `informRouteChange` each                          | Loading, slug changes, and local completion handling retain their owners              |
| Website Playground                     | `informSupport`                                   | The parent owns support detection; the child records the received value               |
| Website Search                         | `requestOpen`, `informRouteChange`                | Existing focus/show/close Commands and search transitions are unchanged               |
| Typing Game Room                       | `informJoin`                                      | The existing join/session Step is shared with the local RPC reply                     |

Notification method names are explicitly normalized, without compatibility
aliases. Command results, Subscription observations, and ordinary UI facts stay
in local Message unions. Receivers apply the owned transition directly.

The seven Job Application receivers retain their original validation behavior.
Four feature-local `validation.ts` modules hold rules shared by local edits and
incoming requests, so receive does not import update. Workspace's save/open/close
Steps likewise live independently of their entry points. IssueList retains its
existing outward `RequestedClearFilters` OutMessage.

Website's Search focus and ApiReference loading Commands moved to their owning
`command.ts` modules without changing handler bodies or identities. ExampleDetail
and Playground retain their existing colocated implementation modules. Typing
Game declares one Schema-backed Context domain value and uses it in separate
`Context` and `InMessageContext` tuples. The player's payload and context argument
order are unchanged. Details are in
[Website and Typing Game adoption](website-typinggame-adoption.md).

Counters exposes no parent operation. No reset feature was added for the proof.

## Adopted UI boundaries

| Component             | Received inputs                                                                                                                      | Local behavior retained                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Dialog                | `RequestedOpen`, `RequestedClose`                                                                                                    | Local dismissal facts and Animation completion remain local; exact output bounds remain declared                              |
| Popover               | `RequestedOpen`, `RequestedClose`                                                                                                    | Backdrop/local dismissal shares the existing close transition                                                                 |
| HoverIntent           | `RequestedClose`                                                                                                                     | Local hover timers and observations stay in update                                                                            |
| Slider                | `InformedOfRangeChange`                                                                                                              | The generated method is `informRangeChange`; local pointer/key facts are unchanged                                            |
| Animation             | `RequestedShow`, `RequestedHide`, `RequestedWaitForLeaveSettlement`, `RequestedToggle`, `RequestedResume`, `RequestedImmediateReset` | Existing pure transitions are shared; paint and animation settlement remain local                                             |
| Calendar              | `RequestedDropToDays`                                                                                                                | Days-mode cursor reconciliation is unchanged; date/constraint adapters remain                                                 |
| Combobox Single/Multi | `RequestedOpen`                                                                                                                      | The same opening Steps handle received and local causes; closing/selection adapters retain their exact Item/default contracts |
| DatePicker            | `RequestedOpen`, `RequestedClose`, `RequestedClear`                                                                                  | Existing connected Steps are shared; clear retains its `ClearedDate` output bound                                             |
| Listbox Single/Multi  | `RequestedOpen`, `RequestedClose`                                                                                                    | Opening/closing Steps are shared; refined scalar Value selection remains an adapter                                           |
| Menu                  | `RequestedOpen`, `RequestedClose`                                                                                                    | Local and received paths share model-owned transitions and original output bounds; positional selection remains               |
| Toast                 | `RequestedDismissAll`                                                                                                                | Existing keyed dismissal and Animation policies remain; show/default and scalar dismiss adapters remain                       |
| VirtualList           | `RequestedScrollToEnd`                                                                                                               | The same logical end-scroll transition runs; positional/default/generic inputs remain adapters                                |

Implementations, public barrels, and affected component tests are migrated. The
UI public Message-constructor and parent-policy fixtures preserve protocol
separation. DatePicker and Pixel Art's existing Dialog tests use the actual local
dismissal cause. Slider's generic-composition declaration fixtures, the active
`blockInformExternalState` snippet, two UI pages, and DevTools' method call use
the normalized range notification. The direct UI follow-through also updates all
retired local-request test causes and the eight active UI pages. Existing parent
Binding call signatures are unchanged; no application production call rewrite is
needed.

## Intentional remaining factory APIs

The exact current UI map is recorded in
[UI operation inventory](ui-operation-inventory.json). Its 11 Definition
locations contain 29 adapters:

| Factory               | Retained operations and reason                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Animation             | `requestFinish(generation)` preserves its scalar generation argument                                                             |
| Calendar              | Date/Option/array arguments retain six selection, focus and constraint mappings                                                  |
| Combobox Single/Multi | `requestClose` retains default/resting-text behavior; `requestSelectItem` retains exact Item and positional display-text mapping |
| DatePicker            | Six scalar/date/Option/array selection, focus and constraint mappings                                                            |
| Listbox Single/Multi  | `requestSelectItem(item)` preserves its refined scalar Value                                                                     |
| Menu                  | `requestSelectItem(item, index)` preserves positional order and refined Item                                                     |
| Toast                 | `requestShow(input)` normalizes variant/sticky/duration defaults; `requestDismiss(entryId)` preserves its scalar id              |
| Tooltip               | `informShowDelayChanged(delay)` normalizes `Duration.Input`                                                                      |
| VirtualList           | Six adapters retain generic history callbacks, item-key arrays, positional scroll targets and optional alignment defaults        |

No remaining UI adapter is a simple constructor alias. A payload Schema does
not preserve positional order or scalar call signatures automatically.
VirtualList’s generic callback continues deriving serializable keys and counts;
it does not enter a Schema or widen to `Schema.Unknown`. These library-owned
adapter contracts remain supported deliberately. Ordinary app authors use
InMessages without an alias record.

Query's retained adapter is `requestLoadIfStale(nowMillis)`. KeyedQuery retains
`requestRevalidation(args)`, `requestRevalidationOrLoad(args)`,
`requestLoadIfMissing(args)`, `requestLoadIfStale(args, nowMillis)`, and
`requestCancel(args)`. Its zero-argument reset uses receive. These six adapters
keep their existing scalar and positional signatures.

Do not move every local `Requested...` tag based on its prefix. Listbox and
Combobox's local `RequestedItemClick` is an actual view interaction, outside the
exposed operation inventory. DOM attributes and Command results continue to use
the local Message contract.

Query's `read`, `isFresh`, `pendingArgs`, `run`, `Fetch`, `toLayer`, and handler
selection stay outside receive. The migration reuses the existing pure
algorithms and preserves Fetch identity, generic Schema/handler requirements,
silent/notifying modes, cancellation, retained responses, generation checks,
and accepted-completion OutMessages. The
[production Query receipt](../query-production/README.md) records source,
emitted, relocated-consumer, runtime, and copied mutation checks.

## Active snippets and deliberate comparisons

The canonical Definition/settings/feature-export sequence, keyed-map and
optional-keyed examples, reset initializer example, and informing-blocks
Definition/Message/child/parent sequence now teach InMessages. The generic-picker
snippet keeps `requestSelectValue(value)` as a refined scalar library adapter.

The four direct examples identified during the final audit are now migrated:

| Source                            | Adopted boundary                                               | Lesson preserved                                                                                     |
| --------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `antiPatternBlockBoundaryGood.ts` | Theme-change InMessage and exact output contract               | The parent invokes the child's public transition                                                     |
| `antiPatternChildInitSettings.ts` | Restoration InMessage/receiver plus updated bad/good consumers | The bad example still drops child Commands/OutMessage; the good example retains the operation result |
| `updateCurriedStep.ts`            | Received route change and canonical `informRouteChange`        | Curried transition composition remains explicit                                                      |
| `testingMigrationFixture.ts`      | Pins receives read requests; results/observations remain local | Subscription testing stays on the selected owning implementation                                     |

Their associated active prose and labels are updated by the lead. Current
application and direct-snippet inventories have no remaining operation-map
omission. The scalar generic-picker example, deliberately labelled native/bad
comparisons, and published release records remain explicit exceptions under the
existing preservation policy.

## Verification scope

The checkpoint results are separate scopes. Their totals must not be added
together as distinct behaviors:

| Scope                               | Source    | Runtime evidence                                            |
| ----------------------------------- | --------- | ----------------------------------------------------------- |
| UI Showcase                         | Full pass | 14 tests in 3 files                                         |
| Job Application                     | Full pass | 68 tests in 17 files                                        |
| Workspace                           | Full pass | 154 tests in 21 files                                       |
| Routing                             | Full pass | 30 tests in 4 files                                         |
| Website                             | Full pass | 75 affected-feature/root Story tests in 12 files            |
| Typing Game client                  | Full pass | Full 30-test suite in 3 files                               |
| UI package                          | Full pass | Full 1,351-test suite in 68 files                           |
| Query and KeyedQuery                | Full pass | 81 tests in 4 files, including 76 pure implementation cases |
| Pixel Art dependent dismissal cause | Full pass | Existing 24-test Story suite                                |

The four example apps retain all 979 original assertion ASTs in order across 44
pre-existing files, including Command, Scene, and OutMessage assertions. Three
added tests exercise public scoped input causes. Website/Typing Game separately
preserve 150 Vitest assertion call trees across 11 files, allowing the recorded
method-name normalizations; their existing Command/Scene assertions remain in
place. Their two new regressions exercise Search's real Command identities and
Room's separate received Context followed by a local Command completion.

The first UI phase retained existing expectation bodies without an automated
assertion-AST count. The later 20-alias follow-through captured its own baseline
and preserves all 3,710 original Vitest/Story/Scene assertion call trees in order
across 68 test files, adding two protocol-check call trees. Its removal control
rejects a missing assertion. This measured claim applies only to that later
phase; it does not retroactively supply a baseline for the earlier UI changes.
See [the preservation receipt](ui-direct-aliases-preservation.json).

Application and Effect lint pass for the adopted examples. Website/Typing Game's
report records its scoped application lint. UI's scoped standard and Effect
lint pass. UI's generic fixture source and emission checks pass. Final integrated
receipts own the full UI external driver and compiler-budget claims.

The first connected app run exposed a framework bug: receive activated public
Binding wrappers rather than update's canonical normalized graph. The central
fix shares the same exact graph. Actual mobile-menu and nested validation
scenarios pass without consumer workarounds or weaker registration checks.

Final logs for the four example apps are
`/private/tmp/foldkit-inmessage-{ui-showcase,job-application,workspace,routing}-{source,tests}.log`.
Website/Typing Game receipts are linked in their adoption report. UI receipts are
`/private/tmp/foldkit-ui-inmessages-{all-runtime,source-final,lint-final,effect-lint}.log`;
the dependent Pixel Art receipt is
`/private/tmp/foldkit-pixel-art-inmessages-runtime.log`.

This audit adds no production build, browser, whole-app emitted-declaration, or
compiler-budget claim. Final integrated receipts remain authoritative for those
gates and for the latest snippet verification.

## Direct UI follow-through verification

- Full UI source check: passed.
- Full UI runtime suite: 1,351 tests in 68 files passed.
- Scoped standard and Effect lint: passed.
- Normal UI source/emitted/relocated driver: passed, including isolated core and UI builds.
- Relevant consumer source checks: UI Showcase, Workspace, Job Application, Pixel Art, Query Sync, and Website passed against the coordinated artifacts.
- Parent Binding signatures and all 29 adapters are unchanged.

Final source/runtime logs are `/private/tmp/foldkit-ui-direct-aliases-{source,runtime}-final.log`.
Scoped lint logs are `/private/tmp/foldkit-ui-direct-aliases-{lint,effect-lint}.log`.
The normal driver log is `/private/tmp/foldkit-ui-direct-aliases-declarations.log`.
Assertion capture can be checked with
`node internal/layered-constructor/inmessages/ui-direct-aliases-preservation.mjs /private/tmp/foldkit-ui-direct-aliases-baseline-20261101/ui-src`.
