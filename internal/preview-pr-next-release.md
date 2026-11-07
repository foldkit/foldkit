## Next preview in preparation

The next Blocks + Effect Layers preview is being prepared. The verified published snapshot remains `90746b32d2ca`; this section does not assign new package versions or a deployment URL. After publication and deployment verification, prepend the generated Ready section and rename this heading to “Changes since the previous preview.”

### Required migrations

- Declare the public contract once with `Block.make`, author through its helpers and Composition, and export its ordinary implementation `layer` with `FooBlock.makeLayer`. Application authoring no longer needs a separate Definition, preparation producer or assembly annotation. Parent code imports the child contract; Layers supply its implementation.
- Select each child relationship with the storage-specific parent Block constructor: required field, optional field, optional keyed field, keyed array, Record, HashMap, custom unkeyed, custom keyed or whole variant. Replace `makeBinding`/`makeMapBinding`, move standalone variants onto the parent, rename `presentWhen` to `activeWhen`, and import initialization helpers from `foldkit/binding`. Storage and whole-occurrence activity are distinct.
- Pass `{ block, layer }` to Program, Server, Story and Scene. Constructors yield the registered Bindings and return their connections under `children`. Provide child implementation Layers through ordinary `Layer.provide` composition.
- Name the positional initializer Schema `InitArgs`. The initializer function and `makeInit` keep their names; `Init` is not a compatibility alias.
- Rename UI child notification operations such as `informItemsChanged` to `informOfItemsChanged`. Generated `InformedOfX` methods retain the same preposition as `informOfX`; `RequestedX` continues to generate `requestX`.
- Ensure Foldkit-managed Model and Message Codecs are synchronous and service-free, including generated child envelopes. Synchronous transformations, Option and Date remain supported. Effectful loading and normalization belong in Commands or other explicitly effectful boundaries.
- Replace Listbox's generic-only factory arguments with runtime Value Schemas. Use `makeBlock()` for unrestricted strings, `makeBlock(Value)` for direct string values, or `makeBlock(Item, Value)` for richer view items, including Multi Listbox. Value governs the selection Message and OutMessage Codecs; Item is view-only. Provide the corresponding family Layer.
- Return scoped Story/Scene runner Effects to the test integration. Block-aware Stories return their final Model after pending-Command validation. Explicitly void-typed wrappers can use `Effect.asVoid`.

If you followed an unpublished integration snapshot, also rename `makeReceive`/`receive` to `makeInMessageUpdate`/`inMessageUpdate`, remove any Block `codec` field, and rename `Story.messageFrom` to `Story.messageIn`. Those intermediate spellings were not part of the published `90746b32d2ca` API.

The active stable-to-preview and previous-preview guides cover these paths separately. Keep the application's installed package set pinned to the verified release manifest and upgrade Effect/platform packages together to the supported 4.1 line.

### Authoring improvements

- Typed builder expressions retain their contracts when moved inline, into a local value or into another module. Application authors no longer write a preparation producer or assembly annotation to bound the public Block type.
- InMessages have their own exhaustive `makeInMessageUpdate` record and can reuse ordinary Steps. `defineInMessageUnion` is the canonical case-record helper and catches invalid names at the declaration. Other valid Schema unions remain supported.
- Exhaustive update records remain the ordinary approach. Focused updates can also be composed in order with `cases`, `each`, `on`, `except` and `compose`, preserving the original dispatch Model and every result channel.
- Keyed OutMessage folds can use an authored fold directly when the key is unused or a key-dependent producer when needed. Existing explicit folds remain valid. Model-produced `makeInitIfMissingStep` requests select a key and init args from the current Model without manual child placement.
- `Composition.acquireChildren()` collects the exact registered child tuple without repeating the inventory in the constructor. It preserves Layer requirements, errors, identities and Scope without initializing child Models. Direct keyed-array startup may omit an identity `toItem`; wrappers and metadata retain an explicit adapter.
- `Story.messageIn` handles a local Message in a bound child and returns the composed parent result after the child update and Binding fold. It is distinct from a formal InMessage. Story's returned Model and `Story.models` support immutable observations. Keyed Scene Subscription and ManagedResource selections identify the occurrence explicitly. The repository's examples, Website, Typing Game, scaffolds and skills use the same patterns.
- Nested Story delivery accepts checked Binding paths with keyed selection. `Story.Command.expectExactInOrder` and its Scene equivalent preserve exact ordered assertions without inspecting simulation internals; `expectExact` remains order-independent.

Application-authored transitions use operation names such as `clearDraft` and `changeSearchQuery`. Framework APIs such as `makeStep`, `Update.Step` and `Update.combineSteps` keep their established names.

### Correctness and application changes

