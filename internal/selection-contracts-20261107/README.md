# Schema-backed selection contracts

## Public contract

Menu, Tabs and RadioGroup accept a runtime Value Codec, matching Listbox and
Combobox. The no-argument form selects unrestricted strings. Narrow selections
pass the Codec itself:

```ts
const Action = Schema.Literals(['Edit', 'Archive'])
type Action = typeof Action.Type
const ActionMenuBlock = Menu.makeBlock(Action)
```

The Value decodes to a string and has no decoding or encoding Service
requirements. Synchronous transformations retain their encoded type. The same
Codec appears in local selection Messages, the Selected OutMessage, and generated
parent envelopes. Configuration does not evaluate it. Foldkit's existing
serialization boundary rejects asynchronous execution when an actual value is
encoded or decoded.

Menu's local RequestedSelectItem and SelectedItem Messages use item and index.
Its Selected OutMessage uses value and index, as do Tabs and RadioGroup. The
parent owns the committed selection or action. Focus, keyboard and pointer
behavior, initialization, Command identities and implementation Layers are
preserved. Schema-specific implementations use the existing Block-family
construction path rather than type-only refinements.

## Consumer review

Migrated narrowed selections in API Cache, API Cache Query, Charting, Job
Application, Pixel Art, UI Showcase, Website and DevTools. Each factory is declared
once at module scope. Applications supply Menu.layer, Tabs.layer or
RadioGroup.layer through ordinary child Layer provisioning. Consumers need no
casts, additional generic arguments, or satisfies clauses.

Website's playground-menu Story used the theme Menu's SelectedItem constructor
for the counter example. The narrower Schema exposed the mismatch. The Story now
uses PlaygroundMenuBlock.Message, and an external rejection fixture checks
cross-Menu Message delivery and invalid bound requestSelectItem arguments.

Pixel Art's Tool Schema now lives in a leaf `tool.ts` module. The Model and
RadioGroup factory both import that contract. Keeping the Schema in `model.ts`
while importing it into `components.ts` creates a runtime cycle because the
Model also depends on those component contracts.

## Verification

- Full UI Vitest: 1,420 tests passed across 74 files.
- Full UI source typecheck, including tests: passed.
- TypeScript 6 source acceptance and rejection fixtures: passed.
- UI emitted-declaration gate: passed.
- The additional declaration matrix emitted both UI and its external consumer
  with TypeScript 6.0.3 and 7.1.0-beta. All four emitter-to-relocated-consumer
  combinations passed, including rejection checks. Input-file lists confirmed
  no reads from the original UI or Foldkit source trees. See declaration-matrix.json.
- All eight unchanged compiler workloads passed. See compiler.txt. No ceiling
  was changed. These counters do not measure editor latency or rendering time.
- API Cache Query, API Cache, Charting, Job Application, Pixel Art, UI Showcase,
  Website, DevTools and Typing Game Client typechecks passed.
- Pixel Art's 38 existing Story/Scene cases passed after removing the cycle.
  A temporary Model-first import probe also retained the narrow Tool Codec.
- Selection lint unit and real-CLI tests: 83 passed. The new fixtures also typecheck.
- Website production build passed after allowing the package manager to verify its
  registry signature. The final focused documentation suite passed 1,003 tests;
  the root Story suite passed 25 tests.
- Browser review confirmed the guide layout and typed Menu demo. A malformed
  container-style Snippet directive hid the later factory sections; using the
  ordinary leaf directive makes Combobox, Tabs, Menu and RadioGroup visible.
  The temporary local server was closed and its port checked afterward.

The initial declaration matrix used the published Foldkit build to isolate the
UI contract. After rebuilding Foldkit with the resolver and Subscription
changes, the full UI emitted gate and all four TypeScript 6/7 matrix pairs
passed again. `initial-declaration-matrix.json` retains the initial check;
`declaration-matrix.json` records the combined check. The combined UI runtime
suite also passed all 1,420 tests. Scoped library and application lint passed.

## Negative controls

Replacing the declared selection Codecs with Schema.String caused eight focused
local/parent-envelope tests to fail. Invalid values were accepted and transformed
encodings were lost. Each implementation file was restored byte-for-byte. See
codec-negative-control.txt.

Removing RadioGroup recognition from the module-scope factory rule failed both
the direct rule test and the real CLI alias fixture. The CLI reported zero
diagnostics where two were required. The rule was restored byte-for-byte and the
83-test suite passed again. See lint-negative-control.txt.

Restoring the Pixel Art Model/component cycle made the temporary Model-first
probe accept `InvalidTool` instead of rejecting it. Vitest's cyclic-module
loader supplied `undefined` during factory evaluation, selecting the default
string Codec. The existing Story/Scene suite alone did not expose this loss of
the runtime contract. Restoring the leaf Schema made the probe and all 38
application cases pass. The temporary probe was removed; no framework-contract
test was added to the example.

## Migration

Replace Menu.makeBlock<Action>(), Tabs.makeBlock<Section>() and
RadioGroup.makeBlock<Plan>() with Menu.makeBlock(Action), Tabs.makeBlock(Section)
and RadioGroup.makeBlock(Plan). Completed<Value, ValueEncoded> names the passive
result when an explicit type is useful. Unrestricted strings use makeBlock().
Historical published content is unchanged. Active guides, snippets, scaffold,
skills and lint recognition describe the Schema-backed form.
