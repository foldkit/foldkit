import { Layer, Option } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'

import * as Animation from '../animation/index.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  type BaseViewInputsCommon,
  type Contract,
  type ItemToValueInput,
  baseInit,
  commandHandlers,
  makeContract,
  makeUpdate,
  makeView,
  mountHandlers,
  selected,
} from './shared.js'

// MODEL

/** Schema for the single-select listbox's private interaction state (open/closed status, active item, activation trigger, typeahead search). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = BaseModel
export type Model = typeof Model.Type

// INIT

/** Constructor args for a single-select Listbox instance. `id` is the base DOM id. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

// VIEW

/** Per-render view input a parent passes to `model.listbox.view(...)`. */
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

const toBaseViewInputs = <Value extends string>({
  maybeSelectedValue,
  ...baseInputs
}: ViewInputs<unknown, Value>): BaseViewInputs<unknown, Value> => ({
  ...baseInputs,
  selectedValues: Option.toArray(maybeSelectedValue),
})

// BLOCK

/** A single-select Listbox instance refined to one Item and Value pair.
 *  Store it in the parent Model and render it with
 *  `model.listbox.view(viewInputs)`. */
export interface Listbox<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> extends BlockTypes.Instance<
  Contract<Value>,
  InitConfig,
  ViewInputs<Item, Value>
> {}

/** A single-select Listbox class refined to one Item and Value pair, declared
 *  with its implementation. The class is its own Layer and requires
 *  `AnimationLive`. */
export type ListboxClass<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> = BlockTypes.BlockClass<
  Listbox<Item, Value>,
  'Listbox',
  InitConfig,
  ViewInputs<Item, Value>,
  Contract<Value>
> &
  Layer.Layer<Listbox<Item, Value>, never, Animation.Animation>

/**
 * Creates a single-select Listbox class refined to one Item and Value pair,
 * declared with its implementation. `Value` defaults to `Item` for string
 * items and to `string` for object items. Declare
 * `const ResultListbox = Listbox.make<Result>()` once at module scope, create
 * instances with `new ResultListbox('listbox', { id })` in a parent's Model,
 * and provide the class itself, with `AnimationLive` for its open and close
 * transitions, to the parent's Layer. Selection closes the Listbox and
 * reports `Selected({ value })` for the parent to store. Send
 * `RequestedOpen`, `RequestedClose`, and `RequestedSelectItem({ item })` to
 * drive it from the parent.
 */
export const make = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): ListboxClass<Item, Value> => {
  const arrayBasedView = internalView<unknown, Value>()

  return Block<Listbox<Item, Value>, InitConfig, ViewInputs<Item, Value>>()(
    'Listbox',
    makeContract<Value>(),
    () => ({
      init: baseInit,
      update: makeUpdate<Value>('CloseWithFocus', (model, item) => ({
        model,
        outMessage: selected<Value>(item),
      })),
      commands: commandHandlers,
      mounts: mountHandlers,
      view: (model, h, viewInputs) => {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const erased = viewInputs as ViewInputs<unknown, Value>
        return arrayBasedView(model, toBaseViewInputs(erased), h)
      },
    }),
  )
}
