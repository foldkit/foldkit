---
'foldkit': minor
'@foldkit/ui': minor
'@foldkit/devtools': minor
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': minor
---

Replace manual child wiring with checked Definition → Composition → Block assembly and parent-owned Bindings.

## Remove authored child Message wrappers

Keep only local facts in each feature's `Message`. Composition derives the complete dispatch Schema from its registered child Bindings, and routes child delivery before the authored local Message handlers.

Before, a parent repeated the child's Message contract in its own union and routed it manually:

```ts
// message.ts
import { defineMessageUnion } from 'foldkit/message'

import * as Settings from './settings'

export const Message = defineMessageUnion({
  ClickedHelp: {},
  GotSettingsMessage: { message: Settings.Message },
})

// update.ts
import { Message } from './message'
import type { Model } from './model'
import { foldSettings } from './settingsPolicy'

export const update = (model: Model, message: typeof Message.Type) =>
  Message.match(message, {
    ClickedHelp: () => ({ model }),
    GotSettingsMessage: ({ message }) => foldSettings(model, message),
  })
```

After, the local Message module has no child import. The Binding supplies delivery:

```ts
// message.ts
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedHelp: {},
})

// composition.ts
import { ApplicationDefinition } from './definition'
import { SettingsBlock } from './settings'

export const SettingsBinding = ApplicationDefinition.makeBinding(
  SettingsBlock,
  {
    field: 'settings',
  },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SettingsBinding],
})

// update.ts
import { ApplicationComposition } from './composition'

export const update = ApplicationComposition.makeUpdate({
  ClickedHelp: model => ({ model }),
})
```

Remove `parentMessage`, `toParentMessage`, and `fromParentMessage` from Binding configuration. Use `delivery.when` to gate incoming child delivery and `delivery.toUpdateContext` to provide the child's exact additional update arguments. General keyed accessors also supply `keySchema`; direct array adapters derive it from their key field.

Use `ApplicationComposition.Message` or a completed `FooBlock.Message` for complete serialization, validation, and replay. These are complete Message Codecs: they combine the local Message Codec with the generated child-envelope Codecs while preserving the local constructors. Generated envelopes have no public constructors and carry the captured placement, occurrence generation, child Message, and a key for keyed delivery. Removing and recreating a child cannot retarget its old results to the replacement.

Codec decoding validates the envelope structure and key Schema; it does not prove that the originating occurrence remains live. External Runtime ingress separately checks the complete placement, key, and generation chain before queueing. History replays accepted Messages, and pure update/Story/Scene replay does not repeat that live admission check.

Generated tags are `Got<FormattedPlacement>Message`. Hyphens, underscores, and spaces separate capitalized segments; capitals inside a segment remain unchanged. Composition rejects duplicate sibling placements and formatting collisions. Unkeyed direct fields default placement to their field; accessor and keyed Bindings default to the child Block ID. This changes derived paths for older keyed array shorthand examples that used the array field as their default.

## Assemble every Block through a Composition

A Definition establishes the Model, Message, and optional OutMessage contracts and authors effects, Steps, lifecycle definitions, and child Bindings. A named Composition fixes the child Binding and Mount graph and owns init, update, and the primary view. `prepareBlock` checks and packages that implementation as an unfinished assembly, and `Block.assemble` creates the completed Block. All four stages are passive.

Define and assemble a Block through explicit stages:

```ts
// composition.ts
import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const HomeComposition = Block.makeDefinition('Home', {
  Model,
  Message,
  OutMessage,
}).makeComposition()

// view.ts
import { HomeComposition } from './composition'

export const view = HomeComposition.makeView((_model, h) => h.div([]))

// block.ts
import { Block } from 'foldkit'

import { HomeComposition } from './composition'
import { init } from './init'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () => HomeComposition.prepareBlock({ init, update, view })
export const HomeBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

// index.ts
export { Model } from './model'
export { HomeBlock } from './block'

// Parent model.ts
import { Schema } from 'effect'
import * as Home from './page/home'

export const Model = Schema.Struct({ home: Home.Model })

// page/index.ts
export { HomeBlock } from './home'
```

