# Init-if-missing Step: implementation and adoption

## Public contract

`foldkit/bindingInit` exports:

```ts
const initIssueEditorStep = (issue: typeof Issue.Type) =>
  makeInitIfMissingStep(IssueDetailBinding, {
    key: issue.id,
    args: [issue],
  })
```

The helper accepts one concrete Binding whose Record or Effect HashMap stores
child Models directly. The Binding supplies the field, key contract, child init
tuple, qualified requirements and registration evidence. There is no independent
field selector, union of Bindings, `unknown[]` argument boundary or consumer cast.

Construction captures the key and arguments without running child init.
Applying the connected Step in its registered graph checks the current storage:

- Existing key: return the exact parent Model with no Commands or child reset.
- Absent key: initialize and insert through the native Binding recipe, retaining
  the child's qualified Commands and occurrence metadata.

Registration is required on both paths, including policy-equipped Binding
aliases. Reuse performs a collection lookup without validating the whole parent
Schema. Insertion retains the existing complete-Model and child-placement checks.
The helper follows ordinary connected-Step execution and deferral, so a valid
active graph does not introduce an extra deferred replay.

`initAndInsert` retains duplicate-key rejection. Wrapped map values and custom
accessors retain explicit writers.

## Repository adoption audit

Inspected application initialization, map Bindings, child Model Schemas,
membership checks and explicit Binding initializers across examples, Website,
Typing Game, UI, scaffolds and active snippets. Inspected the remaining explicit
sites rather than treating compilation as an adoption audit.

| Site                                               | Disposition                                                                                                     |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Workspace issue detail editors                     | Migrated to `makeInitIfMissingStep`                                                                             |
| Workspace project boards                           | Migrated to `makeInitIfMissingStep`                                                                             |
| Workspace project settings                         | Migrated to `makeInitIfMissingStep`                                                                             |
| Website Home, Playground and UI Pages              | Retain `initAndSet`: singular storage and deliberate route/environment initialization                           |
| Typing Game Room                                   | Retain keyed Option initialization: joining/replacing a single room has explicit identity and navigation policy |
| Job Application Skills, Education and Work History | Retain `initAndAppend`: fresh generated IDs create new array entries                                            |
| Counters                                           | Retain explicit init: array insertion also advances the parent's next ID                                        |
| Auth                                               | Retain explicit init: whole tagged variants and parent Commands                                                 |
| Website source tabs                                | Retain explicit init: reset sibling state and optionally load sources                                           |
| Active `initInsertMappedChild` snippet             | Retain explicit insertion example and its duplicate-key contract                                                |
| Active `initAppendKeyedChild` snippet              | Retain array presence check; arrays are outside this helper's map contract                                      |
| Map Binding declaration snippet                    | Declares empty map storage; no conditional initialization to migrate                                            |
| Core tests and compiler/lint fixtures              | Retain APIs and shapes deliberately under test; add dedicated coverage for the new helper                       |

The three Workspace sites are all eligible application sites found. Its current
route selection, missing URL entity handling and loading guard remain explicit.
The three repeated membership-check/initialization wrappers are removed.

The active initialization, Block and preview-upgrade guides, a dedicated snippet,
scaffold FOLDKIT.md, app generation/audit guidance and public TSDoc document the
same contract. Published historical content is unchanged. The new changeset
contains a Foldkit minor and a scaffold patch entry.

## Verification

- Core source typecheck and Workspace/Website typechecks pass.
- Five focused initialization suites: **77 tests pass**.
- Workspace Story, Scene, domain and repository suites: **151 tests pass**.
- Full core emitted-declaration gate passes, including native authoring checks.
- Final focused source acceptance/rejection, external emission and strict
  relocated declaration consumption pass against the final helper signature.
- Negative cases retain exact branded/numeric keys, required and rest arguments,
  concrete Binding selection, registration and opaque result channels. Wrapped,
  direct, optional and custom storage are rejected by this map-only helper.
- Exact Model, generated Messages, qualified Commands/Services and registration
  evidence are asserted across declaration emission.
- Mutation controls fail when existing children are reinitialized or the
  registration check is removed from the reuse path; the implementation is
  restored and the focused suites pass.
- All six compiler-performance fixtures pass without changing their budgets.
- Website production build, focused lint and formatting pass.

These checks do not claim a new editor speedup or benchmark rendering behavior.
Changes are local and uncommitted; this side conversation performs no push,
release or external publication.

## Similar helpers worth considering

1. **Simple optional child fields:** the strongest next extension is the same
   helper accepting an exact `Option<ChildModel>` field, with `None` initializing
   and `Some` preserving it. This serves lazy child creation without repeating
   a presence check and `initAndSet`. Prototype inference and compiler cost
   before broadening the contract.
2. **Keyed arrays with an existing initialization policy:** retaining a key or
   appending an absent one is the same useful operation. Reuse the existing
   `init.toItem` policy and preserve ordering. The active array snippet shows
   the repeated check, but fresh-ID creation sites must keep duplicate rejection.

Prefer extending this one operation over adding a separate helper for every
container. Keyed Option replacement needs an explicit contract for a different
occupied key; it should not be inferred from a generic notion of missingness.
Entity lookup, routing, eviction and lifecycle-sensitive reset remain application
or child-operation decisions. `modifyFields` and existing collection operations
already express ordinary removal concisely. No additional helper is implemented
as part of this adoption pass.
