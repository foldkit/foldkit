import { Effect, Option, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'

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
const ListboxDefinition = ListboxNamespace.makeDefinition({
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
  ListboxDefinition.makeBinding,
  ListboxDefinition.makeOutMessageFold,
  ListboxDefinition.makeStep,
  ListboxDefinition.makeFieldsStep,
  ListboxDefinition.makeNoopStep,
  ListboxDefinition.makeCommandsStep,
  'CloseWithFocus',
  (model, item) => ({
    model,
    outMessage: OutMessage.Selected({ value: item }),
  }),
)
const ListboxComposition = ListboxDefinition.makeComposition({
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
const receive = ListboxComposition.makeReceive(itemUpdate.receiveHandlers)
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
export const block = ListboxDefinition.makeBlock(
  Effect.gen(function* () {
    const animation = yield* itemUpdate.AnimationBinding

    return { children: [animation], init, update, receive, view, EffectsLayer }
  }),
).provide(AnimationLayer)
/** Constructs this Listbox implementation and its private Animation dependency. */
export const layer = block.layer

type CanonicalContract = typeof ListboxDefinition.contract
type CanonicalFacts = Block.FactsOf<CanonicalContract>
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
/** Passive Listbox contract with exact Item, Value and operation result channels. */
export interface Completed<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> extends Omit<RefinedContract<Item, Value>, 'get'> {
  readonly get: Effect.Effect<
    Effect.Success<RefinedContract<Item, Value>['get']>,
    never,
    Effect.Services<CanonicalContract['get']>
  >
}
/** Creates the typed contract; supply this module's layer when constructing the parent. */
export const makeBlock = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): Completed<Item, Value> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ListboxDefinition.contract as unknown as Completed<Item, Value>