The feature barrel exports `HomeBlock` and may re-export the canonical `Model` Schema for parent Schema construction. A parent can use `Home.Model` to declare state without requiring inference of Home's completed source implementation. It still binds `Home.HomeBlock`, whose complete Message Schema, OutMessage matcher, operations, and embedding contract travel with it. Re-export the existing Schema passed to the Definition, and keep the local Message private because it omits generated child envelopes. Shared domain Schemas and utilities have a separate `domain/` barrel.

`bindings` and `mounts` are independently optional. Use `makeComposition()`, `makeComposition({ bindings })`, `makeComposition({ mounts })`, or `makeComposition({ bindings, mounts })`. Omitted registrations grant no capabilities. Name the returned Composition, author init, update, and the primary view through it, and assemble that same value. Definitions do not author init, update, or view directly. A completed Block retains its distinct `makeView` helper for alternate embeds against its already fixed graph. Keep Steps and operations required by child policy on the Definition.

## Author through factory methods

`Definition.makeComposition` fixes the child and Mount graph. A Composition's `makeInit`, `makeUpdate`, and `makeView` methods author its implementation. `prepareBlock` prepares that fixed graph with its authored implementation, and `Block.assemble` produces the completed Block. A completed Block uses `makeView` for an alternate embed view against its fixed graph.

Each `make*` authoring method returns a configured value or function. `prepareBlock` returns a passive opaque assembly, and `Block.assemble` invokes its producer exactly once while constructing the completed Block. These methods do not run init, update the Model, render, construct Layers, or start effects. `Program.make` and `Program.makeElement` add browser host behavior; `Runtime.run`, `Runtime.hydrate`, and `Runtime.embed` start execution.

An authored update supports both call directions. Runtime dispatch uses `update(model, message, ...context)`. The curried `update(message)(model, ...context)` form is an internal Step with the same requirements, OutMessage type, and graph evidence. `Update.combineSteps` accepts unary Steps, so supply required dispatch context through an explicit unary adapter before combining a contextual update.

Use `Block.makeNamespace('Feature')` only for a generic factory that shares identity and primitive definitions across several typed contracts. Call `FeatureNamespace.makeDefinition(...)` for each specialized contract. Ordinary features call `Block.makeDefinition(id, contracts)` directly.

## Declare public operations

A public operation produces the Message and dispatch context for the Block's update. The completed Block passes that value through its update function synchronously as part of the pure transition; it does not enqueue another Runtime Message. The parent calls the Binding-projected operation and cannot bypass the child's update boundary.

Replace raw child Model helpers and parent field rewrites with a child-owned Message transition and a Binding operation:

```ts
// message.ts
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  RequestedReset: {},
})

// update.ts
import { modifyFields } from 'foldkit/struct'

import { SearchComposition } from './composition'

export const update = SearchComposition.makeUpdate({
  RequestedReset: model => ({
    model: modifyFields(model, { query: () => '' }),
  }),
})

// block.ts
import { Block } from 'foldkit'

import { SearchComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  SearchComposition.prepareBlock({
    init,
    update,
    view,
    operations: { requestReset: Message.RequestedReset },
  })
export const SearchBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
```

Put the local Message constructor directly under `operations` when its payload is the public input. Block assembly associates it with the Block's update without constructing a Message. Assembly also verifies exact constructor membership in the declared Message Schema; a same-shaped constructor from another union is rejected at runtime. Generated child envelopes never appear under `operations`. A constructor with payload fields gives the completed Block operation `(model, payload, ...context)`, with constructor defaults accepted. A constructor without payload fields gives `(model, ...context)` with no placeholder. The Binding method omits the child Model; a keyed Binding prepends its key. There is no separate `makeOperation` authoring helper.

