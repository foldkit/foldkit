import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as BlockTypes from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import * as Animation from '../animation/index.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputsCommon,
  type Contract,
  type ItemSchema,
  animationId,
  baseInit,
  closedBaseModel,
  commandHandlers,
  makeContract,
  makeUpdate,
  makeView,
  mountHandlers,
} from './shared.js'

// MODEL

/** Schema for the single-select combobox's private interaction state (open/closed status, active item, activation trigger, typed input value). The selection is owned by the parent and passed in via `ViewInputs.maybeSelectedValue`. */
export const Model = BaseModel
export type Model = typeof Model.Type

// INIT

/** Constructor args for a single-select Combobox instance. `id` is the base DOM id. `isAnimated` enables CSS transition coordination (default `false`). `isModal` locks page scroll and inerts other elements when open (default `false`). */
export type InitConfig = BaseInitConfig

// VIEW

/** Per-render view input a parent passes to `model.combobox.view(...)`. */
export type ViewInputs<Item extends string> = BaseViewInputsCommon<Item> &
  Readonly<{
    /** The selection the parent owns, passed in fresh on every render.
     *  `Option` because a single-select combobox may have no selection
     *  yet. Marks the selected item and drives the hidden form input
     *  submitted under `formName`. */
    maybeSelectedValue: Option.Option<Item>
  }>

// BLOCK

/** A single-select Combobox instance refined to one Item Schema. Store it in
 *  the parent Model and render it with `model.combobox.view(viewInputs)`. */
export interface Combobox<
  Item extends string = string,
  ItemEncoded = Item,
> extends BlockTypes.Instance<
  Combobox<Item, ItemEncoded>,
  Contract<Item, ItemEncoded>,
  InitConfig,
  ViewInputs<Item>
> {}

/** A single-select Combobox class refined to one Item Schema, with its Layer
 *  as `Live`. */
export type ComboboxClass<
  Item extends string = string,
  ItemEncoded = Item,
> = BlockTypes.BlockClass<
  Combobox<Item, ItemEncoded>,
  'Combobox',
  InitConfig,
  ViewInputs<Item>,
  never,
  Contract<Item, ItemEncoded>
> &
  Readonly<{ Live: Layer.Layer<Combobox<Item, ItemEncoded>> }>

const makeComboboxClass = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
): ComboboxClass<Item, ItemEncoded> => {
  const contract = makeContract(Item)
  const { OutMessage } = contract
  const render = makeView<Model, Item, ItemEncoded>(
    { ariaMultiSelectable: false },
    contract.Message,
  )

  const ComboboxClass = Block<
    Combobox<Item, ItemEncoded>,
    InitConfig,
    ViewInputs<Item>
  >()('Combobox', contract)

  const ComboboxLive = ComboboxClass.make(
    Effect.fn(function* (_instanceId, config) {
      const animation = yield* new Animation.Animation('animation', {
        id: animationId(config.id),
      })

      return {
        model: baseInit(config, animation),
        update: makeUpdate<Item>(animation, 'CloseWithFocus', {
          handleClose: (model, restingInputValue, isClearable) => {
            if (isClearable && model.nullable && model.inputValue === '') {
              return {
                model: modifyFields(closedBaseModel(model), {
                  inputValue: () => '',
                }),
                outMessage: OutMessage.ClearedSelection(),
              }
            }

            return {
              model: modifyFields(closedBaseModel(model), {
                inputValue: () => restingInputValue,
              }),
            }
          },
          handleSelectedItem: (model, item, displayText, wasSelected) => {
            const nullableDeselect = model.nullable && wasSelected

            return {
              model: modifyFields(closedBaseModel(model), {
                inputValue: () => (nullableDeselect ? '' : displayText),
              }),
              outMessage: OutMessage.Selected({ value: item }),
            }
          },
          handleImmediateActivation: (model, item) => ({
            model,
            outMessage: OutMessage.Selected({ value: item }),
          }),
        }),
        commands: commandHandlers,
        mounts: mountHandlers,
        view: (model, h, { maybeSelectedValue, ...baseInputs }) =>
          render(
            model,
            {
              ...baseInputs,
              selectedValues: Option.toArray(maybeSelectedValue),
            },
            h,
          ),
      }
    }),
  ).pipe(Layer.provide(Animation.AnimationLive))

  return Object.assign(ComboboxClass, { Live: ComboboxLive })
}

/**
 * Creates a single-select Combobox class with its Layer attached as `Live`.
 * Pass an Item Schema to retain its exact Message and OutMessage payloads.
 * Declare it once at module scope, create instances with
 * `yield* new FruitCombobox('combobox', { id })` in a parent constructor, and
 * provide `FruitCombobox.Live` to the parent's Layer. Selection closes the
 * Combobox and reports `Selected({ value })` for the parent to store. A
 * nullable Combobox also reports `ClearedSelection` when it closes with an
 * empty input. Send `RequestedOpen`,
 * `RequestedClose({ restingInputValue, isClearable })`, and
 * `RequestedSelectItem({ item, displayText })` to drive it from the parent.
 */
export function makeBlock(): ComboboxClass<string>
export function makeBlock<Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
): ComboboxClass<Item, ItemEncoded>
export function makeBlock(Item: ItemSchema<string, unknown> = Schema.String) {
  return makeComboboxClass(Item)
}
