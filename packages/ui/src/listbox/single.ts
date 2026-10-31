import { Effect, Layer, Option } from 'effect'
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
  animationId,
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
  Listbox<Item, Value>,
  Contract<Value>,
  InitConfig,
  ViewInputs<Item, Value>
> {}

/** A single-select Listbox class refined to one Item and Value pair, with
 *  its Layer as `Live`. */
export type ListboxClass<
  Item = string,
  Value extends string = Item extends string ? Item : string,
> = BlockTypes.BlockClass<
  Listbox<Item, Value>,
  'Listbox',
  InitConfig,
  ViewInputs<Item, Value>,
  never,
  Contract<Value>
> &
  Readonly<{ Live: Layer.Layer<Listbox<Item, Value>> }>

/**
 * Creates a single-select Listbox class refined to one Item and Value pair,
 * with its Layer attached as `Live`. `Value` defaults to `Item` for string
 * items and to `string` for object items. Declare
 * `const ResultListbox = Listbox.makeBlock<Result>()` once at module scope,
 * create instances with `yield* new ResultListbox('listbox', { id })` in a
 * parent constructor, and provide `ResultListbox.Live` to the parent's Layer.
 * Selection closes the Listbox and reports `Selected({ value })` for the
 * parent to store. Send `RequestedOpen`, `RequestedClose`, and
 * `RequestedSelectItem({ item })` to drive it from the parent.
 */
export const makeBlock = <
  Item = string,
  Value extends string = Item extends string ? Item : string,
>(): ListboxClass<Item, Value> => {
  const ListboxClass = Block<
    Listbox<Item, Value>,
    InitConfig,
    ViewInputs<Item, Value>
  >()('Listbox', makeContract<Value>())
  const arrayBasedView = internalView<unknown, Value>()

  const ListboxLive = ListboxClass.make(
    Effect.fn(function* (_instanceId, config) {
      const animation = yield* new Animation.Animation('animation', {
        id: animationId(config.id),
      })

      return {
        model: baseInit(config, animation),
        update: makeUpdate<Value>(
          animation,
          'CloseWithFocus',
          (model, item) => ({
            model,
            outMessage: selected<Value>(item),
          }),
        ),
        commands: commandHandlers,
        mounts: mountHandlers,
        view: (model, h, viewInputs) => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const erased = viewInputs as ViewInputs<unknown, Value>
          return arrayBasedView(model, toBaseViewInputs(erased), h)
        },
      }
    }),
  ).pipe(Layer.provide(Animation.AnimationLive))

  return Object.assign(ListboxClass, { Live: ListboxLive })
}