Keep a tuple producer under `operations` when the public inputs need mapping, refinement, defaults, or an exact update context tuple. Inline tuples receive contextual typing. An extracted producer returns `Tuple.make(Message.RequestedReset())`, with `Tuple` imported from `effect`. Local Message constructors and tuple producers complete through the same execution path. The registry accepts these two Message-producing forms, not arbitrary Steps, and there is no `expose` compatibility alias.

Remove `exposedSteps` and any `pure` or `reflect*` public state transition. A public operation must select a local Message constructor so the child's update remains the only state transition boundary. Keep internal Model-only work as a Step: `Definition.makeFieldsStep` creates a unary field-transform Step. Pass `Definition.makeNoopStep` point-free as a `makeOutMessageFold` handler when the parent intentionally keeps its Model unchanged. Use the focused producer helpers for single-purpose field, Command, and OutMessage transitions, and `Definition.makeStep` for reusable mixed, connected, initialization, or composed results.

A completed operation selecting one local Message retains that handler's inferred Command requirements and OutMessage contract. An operation that can select several Messages carries their combined channels. Every operation retains the update's full dispatch context. Delegating through a helper with an already aggregate visible return retains that broader contract.

Keep the authored `update` in a named value before passing it to `prepareBlock`, as shown above. The current overloads can misinfer a handler Layer when `makeUpdate` is nested directly in a preparation record that also contains a view, operations, Subscriptions, and ManagedResources. The named form preserves exact inference without extra type annotations.

A raw Binding operation recipe exposes only channels produced directly by the child transition. Return it intact from the owning Composition handler or init producer. The Composition resolves registered OutMessage policy and sibling operations into the final parent Command Message, requirements, and OutMessage channels. Derive exported parent contracts from the Composition-authored update or completed Block.

Pair the operation and Message names: `informJoined` selects `Message.InformedOfJoin`, `informRouteChanged` selects `Message.InformedOfRouteChange`, and `requestCloseMenu` selects `Message.RequestedCloseMenu`. Notifications use `inform*`/`InformedOf*`; actions use `request*`/`Requested*`. Keep actual UI facts separate when their cause differs from the parent request. Selectors and derived view inputs remain ordinary helpers.

### Name Binding actions

Name action operations with `request*`, paired with `Requested*` Messages. For example, invoke `DialogBinding.requestOpen()` or `DialogBinding.requestClose()` through the registered Binding. Animation, Menu, Listbox, Combobox, DatePicker, Calendar, Toast, VirtualList, and Query Binding actions follow the same convention. Query uses `requestReset`, `requestRevalidation`, `requestRevalidationOrLoad`, and `requestLoadIfMissing`. Notification operations retain their `inform*` names and enter update through `InformedOf*` Messages. Custom tuple adapters follow the same naming rule.

### Bundle owned Subscription handlers

When all entries returned by `Definition.makeSubscriptions(...)` have attached handlers, the registry exposes an aggregate `.layer`:

Individual recipes (still supported):

```ts
const EffectsLayer = Layer.mergeAll(
  subscriptions.pointerMoves.layer,
  subscriptions.keyboardPresses.layer,
)
```

All attached recipes in the owned registry:

```ts
const EffectsLayer = subscriptions.layer
```

The aggregate only merges passive recipes; it constructs no handlers or Streams. Its exact handler outputs, Service requirements, and constructor errors are preserved. An empty record supplies `Layer.empty`. A registry containing any host-provided contract has no aggregate `.layer`; supply that contract explicitly. The entry key `layer` is reserved and rejected by types and runtime validation. Individual entry Layers remain available for selective assembly. Standalone `Subscription.make` still returns an entry record without this owned aggregate.

## Move child integration to the parent

The parent authoring value creates the Binding because the parent owns Model access, delivery context, OutMessage policy, and lifecycle policy:

