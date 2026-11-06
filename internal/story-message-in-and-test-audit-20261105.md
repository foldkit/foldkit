# Story child delivery and application-test audit

## Canonical child delivery

`Story.messageIn(binding, message)` is the canonical direct-child delivery
step. A keyed Binding takes its decoded key between the Binding and Message.
The rename retains the existing passive graph acquisition, exact Binding owner
and child Message evidence, nested `Story.steps` resolution, child routing,
OutMessage policy, and Command channels.

The active framework, application, UI, Website, scaffold, skill, documentation,
and current verifier sources use `messageIn`. The rejected declaration fixture
checks that `messageFrom` is not exported. Frozen proof receipts, saved patches,
and copied performance artifacts retain the identifier they recorded. The
Website helper `isExampleUrlMessageFromIframe` is unrelated: it identifies the
origin of a browser `MessageEvent` rather than a Story step.

## Application-test structure

The audit covers active tests under `examples/`, `packages/website/`,
`packages/typing-game/`, and `packages/create-foldkit-app/`, excluding built
`dist` output. It found 120 Story or Scene files.

- Story and Scene operations are qualified through the root `Story` and `Scene`
  namespaces. The only direct Story subpath import in the reviewed application
  guidance is the explicitly labelled migration-before snippet, which remains
  historical input to that comparison.
- No Story or Scene file carries values between steps through an outer `let` or
  a `mockImplementation` closure. Current comparisons use immutable fixtures,
  observable assertions, `messageWith`, or `models`.
- Story and Scene files live with the application or feature they exercise.
  There are no active `scenario` files or directories. Descriptions such as the
  Auth login flow and Pixel Art export workflow are behavior groups inside the
  owning feature's Scene, not abstract scenario suites.

## Pure-test boundary

Pure domain algorithms, repository failure and staleness behavior, browser
lifecycle adapters, Service execution, content generation, and URL policy stay
in focused ordinary tests. Two assertions duplicated configuration or framework
routing mechanics and were removed:

- Workspace no longer repeats `withRouteFilters`' supported Route tag list and
  object-spread implementation. Its filter encoding, malformed-value fallback,
  Saved View default override, selected-issue preservation, and standalone-link
  policies remain covered.
- Website no longer derives expected Route tags from exported router variable
  names and asks every parameterless router to parse back to that derived tag.
  Canonical URL policy, query removal, the previous Layers redirect, blog paths,
  RSS exclusion, and section predicates remain covered.

Schema tests that decode external TypeDoc, blog-frontmatter, package metadata,
or content-API documents remain because they protect real input and publication
boundaries. Command/Service tests remain where they exercise interruption,
staleness, cleanup, or error behavior rather than merely proving Layer wiring.

## Canonical keyed Scene lifecycles

A focused canonical proof uses a real `Block.make` child and parent, their
selected `makeLayer` implementations, one keyed map Binding, and the public
Block-aware Scene. The same child implementation occurs at two keys. Selected
Subscriptions and ManagedResources route independently, inactive and absent
occurrences remain observable, a child OutMessage reaches the parent fold, and
Scene never constructs the live handler generators. A source created by the
same child but omitted from the selected implementation is rejected against
the acquired graph.

`Scene.Subscription.at` retains compact `BindingParent<Owner>` evidence. A
Block-aware Scene accepts selected Subscription steps only when that exact
parent Owner matches, including when a foreign parent has an identical Model
shape. The carried type does not expand the child implementation graph. The
acquired Scene host still resolves the declarative Binding to its selected
implementation and verifies the actual Binding and source registration at
runtime.

`Scene.ManagedResource.at` checks the selected Binding's exact key and source,
and its lifecycle operation preserves the acquired value type. Runtime metadata
retains the actual Binding for acquired-graph membership. ManagedResource
lifecycle operations predate the typed Scene-step union and remain simulation
functions, so a valid selection from a different parent is not compared with
the Scene root Owner statically. The acquired graph rejects that foreign
Binding at runtime. This is an explicit limit of the existing function-step
shape, not a claim of complete static foreign-parent coverage.

## Verification

Focused checks completed against the coordinated Core and UI build:

- Core child delivery: 4 runtime tests passed.
- Core declaration source: direct and keyed `messageIn` projects passed with
  exact key and Message rejections.
- Core emitted declarations: TypeScript 7.1 accepted emission, rejected wiring,
  strict relocated consumption, compiler diagnostics, completions, and
  documentation checks passed. This gate includes the optional wrapped-keyed
  and Program union-Service groups.
- Canonical keyed Scene source and declaration fixtures passed focused
  TypeScript 6 and TypeScript 7 checks. The permanent negative fixture covers
  the exact Subscription payload and key, an incompatible source, the
  ManagedResource value, and an identical-Model foreign parent Owner.
- Canonical keyed Scene runtime: 3 tests passed. Temporarily bypassing the
  selected Binding resolver made the proof fail at graph membership; restoring
  the resolver returned it to green.
- Workspace Route policy: 10 tests passed.
- Website Route policy: 111 tests passed.

Repository-wide application suites and compiler ceilings remain lead-owned
integration gates.
