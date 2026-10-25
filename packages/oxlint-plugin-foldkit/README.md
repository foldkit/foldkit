# @foldkit/oxlint-plugin

Oxlint rules for Foldkit applications. Extend `recommended.json` for the full supported convention set, or `all.json` for every current rule. Both presets enable `foldkit/block-name-matches-variable` at error severity.

`foldkit/no-manual-composition-routing` keeps child delivery out of authored Composition updates. Current `makeBinding` configurations derive generated envelopes from the completed child Block; they need no parent `Got*` variant or Message mapper. The rule reports every legacy `parentMessage`, `toParentMessage`, or `fromParentMessage` property and manual `Got*` handling during migration. The presets disable it in tests.

`foldkit/no-direct-block-state-update` recognizes generated direct, accessor, exact-keyed, wrapped-keyed, and general-keyed Bindings without requiring authored Message mapping properties. It protects child-owned Model fields through registered Binding ownership. `foldkit/no-child-message-construction-in-root` separately prevents a parent from constructing child-owned Messages; parent-driven transitions use named Binding operations.

These ownership and routing checks also recognize `makeMapBinding` imported from `foldkit/mapBinding`, including named import aliases and namespace imports. They distinguish its parent Definition, child Block, and configuration arguments and ignore unrelated or shadowed functions with the same name. Direct child transformations through Effect `HashMap.modify` are detected in data-first calls, point-free data-last calls, immediately applied data-last calls, and `pipe`. Immutable value aliases such as `const bind = makeMapBinding` are not followed; named import aliases are. This remains provenance-based analysis; arbitrary factory wrappers and unresolvable cross-file relationships require review.

`foldkit/block-name-matches-variable` requires direct literal Block authoring declarations to use the suffix for their stage. Definitions use `<BlockId>Definition`, Namespaces use `<BlockId>Namespace`, and Compositions derived in the same file use `<BlockId>Composition`:

```ts
const PeopleDefinition = Block.makeDefinition('People', { Model, Message })
const PeopleComposition = PeopleDefinition.makeComposition()

const PickerNamespace = Block.makeNamespace('Picker')
const PickerDefinition = PickerNamespace.makeDefinition({ Model, Message })
```

The application root is an ordinary Block named `Application`, so its authoring values use `ApplicationDefinition` and `ApplicationComposition`:

```ts
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition()
const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
```

The rule follows supported `foldkit` root and `foldkit/block` imports, including namespace and import aliases. It follows inline chains and authoring values declared in the same file. A Composition derived from an authoring value imported from another local module is not verified because Oxlint does not expose cross-module symbol or type information. Dynamic names are left for the developer to review.

`foldkit/no-disabling-dev-guardrails` checks `Program.make` and `Program.makeElement` configurations imported from `foldkit` or `foldkit/program`, including namespace and import aliases. Build the root Block before constructing its Program, and pass routing Message constructors directly:

```ts
const program = Program.make({
  block: ApplicationBlock,
  container,
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
})
```

Rules that inspect HTML builder calls share provenance-aware recognition. They recognize `HtmlBuilder`, `Block.ViewBuilderFor<typeof FooComposition>`, local aliases of those types, owner-specific ViewBuilder types imported from a relative module, and the builder parameter of `FooComposition.makeView` and `makeView.withInputs` callbacks. For an imported alias, the plugin resolves the relative TypeScript module and explicit re-export barrels until it finds an actual exported `Block.ViewBuilderFor` declaration; declaration-like text in comments and string literals is ignored. This covers extracted view helpers while leaving unrelated types named `*ViewBuilder` alone. Package aliases, wildcard re-exports, JavaScript declarations, and generated declaration-only modules are not resolved; annotate those helpers directly with `HtmlBuilder` or `Block.ViewBuilderFor` when lint recognition is needed.

The `command-define-pascal-const` rule owns the complete Command declaration convention for both `Command.define` and Definition `makeCommand` calls: literal PascalCase identity, `const` binding, and an exact binding-name match. The older `command-binding-matches-name` configuration ID has been removed. Replace it with `foldkit/command-define-pascal-const` in explicit rule configurations. The same consolidated `no-direct-block-state-update` ID covers discarded Commands and OutMessages when a parent copies a child update or operation result's `model`; the older `require-fold-for-child-update-result` ID has also been removed.

`foldkit/no-direct-block-state-update` also recognizes child-owned transform references in `modifyFields`, `Definition.makeFieldsStep`, and point-free `Array.map` updates. Focused helpers used directly in Composition handler records retain those checks, including local immutable aliases and `makeFieldsStep.fromMessage`. Only ordinary helper callbacks receive parent Model evidence; a `.fromMessage` callback receives a Message. It uses the Block registered by a local Binding as evidence: a transform must resolve through the same imported namespace or local path, through a named `block` import from the same module, or through a local helper whose parameter and return types both name that child module's Model. The rule deliberately leaves cross-file Composition registration, dynamic helper construction, and unannotated local helper inference to type review because Oxlint does not expose the required project-wide type ownership.

`foldkit/no-child-message-construction-in-root` recognizes the owning Definition in focused helper callbacks, including `.fromMessage` and named local producers. It permits that Definition's own Messages. A named producer shared by parent and child must satisfy both owners.

`foldkit/no-completed-block-model-in-schema` keeps parent Schema construction independent of a completed child's inferred implementation. Use a canonical child Model Schema or the checked explicit producer/header boundary below when composing the recognized Effect Schema constructors: `Struct`, `Array`, `NonEmptyArray`, `Option`, `Union`, `Record`, `Tuple`, `TupleWithRest`, `NullOr`, `UndefinedOr`, `NullishOr`, `optional`, `optionalKey`, and `mutable`. The rule follows nested field records and immutable local aliases of Blocks, Schema imports, constructors, field records, and child Schemas. A completed Block's `.Model` remains public and is allowed in ordinary accesses, decoders, predicates and `typeof ChildBlock.Model.Type` annotations.