```ts
import { Block } from 'foldkit'
import { Message } from './message'
import { Model } from './model'
import { HomeBlock } from './page'
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding],
})
```

The direct field form infers the parent Model and child Model relationship for exact `ChildModel` and `Option<ChildModel>` fields. An unkeyed field uses its field name as the default placement. Every keyed form and an unkeyed accessor use the child Block ID. An explicit `placement` overrides either default. `None` makes an optional field absent, and a fold or operation never creates it. Optionality does not require a placement override. Add `presentWhen` when parent policy gates that whole direct child. Use `makeVariantBinding` from `foldkit/variantBinding` when the child occupies one complete tagged member of the parent `Schema.Union`, including the actual child Model Schema. Use explicit `read` and `write` for nested, wrapped, or custom storage. Foldkit compares decoded built-in Schema shapes; reuse the same Schema instance for an opaque declaration or keep custom accessors. Composition generates child delivery; remove authored `Got*` wrappers and mapper fields. Do not pass a redundant Model Schema. A child with OutMessages selects an immutable policy through `.withOutMessagePolicy({ fold?, forward? })`; Composition rejects a missing policy and registers the selected full Binding without changing its child identity or lifecycle scopes. Binding and policy construction remain passive.

Placement identifies one child Binding within the parent's composition graph. It does not identify a DOM position and need not match a Model field. Unkeyed direct fields default placement to the field. Accessor Bindings and all keyed Bindings default to the child Block ID, including direct and wrapped array adapters. For keyed Bindings, `key` identifies dynamic occurrences under that one placement. Supply an explicit placement only when sibling defaults collide or an established graph identity must deliberately remain different from the new default.

A split feature without a `composition/` directory uses `composition.ts` for straightforward Bindings, its complete `makeComposition({ bindings, mounts })` registration, Composition and an optional owner-specific ViewBuilder alias. When `composition/` exists, `composition/composition.ts` owns that assembly and `composition/index.ts` exports it. Mount-only features use the same home, with definitions shared with the view in `mount.ts`. Extract a substantial one-way policy to `composition/<child>.ts`; then `composition/composition.ts` remains the single assembly point and `composition/index.ts` is an explicit barrel. Assembly imports actual policy exports directly from sibling modules, and the barrel re-exports intended values such as `HomeBinding`, `RoomBinding`, and `ApplicationComposition`. External consumers import from `composition.ts` or that barrel, never from a policy or assembly implementation path. Use a factory only when Binding construction needs caller-owned configuration. Keep reciprocal sibling policies together in the same parent assembly and defer sibling Binding calls through policy callbacks; a callback may close over a Binding declared later without a circular import. Internal implementation modules may use direct relative sibling imports to avoid barrel cycles. This assembly module is also required for a split graphless feature. Retain `definition.ts` and `FooDefinition` when authoring methods use that value; otherwise put the top-level Definition factory and contract imports in `composition.ts` and chain `makeComposition()` directly. Never put a Composition or owner-specific ViewBuilder in a retained `definition.ts`. A compact graphless feature keeps all stages beside its cohesive implementation. A genuinely compact root keeps Model, Message, init, update, view, `ApplicationDefinition`, and `ApplicationComposition` together in `application.ts`. A split root always uses `composition.ts` or `composition/composition.ts`, including when graphless, and removes the emptied `application.ts`. `makeBinding` only configures the relationship; including its result under `bindings` registers it. Neither step constructs Layers or starts effects.

The Binding projects `init`, `fold`, `embedView`, and operations selected under `operations`. Every registered child routes through `fold` automatically, so the Composition update record handles only local facts:

Declare `delivery.toUpdateContext` when the child update has required, optional, defaulted, or rest context parameters. Return the exact additional argument tuple, including an empty tuple when choosing child defaults. Use `delivery.when` to ignore incoming delivery under parent-owned conditions; keyed callbacks also receive the captured key.

