import { Option, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
  EffectsLayer,
  type ItemToValueInput,
  ListboxNamespace,
  Message,
  OutMessage,
  type OutMessageSchema,
  baseInit,
  makeUpdateHandlers,
  makeView,
  mounts,
} from './shared.js'

// MODEL

/** Schema for the single-select listbox's private interaction state (open/closed status, active item, activation trigger, typeahead search). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = Schema.Struct({
  ...BaseModel.fields,
})
export type Model = typeof Model.Type

// INIT

/** Configuration for creating a single-select listbox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

// VIEW

/** Per-render view inputs passed to the view through a Listbox connection. */
export type ViewInputs<
  Item,
  Value extends string = string,
> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  `Option` because a single-select listbox may have no selection yet.
     *  Drives `aria-selected` and `data-selected` on items, which item the
     *  Listbox highlights when it opens onto a selection, and the hidden
     *  form input submitted under `name`. */
    maybeSelectedValue: Option.Option<Value>
  }> &
  ItemToValueInput<Item, Value>

const internalView = makeView<Model>({ ariaMultiSelectable: false })
const arrayBasedView = internalView<unknown, string>()

const singleViewImpl = (
  model: Model,
  { maybeSelectedValue, ...baseInputs }: ViewInputs<unknown, string>,
  h: HtmlBuilder<Message, Mount.RequirementsOf<typeof mounts>>,
): Html =>
  arrayBasedView(
    model,
    {
      ...baseInputs,
      selectedValues: Option.toArray(maybeSelectedValue),
    },
    h,
  )

const makeBlockParts = <Item, Value extends string>() => {
  const RefinedOutMessage =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    OutMessage as unknown as OutMessageSchema<Value>
  const ListboxDefinition = ListboxNamespace.makeDefinition({
    Model,
    Message,
    OutMessage: RefinedOutMessage,
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
      outMessage:
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        OutMessage.Selected({ value: item }) as OutMessage<Value>,
    }),
  )
  const ListboxComposition = ListboxDefinition.makeComposition({
    mounts,
    bindings: [itemUpdate.AnimationBinding],
  })
  const update = ListboxComposition.makeUpdate(itemUpdate.handlers)
  const init = ListboxComposition.makeInit((config: InitConfig) => ({
    model: baseInit(config),
  }))
  const refinedView =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    singleViewImpl as unknown as (
      model: Model,
      viewInputs: ViewInputs<Item, Value>,
      h: HtmlBuilder<
        typeof ListboxComposition.Message.Type,
        Mount.RequirementsOf<typeof mounts>
      >,
    ) => Html
  const view = ListboxComposition.makeView.withInputs<ViewInputs<Item, Value>>(
    (model, viewInputs, h) => refinedView(model, viewInputs, h),
  )
  const requestOpen = Message.RequestedOpen
  const requestClose = Message.RequestedClose
  const requestSelectItem = (item: Value) =>
    Tuple.make(Message.RequestedSelectItem({ item }))
  return {
    composition: ListboxComposition,
    implementation: {
      init,
      update,
      view,
      operations: { requestOpen, requestClose, requestSelectItem },
      EffectsLayer,
    },
  }
}

type BlockParts<Item, Value extends string> = ReturnType<
  typeof makeBlockParts<Item, Value>
>

/** A completed single-select Listbox Block refined to one Item and Value pair. */
export interface Completed<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> extends Block.CompletedWithViewAndOutMessage<
  BlockParts<Item, Value>['composition'],
  BlockParts<Item, Value>['implementation']
> {}

const assembleBlock = <Item, Value extends string>(): Completed<
  Item,
  Value
> => {
  const { composition, implementation } = makeBlockParts<Item, Value>()

  const prepare = () => composition.prepareBlock(implementation)
  const completedBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return completedBlock
}

/** Creates a complete single-select Listbox Block refined to one Item and
 * Value pair. `Value` defaults to `Item` for string items and to `string` for
 * object items. */
export const makeBlock = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): Completed<Item, Value> => assembleBlock<Item, Value>()

/** Complete default single-select Listbox Block definition. */
export const block = assembleBlock<string, string>()

/** Creates the initial single-select Listbox Model and Commands. Defaults to closed with no active item. */
export const init = block.init

// UPDATE

/** Processes a Listbox Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. Selection closes the Listbox and emits
 *  `Selected({ value })` for the parent to store. */
export const update = block.update

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the Listbox, updating the Model and returning focus
 *  and modal Commands. When it is already open, returns the Model unchanged
 *  with no Commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn =>
  block.operations.requestOpen(model)

/** Programmatically closes the listbox. If it is open, returns the closed Model
 *  with focus and modal Commands. If it is already closed, returns the Model
 *  unchanged with no Commands. Use this in domain-event handlers to close the
 *  listbox. */
export const close = (model: Model): UpdateReturn =>
  block.operations.requestClose(model)

/** Programmatically selects an item in the single-select listbox, closing the listbox and emitting a `Selected({ value })` OutMessage. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  block.operations.requestSelectItem(model, item)