This is a performance guardrail. It reports only proven `Block.makeDefinition` or `Block.makeNamespace` → `makeDefinition` → `makeComposition` → `prepareBlock` producer → `Block.assemble` provenance. It follows scope-resolved local `const` aliases and relative TypeScript imports through named and namespace re-export barrels. Imported modules are parsed with the declared runtime `oxc-parser` dependency; only top-level imports, exports and immutable authoring declarations provide evidence. Nested function declarations, templates, comments and regex literals cannot supply fake top-level evidence. Parse and file-read failures are treated as unknown provenance. Parsed modules are cached only for the current file's lint invocation.

The rule follows transparent TypeScript value wrappers such as `as`, `satisfies` and non-null assertions while leaving type-only annotations alone. It does not infer provenance from names or the presence of a `Model` property. Unrelated registries, shadowed parameters, decoders and ordinary `.Model` accesses remain allowed.

Unknown factory results, package imports, path aliases, wildcard re-exports without an explicit namespace, default imports, destructuring, JavaScript/declaration-only modules, mutable aliases and Schema values routed through arbitrary functions remain outside this rule's proof. It does not use the type checker, prove every source dependency is cheap, or replace performance measurements. The recommended and all presets enable the rule at error severity and disable it in test files. There is no autofix because the canonical Schema's public import path must be chosen by the feature author.

## Explicit producer boundaries

The rule accepts an explicit annotation using the actual Foldkit `Block.FromAssemblyWithView`, `Block.FromAssemblyWithViewAndOutMessage`, `Block.FromAssemblyWithOutMessage`, or `Block.FromAssemblyWithoutViewOrOutMessage` helper. Named helper imports from `foldkit/block` may be aliased; `Block` imports from `foldkit` may be aliased. Exactly two `typeof` arguments must name the Model and the same producer passed once to the declaration initializer's proven `Block.assemble` call, without explicit type arguments. The producer must be a direct immutable zero-argument arrow, with no async or generics, whose expression body or sole return statement directly calls a proven Composition's `prepareBlock`. Ordinary producers keep their return type inferred. Framework helper constraints remain responsible for contract checking; the lint exemption is a performance-boundary recognition, not an independent type-safety proof.

A producer that encounters TypeScript declaration serialization limits can use the precise named return `Block.AssemblyDraft<Block.CompletedWithView<typeof Composition, Implementation>>`, or the corresponding `CompletedWithViewAndOutMessage` contract. The rule recognizes this form at module scope. The Composition query must name the actual `prepareBlock` receiver. `Implementation` must be one local nongeneric interface containing only required readonly `typeof` fields. The argument must be an object literal checked with `satisfies Implementation`, with exactly those fields and value references. Imported Foldkit type helpers may be aliased. Casts, spreads, inherited or merged interfaces, and broader field annotations do not receive this exemption. Add this boundary when declaration emission reports TS7056 and the serialization profile identifies the producer; it is not routine application wiring.

The completed value and its immutable aliases can pass through the existing relative explicit barrels. Helper type aliases, helper type reexport barrels, imported producer functions, function declarations, statementful producers and indirect producer aliases do not receive this exemption. A call without that direct header receives no lint exemption. TypeScript separately checks the exact Model and producer context, supplied by a suitable annotation or both explicit type arguments; an uncontextualized call is rejected. Casts, `satisfies`, raw producer calls, annotations without the finisher, fake or shadowed helper names, mismatched producer queries, argument-bearing completion calls and wrong helper arity do not create a checked boundary. Ordinary public Model accesses and type queries remain allowed.

Checked provenance survives bare immutable aliases, parentheses, non-null expressions and `satisfies` that preserve the value's type. An assertion or a new declaration annotation downgrades a known completed value to inferred provenance, even when the annotation repeats `typeof Safe`; use the original checked export instead. The same rule applies to imported values and aliases exported through relative barrels. The header's Model query must not provably refer to an inferred completed Block's Model, directly or through inspected immutable/imported Schema aliases. Unknown generic Schema factories are not judged from their names.

Arbitrary factory/call-derived Schemas and type annotations that independently mention inferred ReturnType dependencies are outside proven value provenance; this rule does not identify every inference dependency.

The completed Block methods `provideHandlers` and `replaceEffectsLayer` preserve runtime completion and precise channels, but return full Block contracts. The rule treats their results as inferred for Schema construction, including chains and immutable or relative-barrel aliases. Use the original checked Block’s `Model` in the parent Schema and apply handler changes when creating its Binding; those methods do not change the Model Schema. Ordinary method calls, Block usage, and type queries remain allowed. Same-named methods on unrelated values supply no Block evidence.

### Binding writer ownership

`no-binding-write-coordination` is included in the recommended configuration. For a proven Foldkit Definition, it reports a direct `Option.some(model.child)` reader whose writer stores the next child and also derives a sibling parent field from that next child. It follows Definition imports, immutable local callback/configuration aliases, and lexical references, including shadowing.

Use the Binding OutMessage policy for parent announcements and other reactions. Custom nested/wrapped storage, keyed replacement, absence checks, and preserving wrapper metadata remain supported. The rule does not infer arbitrary helper bodies, complex accessors, mutations, or every indirect dependency. It has no autofix because exposing a child fact and choosing the parent response require domain decisions.
