# Application view input audit

Date: 2026-11-06

## Rule applied

Primary Block views and cohesive page or tab composers continue to receive their
Model when they own the corresponding rendering responsibility. Smaller helpers
now receive the exact fields, child Models, domain collections, or route data
that they read, followed by the graph-aware `h` builder. The pass did not add a
parallel ViewModel or Schema layer, move files, change Message flow, or change
DOM keys and layout.

The same rule now appears in `AGENTS.md`, the scaffold's `FOLDKIT.md`, the
generate/audit skill guidance and checklist, and the active Website View guide.
The `featureViewHelpers` snippet passes `model.articles` to its list helper
instead of passing the whole Model.

## Changed rendering surfaces

| Application              | Files                                                                                                                                                                                                                                                                                                                                           | Narrowed responsibility                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                | `src/view/{view,workspace,project,settings,sidebar}.ts`                                                                                                                                                                                                                                                                                         | Page titles take Route, saved views, and projects; the active-member renderer takes the child Listbox Model, selected member id, and members. Workspace/project/settings composers pass explicit route, collection, drag, and child-Model inputs. |
| Workspace features       | `blocks/createIssue/view.ts`, `blocks/projectSettings/view.ts`, `blocks/commandPalette/view.ts`, `blocks/memberDirectory/view.ts`, `blocks/issueBoard/view.ts`, `blocks/issueDetail/view.ts`, `blocks/issueDetail/blocks/commentComposer/view.ts`, `blocks/issueList/view/{view,controls,toolbar,rows}.ts`, `blocks/notificationCenter/view.ts` | Leaf form fields, child Listbox Models, issue/member/project collections, conflict state, drag state, list controls, rows, and notification entries are passed directly instead of being selected from a whole feature Model inside a renderer.   |
| API cache examples       | `examples/api-cache/src/view/{view,posts,stats}.ts`, `examples/api-cache-query/src/view/{view,posts,stats}.ts`                                                                                                                                                                                                                                  | Posts, detail maps/queries, stats, active tab, and selected ids are explicit at each tab/section boundary.                                                                                                                                        |
| Kanban and Map           | `examples/kanban/src/view/{view,column,card}.ts`, `examples/map/src/view.ts`                                                                                                                                                                                                                                                                    | Cards and columns take their entity and exact drag/form context; map panes take exact viewport, marker, route, and selection inputs.                                                                                                              |
| Query Sync               | `examples/query-sync/src/view.ts`                                                                                                                                                                                                                                                                                                               | Filter renderers take the exact query/filter fields. The new Schema-backed diet and period filters render the explicit `All` variant instead of an empty-string absence sentinel.                                                                 |
| Stateful examples        | `examples/shopping-cart/src/view.ts`, `examples/snake/src/block.ts`, `examples/canvas-art/src/block.ts`, `examples/generative-art/src/view.ts`, `examples/state-machine/src/view.ts`, `examples/state-machine/src/view/analysis.ts`, `examples/todo/src/view.ts`, `examples/web-components/src/block.ts`                                        | Cart sections, game/canvas controls, generation panels, state analysis, todo rows/controls, and custom-element sections receive the values they display or mutate rather than the complete root Model.                                            |
| Other examples           | `examples/auth/src/view.ts`, `examples/ui-showcase/src/view.ts`, `examples/ssg/src/block.ts`, `examples/slow-warnings/src/view.ts`, `examples/job-application/src/view/view.ts`, `examples/personal-blog/src/view.ts`                                                                                                                           | Route/content, selected showcase section, page/count, slow-warning phase data, application step data, and blog selection are explicit at leaf boundaries.                                                                                         |
| Website                  | `packages/website/src/blocks/search/view.ts`, `blocks/snippetDisclosure/view.ts`, `blocks/home/blocks/asyncCounterDemo/view/view.ts`, `blocks/home/blocks/notePlayerDemo/view/view.ts`, `packages/website/src/view/view.ts`                                                                                                                     | Search input/results, disclosure state, demo controls, note-player sections, and the root home handoff expose the data each renderer uses.                                                                                                        |
| Typing Game and scaffold | `packages/typing-game/client/src/blocks/room/view/view.ts`, `packages/create-foldkit-app/templates/rendering/ssg/src/block.ts`                                                                                                                                                                                                                  | Room content takes the exact session/player fields; the SSG template teaches `pageView(route, count, h)` instead of passing the whole Model.                                                                                                      |

## Deliberate broad inputs

The final pass also narrowed DevTools' badge, flatten setting, settings screen,
and scrubber-position label. The host-owned view cache and cohesive inspector,
child-control and panel composers retain their existing ownership. All six
DevTools integration tests, its TypeScript check and both lint configurations
pass after that cleanup.

- A primary Block view remains the natural Model owner. It decomposes the Model
  at the call sites instead of introducing a second aggregate input type.
- Workspace root/page/sidebar composition still uses shared Model queries such
  as effective filters, visible workspace data, and unsaved issue summaries.
  Those are domain queries shared by the composition, not hidden leaf-renderer
  dependencies.
- API-cache tab composers, Website page adapters and demo panel composers,
  Pixel Art's primary content view, and the job-application preview remain
  broad where they intentionally coordinate most of the owning feature.
- Existing renderers that already took an entity, field, or child Model were
  left alone. No helper was split merely to reduce its parameter count.

No remaining leaf renderer was found to hide a meaningful dependency on an
unrelated whole Model. The retained broad inputs correspond to cohesive
ownership rather than convenience selectors.

## Verification

- Oxfmt completed on all 49 changed rendering files.
- Application-config Oxc lint passed for the same files. Receipts:
  `/private/tmp/foldkit-view-input-audit-lint-20261106.log` and
  `/private/tmp/foldkit-view-input-audit-lint-extra-20261106.log`.
- Focused TypeScript checks passed for API Cache, API Cache Query, Auth, Canvas
  Art, `create-foldkit-app`, Generative Art, Job Application, Kanban, Map,
  Personal Blog, Query Sync, Shopping Cart, Slow Warnings, Snake, SSG, State
  Machine, Todo, Typing Game client, UI Showcase, Web Components, and Website.
  Their receipts are
  `/private/tmp/foldkit-view-input-audit-*-types-20261106.log`.
- The first scoped Workspace receipt captured a concurrent, non-view
  `commandPalette/steps.ts` graph-capability diagnostic. The owning change was
  subsequently corrected, and the lead's combined current Workspace TS7 check
  passes; the initial receipt is retained as historical evidence rather than a
  claim about the final source.
- `git diff --check` passed for the owned rendering paths.
- A representative Scene/Story run was stopped before completion when the lead
  began the combined full-workspace test run. Runtime acceptance should use the
  lead's combined receipt, not the interrupted local run.
