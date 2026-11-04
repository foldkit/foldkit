import { Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'
import * as BlockFamily from 'foldkit/internal/block'

import { layer as AnimationLayer } from '../animation/block.js'
import { EffectsLayer, mounts } from './command.js'
import { makeUpdateHandlers } from './handlers.js'
import { baseInit } from './model.js'
import { ListboxNamespace } from './namespace.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
  InMessage,
  InitConfig as InitConfigSchema,
  type ItemToValueInput,
  Message,
  OutMessage,
  type OutMessageSchema,
} from './types.js'
import { makeView } from './view.js'

/** Private Listbox interaction Model; the parent owns selection. */
export const Model = Schema.Struct({ ...BaseModel.fields })
export type Model = typeof Model.Type
/** Startup configuration for this Listbox occurrence. */
export type InitConfig = BaseInitConfig
/** Controlled single-selection inputs and item rendering callbacks. */
export type ViewInputs<
  Item,
  Value extends string = string,
> = BaseViewInputsCommon<Item> &
  Readonly<{ maybeSelectedValue: Option.Option<Value> }> &
  ItemToValueInput<Item, Value>

/** @internal Nominal identity of the single-selection contract. */
export const ListboxKey = Symbol('Listbox.Single')
const ListboxBlock = Block.make(ListboxNamespace, {
  key: ListboxKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([InitConfigSchema]),
  ChildInitContext: InitConfigSchema,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ViewInputs<unknown>>(),
  },
  operations: {
    requestSelectItem: {
      message: (item: string) =>
        Tuple.make(Message.RequestedSelectItem({ item })),
      outMessage: OutMessage.Selected,
    },
  },
})
const itemUpdate = makeUpdateHandlers(
  ListboxBlock.makeBinding,
  ListboxBlock.makeOutMessageFold,
  ListboxBlock.makeStep,
  ListboxBlock.makeFieldsStep,
  ListboxBlock.makeNoopStep,
  ListboxBlock.makeCommandsStep,
  'CloseWithFocus',
  (model, item) => ({
    model,
    outMessage: OutMessage.Selected({ value: item }),
  }),
)
const ListboxComposition = ListboxBlock.makeComposition({
  mounts,
  bindings: [itemUpdate.AnimationBinding],
})
type ListboxViewBuilder = Block.ViewBuilderFor<typeof ListboxComposition>
type ListboxViewMessage =
  ListboxViewBuilder extends HtmlBuilder<infer FullMessage, infer _Mounts>
    ? FullMessage
    : never
const init = ListboxComposition.makeInit(config => ({
  model: baseInit(config),
  childInitContext: config,
}))
const update = ListboxComposition.makeUpdate(itemUpdate.handlers)
const inMessageUpdate = ListboxComposition.makeInMessageUpdate(
  itemUpdate.inMessageUpdateHandlers,
)
const render = makeView<Model>({ ariaMultiSelectable: false })<
  unknown,
  string,
  ListboxViewMessage
>()
const view = ListboxComposition.makeView.withInputs(
  (model, { maybeSelectedValue, ...viewInputs }, h) =>
    render(
      model,
      { ...viewInputs, selectedValues: Option.toArray(maybeSelectedValue) },
      h,
    ),
)

