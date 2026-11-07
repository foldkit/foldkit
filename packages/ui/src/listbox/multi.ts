import { Context, Effect, Layer, Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'
import type { MessageOf } from 'foldkit/html'
import * as BlockFamily from 'foldkit/internal/block'

import { layer as AnimationLayer } from '../animation/block.js'
import { EffectsLayer, mounts } from './command.js'
import { makeUpdateHandlers } from './handlers.js'
import { baseInit } from './model.js'
import { ListboxNamespace } from './namespace.js'
import {
  type BaseInitConfig,
  BaseModel,
  type BaseViewInputs,
  InMessage,
  InitConfig as InitConfigSchema,
  type MessageSchema,
  type OutMessageSchema,
  type ValueSchema,
  makeMessage,
  makeOutMessage,
} from './types.js'
import { makeView } from './view.js'

/** Private Listbox interaction Model; the parent owns selection. */
export const Model = Schema.Struct({ ...BaseModel.fields })
export type Model = typeof Model.Type
/** Startup configuration for this Listbox occurrence. */
export type InitConfig = BaseInitConfig
/** Controlled multi-selection inputs and item rendering callbacks. */
export type ViewInputs<Item, Value extends string = string> = BaseViewInputs<
  Item,
  Value
>

/** @internal Stable identity of the multi-selection Listbox family. */
export const ListboxKey = Symbol('Listbox.Multi')

const makeAuthoring = <Item, Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const ValueMessage: MessageSchema<Value, ValueEncoded> = makeMessage(Value)
  const ValueOutMessage: OutMessageSchema<Value, ValueEncoded> =
    makeOutMessage(Value)
  const Definition = BlockFamily.makeFamilyDeclaration(ListboxNamespace, {
    key: ListboxKey,
    Model,
    Message: ValueMessage,
    InMessage,
    OutMessage: ValueOutMessage,
    InitArgs: Schema.Tuple([InitConfigSchema]),
    ChildInitContext: InitConfigSchema,
    view: {
      kind: 'Element',
      Inputs: Block.makeInputContract<ViewInputs<Item, Value>>(),
    },
    operations: {
      requestSelectItem: {
        message: (item: Value) =>
          Tuple.make(ValueMessage.RequestedSelectItem({ item })),
        outMessage: ValueOutMessage.Selected,
      },
    },
  })
  const itemUpdate = makeUpdateHandlers(
    Definition.makeRequiredFieldBinding,
    Definition.makeOutMessageFold,
    Definition.makeStep,
    Definition.makeFieldsStep,
    Definition.makeNoopStep,
    Definition.makeCommandsStep,
    'KeepOpen',
    (model, item) => ({
      model,
      outMessage: ValueOutMessage.Selected({ value: item }),
    }),
  )
  const ListboxComposition = Definition.makeComposition({
    mounts,
    bindings: [itemUpdate.AnimationBinding],
  })
  type ListboxViewBuilder = Block.ViewBuilderFor<typeof ListboxComposition>
  type ListboxViewMessage = MessageOf<ListboxViewBuilder>
  const init = ListboxComposition.makeInit((config: InitConfig) => ({
    model: baseInit(config),
    childInitContext: config,
  }))
  const update = ListboxComposition.makeUpdate(itemUpdate.handlers)
  const inMessageUpdate = ListboxComposition.makeInMessageUpdate(
    itemUpdate.inMessageUpdateHandlers,
  )
  const render = makeView<Model, Item, Value, ListboxViewMessage, ValueEncoded>(
    { ariaMultiSelectable: true },
    ValueMessage,
  )
  const view = ListboxComposition.makeView.withInputs((model, viewInputs, h) =>
    render(model, viewInputs, h),
  )

  return {
    Definition,
    Composition: ListboxComposition,
    AnimationBinding: itemUpdate.AnimationBinding,
    init,
    update,
    inMessageUpdate,
    view,
  }
}

type Authoring<Item, Value extends string, ValueEncoded> = ReturnType<
  typeof makeAuthoring<Item, Value, ValueEncoded>
>
const construct = <Item, Value extends string, ValueEncoded>(
  authoring: Authoring<Item, Value, ValueEncoded>,
) =>
  authoring.Definition.makeLayer({
    init: authoring.init,
    update: authoring.update,
    inMessageUpdate: authoring.inMessageUpdate,
    view: authoring.view,
    EffectsLayer,
  }).pipe(Layer.provide(AnimationLayer))

interface ListboxImplementation extends Block.FamilyLifetime {
  readonly construct: typeof construct
}

/** @internal Scoped provider identity for all multi-selection specializations. */
export class ListboxFamily extends Context.Service<
  ListboxFamily,
  ListboxImplementation
>()('foldkit/ui/Listbox.multi') {}

/** Constructs multi-selection Listbox specializations and their private Animation children. */
export const layer = Layer.effect(
  ListboxFamily,
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct }
  }),
)

const declareBlock = <Item, Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const authoring = makeAuthoring<Item, Value, ValueEncoded>(Value)

  return BlockFamily.resolveFamily(
    authoring.Definition,
    ListboxFamily,
    implementation => implementation.construct(authoring),
  )
}

type Contract<Item, Value extends string, ValueEncoded> = ReturnType<
  typeof declareBlock<Item, Value, ValueEncoded>
>
/** Passive Listbox contract with exact rendering Item, selected Value and encoded channels. */
export interface Completed<
  Item = string,
  Value extends string = Item extends string ? Item : string,
  ValueEncoded = Value,
> extends Contract<Item, Value, ValueEncoded> {}

/** Declares a Listbox contract. Supply Listbox.Multi.layer when constructing the parent.
 *
 * Omit arguments for unrestricted string items. Pass one Value Schema for string
 * items, or an Item Schema and Value Schema for objects. Item supplies view typing
 * only; Value supplies the runtime selection Codecs. Map object items and other non-Value items
 * through itemToValue; items that are Values need no extractor.
 *
 * @example
 * ```ts
 * const Status = Schema.Literals(['Todo', 'Done'])
 * const StatusListboxBlock = Listbox.Multi.makeBlock(Status)
 * const StatusOption = Schema.Struct({ label: Schema.String, value: Status })
 * const StatusOptionListboxBlock = Listbox.Multi.makeBlock(StatusOption, Status)
 * ```
 */
export function makeBlock(): Completed<string, string>
export function makeBlock<Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
): Completed<Value, Value, ValueEncoded>
export function makeBlock<
  Item extends Schema.Top,
  Value extends string,
  ValueEncoded,
>(
  Item: Item,
  Value: ValueSchema<Value, ValueEncoded>,
): Completed<Item['Type'], Value, ValueEncoded>
export function makeBlock(
  ...args:
    | readonly []
    | readonly [Value: ValueSchema<string, unknown>]
    | readonly [Item: Schema.Top, Value: ValueSchema<string, unknown>]
): object {
  if (args.length === 2) {
    const [, Value] = args

    return declareBlock(Value)
  }

  const [Value = Schema.String] = args

  return declareBlock(Value)
}

const defaultAuthoring = makeAuthoring<string, string, string>(Schema.String)

/** @internal Original Animation relationship used by interaction tests. */
export const AnimationBinding = defaultAuthoring.AnimationBinding
/** @internal Default string contract and provider used by interaction tests. */
export const block = {
  block: BlockFamily.resolveFamily(
    defaultAuthoring.Definition,
    ListboxFamily,
    implementation => implementation.construct(defaultAuthoring),
  ),
  layer,
}
