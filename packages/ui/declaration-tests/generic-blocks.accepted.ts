import {
  Array,
  Duration,
  Effect,
  Layer,
  Schema,
  SchemaTransformation,
} from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Combobox from '@foldkit/ui/combobox'
import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as Listbox from '@foldkit/ui/listbox'
import * as Menu from '@foldkit/ui/menu'
import * as RadioGroup from '@foldkit/ui/radioGroup'
import * as Slider from '@foldkit/ui/slider'
import * as Tabs from '@foldkit/ui/tabs'
import * as Toast from '@foldkit/ui/toast'
import * as Tooltip from '@foldkit/ui/tooltip'
import * as VirtualList from '@foldkit/ui/virtualList'

export const Item = Schema.Literals(['Apple', 'Pear'])
export type Item = typeof Item.Type

export const Picker = Combobox.makeBlock(Item)
export const EncodedItem = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: value => globalThis.String(value),
      encode: value => globalThis.Number(value),
    }),
  ),
)
export const EncodedPicker = Combobox.makeBlock(EncodedItem)
export const MultiPicker = Combobox.Multi.makeBlock(Item)
export const ListPicker = Listbox.makeBlock<Item>()
export const MultiListPicker = Listbox.Multi.makeBlock<Item>()
export const MenuPicker = Menu.makeBlock<Item>()
export const RadioPicker = RadioGroup.makeBlock<Item>()
export const TabPicker = Tabs.makeBlock<Item>()
export const ItemList = VirtualList.makeBlock<Item>()
export const RootSlider = Slider.forRoot(() => document)

export const ToastPayload = Schema.Struct({
  kind: Schema.Literals(['Saved', 'Failed']),
})
export const Notifications = Toast.makeBlock(ToastPayload)

export const matchMenuOutMessage = MenuPicker.OutMessage.match<Item | 'Closed'>(
  {
    Selected: ({ value }) => value,
    Closed: () => 'Closed',
  },
)
export const closedMenuOutMessage = MenuPicker.OutMessage.Closed()
export const menuMounts = MenuPicker.Mount

export const toastFromStringDuration = Notifications.requestShow({
  payload: { kind: 'Saved' },
  duration: '1 second',
})
export const toastFromNumberDuration = Notifications.requestShow({
  payload: { kind: 'Failed' },
  duration: 1_000,
})
export const toastFromDuration = Notifications.requestShow({
  payload: { kind: 'Saved' },
  duration: Duration.seconds(2),
})
export const drainNotification = Notifications.test.drainEntry({
  path: 'notifications',
  entryId: 'notifications-entry-0',
})
export const settleBoardFocus = DragAndDrop.test.settleFocus({
  itemId: 'card-1',
  path: 'board',
})

export const tooltipDelayChange =
  Tooltip.Tooltip.Message.InformedOfShowDelayChange({
    showDelay: Duration.millis(350),
  })
export const sliderRangeChange = Slider.Slider.Message.InformedOfRangeChange({
  min: 10,
  max: 90,
})

export const ShopMessage = defineMessageUnion({
  ClickedShowSaved: {},
  ClickedOpenMenu: {},
})

export class Shop extends Block<Shop>()('Shop', {
  Model: Schema.Struct({
    picker: Picker,
    encodedPicker: EncodedPicker,
    listPicker: ListPicker,
    menu: MenuPicker,
    notifications: Notifications,
    slider: RootSlider,
    tooltip: Tooltip.Tooltip,
    board: DragAndDrop.DragAndDrop,
    selections: Schema.Array(Item),
  }),
  Message: ShopMessage,
}) {}

export const ShopLive = Shop.make(
  Effect.fn(function* () {
    const picker = yield* new Picker('picker', { id: 'picker' })
    const encodedPicker = yield* new EncodedPicker('encodedPicker', {
      id: 'encoded-picker',
    })
    const listPicker = yield* new ListPicker('listPicker', {
      id: 'list-picker',
    })
    const menu = yield* new MenuPicker('menu', { id: 'menu' })
    const notifications = yield* new Notifications('notifications', {
      id: 'notifications',
    })
    const slider = yield* new RootSlider('slider', {
      id: 'volume',
      min: 0,
      max: 100,
      step: 1,
    })
    const tooltip = yield* new Tooltip.Tooltip('tooltip', { id: 'help' })
    const board = yield* new DragAndDrop.DragAndDrop('board', {})

    return {
      model: {
        picker,
        encodedPicker,
        listPicker,
        menu,
        notifications,
        slider,
        tooltip,
        board,
        selections: [],
      },
      update: {
        ClickedShowSaved: model => ({
          model,
          messages: [
            model.notifications.send(toastFromStringDuration),
            model.slider.send(sliderRangeChange),
            model.tooltip.send(tooltipDelayChange),
          ],
        }),
        ClickedOpenMenu: model => ({
          model,
          messages: [model.menu.send(MenuPicker.Message.RequestedOpen())],
        }),
        ...picker.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { selections: Array.append(value) }),
          }),
        }),
        ...listPicker.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { selections: Array.append(value) }),
          }),
        }),
        ...menu.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { selections: Array.append(value) }),
          }),
        }),
      },
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Picker.Live,
      EncodedPicker.Live,
      ListPicker.Live,
      MenuPicker.Live,
      Notifications.Live,
      RootSlider.Live,
      Tooltip.TooltipLive,
      DragAndDrop.DragAndDropLive,
    ),
  ),
)
