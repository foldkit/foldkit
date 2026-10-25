# Extracted connected Step inference

## Decision

Retain one derived Model input annotation for an extracted helper that changes its own fields before applying an emitting child operation. The annotation comes from that operation, not from a plain Model Schema. It preserves the exact registered Binding requirement without a cast, consumer generic list or new authoring API.

The current Workspace `changeDraft` and `resetDraft` helpers demonstrate this case. The [copyable Update guide example](../packages/website/src/snippet/blockExtractedConnectedStep.ts) shows the same contract in a smaller parent/Settings graph. Inline Message handlers continue to receive their Model context from `Composition.makeUpdate`.

## Bounded comparison

The comparison used official TypeScript `7.1.0-beta`, the actual Workspace Issue Detail contracts, and the checked `679d2d5e7f` implementation. The subsequent testing-helper delta does not change the compared Binding or Step encodings.

| Encoding                                                                                 | Result   | Reason                                                                                                        |
| ---------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `Function.compose(model => modifyFields(model, fields), reportDraft)`                    | Rejected | The first callback's input is inferred as `unknown`; the downstream operation does not contextually supply it |
| `Function.compose(reportDraft)(model => modifyFields(model, fields))`                    | Rejected | Currying fixes the downstream input but leaves the first callback's generic input unresolved                  |
| `Definition.makeStep(model => reportDraft(modifyFields(model, fields)))`                 | Rejected | Definition supplies its plain local Model, which cannot execute a connected operation                         |
| `(model: Parameters<typeof reportDraft>[0]) => reportDraft(modifyFields(model, fields))` | Accepted | The input retains the operation's exact graph capability through the local transformation                     |

The failed probes report TS2740/TS2345 for the composition forms and TS2345 for the plain Definition callback. These are failures of these encodings, not proof that no different encoding could work. Probe files and raw diagnostics are retained at `/private/tmp/foldkit-extracted-inference-20261025`.

Adding a graph-aware Composition helper would also require resolving the organization problem: Workspace's shared transition is referenced by sibling policies before that Composition is registered. Moving the helper behind the final Composition risks the same policy/Composition inference cycle. An additional Step-composition API would need its own meaningful contract for a final emitting operation. Neither change is justified solely to replace this one annotation.

## Preserved contract

The helper changes only parent-owned fields, returns the complete connected result, and does not inspect an opaque recipe. Its policy runs after the parent edit and child transition. It must not combine away the policy's OutMessage through `Update.combineSteps`.

The dedicated `extracted-connected-step` declaration group uses separate helper and consumer files. Source and emitted checks retain the exact transformer argument, resulting Model and OutMessage, existing scoped Command requirements, and the helper's absence of extra Command requirements. Negative cases reject a plain Model call, an incompatible field output and a Composition missing the required Binding. Strict relocation checks the exported helper without consumer casts.

No framework API or inference encoding changes as a result of this assessment. No new editor-speed or compiler-count improvement is claimed. The combined unchanged-budget and affected-consumer gates pass; the [final followup report](preview-final-followups-20261025.md) records their exact source and package scope.
