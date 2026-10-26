# Block type performance

This harness measures deterministic TypeScript diagnostics for completed Block
composition through Foldkit's published declarations. Each checked-in fixture
imports public `foldkit` package entry points, completes its Block graph, and
finishes with an Application update, `ApplicationComposition.prepareBlock`,
`Program.makeElement`, and the completed Program's `.provide(...)` method.

The shared baseline contains the imports and warmup expressions repeated by
every fixture. Fixture cost is the fixture total minus that baseline for these
compiler diagnostics:

- `Instantiations` and `Types` are regression gates.
- `Symbols` is reported for context because symbol count alone is not a stable
  proxy for type computation.

The deep fixture binds a leaf through eight parent Blocks and then binds the
result into an Application. The other fixtures cover 100 sibling Bindings
with exhaustive Message folds and 200 distinct Command requirements. Every
fixture carries an ordinary Effect Service through Application completion and
provides its Layer. Run the check after building `packages/foldkit`:

```sh
pnpm check:block-type-performance
```

Pass a fixture name to measure only that fixture. Threshold updates are a
separate, explicit command and write the exact observed deltas without adding a
tolerance:

```sh
pnpm check:block-type-performance deep-composition-8
pnpm update:block-type-performance
pnpm update:block-type-performance command-requirements-200
```

Only update budgets after reviewing an intentional type-level change. The
ordinary check never changes them and fails when either gated metric exceeds
its stored maximum.

## Workspace composition scale

`workspace-composition-4` and `workspace-composition-8` use the same count
harness and baseline. Their generator emits distinct, named workspace Group
Blocks, rather than increasing the number of runtime records in one array:

```sh
node packages/foldkit/type-performance/workspace-generate.ts
node packages/foldkit/scripts/check-block-type-performance.ts workspace-composition-4
node packages/foldkit/scripts/check-block-type-performance.ts workspace-composition-8
```

For `N` Groups, the static graph contains `N + 3` distinct completed Blocks
(Application, Groups, Control, and Editor), `4N` child Bindings, `N` Mounts,
and `2N + 1` attached local handler recipes. Every Group has a required Control
child using default zero-argument init, an optional keyed Editor wrapper opened
through `Binding.init`, and a wrapped keyed Editor array using `init.instances`
and `toItem`. Extracted authored views retain the Mount requirement. Local
Message-backed operations invoke sibling operations through parent OutMessage
policies. Commands and Mounts require the same ordinary `WorkspaceStore` Service.
The Application finishes with `Program.makeElement(...).provide(...)`.

Checked assembly headers name each local canonical Model Schema. Compiler
assertions retain exact Model, encoded, decoding-Service and encoding-Service
channels, OutMessage payloads, Mount requirements, Layer errors, and the ordinary
Service requirement before and after Program provision. These fixtures extend
the count workload; ownership rejection and declaration safety remain covered by
the existing emitted-declaration fixtures.

Initial exact budgets with TypeScript `7.1.0-beta` are:

| Groups | Instantiations above baseline | Types above baseline | Symbols above baseline |
| ------ | ----------------------------- | -------------------- | ---------------------- |
| 4      | 2,639,574                     | 206,314              | 276,265                |
| 8      | 4,515,010                     | 280,523              | 402,969                |

The original deep, wide, and Command budgets are unchanged. Counts do not
measure editor latency, and this synthetic static graph does not claim that
every feature of the handwritten workspace example is represented.

### Declaration emission and the larger-size limit

Source checking and declaration serialization are separate checks. Use the
package compiler and `workspace-declarations.json` for strict source checking
and declaration emission:

```sh
packages/foldkit/node_modules/.bin/tsc -p packages/foldkit/type-performance/workspace-declarations.json --outDir /tmp/foldkit-workspace-declarations --pretty false --extendedDiagnostics
```

For a portable external emission and consumer check, use a temporary package as
the existing emitted-declaration harness does. Run these commands from the repo
root after generating the retained fixtures:

