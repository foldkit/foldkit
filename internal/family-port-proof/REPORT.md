# Query and fixed Listbox family port

The results below record the original isolated trial. Shared-checkout runs use checkout-derived inputs and a separate artifact directory; these historical receipts are not claims about subsequent shared edits.

This is a bounded integration proof in `/private/tmp/foldkit-unified-family-trial-20261103`. It ports Query, KeyedQuery, Single Listbox and Multi Listbox. It does not migrate other factories or application consumers.

The four returned public facades have no `get`, `contract`, or `makeBlock` member. Query specializations expose ordinary `makeLayer` completion and the existing typed authoring helpers. Fixed erased Listbox specializations expose portable authoring helpers while withholding `makeLayer` and `provideHandlers`, both statically and on the actual returned object. Their shared ordinary Layers remain the implementation providers.

The original Equivalent family validation and one native completion runtime are reused. The internal family template now travels as an ordinary Layer; there is no new public implementation recipe stage. The public Namespace overload on `Block.make` preserves the existing Listbox effect owner. The private reader remains registered and authenticated, including the provided-child resolver path.

## Preferred consumer

The complete split-file example is in `consumer/`: contracts, composition, update, view and completion. It uses only public imports. Its extracted transition is simply:

```ts
export const refreshCatalog = CatalogBinding.requestRevalidationOrLoad()
export const update = ApplicationComposition.makeUpdate({
  ClickedRefresh: refreshCatalog,
})
```

The application yields its Bindings in an Effect constructor and completes through `ApplicationBlock.makeLayer`. `Query.layer` and `Listbox.layer` supply the child implementations. Pure Story construction needs no Catalog handler mock; an actual bound refresh produces the Catalog Fetch Command after deferred child initialization.

The key export in `contracts.ts` follows the existing declaration-portability convention. Exporting it allows TypeScript to name cross-file owner identity. No handler plumbing annotation, consumer cast, generic list, callback factory, or `satisfies` clause was added to extract the builders. The explicit `Fruit` parameter on the item rendering function communicates the application's domain type.

## Query handler selection

The existing factory-specific `provideHandlers` behavior is deliberately retained. It specializes a passive factory Block before Binding, rather than transforming an ordinary implementation Layer.

A host-owned Query can still be selected this way:

```ts
const PendingCatalogQueryBlock = Query.define({
  name: 'CatalogQuery',
  data: Schema.Array(Schema.String),
  error: Schema.String,
})
const CatalogQueryBlock = PendingCatalogQueryBlock.provideHandlers(
  PendingCatalogQueryBlock.toLayer(
    Effect.gen(function* () {
      const catalog = yield* Catalog

      return () => Effect.succeed(catalog.fruits)
    }),
  ),
)
```

The preferred ordinary consumer already has the shorter configuration form:

```ts
const CatalogQueryBlock = Query.define({
  name: 'CatalogQuery',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  handler: function* () {
    const catalog = yield* Catalog

    return () => Effect.succeed(catalog.fruits)
  },
})
```

Both forms existed before this port. They produce the same kind of selected passive public Block. The actual split consumer uses the second form.

`Query.layer` is a universal family implementation provider, not the checked ordinary implementation Layer of one Catalog specialization. Ordinary `Block.provideHandlers(handlers)(Query.layer)` therefore cannot select Catalog's original Fetch identity. Even if an individual default Layer were exposed, transforming that Layer alone would leave the unselected descriptor's public host contract unchanged before `makeBinding`.

Specialization retains the exact selected `effectsLayerRequirements`, `effectsLayerError`, `hostRequirements`, and `programRequirements`. Those facts travel through the Binding and the parent's aggregate effect requirements. For the concrete source fixture, replacing FetchSource with OtherSource changes exactly the selected effect requirements; merged Layers project the chosen handler's requirements rather than their union. The Model and Message payload contracts are unchanged by selection. Graph construction errors and requirements remain distinct from delayed handler construction.

Ordinary declared Blocks keep their curried Layer transformer. No `withHandler` modifier or other public spelling was introduced. `Query.define` was not renamed.

## Fixed-family admission

The Listbox facade preserves its existing complete public refinement, including readonly operation argument metadata. The new authoring helpers are overlaid without changing that contract. The canonical shared implementation is captured once through a private reader. Closed provider evidence survives ordinary `Layer.provide` and `Layer.mergeAll`.

The fixed admission checks retain the complete selected public identity, the original canonical implementation association, original handler readiness, and all unrefined actual Service, lifecycle, Mount and Subscription facts. Refined view inputs, operation arguments and OutMessages do not replace actual Command requirements. Copied stale witnesses and a genuinely replaced stale union member reject. The original capture, acquired native implementation and active acquisition lifetime are checked on both direct acquisition and the provided-child resolver path.

The existing erased Item/Value limit remains: `Listbox.makeBlock<'Apple'>().Message.RequestedSelectItem({ item: 'Pear' })` still uses the canonical String Message Schema. This port does not claim narrower runtime validation of erased type parameters. It also does not claim that TypeScript can distinguish separately selected Query values with identical structural public types; the original per-selection runtime identity rejects an incorrectly paired Layer in that case.

## Verification

Final receipts are under `/private/tmp/foldkit-recovery-artifacts/family-port/`. Earlier failure logs are retained as investigation history, not current failures. Final checks use Node22.22.3, native TS7.1.0-beta and raw TS6.0.3. Strict checks enable `skipLibCheck: false`, exact optional properties and unchecked index checks.

- Native core and complete UI builds pass.
- Native and strict source consumers pass, including exact factory Schemas, handler requirements, selected Layer association, generic/refined readers, constructor errors and Services, child folds, graph-aware views, and rejected combinations.
- Strict author emission and relocated consumption pass. The relocated check reads 171 copied framework declarations, zero framework source files, and zero live framework files. All phases resolve one physical Effect4.1.0.
- The split-file emitted consumer runs against the copied packages; initialization and the extracted bound refresh pass.
- Query plus ordinary-boundary runtime regressions: 21 tests pass. Listbox regressions: 142 tests pass. The focused proof has 11 passing groups covering passive construction, delayed handlers, scoped cleanup, keyed accepted/stale notifications, selected handler identity, identical-public-type selection rejection, capture authenticity, implementation identity and expired acquisition.
- Nine mutations in copied emitted packages fail as intended: selected result association, fixed admission, fixed provider pairing, refined reader requirements, capture originality, acquired implementation identity, lifetime, direct private reader guard and provided-child guard. Every mutated byte was restored. All 1,554 copied core/UI dist files equal the live built files afterward; restored copied type and runtime checks pass.
- Focused lint passes. No compiler budget was changed and no performance improvement is claimed. Combined compiler-performance acceptance belongs to the lead's final integration check.

`commands.json` records exact commands and statuses. `input-manifest.json` hashes every final compiler input; `provenance.json` records compiler identities and source-free audits; `mutations.json` records mutation commands, failures and byte restoration.

The exact integrated core baseline is `0bb16a8aaf36b85218be65c24f70c8a4c52b4023`. The family-only patch excludes that checkpoint’s correlation changes, NativeBody correction, and existing WithoutPendingHandlers reexport. No shared worktree source or build was changed. No commit, push, publication or source transfer was performed.

Recommendation: integrate this bounded port after review, retain the documented factory-selection exception, and use the Schema-specialized Combobox as the next family proof before broad migration.
