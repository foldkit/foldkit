# Machine Definition authoring

## Design

Starting point: `0b979558c0ab6f4ea5a90b6fcce1039a7a6e3613` on
`codex/workspace-example`.

The motivating consumer is the search and nested quote-request lifecycle in
`foldkit-domains/src/searchMachine.ts`. That repository is inspected read-only.
The framework contains a self-contained, split-file version of the lifecycle
under `packages/foldkit/declaration-tests/machine.*.ts` for source and external
declaration checks.

| Responsibility                               | Authoring surface                                      |
| -------------------------------------------- | ------------------------------------------------------ |
| Bind Schema contracts once                   | `Machine.makeDefinition({ State, Message, Context? })` |
| Inline edges and ordered guards              | Bound `to`, `when`, `otherwise`, and `ignore`          |
| Extract a guard                              | `makeGuard({ from, on }, producer)`                    |
| Extract a handler without a guard dependency | `makeHandler({ from, on }, producer)`                  |
| Extract a guard-dependent handler            | `makeHandler(guard, producer)`                         |
| Extract a source state's table entry         | `makeTransitions(source, { on })`                      |
| Share transition defaults                    | `makeSharedTransitions(sourceTags, { on })`            |
| Check and complete the Machine               | `Definition.makeMachine({ initial, shared?, states })` |

Source and Message selectors accept a single tag or a nonempty tag list.
That supports the real response guard shared by success/failure Messages and
the Ready-state delegate shared by request, retry, and failure handling.
Selectors describe unions, not a correlation between pairs of selected tags.

Guards receive `{ state, message, context }`, omitting Context when none is
declared. This removes unused positional parameters. A selector-authored
handler receives those same fields, without a promised guard value. A
guard-authored handler additionally receives its exact `guardValue`: the
unwrapped Option value, `void` for boolean guards, or their union for mixed
guards. Targets remain visible beside guards in the table and are checked
against the handler's inferred returned state.

No Composition stage is added. Machine has no child graph or registration
responsibility to establish. Its Definition fixes the contracts and completion
checks the table. Guards, handlers, and Command Effects remain unevaluated
during authoring. Context is supplied per transition, not stored, decoded, or
deep-frozen by the Machine.

## Concrete consumer

- `machine.contracts.ts` owns State, Message, Context, and ordinary Commands.
- `machine.quote-request.ts` shows inline Option guards, contextual request
  arguments, shared completion, failure, and retry.
- `machine.accepted.ts` shows extracted guards and handlers, shared search
  transitions, cache restoration, stale-response admission, nested quote
  transitions, and an extracted Ready table. It folds the completed Machine
  into a Schema-backed parent Model.
- `machine.consume.ts` checks exact input types and the union of the fetch,
  cancel, and audit Command requirements. Purposeful domain annotations remain
  on the parent Context selector and domain functions.
- `machine.rejected.ts` checks incorrect inputs, targets, Context, Command
  results, requirement erasure, and unfinished values at the fold boundary.

The extraction helpers normalize their returned callable input even when a
producer ignores arguments. A guard-dependent handler cannot choose a narrower
value type than the guard supplies. A selector-only handler does not depend
on a guard value at all. Explicitly erased annotations cannot recover lost
information; the API does not claim to restore types after erasure.

## Public migration

The old curried `define` and standalone authoring functions leave the public
barrel. Their implementation remains internal to the compiler and existing
runtime regressions. Active examples, Website snippets and guide, scaffold
guidance, and consumer skills use the bound Definition. Historical published
release material is preserved. `EdgeInput`, `StateTransitions`, and completed
Machine/graph types remain available for purposeful domain contracts.

Existing execution and graph behavior is retained. Shared entries remain
defaults, local entries override them, and overlapping shared entries fail on
completion. A mixed boolean/Option guard now includes `void` in its handler
value type, matching the existing runtime behavior of a successful boolean.

## Declaration portability

The realistic consumer initially exposed declaration-emission errors that source
checks alone did not catch. The library now provides named handler and helper
interfaces, plus named tagged-union Schema interfaces. These let exported
helpers, nested State Schemas with constructor defaults, and nested Machine
Commands emit portable declarations without consumer annotations. The omitted
Context marker is a named branded interface for the same reason.