/** @internal Shared Animation relationship used by internal transition tests. */
export const AnimationBinding = itemUpdate.AnimationBinding
/** @internal Selected implementation used as a scoped internal testing root. */
const canonicalLayer = ListboxBlock.makeLayer(
  Effect.gen(function* () {
    const animation = yield* itemUpdate.AnimationBinding

    return {
      children: [animation],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(AnimationLayer))
type CanonicalContract = typeof ListboxBlock
type CanonicalFacts = Block.FactsOf<CanonicalContract>
type CanonicalIdentity = Block.SelectedPublicIdentity<CanonicalContract>
const ListboxRefinementRule = Symbol('Listbox.Single.Refinement')
/** @internal Nominal identity of the closed Item/Value refinement rule. */
export interface ListboxRefinementKey {
  readonly [ListboxRefinementRule]: true
}
type CanonicalImplementation = Extract<
  Layer.Success<typeof canonicalLayer>,
  Block.SelectedImplementationFacts<
    CanonicalIdentity,
    unknown,
    unknown,
    unknown
  >
>
/** @internal The shared provider's private reader capability. */
export interface SharedListboxProof extends Block.ClosedFamilyCapability<ListboxRefinementKey> {}
/** @internal The shared provider's exact canonical implementation association. */
export interface SharedListboxFacts extends Block.FixedRefinementProvider<
  ListboxRefinementKey,
  CanonicalIdentity,
  CanonicalImplementation
> {}
const SharedListboxProof = Context.Service<
  SharedListboxProof,
  Readonly<{ executable: object }>
>('foldkit/ui/private/Listbox.Single.SharedImplementation')
const SharedListboxFacts = Context.Service<
  SharedListboxFacts,
  Readonly<Record<never, never>>
>('foldkit/ui/private/Listbox.Single.SharedFacts')
const captures = new WeakSet<object>()
const captureExecutable = (executable: object) => {
  const capture = Object.freeze({ executable })

  captures.add(capture)

  return capture
}
const capturedExecutable = Effect.map(
  Effect.serviceOption(SharedListboxProof),
  maybeCapture =>
    Option.map(maybeCapture, capture => {
      if (!captures.has(capture)) {
        throw new Error(
          '[foldkit] A fixed family requires its original captured provider.',
        )
      }

      return capture.executable
    }),
)
BlockFamily.registerFixedProviderGuard(ListboxBlock, capturedExecutable)
const readSharedCapture = Effect.map(
  BlockFamily.readDeclaredExecutable(ListboxBlock),
  captureExecutable,
)
const sharedProofLayer = Layer.effect(SharedListboxProof, readSharedCapture)
const providedSharedProofLayer = Layer.provide(sharedProofLayer, canonicalLayer)
const sharedFactsLayer = Layer.succeed(SharedListboxFacts, {})
/** Constructs the shared Listbox implementation and its private Animation dependency. */
export const layer = Layer.mergeAll(
  canonicalLayer,
  providedSharedProofLayer,
  sharedFactsLayer,
)

Reflect.deleteProperty(ListboxBlock, 'makeLayer')
Reflect.deleteProperty(ListboxBlock, 'provideHandlers')
Object.freeze(ListboxBlock)

/** @internal Selected implementation used as a scoped internal testing root. */
export const block = { block: ListboxBlock, layer }

type RefinedFacts<Item, Value extends string> = Omit<
  CanonicalFacts,
  'view' | 'update' | 'operations'
> &
  Readonly<{
    view: Block.ViewContract<ViewInputs<Item, Value>, 'Element'>
    update: Block.ResultContract<
      OutMessage<Value>,
      CanonicalFacts['update']['requirements']
    >
    operations: Omit<CanonicalFacts['operations'], 'requestSelectItem'> &
      Readonly<{
        requestSelectItem: Block.OperationContract<
          readonly [item: Value],
          OutMessage<Value>,
          CanonicalFacts['operations']['requestSelectItem']['requirements']
        >
      }>
  }>
type RefinedContract<Item, Value extends string> = Block.Contract<
  CanonicalContract['owner'],
  CanonicalContract['Model'],
  CanonicalContract['Message'],
  OutMessageSchema<Value>,
  RefinedFacts<Item, Value>
>
type RefinedConfiguration<Item, Value extends string> = Readonly<{
  key: typeof ListboxKey
  InMessage: typeof InMessage
  Init: Schema.Tuple<readonly [typeof InitConfigSchema]>
  ChildInitContext: typeof InitConfigSchema
  view: Readonly<{
    kind: 'Element'
    Inputs: Block.InputContract<ViewInputs<Item, Value>>
  }>
  operations: Readonly<{
    requestSelectItem: Readonly<{
      message: (
        item: Value,
      ) => readonly [typeof Message.RequestedSelectItem.Type]
      outMessage: OutMessageSchema<Value>['Selected']
    }>
  }>
}>
/** @internal Names the exact private reader of this fixed-family specialization. */
export interface ListboxReader<
  Item,
  Value extends string,
> extends Block.ReadableProvider<
  ListboxRefinementKey,
  Block.SelectedPublicIdentity<RefinedContract<Item, Value>>
> {}

type RefinedBlock<Item, Value extends string> = Omit<
  Block.UnifiedBlock<
    'Listbox',
    typeof Model,
    typeof Message,
    OutMessageSchema<Value>,
    typeof InitConfigSchema,
    RefinedConfiguration<Item, Value>,
    CanonicalIdentity,
    ListboxReader<Item, Value>
  >,
  'makeLayer' | 'provideHandlers' | keyof RefinedContract<Item, Value>
> &
  Omit<RefinedContract<Item, Value>, 'get'>
/** Passive Listbox contract with exact Item, Value and operation result channels. */
export interface Completed<
  Item = string,
  Value extends string = Item extends string ? Item : string,
>
  extends
    RefinedBlock<Item, Value>,
    Block.FixedRefinement<
      ListboxRefinementKey,
      CanonicalIdentity,
      Block.SelectedPublicIdentity<RefinedContract<Item, Value>>
    > {}
/** Creates the typed contract; supply this module's layer when constructing the parent. */
export const makeBlock = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): Completed<Item, Value> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ListboxBlock as unknown as Completed<Item, Value>
