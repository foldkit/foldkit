# Record Block completion

## Recommendation

Use `Block.makeLayer({ init, update, view, ... })` for ordinary implementations.
Keep the Effect-taking form for construction that performs work, obtains
implementation dependencies or owns scoped resources.

The record removes a generator, child-acquisition call and returned child list
without moving application behavior. Composition declares the relationships;
parents provide implementation Layers. Portable builders remain independently
authored values.

## Graph ownership

Init already selects the Composition used by completion. The record follows
that rule explicitly: authenticate its init plan's original Source, acquire
that Source's immutable registered Binding inventory, then pass the resulting
body through existing completion. Update, InMessage update and view must use
the same Source. Separate runtime Compositions with identical structural types
remain distinct; runtime authentication rejects crossed plans.

The record is captured once. Its acquisition Effect runs inside the existing
construction graph, Layer memo map and Scope. It does not run init, evaluate
child argument producers, build handler Layers or start Model-driven
lifecycles. Child implementation provision remains explicit.

An Effect constructor acquires and returns its own complete `children` list.
It receives no automatic additions. Records reject `children`, `bindings` and
`operations`. Effects carrying both init and update fields are rejected before
execution, including structurally narrowed and inherited values; otherwise a
hidden Effect could execute dependencies absent from its record type.
Unrelated Effect metadata is preserved.

## Type and lifecycle proof

The record normalizes into the existing constructor-body validators. Its
synthetic child union retains each Binding's complete connection and placement;
construction Error and Service channels are derived separately from Binding
acquisition. Validation needs the element union, rather than tuple indices.
The public `acquireChildren()` helper retains its exact tuple.

Source and external emitted/relocated fixtures cover childless records,
inline/local/imported builders and views, graph-aware child view inputs,
generic family and provider completion, optional/default/rest context,
InMessages, OutMessages, child errors and dependencies, original host handlers,
foreign/crossed plans, invalid provider alternatives and unsupported hybrids.
Both TypeScript 6 and the pinned native compiler pass the focused fixtures.

The runtime regressions cover passive construction, one-time record capture,
Binding order, scoped memoization, independent acquisitions, partial-failure
cleanup, deferred argument selection, retained init Commands, post-assembly
Steps, host-handler readiness and custom construction. Mutation controls fail
when automatic child acquisition or hybrid rejection is removed.

The real split-file Workspace root typechecks, emits 175 declaration files and
works from relocated declarations without application source. Its 154 existing
tests pass. The generic Listbox implementation passes the UI emitted-consumer
suite. All 36 example/client typechecks and all 1,408 UI tests pass.

## Host-handler validation

The proof exposed an inherited defect in both completion forms: host provider
selection compared against an empty local handler Layer instead of the Block's
declared Service/error bounds. Selection now checks the original same-owner
public graph while preserving exact installed private facts. Every possible
Layer/provider alternative must provide the original handlers; one valid
alternative cannot mask a foreign provider. Undeclared Services and errors
remain rejected.

## Compiler measurements

All eight unchanged native fixtures pass their existing ceilings. No compiler-fixture
body, assertion or budget was changed.

The [portable comparison](performance.mjs) separately adapts the existing
Workspace graphs to canonical manual and record completion, preserving authored
property ASTs, domain declarations and every assertion. The final record path
uses 1.35% fewer instantiations for four groups and 0.95% fewer for eight groups
than the matching manual path. The [receipt](performance.json) preserves the
initial tuple experiment, the normalized version, the final hybrid guard and
controls proving the new overload is exercised.

Those canonical manual and record instantiation counts both exceed the native
ceilings. The canonical manual eight-group Types count also exceeds its native
ceiling. The comparison reports those failures and exits nonzero; it does not
recalibrate the existing gate or claim the native ceilings pass canonical
fixtures. It measures the incremental completion choice separately from the
unchanged repository gate.

## Adoption and retained forms

Ordinary examples, Website, Typing Game, UI and Query implementations, scaffold
templates, active documentation and skills use record completion. Packed SSR
fixtures and ordinary UI application fixtures also exercise it. The original
implementation properties and Layer providers are preserved.

Custom resource/Service constructors, invalid-input and explicit Effect
contract tests, unchanged compiler workloads, historical experiments and
published release material retain their appropriate forms. The active custom
construction snippet logs graph construction before acquiring children.

Final release checks, exact-commit review, protected integration, security
review and refreshed release-artifact evidence are recorded separately. A
passing API prototype alone is not publication verification.