- Repair lifecycle delivery and cleanup around current DOM boundaries, occurrence replacement and late asynchronous work.
- Cancel late Node response bodies, handle empty and changing Menu items, correct source-excluded DragAndDrop positions, and preserve Dialog terminal cleanup.
- Improve Query Runtime lifetime coverage, SSR request isolation and development reload behavior, and validate relay destinations before probing liveness.
- Inspect Effect Chunks as their elements in DevTools, avoiding the stack overflow caused by traversing their circular implementation fields. Nested secret masking and inspection reference reuse are preserved. This includes [Wayne Maurer's fix (#1899)](https://github.com/foldkit/foldkit/pull/1899) for [#1897](https://github.com/foldkit/foldkit/issues/1897).
- Simplify Workspace ownership and update workflows, use Schema-backed controls, preserve retained drafts and meaningful optimistic failure handling, and narrow rendering helpers to the state they use. The other applications follow the same file, Binding, import and testing conventions.

Machine authoring, Query/KeyedQuery cache and cancellation capabilities, and the earlier VirtualList features already shipped in `90746b32d2ca`. Their construction/API migrations and subsequent bug fixes are included here; those features are not being announced as new again.

### The current Block shape

A Block declaration provides the Model, local Message, optional InMessage and OutMessage, init inputs and typed authoring helpers. Composition registers the child relationships and authors init, update and view. An implementation Layer acquires those children and connects the authored pieces.

For example, the compiled [Profile snippet](https://github.com/foldkit/foldkit/blob/253cf72ed47ead5ee5a46e2530e10dcbaa1283e7/packages/website/src/snippet/blockProfile.ts) completes its independently authored pieces like this:

```ts
export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ApplicationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Settings.layer))
```

The Binding declaration is available to extracted update and view modules before construction. Those modules do not need a bag of constructor-local instances. For example, the compiled [Message Composer parent](https://github.com/foldkit/foldkit/blob/253cf72ed47ead5ee5a46e2530e10dcbaa1283e7/packages/website/src/snippet/blockInMessageParent.ts) uses generated child methods directly:

```ts
export const update = ConversationComposition.makeUpdate({
  ClickedSend: ComposerBinding.requestSubmit(),
  ChangedDraft: makeStep.fromMessage(({ text }) =>
    ComposerBinding.informOfDraftChanged({ text }),
  ),
})
```

The Model remains the source of truth, update stays pure, and Commands execute after the transition. Construction has its own Scope; Subscriptions, ManagedResources and Mounts retain their Model- and DOM-driven occurrence lifetimes. Ordinary application execution tests keep real handlers and substitute the Services whose behavior needs controlling.

### Verification and remaining limits

The explicit Binding migration, initializer and testing follow-ups pass source/emitted/relocated checks and all eight existing compiler workloads without further budget changes. The complete pre-push gate, fresh rendering evidence, exact-commit review and protected integration must finish before freezing the next candidate. A fresh authorized security review must cover that final candidate. The earlier snapshots below do not cover this new runtime/API work.

The [current review](https://github.com/foldkit/foldkit/blob/codex/layers-and-submodels/internal/preview-release-review-20261106.md) records source, emitted and relocated declaration checks, compiler workloads, runtime and browser tests, installed-consumer checks, and the authorized static security review. Both that review and the subsequent [Chunk-fix and release-documentation addendum](https://github.com/foldkit/foldkit/blob/codex/layers-and-submodels/internal/daybreak-20261106-addendum/README.md) found no substantiated new security or release-correctness defect in their frozen snapshots. Static inspection does not certify every registry artifact or deployment.

Runtime and bundle costs are measured separately. The Binding-adoption candidate has a fresh 32-sample comparison against main: naive medians 637.0/596.0 ms (−6.44%) and optimized medians 230.9/370.1 ms (+60.29%), with 47,673/48,331 added gzip bytes. This batch has substantial variation and does not establish a stable percentage or isolate the cost of Binding authoring. The earlier, steadier candidate comparison measured +5.60%/+30.02%; both captures are retained. The optimized timing and bundle costs still require release review. The separate dependency audit retains two moderate build-tool findings and no high or critical findings. The security result does not constitute acceptance of these costs.

Only [automatic OutMessage propagation (#1662)](https://github.com/foldkit/foldkit/issues/1662) and [derived/default view slots (#1663)](https://github.com/foldkit/foldkit/issues/1663) have explicit approval to follow after this work merges to main.

The new [profiling proposal (#1898)](https://github.com/foldkit/foldkit/pull/1898) has been assessed separately. Its instrumentation and diagnostics are unaccepted new APIs, not completed features or agreed future work. The canonical Block-aware Scene already retains its boundary registry and provides `unhover`; the proposal's native Scene registry parity and broader profiling design remain outside this stabilization change.
