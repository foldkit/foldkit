# Explicit Binding relationship adoption

The requested change makes the relationship visible at its declaration while
retaining the existing Binding, Composition and Layer architecture. Prototype
first; migrate after exact typing, runtime and declaration proofs and an explicit
compiler-cost decision. The user approved the final prototype and its two measured
Workspace ceiling revisions.

The investigation starts at `4f6a740d923b9a25b2c0360e79071eda898057ab` on
`codex/explicit-binding-relationships-20261106`. The separate release-preparation
PR [#1901](https://github.com/foldkit/foldkit/pull/1901) retains that exact head
and continues through its protected queue. Publication and announcements remain
held for user approval and this new work.

## Canonical family

| Parent-owned constructor        | Existing relationship                                                |
| ------------------------------- | -------------------------------------------------------------------- |
| `makeRequiredFieldBinding`      | One exact required child field                                       |
| `makeOptionalFieldBinding`      | Required `Option<ChildModel>` field                                  |
| `makeOptionalKeyedFieldBinding` | One optional closed keyed wrapper                                    |
| `makeKeyedArrayBinding`         | Exact or wrapped keyed array                                         |
| `makeRecordBinding`             | Required Record, with optional `childField` projection               |
| `makeHashMapBinding`            | Required HashMap, with optional `childField` projection              |
| `makeCustomBinding`             | Unkeyed `read` and `write` accessors                                 |
| `makeCustomKeyedBinding`        | Keyed `readAll`, `key`, `read`, `writeAt`; delivery adds `keySchema` |
| `makeVariantBinding`            | One exact tagged member of the parent Model union                    |

Custom keyed children with generated Message delivery require `keySchema`. Message-free children omit both `keySchema` and `delivery`; their `key` callback still establishes the exact occurrence-key type.

The constructor describes storage. `activeWhen` replaces `presentWhen`: a false
predicate deactivates the whole direct child occurrence while retaining its
stored Model. Delivery and Subscription gates keep their narrower roles.
Required storage can still have this activity gate. A child Model may itself be an Option, array,
Record or HashMap; container-shaped child data must not be mistaken for parent
storage. Do not add unsupported matrix combinations.

Use one internal lowering implementation and retain common initialization,
delivery, lifecycle and OutMessage policy. Parent-specialized callables must
remain detachable and portable between inline, local and extracted expressions.
Avoid generic receivers or a free config helper that loses parent inference.

The user also approved `foldkit/binding` as the canonical public helper path.
Remove `foldkit/bindingInit` without an alias, preserving helper names. Shared
helpers and types belong there; relationship constructors stay on the parent
Block. Remove the standalone `foldkit/variantBinding` authoring path if the
parent-owned variant constructor succeeds.

## Proof before migration

- [x] Read the request, current repository/scaffold guidance, implementation
      and prior map/variant experiments; inventory real consumers.
- [x] Prototype all current relationship contracts with erased-call validation.
- [x] Prove actual Typing Game Home/Room and Workspace Record relationships.
      Workspace has no child arrays; use actual Job Application and Toast array
      relationships rather than changing its Models for the example.
- [x] Prove HashMap and custom relationships in framework fixtures, including
      exact keys, wrapper fields, init args, dispatch context, Services,
      constructor errors and OutMessage/registration channels.
- [x] Reject relationship/field/container/key/child-field mismatches in source,
      emitted and relocated consumers, including detached helpers and generic
      UI/Query callers.
- [x] Verify passive construction, synchronous init and operations, identity,
      lifecycle and cleanup through the existing execution architecture.
- [x] Run all eight existing compiler-performance workloads with unchanged
      graph shapes and budgets. Six pass; two Workspace ceilings still fail.
      [Measured results and limits](README.md#compiler-measurements).
- [x] Review reader clarity and material costs before broad migration.
- [x] Obtain the user's decision on the measured compiler cost and apply only
      the two approved exact Workspace ceiling revisions. All eight fixtures pass.
- [x] Complete repository-wide consumer, fixture, lint and documentation adoption.
- [x] Complete source/emitted/runtime, lint and focused consumer checks.
- [ ] Complete the ordinary pre-push package gates and exact-commit review.
- [x] Run the frozen rendering comparison before final release review. Retain
      all 32 samples and review its variable optimized timing and added bundle cost.
- [ ] Freeze the integrated candidate for newly authorized security review.

## Verified baseline

The ordinary pre-push hook at the starting commit already measured all eight
unchanged fixtures with TypeScript 7.1.0-beta and the single-threaded checker.
The raw log remains at
`/private/tmp/foldkit-daybreak-chunk-addendum-20261106/preparation-push-verified.log`.
No fresh baseline run is implied by this record.

| Fixture                  | Instantiations delta | Types delta | Symbols delta |
| ------------------------ | -------------------: | ----------: | ------------: |
| deep-composition-8       |              671,225 |      54,305 |        89,052 |
| wide-composition-100     |            1,407,702 |      81,772 |       130,469 |
| command-requirements-200 |              345,597 |      64,468 |       115,795 |
| wide-subscriptions-100   |              548,134 |      23,593 |        58,409 |
| workspace-composition-4  |            1,604,687 |     116,418 |       161,974 |
| workspace-composition-8  |            2,778,703 |     157,971 |       235,005 |
| machine-search           |               69,558 |      13,180 |        43,612 |
| attribute-bundles-200    |              114,226 |      29,369 |       152,472 |

## Adoption

The user approved proceeding on `codex/explicit-binding-adoption-20261106`, based
on integrated preparation commit `d782b73e62c95a1bfba60c11bbfdaf99c496b153`. Retire the implicit
public constructors and migrate active applications, framework consumers,
fixtures, scaffolds, docs/snippets, skills, TSDoc and lint recognition. Preserve
historical published material and labelled migration-before examples. Update
migration guidance, changesets and the release review, obtain exact-commit
review before pushing, and coordinate the final security-review scope.