```ts
export const update = ApplicationComposition.makeUpdate({
  ClickedRefresh: HomeBinding.requestRefresh(),
})
```

The authored parent Message Schema contains only local facts. Composition derives the complete dispatch Schema from its registered Bindings; `Got*` is reserved and cannot be authored locally. Remove manual `Got*` branches, including branches that inspect the wrapped child Message, and move parent reactions to the Binding's selected `fold` policy.

Register that route and its OutMessage policy on the Binding:

```ts
import { Block } from 'foldkit'
import { DialogBlock } from './dialog'
import { Message } from './message'
import { Model } from './model'
import { resetSearch } from './search'
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const foldDialogOutMessage = ApplicationDefinition.makeOutMessageFold(
  DialogBlock,
  {
    Opened: ApplicationDefinition.makeNoopStep,
    Closed: ApplicationDefinition.makeNoopStep,
    CompletedClose: () => resetSearch,
  },
)
const DialogBinding = ApplicationDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
}).withOutMessagePolicy({ fold: foldDialogOutMessage })
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [DialogBinding],
})
export const update = ApplicationComposition.makeUpdate({})
```

Pass an empty record when every parent Message is owned by registered child routing. Composition still returns the complete update function and routes each wrapper to its Binding.

Remove `parentMessage`, `toParentMessage`, and `fromParentMessage` from Binding configs. Composition owns the envelope, its exact child Codec, captured generation, and keyed identity. A Message-free child has no delivery policy. Local constructors remain on the complete Message Codec; generated wrappers have no public constructors. Use `Composition.Message` or `FooBlock.Message` for complete serialization, validation, or replay.

For Dialog, `CompletedClose` is emitted when `CompletedCloseDialog` finishes cleanup. Fold it there when dependent state such as Search must reset after cleanup. The existing `Closed` transition keeps its earlier timing.

The recommended Oxlint preset reports manual `Got*` routing and parent inspection of internal child Messages. Composition authoring also excludes generated wrappers from the local update callback. Parent coordination uses Binding OutMessage policies and exposed operations.

`foldkit/no-direct-block-state-update` now also reports a `reflect*` helper used to change a registered child field from its parent. Replace that silent Model change with a child-owned `inform*` operation and an `InformedOf*` Message branch.

The parent configures OutMessage policy in its Binding. That policy executes during the pure child fold or operation:

parent update → child fold or operation → parent OutMessage handling → parent result

```ts
import { Block } from 'foldkit'
import { Message } from './message'
import { Model } from './model'
import { openArticle } from './operation'
import { HomeBlock } from './page'
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const foldHomeOutMessage = ApplicationDefinition.makeOutMessageFold(HomeBlock, {
  SelectedArticle: ({ articleId }) => openArticle(articleId),
})
export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
}).withOutMessagePolicy({ fold: foldHomeOutMessage })
```

`withOutMessagePolicy({ fold })` handles variants locally. Inline `Definition.makeOutMessageForward(handlers)` under an unkeyed Binding's `forward` field when at least one variant continues through the current Block's OutMessage; pass the completed child explicitly when extracting the callable forward or adapting keyed policy. A derived OutMessage takes precedence over forwarding for the same dispatch; local handling still runs.

An OutMessage policy may call a parent Step or a registered sibling Binding operation. This supports parent-owned coordination in either direction between siblings. Composition validates the policy's output and the captured sibling evidence when the graph is registered. Keep policy chains synchronous and finite because a sibling operation may run another policy before the original update returns.

A keyed Binding uses the same parent-owned method. When a field is an array of child Models, a string-valued `key` names their stable identity field:

```ts
import { Block } from 'foldkit'
import { Message } from './message'
import { Model } from './model'
import { RowBlock } from './row'
const TableDefinition = Block.makeDefinition('Table', { Model, Message })
export const RowsBinding = TableDefinition.makeBinding(RowBlock, {
  field: 'rows',
  key: 'id',
})
export const TableComposition = TableDefinition.makeComposition({
  bindings: [RowsBinding],
})
```