An extracted handler retains its precise next State, Command result Messages,
and Service requirements through the normal `MachineReturn` contract. It does
not promise the producer's incidental record fields or exact Command tuple.

## Verification

The final 19-check manifest passes and records unchanged source hashes before
and after verification. It is saved as `complete-manifest.json` under the raw
evidence directory below.

| Area                | Result                                                                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source              | Core, Machine source fixtures, Website, checkout example, and repository scripts typecheck                                                                                                                      |
| Declarations        | Full native TypeScript 7.1 beta source/rejection/emission/physical-relocation gate passes with strict declaration checks                                                                                        |
| Packed consumer     | Fresh tarball installed outside the repository; TypeScript 6.0.3 and 7.1 beta both emit the split search lifecycle, exported helpers with and without Context, and the copyable extracted-handler guide example |
| Packed execution    | Transition result, ignored Model identity, and graph checks pass against installed JavaScript                                                                                                                   |
| Behavioral tests    | 172 Machine, Schema, and public TypeDoc-boundary tests; 10 checkout Story/Scene tests                                                                                                                           |
| Lint and formatting | Framework, application, Effect, formatting, whitespace, and changeset checks pass                                                                                                                               |
| Documentation       | Active guide/snippets, checkout example, scaffold, and consumer skills migrated; API generation succeeds with 319 private-type/inherited Effect link warnings                                                   |

The old six compiler fixtures retain exactly their starting instantiation/type
counters, with their budgets unchanged:

| Fixture                  | Instantiations |   Types |
| ------------------------ | -------------: | ------: |
| deep-composition-8       |        634,239 |  51,235 |
| wide-composition-100     |      1,330,130 |  80,276 |
| command-requirements-200 |        334,654 |  62,104 |
| wide-subscriptions-100   |        548,398 |  24,566 |
| workspace-composition-4  |      2,641,963 | 228,893 |
| workspace-composition-8  |      4,264,711 | 276,361 |

The newly added `machine-search` fixture compiles the actual split consumer.
Three final calibration runs each measured 82,847 instantiations and 18,591
Types. Its initial ceilings are 83,700 and 18,800: 1% above the measured maximum,
rounded to 100, to accommodate observed native-checker count variation. No
existing ceiling was raised. This is a compiler regression check, not an editor
latency or runtime speedup claim.

Website client and SSR production builds pass with the same local review build
identifier. The guide and extracted-handler snippet were inspected at 1440px
using the server-rendered document and production styles. That presentation
check used JavaScript disabled and makes no hydration claim. Its temporary
server and browser were closed; the user's existing server was not touched.

### Independent review and mutation controls

Independent review found and closed requirement accumulation gaps for optional
shared entries and named alternative tables/maps, plus both directions of
shared-fragment variance. Shared inputs retain contravariant State, Message,
and Context contracts; State and Message outputs retain covariant evidence.
The combined contract rejects missing source payloads, unknown target states,
and foreign Command result Messages while allowing compatible Context reuse.

Mutations run on a separate source copy:

- Removing shared input evidence exposes three rejected-input checks.
- Removing shared output evidence exposes two rejected-output checks.
- Removing distributive requirement extraction breaks two exact requirement
  assertions.
- Restoring the source copy passes. Live repository sources stay unchanged.

The independent precommit assessment passes. A separate exact-commit review is
required before any push; its report is retained with the raw evidence.

### Limits and release boundary

- Schema contracts are structural; shared fragments are checked for compatible
  inputs and outputs, not assigned a new runtime owner identity.
- Source/Message tag lists select unions, not a correlation between tag pairs.
- Explicitly erased annotations cannot recover lost type information.
- Context is checked by TypeScript, not decoded or deep-frozen at dispatch.
- Runtime analysis remains structural and cannot prove arbitrary guards.
- The domains repository remains unchanged. Its migration is demonstrated in
  the self-contained framework fixtures rather than applied externally.
- Historical release material remains unchanged. No release snapshot is promoted.

Raw evidence: `/private/tmp/foldkit-machine-authoring-20261027`.
This work does not publish, push, or promote a preview snapshot.
