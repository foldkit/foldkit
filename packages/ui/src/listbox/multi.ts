import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'

import * as Animation from '../animation/index.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  type Contract,
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

/** Schema for the multi-select listbox's private interaction state (open/closed status, active item, activation trigger, typeahead search). The selection is owned by the parent and passed in via `ViewInputs.selectedValues`. */
export const Model = BaseModel
export type Model = typeof Model.Type

// INIT

/** Constructor args for a multi-select Listbox instance. `id` is the base DOM id. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

// VIEW

/** Per-render view input a parent passes to `model.listbox.view(...)`. */
export type ViewInputs<Item, Value extends string = string> = BaseViewInputs<
  Item,
  Value
>

const internalView = makeView<Model>({ ariaMultiSelectable: true })

// BLOCK

/** A multi-select Listbox instance refined to one Item and Value pair.
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

/** A multi-select Listbox class refined to one Item and Value pair, with its
 *  Layer as `Live`. */
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
 * Creates a multi-select Listbox class refined to one Item and Value pair,
 * with its Layer attached as `Live`. `Value` defaults to `Item` for string
 * items and to `string` for object items. Selection leaves the Listbox open
 * and reports `Selected({ value })` for the parent to handle by toggling
 * membership. Send `RequestedOpen`, `RequestedClose`, and
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
        update: makeUpdate<Value>(animation, 'KeepOpen', (model, item) => ({
          model,
          outMessage: selected<Value>(item),
        })),
        commands: commandHandlers,
        mounts: mountHandlers,
        view: (model, h, viewInputs) =>
          arrayBasedView(
            model,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            viewInputs as ViewInputs<unknown, Value>,
            h,
          ),
      }
    }),
  ).pipe(Layer.provide(Animation.AnimationLive))

  return Object.assign(ListboxClass, { Live: ListboxLive })
}