The child Schema must expose its declared Struct fields. Use the general keyed form for a union Model or a Schema without declared fields. The keyed shorthand defaults placement to the child Block ID. The child Model returned by `init(key, ...)` must contain that key, and child folds and operations cannot change it. Parent update owns collection membership, so it replaces identity by removing one Model and adding another.

A required `Schema.Array` field on a parent Struct can store closed Struct wrappers around child Models. Add `childField` when `key` belongs to the wrapper.

Configure the wrapper field on the parent-owned Binding:

```ts
export const ApplicantsBinding = ApplicationDefinition.makeBinding(
  ApplicantBlock,
  {
    field: 'applicants',
    key: 'id',
    childField: 'entry',
  },
)
```

`key` must name a required string or finite-number wrapper field, and `childField` must name a different required field whose Schema has exactly the same decoded shape as the child Model. The child Model may be a primitive or union because its identity stays on the wrapper. A child write replaces only the matching wrapper's child field, preserving its metadata, array position, and every unmatched wrapper reference. It does not insert a wrapper after parent update has removed that key. Placement defaults to the child Block ID.

An exact required `Schema.Option` field can store zero or one closed keyed wrapper with the same `field`, `key`, and `childField` shorthand. `None` is absent. A child write replaces only the matching wrapper's child field and preserves its metadata; `None` or another key leaves the exact parent Model unchanged. The Binding defaults placement to the child Block ID. Create the occurrence through `Binding.init({ key, args, toParentModel })`; automatic `init.instances` accepts keyed arrays only.

Use `readAll`, function-valued `key`, `read`, and `writeAt` for custom parent writes, opaque, union, or open/index-signature wrappers, and every other zero-or-one storage representation. These explicit accessors continue to define application-specific storage and enumeration policy. Supply a `keySchema` Codec whose decoded value is the selected string or finite-number key. Generated envelope encoding preserves that Codec's encoded key type. Field adapters derive the key Codec from their declared Schema fields.

Use a keyed Binding for a routed child when its domain ID changes, even if only one instance is present at a time. Generated delivery captures the key and generation for delayed Command results and Subscription emissions. Add `delivery.when` for a parent-owned route condition and `delivery.toUpdateContext` for the child update context. Replacing the key retires that occurrence and its dispatchers; reusing the key later creates a new occurrence. Running Commands retain application lifetime, so isolate external writes by domain ID when their completion must not overwrite another instance's data.

A Query uses the same Binding path because Query and KeyedQuery are completed viewless Blocks. A KeyedQuery's keyed entries remain cache data inside one child Model; they are not keyed Block instances.

```ts
import { Schema } from 'effect'
import { Query } from 'foldkit/experimental'
import { Block } from 'foldkit'
import { fetchPosts } from './api'
import { Message } from './message'
import { Model } from './model'
import { Post } from './post'
const Posts = Schema.Array(Post)
export const postsQuery = Query.define({
  name: 'Posts',
  data: Posts,
  error: Schema.String,
  handler: function* () {
    return () => fetchPosts
  },
})
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
export const PostsBinding = ApplicationDefinition.makeBinding(postsQuery, {
  field: 'posts',
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [PostsBinding],
})
```

Query preserves `Model`, `Message`, `Fetch`, direct `read` and `run`, cache generations, stale response protection, loading, refresh and reset operations, cache key typing, and precise handler constructor error and Service requirements. A canonical handler contributes `query.EffectsLayer`. A host-owned Query omits `handler`, lists the unresolved Fetch contract on its Block, and is completed with `query.provideHandlers(query.toLayer(...))` before binding.

## Use plain feature-local view helpers

The canonical owned view uses `Composition.makeView` or `makeView.withInputs`. Ordinary feature-local helpers are plain functions with purposeful parameters.

