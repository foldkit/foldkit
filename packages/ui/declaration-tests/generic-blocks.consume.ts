import { Array, Effect, type Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import type * as Combobox from '@foldkit/ui/combobox'
import type * as Listbox from '@foldkit/ui/listbox'
import type * as Menu from '@foldkit/ui/menu'
import type * as Toast from '@foldkit/ui/toast'

import {
  EncodedPicker,
  type Item,
  ListPicker,
  MenuPicker,
  MultiPicker,
  Notifications,
  Picker,
  Shop,
  ShopLive,
  type ToastPayload,
  matchMenuOutMessage,
} from './generic-blocks.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type RelocatedAssertions = [
  Expect<Equal<typeof Picker, Combobox.ComboboxClass<Item, Item>>>,
  Expect<Equal<typeof EncodedPicker, Combobox.ComboboxClass<string, number>>>,
  Expect<Equal<typeof MultiPicker, Combobox.Multi.ComboboxClass<Item, Item>>>,
  Expect<Equal<typeof ListPicker, Listbox.ListboxClass<Item, Item>>>,
  Expect<Equal<typeof MenuPicker, Menu.MenuClass<Item>>>,
  Expect<
    Equal<
      typeof Notifications,
      Toast.Completed<typeof ToastPayload.Type, typeof ToastPayload.Encoded>
    >
  >,
  Expect<Equal<ReturnType<typeof matchMenuOutMessage>, Item | 'Closed'>>,
  Expect<Equal<(typeof Shop.Model.Type)['picker'], Combobox.Combobox<Item>>>,
  Expect<Equal<typeof ShopLive, Layer.Layer<Shop>>>,
]

const MallMessage = defineMessageUnion({ ClickedEnterShop: {} })

export class Mall extends Block<Mall>()('Mall', {
  Model: Schema.Struct({
    shop: Shop,
    menu: MenuPicker,
    choices: Schema.Array(Schema.Literals(['Apple', 'Pear'])),
  }),
  Message: MallMessage,
}) {}

export const MallLive = Mall.make(
  Effect.fn(function* () {
    const shop = yield* new Shop('shop')
    const menu = yield* new MenuPicker('menu', { id: 'mall-menu' })

    return {
      model: { shop, menu, choices: [] },
      update: {
        ClickedEnterShop: model => ({
          model,
          messages: [model.shop.send(Shop.Message.ClickedOpenMenu())],
        }),
        ...menu.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { choices: Array.append(value) }),
          }),
        }),
      },
    }
  }),
)
