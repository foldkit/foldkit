import { Context, Effect, Layer, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import type { MessageOf } from 'foldkit/html'
import * as BlockFamily from 'foldkit/internal/block'
import { modifyFields } from 'foldkit/struct'

import { layer as AnimationLayer } from '../animation/block.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  ComboboxNamespace,
  EffectsLayer,
  InMessage,
  InitConfig as InitConfigSchema,
  type ItemSchema,
  type MessageSchema,
  type OutMessageSchema,
  baseInit,
  closedBaseModel,
  makeMessage,
  makeOutMessage,
  makeUpdateHandlers,
  makeView,
  mounts,
} from './shared.js'

// MODEL

/** Schema for the multi-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.selectedValues`. */
export const Model = Schema.Struct({
  ...BaseModel.fields,
})
export type Model = typeof Model.Type

/** Configuration for creating a multi-select combobox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Per-render view inputs passed to the view via `h.block`'s `viewInputs` field. */
export type ViewInputs<Item extends string> = BaseViewInputs<Item>

/** @internal Stable identity of the multi-selection Combobox family. */
export const ComboboxKey = Symbol('Combobox.multi')

const makeAuthoring = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
) => {
  const ItemMessage: MessageSchema<Item, ItemEncoded> = makeMessage(Item)
  const ItemOutMessage: OutMessageSchema<Item, ItemEncoded> =
    makeOutMessage(Item)

  const requestClose = () =>
    Tuple.make(
      ItemMessage.RequestedClose({
        restingInputValue: '',
        isClearable: true,
      }),
    )

  const requestSelectItem = (item: Item) =>
    Tuple.make(
      ItemMessage.RequestedSelectItem({
        item,
        displayText: item,
      }),
    )

  const ComboboxDefinition = BlockFamily.makeFamilyDeclaration(
    ComboboxNamespace,
    {
      key: ComboboxKey,
      InitArgs: Schema.Tuple([InitConfigSchema]),
      ChildInitContext: InitConfigSchema,
      view: {
        kind: 'Element',
        Inputs: Block.makeInputContract<ViewInputs<Item>>(),
      },
      operations: {
        requestClose: {
          message: requestClose,
          outMessage: ItemOutMessage.ClearedSelection,
        },
        requestSelectItem: {
          message: requestSelectItem,
          outMessage: ItemOutMessage.Selected,
        },
      },
      Model,
      Message: ItemMessage,
      InMessage,
      OutMessage: ItemOutMessage,
    },
  )

  const itemUpdate = makeUpdateHandlers(
    ComboboxDefinition.makeRequiredFieldBinding,
    ComboboxDefinition.makeOutMessageFold,
    ComboboxDefinition.makeStep,
    ComboboxDefinition.makeFieldsStep,
    ComboboxDefinition.makeNoopStep,
    ComboboxDefinition.makeCommandsStep,
    'KeepOpen',
    {
      handleClose: model => ({
        model: modifyFields(closedBaseModel(model), { inputValue: () => '' }),
      }),
      handleSelectedItem: (model, item) => ({
        model,
        outMessage: ItemOutMessage.Selected({ value: item }),
      }),
      handleImmediateActivation: (model, item) => ({
        model,
        outMessage: ItemOutMessage.Selected({ value: item }),
      }),
    },
  )
  const ComboboxComposition = ComboboxDefinition.makeComposition({
    mounts,
    bindings: [itemUpdate.AnimationBinding],
  })
  const update = ComboboxComposition.makeUpdate(itemUpdate.handlers)
  const inMessageUpdate = ComboboxComposition.makeInMessageUpdate(
    itemUpdate.inMessageUpdateHandlers,
  )
  type ViewBuilder = Block.ViewBuilderFor<typeof ComboboxComposition>
  type ViewMessage = MessageOf<ViewBuilder>
  const init = ComboboxComposition.makeInit((config: InitConfig) => ({
    model: baseInit(config),
    childInitContext: config,
  }))
  const view = ComboboxComposition.makeView.withInputs(
    makeView<Model, Item, ViewMessage, ItemEncoded>(
      { ariaMultiSelectable: true },
      ItemMessage,
    ),
  )

  return {
    Definition: ComboboxDefinition,
    Composition: ComboboxComposition,
    AnimationBinding: itemUpdate.AnimationBinding,
    init,
    update,
    inMessageUpdate,
    view,
  }
}

type Authoring<Item extends string, ItemEncoded> = ReturnType<
  typeof makeAuthoring<Item, ItemEncoded>
>
const construct = <Item extends string, ItemEncoded>(
  authoring: Authoring<Item, ItemEncoded>,
) =>
  authoring.Definition.makeLayer({
    init: authoring.init,
    update: authoring.update,
    inMessageUpdate: authoring.inMessageUpdate,
    view: authoring.view,
    EffectsLayer,
  }).pipe(Layer.provide(AnimationLayer))

interface ComboboxImplementation extends Block.FamilyLifetime {
  readonly construct: typeof construct
}

/** @internal Scoped provider identity for all multi-selection specializations. */
export class ComboboxFamily extends Context.Service<
  ComboboxFamily,
  ComboboxImplementation
>()('foldkit/ui/Combobox.multi') {}

/** Constructs every multi-selection Combobox specialization and its private Animation child. */
export const layer = Layer.effect(
  ComboboxFamily,
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct }
  }),
)

const declareBlock = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
) => {
  const authoring = makeAuthoring(Item)

  return BlockFamily.resolveFamily(
    authoring.Definition,
    ComboboxFamily,
    implementation => implementation.construct(authoring),
  )
}

type Contract<Item extends string, ItemEncoded> = ReturnType<
  typeof declareBlock<Item, ItemEncoded>
>
/** Passive multi-selection Combobox contract retaining the exact Item Codec. */
export interface Completed<
  Item extends string = string,
  ItemEncoded = Item,
> extends Contract<Item, ItemEncoded> {}

/** Declares a multi-selection Combobox contract. Supply its implementation with Combobox.Multi.layer. */
export function makeBlock(): Completed<string>
export function makeBlock<Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
): Completed<Item, ItemEncoded>
export function makeBlock(
  Item: ItemSchema<string, unknown> = Schema.String,
): object {
  return declareBlock(Item)
}

/** @internal Default string contract used by the component's interaction tests. */
export const block = makeBlock()