Keep the early root contract separate when child Bindings import its helpers:

```ts
// definition.ts
import { Block } from 'foldkit'
import { Message } from './message'
import { Model } from './model'
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
// composition.ts
import type { Block } from 'foldkit'
import { HomeBlock } from './page'
import { ApplicationDefinition } from './definition'
import { mounts } from './mount'
export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding],
  mounts,
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
```

Then in the feature's helper module:

```ts
import type { Article } from './article'
import type { ApplicationViewBuilder } from './composition'
import { Model } from './model'

export const headerView = (h: ApplicationViewBuilder) =>
  h.header([], ['Articles'])

export const articleCard = (article: Article, h: ApplicationViewBuilder) =>
  h.article([], [article.title])

export const articleList = (
  model: typeof Model.Type,
  h: ApplicationViewBuilder,
) =>
  h.ul(
    [],
    model.articles.map(article => h.li([], [article.title])),
  )
```

`Block.ViewBuilderFor<typeof ApplicationComposition>` carries the root Message type plus its registered child and Mount capabilities. It is a purposeful generic type alias and constructs no runtime builder. Name the alias for its owner, declare it immediately after the Composition with no blank line, and export it only when another file uses it. The owner prefix identifies one Composition's capabilities at the plain type import site. Routine application annotations query their Schema values directly, such as `typeof Model.Type`; a child consumer queries `typeof ChildBlock.Model.Type`. A helper takes only the Model, domain value, or context it actually reads; TypeScript infers one `Html` result or an array. Keep the framework's general `HtmlBuilder<Message>` for functions genuinely shared across owners.

## Name the Composition view helper type

Use `Block.ViewBuilderFor<typeof Composition>` to retain a Composition's Message, registered child, and Mount capabilities for extracted view helpers:

```ts
import type { Block } from 'foldkit'

import { SearchComposition } from './composition'

export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>
```

Use `Block.ViewBuilderFor` for both Block and Application Compositions. Keep owner-specific alias names such as `SearchViewBuilder` and `ApplicationViewBuilder`; define the alias immediately after the Composition when they share a file.

## Name and organize the final roles

Use `FooDefinition` or `ApplicationDefinition` when Definition authoring methods need a named value. Always name the Composition `FooComposition` or `ApplicationComposition`, the completed child `FooBlock`, and the completed root `ApplicationBlock`. Name the browser host `program`. Preserve the runtime name in `Block.makeDefinition('Foo', ...)`.

- `definition.ts`: early Model, Message, OutMessage, and Block authoring contracts when split implementation files use Definition authoring methods. It exports `FooDefinition`, never a Composition or owner-specific ViewBuilder. Omit it when the Definition factory only creates the Composition.
- A folder-named implementation file, such as `workHistory/workHistory.ts`: substantial feature logic that does not warrant separate init/update/command files.
- `block.ts`: completed feature assembly.
- `composition.ts`: a split feature without `composition/`, with Bindings, complete child/Mount registration, Composition and optional owner-specific ViewBuilder alias. A substantial one-way policy may use `composition/<child>.ts` with `composition/composition.ts` as assembly and an explicit barrel; reciprocal sibling policies stay together in that assembly and defer sibling calls through policy callbacks. External consumers import from the composition barrel rather than either implementation path. Mount-only and graphless split features use the same home. A split root uses `composition.ts` even when graphless.
- `composition/composition.ts`: the complete root graph when substantial policies need a directory, including straightforward Bindings, reciprocal policies, and OutMessage folds. Import one-way policy siblings directly inside the assembly module; external consumers import the explicit `composition/index.ts` barrel; external consumers do not deep-import `composition/<child>.ts` or `composition/composition.ts`.
- `entry.ts`: container, startup inputs, Program construction, and Runtime startup.
- `services.ts`: root `ApplicationLayer` service providers.
- `command.ts`: root Command definitions and a small root `EffectsLayer`.
- `layer.ts`: substantial or reused Layer composition at that directory boundary.

