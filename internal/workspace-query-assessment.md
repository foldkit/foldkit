# Workspace Query assessment

## Recommendation

Keep the workspace's current direct `AsyncData` ownership. Query would fit a
standalone retained workspace read, but the current read result also reconciles
mutations and initializes routed children. The existing Query API does not make
that integration simpler while preserving the current behavior and one
authoritative issue collection.

This is an assessment of the current implementation, not a request for Query API
changes. No application code, compiler runs, or builds were part of this review.

## Current ownership

| Concern                                | Current owner                                                                                   | Query assessment                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial snapshot and retry             | `src/init.ts`, `src/command.ts`, `src/update.ts`                                                | One `LoadWorkspace` Command and `AsyncData.revalidateOrLoad` already cover this read. Query could package this loop and add fetch-generation protection.           |
| Retained issues, projects, and members | Root `Model.workspaceAsyncData`                                                                 | Keep one snapshot. Lists, boards, people, search, and project pages derive their data from it. Separate keyed issue/project Queries would duplicate those records. |
| Load completion                        | `applySnapshot`, `prepareProjectDraft`, `openRoutedIssue`, `openRoutedBoard` in `src/update.ts` | Completion is a domain transition across several fields and child Bindings, beyond retaining a fetch result.                                                       |
| Successful writes and live activity    | `src/composition.ts`, `src/update.ts`                                                           | Returned records update the canonical snapshot immediately. Activity ticks add comments; they are mutations, not read polling.                                     |
| Editing and conflicts                  | `src/issueDetail/`, `src/commentComposer/`, root mutation state                                 | Drafts, revision checks, incoming changes, optimistic ordering, and rollback remain application state regardless of the read primitive.                            |

The root uses the standard six-state `AsyncData` Schema. Retry/revalidation starts
through `AsyncData.revalidateOrLoad`; failed reads settle through
`AsyncData.settle`. This already permits retained data during a refresh or after
its failure. The snapshot merge also preserves newer issue revisions and issues
created after an older snapshot was read.

## Exact existing-API read sketch

A read-focused version could define one unkeyed Query:

```ts
import { Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { WorkspaceSnapshot } from './domain'
import { WorkspaceRepository } from './repository'

export const workspaceQuery = Query.define({
  name: 'Workspace',
  data: WorkspaceSnapshot,
  error: Schema.String,
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return () => repository.load.pipe(Effect.mapError(error => error.message))
  },
})
```

The corresponding integration uses existing APIs:

- Replace the root Schema field with `workspace: workspaceQuery.Model`.
- Define `WorkspaceBinding = ApplicationDefinition.makeBinding(workspaceQuery,
{ field: 'workspace' })` and register it in `ApplicationComposition.bindings`.
- Let required-child default init initialize the Query. Omit `workspace` from
  the parent's authored init fields and start through
  `steps: [WorkspaceBinding.requestLoadIfMissing()]`.
- A Retry branch returns
  `WorkspaceBinding.requestRevalidationOrLoad()(model)`.
- Read through `workspaceQuery.read(model.workspace)` and render the returned
  `AsyncData`. Registered Bindings collect the Query handler recipe; the root
  continues providing `WorkspaceRepository` through `ApplicationLayer`.

These are consumer fragments checked against the current source and
`examples/api-cache-query`, not a compiled drop-in migration of this application.

## Why this is not the current migration

A single unkeyed Query could own the one canonical snapshot. Single ownership does not itself favor AsyncData. The distinction is who can perform the required mutation and completion transitions through the public API.

1. **Writes need domain reconciliation.** Query exposes read/reset/load/refresh
   operations; it has no public operation to merge a mutation result into retained
   data. A parent should not write the Query Model's internal `data` field. Query
   fetch generations reject obsolete fetches; they do not compare issue revision
   numbers or preserve records created after an earlier read.
2. **Settlement drives child initialization.** Query is a viewless Block without
   OutMessages. Replacing `SucceededLoadWorkspace` removes the parent event that
   currently prepares the project draft and initializes routed detail/board
   occurrences. A custom Binding writer can change plain parent fields but cannot
   return child init Steps and their Commands. A Subscription could report
   settlement, with an additional asynchronous transition and deduplication policy.
   These are indirect existing-API encodings, not proof that coordination is
   impossible.
3. **Refetching after writes changes the experience.** Existing Query operations
   can refresh after mutation success. Preserving optimistic moves would then
   require a pending-operation overlay over Query data and a defined reconciliation
   policy, including refresh failure. That is a behavioral redesign with more
   coordination than this single read loop currently needs.

Keep local editing baselines and drafts where they are; they are transaction
state, not another retained issue collection. Do not retain both a snapshot Query
and the current root snapshot. Calling `workspaceQuery.run` inside the existing
Command would reuse a fetch handler but would not adopt Query's retained-state
ownership or remove the domain completion workflow.

## Sources reviewed

- `packages/foldkit/src/experimental/query/{define,query,keyedQuery}.ts`
- `packages/website/src/page/core/query.md`, especially “When to Use AsyncData
  Directly”
- `examples/api-cache-query/src/{query,composition,init,update}.ts`
- `examples/workspace/src/{model,init,command,composition,update,subscription}.ts`
  and the issue-detail/comment mutation boundaries

Query remains experimental. If the workspace later adopts it, use one unkeyed
snapshot Query and review the completion/reconciliation design first. No Query
enhancement is required to finish the current example.

## AsyncData naming follow-up

The root field is now `workspaceAsyncData`, including init, update, views, Subscriptions, and tests. `FOLDKIT.md`, the repository conventions, and authoring guidance require an `AsyncData` suffix for fields containing AsyncData values. A field storing a Query Model contains a child Block Model and does not take that suffix merely because Query retains AsyncData internally.

An independent source review reconfirmed the recommendation against current Query operations and OutMessage contracts. Query-owned mutation reconciliation and settlement notification remain future API assessment topics; no Query API or application ownership redesign is introduced here.

The naming change passes pinned Workspace source checking, all 113 application tests, lint, production build, root declaration emission, and strict relocated declaration consumption. The emitted consumer accepts `workspaceAsyncData` and rejects the removed `workspace` field; an isolated mutation confirms that rejection assertion is active. Evidence: `/private/tmp/foldkit-workspace-asyncdata-naming-20261024/`.
