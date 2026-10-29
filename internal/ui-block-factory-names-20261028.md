# Generic UI Block factory names

## Public migration

Listbox, Combobox, Menu, RadioGroup, Tabs and VirtualList now expose `makeBlock` instead of `create`. The Listbox and Combobox Multi variants follow the same rename. Toast's `make` becomes `makeBlock` too. No compatibility aliases remain. Type parameters, Schema arguments, completed contracts and import paths are unchanged.

These factories construct reusable checked completed Blocks passively. Each occurrence's `init` creates its initial Model and Commands. Private assembly helpers retain their existing implementation under the local name `assembleBlock`; the public rename does not change initialization, identities, effects or lifecycle behavior.

All affected active examples, Website, DevTools, UI tests and declaration fixtures are migrated. Typing Game has no affected factory calls. Split-file inspection covers Job Application, UI Showcase, Workspace and Website consumers. Specialized operations such as `Slider.forRoot` retain their purpose-specific names.

The selection-factory lint rule recognizes the new spelling through the same import provenance checks and component set. Its namespace-alias and locally shadowed lookalike fixtures exercise the current name. Active guidance and pending changesets use `makeBlock`; the explicitly labeled migration Before example retains its original `Menu.create` call. Published historical content is preserved.

## Verification

- UI and DevTools builds pass. UI source and VirtualList browser-fixture typechecks pass.
- All 11 affected application/package source configurations pass: API Cache, API Cache Query, Pixel Art, Job Application, UI Showcase, Workspace, Charting, State Machine, Query Sync, DevTools and Website.
- All 521 tests in the 17 changed UI test files pass. The two affected lint suites pass 71 tests, including real oxlint import-provenance checks.
- UI source acceptance/rejection, declaration emission and strict relocated-consumer checks pass through the existing emitted-declaration harness.
- All seven compiler fixtures pass with unchanged budgets and unchanged diagnostic counts. No editor or rendering speedup is claimed for a naming change.
- Website API generation, client build and server build pass. Desktop review covers the rendered preview upgrade instructions using a local unpublished manifest fixture.
- Formatting, whitespace, changeset summaries, skill-version enforcement and public-subpath checks pass. Independent review found pending changeset and Toast TSDoc remnants; those are corrected and the review passes.

Lead verification logs and the local render fixture are under `/private/tmp/foldkit-ui-make-block-20261028`; compiler diagnostics are in `/private/tmp/foldkit-ui-make-block-budgets.log`. Delegated runtime/lint and declaration check results are retained in their task tool outputs. Publication remains held for approval, and the published Ready snapshot is unchanged.
