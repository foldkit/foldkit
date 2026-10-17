import { Option, Schema } from 'effect'
import type * as Block from 'foldkit/block'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'
import type * as Update from 'foldkit/update'

import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
  EffectsLayer,
  type ItemToValueInput,
  Message,
  OutMessage,
  type OutMessageSchema,
  Listbox as SharedListbox,
  baseInit,
  makeUpdate,
  makeView,
  mounts,
} from './shared.js'

type RefineOutMessage<Return, OutMessage> =
  Return extends Update.ResultRecipe<
    infer Model,
    infer Message,
    unknown,
    infer R,
    infer Evidence
  >
    ? Update.ResultRecipe<Model, Message, OutMessage, R, Evidence>
    : Return extends (...args: infer Args) => infer Output
      ? (...args: Args) => RefineOutMessage<Output, OutMessage>
      : Return extends unknown
        ? Omit<Return, 'outMessage'> & Readonly<{ outMessage?: OutMessage }>
        : never

// MODEL

/** Schema for the single-select listbox's private interaction state (open/closed status, active item, activation trigger, typeahead search). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = Schema.Struct({
  ...BaseModel.fields,
})

export type Model = typeof Model.Type

// INIT

/** Configuration for creating a single-select listbox model with `init`. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

/** Creates an initial single-select listbox model from a config. Defaults to closed with no active item. */
export const init = (config: InitConfig): Model => baseInit(config)

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
  const Listbox = SharedListbox.define({
    Model,
    Message,
    OutMessage: RefinedOutMessage,
  })
  const itemUpdate = makeUpdate(
    Listbox.bindChild,
    Listbox.step,
    'CloseWithFocus',
    (model, item) => ({
      model,
      outMessage: OutMessage.Selected({ value: item }),
    }),
  )
  type RefinedOutMessage = OutMessage<Value>
  type RefinedReturn = RefineOutMessage<
    ReturnType<typeof itemUpdate.update>,
    RefinedOutMessage
  >

  const castReturn = (result: ReturnType<typeof itemUpdate.update>) =>
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    result as unknown as RefinedReturn
  const ListboxComposition = Listbox.makeComposition({
    mounts,
    childBindings: [itemUpdate.AnimationBinding],
  })
  const authoredUpdate = Listbox.step(
    (model, message: Parameters<typeof itemUpdate.update>[1]) =>
      castReturn(itemUpdate.update(model, message)),
  )
  const update = ListboxComposition.makeUpdate((model, message) =>
    authoredUpdate(model, message),
  )
  const refinedView =
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    singleViewImpl as unknown as (
      model: Model,
      viewInputs: ViewInputs<Item, Value>,
      h: Parameters<typeof singleViewImpl>[2],
    ) => Html
  const view = ListboxComposition.makeView.withInputs<ViewInputs<Item, Value>>(
    (model, viewInputs, h) => refinedView(model, viewInputs, h),
  )
  const open = Listbox.step(model =>
    update(model, Message.Opened({ maybeActiveItemIndex: Option.none() })),
  )
  const close = Listbox.step(model => update(model, Message.Closed()))
  const selectItem = Listbox.step((model, item: Value) =>
    update(model, Message.SelectedItem({ item })),
  )
  const expose = { open, close, selectItem }
  return {
    composition: ListboxComposition,
    implementation: {
      init: ListboxComposition.makeInit((config: InitConfig) => ({
        model: init(config),
      })),
      update,
      view,
      expose,
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

const makeBlock = <Item, Value extends string>(): Completed<Item, Value> => {
  const { composition, implementation } = makeBlockParts<Item, Value>()

  return composition.makeBlock(implementation)
}

/** Creates a complete single-select Listbox Block refined to one Item and
 * Value pair. `Value` defaults to `Item` for string items and to `string` for
 * object items. */
export const create = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): Completed<Item, Value> => makeBlock<Item, Value>()

/** Complete default single-select Listbox Block definition. */
export const block = makeBlock<string, string>()

// UPDATE

/** Processes a Listbox Message and returns the next Model, optional Commands,
 *  and an optional OutMessage. Selection closes the Listbox and emits
 *  `Selected({ value })` for the parent to store. */
export const update = block.update

type UpdateReturn = ReturnType<typeof update>

/** Programmatically opens the Listbox, updating the Model and returning focus
 *  and modal Commands. Use this in domain-event handlers. */
export const open = (model: Model): UpdateReturn => block.expose.open(model)

/** Programmatically closes the listbox. If it is open, returns the closed Model
 *  with focus and modal Commands. If it is already closed, returns the Model
 *  unchanged with no Commands. Use this in domain-event handlers to close the
 *  listbox. */
export const close = (model: Model): UpdateReturn => block.expose.close(model)

/** Programmatically selects an item in the single-select listbox, closing the listbox and emitting a `Selected({ value })` OutMessage. */
export const selectItem = (model: Model, item: string): UpdateReturn =>
  block.expose.selectItem(model, item)