```sh
fixture_tmp=$(mktemp -d)
mkdir "$fixture_tmp/node_modules"
ln -s "$PWD/packages/foldkit" "$fixture_tmp/node_modules/foldkit"
ln -s "$PWD/packages/foldkit/node_modules/effect" "$fixture_tmp/node_modules/effect"
cp packages/foldkit/type-performance/workspace-composition-*.ts packages/foldkit/type-performance/workspace-groups-*.ts packages/foldkit/type-performance/workspace-shared.ts packages/foldkit/type-performance/workspace-declarations.json packages/foldkit/type-performance/tsconfig.json "$fixture_tmp/"
printf '{"type":"module"}\n' > "$fixture_tmp/package.json"
packages/foldkit/node_modules/.bin/tsc -p "$fixture_tmp/workspace-declarations.json" --outDir "$fixture_tmp/emitted" --pretty false --extendedDiagnostics
packages/foldkit/node_modules/.bin/tsc --strict --skipLibCheck false --module NodeNext --moduleResolution NodeNext --target ES2022 --lib ESNext,DOM --noEmit "$fixture_tmp"/emitted/*.d.ts
```

Emitting from inside the Foldkit package can name its own declarations through
relative `../dist` imports; moving that output alone does not make an external
consumer package. The external check above resolves public package imports and
checks emitted declarations with `skipLibCheck: false`.

The initial combined 4/8 external emission produced five declaration files
totaling 2,997,831 bytes. It took 1.338 seconds of compiler time and 1.567 seconds
of wall time, with 567,560 KiB reported compiler memory on the measurement host.
These observations describe this run and are not timing or memory budgets.

The requested 8/32 scale exposed a declaration-serialization limit. The initial
32-Group variant, which also combined every sibling's `requestSave()` operation
in one root Message branch, source-checked but failed declaration emission with
TS7056 at the root `prepare`: “The inferred type of this node exceeds the maximum
length the compiler will serialize. An explicit type annotation is needed.”
Removing that extra aggregate operation still left 16 Groups failing TS7056 at
`prepare`. An exact local implementation type and explicit instantiated
`ReturnType` annotation moved the 16-Group error to `ApplicationComposition`;
it did not establish an emitting boundary. No assertion or Service channel was
weakened to obtain the retained 4/8 fixtures.

The generator keeps these larger reproductions available without adding failing
fixtures to the ordinary budget gate:

```sh
node packages/foldkit/type-performance/workspace-generate.ts 16
packages/foldkit/node_modules/.bin/tsc -p packages/foldkit/type-performance/workspace-declarations.json --outDir /tmp/foldkit-workspace-16 --pretty false --extendedDiagnostics
rm packages/foldkit/type-performance/workspace-composition-16.ts packages/foldkit/type-performance/workspace-groups-16.ts
node packages/foldkit/type-performance/workspace-generate.ts 32 --save-all
packages/foldkit/node_modules/.bin/tsc -p packages/foldkit/type-performance/workspace-declarations.json --outDir /tmp/foldkit-workspace-32 --pretty false --extendedDiagnostics
rm packages/foldkit/type-performance/workspace-composition-32.ts packages/foldkit/type-performance/workspace-groups-32.ts
node packages/foldkit/type-performance/workspace-generate.ts
```

The generator defaults to 4/8 and accepts distinct counts from 1 through 32.
Explicit sizes create additional files; remove those files after investigating.
`--save-all` only adds the aggregate-operation branch and is not part of the
retained budget workload. Larger source checks succeeding is not evidence that
their declarations emit or that the handwritten app meets the same bound.