A genuinely compact root defines Model, Message, init, update, view, `ApplicationDefinition`, and `ApplicationComposition` together in `application.ts`. Once any root responsibility is extracted, put a reused `ApplicationDefinition` in `definition.ts`, or put the top-level factory-to-Composition chain in `composition.ts` when no authoring method needs the Definition value. The complete graph and `ApplicationComposition` live in `composition.ts` or `composition/composition.ts`, and every standard implementation lives in its named file. Remove the emptied `application.ts` instead of retaining a partial implementation or re-export barrel. Composition imports the Definition and child or Mount declarations, never root init, update, or view. Block assembly imports each implementation field from its real owner. Entry imports the completed `ApplicationBlock` and its host declarations.

Keep final completion in `block.ts` when the view imports its Composition from `composition.ts`. The final assembly imports that same Composition and the view, so neither module depends on the completed Block. Do not create one file per API stage. Keep small examples compact. Use explicit barrels for intended feature contracts and import private implementations directly in tests.

`EffectsLayer` supplies implementations of declared Commands, Subscriptions, Mounts, ManagedResources, and Query Fetch Commands. `ApplicationLayer` supplies ordinary Services required by those handlers and startup Effects. Compose a small feature `EffectsLayer` in `block.ts`; use feature `layer.ts` when substantial. Keep a simple root `EffectsLayer` with its Command definitions in `command.ts`; use root `layer.ts` only when the composition is substantial or reused. Compose root `ApplicationLayer` in `services.ts`, separate from browser startup in `entry.ts`.

## Complete the root through ApplicationComposition

Before:

```ts
// main.ts
import { Schema } from 'effect'
import { Runtime, type Update } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({ ClickedIncrement: {} })
export type Message = typeof Message.Type

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  })

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { count: 0 },
})

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
    ],
  ),
})

// entry.ts
import { Runtime } from 'foldkit'

import { Model, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)
```

After:

```ts
// application.ts
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })

export const Message = defineMessageUnion({ ClickedIncrement: {} })

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

export const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
    ],
  ),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

// entry.ts
import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './application'

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
})

Runtime.run(program)
```

Call `program.provide(ApplicationLayer)` when ordinary Services remain. `program.provide` is an instance method on the completed passive Program. There is no standalone `provide` function.

Server rendering receives the same completed root Block as the browser Program:

```ts
import { Server } from 'foldkit/experimental'

import { ApplicationBlock } from './block'
import { Flags } from './flags'

Server.renderToString(
  ApplicationBlock,
  { Flags, routing: {} },
  { url: request.url, flags },
)
```

## Enforcement boundaries

TypeScript checks contracts, precise handler and Service requirements, constructor errors, handler completeness, operation requirements, and Mount or child capabilities through emitted declarations. Connected Binding folds and Binding-projected operations require the registering Composition's graph capability on their Model input. `makeUpdate` and startup processing supply that capability contextually. The capability is type-only and adds no domain Model or Schema field. A plain Model helper cannot invoke it.

`Binding.init({ args, key?, toParentModel, commands? })` returns a passive, noncallable initialization recipe with no result fields. Return it directly from `Composition.makeInit` or a Definition-owned Step; those boundaries interpret it under the registered graph and produce the complete parent result. Ordinary Model construction remains available.

Runtime composition-frame guards continue to protect erased JavaScript and operations captured for later execution. Runtime identity maps and lifecycle generations enforce exact occurrence identity, stale Command and callback suppression, keyed generation isolation, Mount ownership, and the private identity of structurally identical handler protocols. These are runtime guarantees rather than type-level proofs.

Lint rules enforce repository naming and architectural conventions such as authoring and Composition value names and avoiding direct child state updates. File names, narrow barrels, section heading restraint, and the distinction between substantial and small Layer modules remain review conventions.