A later isolated naming control made the same 16-group graph and the full workspace application emit by adding an exported interface extending each completed Block's exact checked contract. Type aliases and an internal preparation wrapper did not fix serialization. The emitter can retain a named consumer interface rather than repeatedly expanding the private producer, so this demonstrates an encoding limitation, not an inherent impossibility for the graph. The reviewed same-name interface form is now adopted for public UI Block declarations after source/emitted rejection and editor checks. At the October 23 four-control checkpoint, naming the library's completed update and owned document view contracts also made that Workspace root emit and relocate without additional consumer annotations. The larger Workspace root retains an exact Binding tuple type in `composition.ts`. Exporting that type lets the ordinary checked `block.ts` emit without the earlier implementation interface; the actual root and strict relocated consumption pass. Inline Composition inference and the separate 32-group synthetic root retain their documented serialization limits. The [latest cleanup](../../../internal/workspace-clean-assembly-20261025.md) records larger declaration output and the separate paired editor results. See the [current Workspace boundary](../../../examples/workspace/README.md#verification-and-scale). [Integrated measurements and current scope](../../../internal/preview-framework-performance.md). [Detailed scope and results](../../../internal/workspace-performance.md#independent-serialization-controls).

### Actual application declarations

After building `foldkit` and `@foldkit/ui`, check the complete Workspace root
with the opt-in declaration configuration:

```sh
workspace_declarations=$(mktemp -d /tmp/foldkit-workspace-declarations.XXXXXX)
packages/foldkit/node_modules/.bin/tsc -p packages/foldkit/type-performance/workspace-application-declarations.json --outDir "$workspace_declarations" --pretty false --extendedDiagnostics
```

This gate follows every import from the actual application Block. Release
verification also checks a relocated copy of those declarations with
`skipLibCheck: false` and the application's TypeScript source absent. Workspace
bundles JavaScript and does not ship declarations; this optional stress check
does not establish an unlimited graph size or predict editor latency.

## Language service latency

Compiler instantiation and type counts provide regression signals,
but they do not predict the delay of an editor request after a file changes.
Use the opt-in native LSP benchmark after building `packages/foldkit` when a
type-level change is intended to improve authoring latency:

```sh
node packages/foldkit/scripts/profile-block-language-service.ts --runs 5 > /tmp/foldkit-block-language-service.json
```

The benchmark starts a fresh pinned native TypeScript language server for each
Website hover, go-to-definition, Route completion, Binding member completion,
and changed URL workflow scenario. Route completion retains the narrowed
`previousRoute.` query. Binding completion uses valid
`packages/website/src/update/handleChangedUrl.ts`, placing the cursor after
`SearchBinding.` in `SearchBinding.informRouteChanged()` and requiring
`informRouteChanged` and `embedView`. It records first and warm requests before
and after a ranged newline edit.

The changed URL workflow hovers `SearchBinding` at that call, repeats the hover
after a ranged newline edit, and pulls a full clean diagnostic report. It then
replaces only `nextRoute` in `route: () => nextRoute` with `1709`, requires an
error with code 2322 whose range is exactly the `route` property, restores
`nextRoute`, and requires a full report with no errors. Hover requests after restored diagnostics
measure the first and warm query costs separately; the final completion is
explicitly warm. All edits stay in server memory, and the workflow verifies that
the source returns to its original text plus the deliberate newline.

The client advertises snippet support and pull diagnostics, requires incremental
synchronization and UTF-16 positions, and returns null workspace configuration
sections to select server defaults. This protocol profile and the moved Binding
completion site were introduced in format version 2; compare measurements only when
these workload settings match. Existing hover and definition scenarios also
record post-whitespace and post-semantic-edit requests where applicable.

JSON output includes raw samples, medians, full response hashes, document versions
and content hashes, diagnostic validation evidence, the source commit and dirty state, and a hash of
the Website and mapped workspace TypeScript sources, workspace declarations and
declaration maps, package manifests, TypeScript configuration, and lockfile. It
also records separate lockfile and benchmark-script hashes and the compiler,
server, Node, and platform versions. Set `--timeout-ms` when profiling a graph
that legitimately takes longer than the default 60 seconds. Missing or empty
hover contents, definitions, server identity, or expected completion labels fail
the run. The actual-file Binding hover requires `InitializedBinding` and rejects
a direct `any`, `unknown`, or `never` type. When the Owner is visible, it must be
`Search`. Checked assembly headers can hide the Owner through hover truncation;
in that case, the guard requires the recorded Schema header and field fragments.
Expanded and abbreviated nested TaggedUnion displays are both accepted while the required Binding and Schema field fragments remain checked. This validates the visible Binding shape, not full ownership. Framework source
and emitted-declaration tests enforce ownership. Missing route errors or errors
remaining after restoration fail instead of recording an artificially fast
response.

### Message constructor access

A completed Block forwards its local Message constructors through its composed
Message Schema. Reading a constructor through that Schema can demand the child
graph even when reading the original local constructor is inexpensive. Profile
these two access paths separately:

```sh
node packages/foldkit/scripts/profile-block-language-service.ts --scenario message-constructors --runs 3 > /tmp/foldkit-message-constructors.json
```

Each case opens a minimal document at the Website's `src/entry.ts` URI. Both
import `ApplicationBlock` and the local `Message`, keep both imports in use, and
export `onUrlChange`. Only the accessed expression differs:
`Message.ChangedUrl` or `ApplicationBlock.Message.ChangedUrl`. Each case starts a
fresh native server and requires a full diagnostic response with no errors.
These are cold type-checking measurements, not post-edit or application runtime
measurements. The output records both document texts, their hashes, the selected
scenario, and compiler and workspace identities. Format version 3 adds this pair
of cases. The default `all` selection also retains the existing workloads.

The benchmark has no CI latency threshold. Run baseline and candidate samples
on the same idle host and compare their metadata before comparing medians.
Inspect post-edit samples and slow requests alongside medians. Repeat small
compiler-count differences with identical source and emitted declarations.
Wall-clock results vary with CPU contention, filesystem cache state, profiling,
and language-server scheduling. Keep captured JSON outside the source tree.

### Workspace example

Profile the workspace's issue-list and routed-editor composition with:

```sh
node packages/foldkit/scripts/profile-block-language-service.ts --scenario workspace --runs 3 > /tmp/foldkit-workspace-language-service.json
```

The workspace selection starts four fresh native servers per run. It measures
`IssueDetailBinding` hover in `examples/workspace/src/composition.ts`, Binding
member completion at the real initializer call in `src/update.ts`, and completed
`ApplicationBlock` member completion at its routing callback in `src/entry.ts`.
Each request has first and warm samples, then repeats after an incremental
newline edit. Completion must include `requestSave`, `embedView` and `init` on
the Binding, and `Model`, `Message`, `init`, `makeView` and `replaceEffectsLayer`
on the completed Block.

The fourth server checks `src/issueDetail/update.ts`. It requires clean full
diagnostics, changes the production draft writer from `title: () => value` to
`title: () => value.length`, and requires exactly one TS2322 error at the `title`
property. Restoring `value` must clear the error. Edits stay in server memory,
and the diagnostic workflow verifies restoration of the original text plus the
deliberate newline. Source markers must identify one occurrence.

Workspace runs sample the native server's resident memory at startup, every
250 milliseconds during requests, and after the workload before closing the
server, with `ps -o rss= -p <pid>`. JSON labels each sample `Startup`, `Interval`,
or `Final` and includes peak sampled RSS in KiB for each server. The final sample
also covers workloads that finish before the first interval. Startup and final
sampling run outside request latency measurements. Sampling supports macOS and
Linux and requires permission to inspect processes; other platforms fail
explicitly. Each `ps` invocation has a
one-second timeout, and samples do not overlap. Sampled RSS can miss peaks
between samples and does not include the benchmark client or editor. There is
no RSS threshold, and a bounded run does not establish long-session stability.

Format version 5 records memory sample phases and final workload coverage. The
`all` selection runs the Website workloads described above. Workspace workload
hashes and Git dirty state include the example's TypeScript files, package
manifest, and TypeScript configuration. Preserve the compiler budgets when comparing
editor measurements, use the same idle host, and record the exact app revision
and graph size. Increasing the issue-record count exercises runtime workload;
larger type workloads need distinct static Block compositions.

The initial investigation at commit
`3edb273870b898ef963f1ed3a308424554bfd370` reproduced a 3.3–4.4 second Website
hover after invalidation and a 3.8–4.2 second first go-to-definition request.
Warm hovers were normally below one millisecond, while the focused Route
completion remained around 20 milliseconds after a whitespace edit. Hover
responses were about one kilobyte. Native profiles attributed the delay to
conditional type instantiation and relation work, with allocation and garbage
collection pressure, rather than response formatting or transport.
Whole-program compiler traces highlighted several large Block validation
graphs. Request-scoped traces found the post-edit work distributed across
local Block validation, deferred Message policy resolution, selected Binding
resolution, and delivery indexes, so they do not establish one validator as
the interactive stall. A local assembly channel projection was adopted because
it reduced Website compiler instantiations by 8.09% and focused fixture counts
by 8–13% on the integrated factory surface. Its paired native timings were
modest and noisy, so it is a compiler-cost optimization rather than a claimed
interactive latency fix.
Other safe encodings reduced compiler counts without a repeatable
post-edit LSP improvement and were not adopted as latency fixes.

This benchmark drives the native server directly. Editor extensions, editor UI
rendering, and editor-side request scheduling remain outside its scope.

Baseline history for private Binding evidence: the TypeScript 7.0.2 ceilings
include the evidence used by `Block.inspectBinding`. Compared with the
preceding public metadata shape, the reviewed increases were 2.40%
instantiations and 0.94% types for deep composition, 1.35% and 0.76% for wide
composition, and 0.04% and 0.03% for the Command fixture. This evidence
preserves exact handler requirements, registration evidence, Layer services and
errors, and Mount definitions through emitted declarations while keeping
metadata out of ordinary Binding completions.

Baseline history for the named operations boundary: completed Block operations
use a named interface so TypeScript 6 can emit API documentation for generic
registered component graphs without erasing their Model, Message, OutMessage,
Layer, Mount, or Binding evidence. Compared with the private-evidence ceilings
above, this boundary increased deep composition by 4.46% instantiations and
2.95% types. The wide and Command fixtures decreased slightly, so their
ceilings were lowered to the exact final measurements.

## Parent-owned Binding and mandatory Composition staging

The parent-owned Binding API keeps the fixture widths unchanged: eight nested
Blocks, 100 sibling Bindings, and 200 distinct Command requirements. The
mandatory Definition to Composition to completion stages add a fixed type-shape
cost in the deep and Command fixtures. Exact parent Message evidence prevents
the 100-child fixture from repeating the complete parent Message union in every
Binding, so its instantiation count decreases.

| Fixture                    | Baseline instantiations (`11e8ca60e6dd`) | After staging instantiations | Baseline types (`11e8ca60e6dd`) | After staging types |
| -------------------------- | ---------------------------------------: | ---------------------------: | ------------------------------: | ------------------: |
| `deep-composition-8`       |                                1,126,164 |                    1,152,618 |                          49,591 |              55,843 |
| `wide-composition-100`     |                                3,132,298 |                    3,013,262 |                         211,029 |             215,419 |
| `command-requirements-200` |                                2,616,095 |                    2,659,415 |                         382,863 |             389,460 |

Two bounded counterfactuals isolate ordinary Composition helpers from the
mandatory staging cost. Removing the former `Composition.render` helper
changed no instantiations and removed two types from each fixture. Removing
`Composition.bindChild` changed neither gated metric. `Composition.bindChild`
remains in the public API.

Separate process-cold compiler runs on the same TypeScript 7.0.2 installation
showed no material wall-time regression after the filesystem cache was warm.
Baseline `11e8ca60e6dd` versus staged Composition check times were 0.429s versus 0.416s for
deep composition, 1.266s versus 1.294s for wide composition, and 0.948s versus
0.926s for Command requirements. Peak reported memory changed from 142,236K to
146,147K, 280,586K to 283,343K, and 293,411K to 296,906K respectively. The
checked-in ceilings continue to gate deterministic instantiation and type
counts rather than timing or memory, which vary with host and cache state.

## Exact child Binding adapters

Required and Option fields, `presentWhen`, exact keyed arrays, constructor checks,
and duplicate sibling validation retain the existing 8/100/200 fixture widths
and budgets. The adapter and keyed callback inference measurements are:

| Fixture                    | Instantiations delta | Types delta |
| -------------------------- | -------------------: | ----------: |
| `deep-composition-8`       |            1,126,656 |      52,564 |
| `wide-composition-100`     |            3,021,829 |     215,407 |
| `command-requirements-200` |            2,632,385 |     386,042 |

The duplicate check projects placements once and maps each placement to tuple
indexes. An index union identifies a duplicate without recursively copying the
remaining child tuples. Binding overloads check ordinary relationships before
keyed adapters, and exact field/key eligibility is checked at the configuration
properties. Shared conditional overloads preserve required OutMessage policies
and callback inference while avoiding duplicate signature shapes. Deferred
handler validation checks the existing owner evidence directly. Accepted,
rejected, and downstream declaration fixtures verify these changes together.

## Wrapped keyed-array adapter

The `childField` overload retains the same 8/100/200 fixture sizes. Compared
with checkpoint `1c64a700eb`, the final public declarations measure:

| Fixture                    | Before instantiations | After instantiations | Before types | After types |
| -------------------------- | --------------------: | -------------------: | -----------: | ----------: |
| `deep-composition-8`       |             1,126,656 |            1,126,656 |       52,564 |      52,579 |
| `wide-composition-100`     |             3,021,829 |            3,037,198 |      215,407 |     216,662 |
| `command-requirements-200` |             2,632,385 |            2,632,385 |      386,042 |     386,057 |

The wide fixture increases by 0.51% instantiations and 0.58% types. It uses
accessor Bindings; the extra overload contributes contextual type computation
even when no call selects it. A counterfactual with only a required `childField`
parameter still added 226 types, exceeding the previous ceiling's 12-type
headroom. Moving the overload and extracting its signature did not reduce
that cost.

Selected-field validation avoids scanning unrelated generic wrapper payloads.
The wrapped config declares its Subscription policy directly instead of
instantiating and omitting the entire general keyed config. These reductions
retain exact child, key, Message, OutMessage, registration, Service and error
checks. Generic Toast and emitted acceptance/rejection fixtures verify the
result.

Only the wide fixture's Types ceiling changes, to the exact observed 216,662.
All instantiation ceilings and the deep and Command Types ceilings stay in
place. No fixture was narrowed and no rejection test was removed.

## Checked Model Schema boundaries

Parent Models can compose `ChildBlock.Model` through the mandatory checked
completed-Block export boundary. The header supplies the canonical local Model
Schema to `Block.FromAssembly*`; `Block.assemble(prepare)` validates and packages
the prepared implementation. This separates a parent Schema lookup from the
child's inferred implementation graph while preserving assembly checks. A
directly exported canonical Schema is a fallback when that boundary is unavailable.
Use the local Schema inside the feature's own Definition to avoid an import cycle.

The external `schema-boundary` declaration fixture checks exact Schema and
Codec channels, Service requirements, operation arguments, and registration
through the public barrel, then emits and relocates the consumer. Named public
UI interfaces additionally let declaration emission refer to the completed
contract without repeatedly expanding its producer. These boundaries do not
make every completed Block member cheap to inspect. The
[integrated measurements and remaining Website cold-access cost](../../../internal/preview-framework-performance.md)
cover actual post-edit requests separately from compiler counts.

The recommended lint guard targets unguarded completed-Block dependencies during
parent Schema construction. Ordinary `typeof ChildBlock.Model.Type` annotations
remain supported. Provenance tracking is a performance guardrail, not universal
static detection of expensive inference.

## Assembly checks

Block assembly keeps its existing consumer call shape. Its first overload infers
the exact implementation object before checking that object against the shared
validators. Additional overloads preserve contextual typing for specialized and
generic implementations. Six of them defer Composition checks until inference
resolves their type parameters. Those checks must still run when an explicit
implementation type contains optional view or Layer fields.

Handler checks index contracts by identity and compare contracts within each
group. They may skip a group proven identical to the current entry. They must
not skip validation merely because TypeScript cannot prove that generic
contracts form a union: a handler for `string` cannot implement every narrower
generic item contract. The generic handler declaration fixtures cover accepted
implementations, rejected mismatches, exact payloads, and relocated consumption.

These encodings change type-checking work. They do not construct Layers or
change Runtime behavior. Keep the numerical budgets unchanged when evaluating
editor improvements, and measure real post-edit requests as well as counts.
