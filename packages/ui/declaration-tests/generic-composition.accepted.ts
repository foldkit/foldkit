import { Layer, Option, Schema } from 'effect'
import { Block, Message, Struct, defineApplication } from 'foldkit'
import { childAttributes } from 'foldkit/html'

import * as Combobox from '@foldkit/ui/combobox'
import * as Dialog from '@foldkit/ui/dialog'
import * as Listbox from '@foldkit/ui/listbox'
import * as Menu from '@foldkit/ui/menu'
import * as Popover from '@foldkit/ui/popover'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const Item = Schema.Literals(['Apple', 'Pear'])
export const Picker = Combobox.create(Item)
export const MultiPicker = Combobox.Multi.create(Item)
export const ListPicker = Listbox.create<'Apple' | 'Pear'>()
export const MultiListPicker = Listbox.Multi.create<'Apple' | 'Pear'>()
export const MenuPicker = Menu.create<'Apple' | 'Pear'>()
export const Model = Schema.Struct({
  dialog: Dialog.Model,
  picker: Picker.Model,
  popover: Popover.Model,
  maybeSelected: Schema.Option(Item),
})
export const ParentMessage = Message.defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
  GotPickerMessage: { message: Picker.Message },
  GotPopoverMessage: { message: Popover.Message },
  ClickedClear: {},
})
export const Application = defineApplication({ Model, Message: ParentMessage })

export const DialogBinding = Application.bindChild(Dialog.block, {
  field: 'dialog',
  parentMessage: ParentMessage.GotDialogMessage,
  init: { args: () => [{ id: 'details' }] },
  outMessage: {
    fold: Dialog.OutMessage.match({
      Opened: () => Application.step(model => ({ model })),
      Closed: () => Application.step(model => ({ model })),
    }),
  },
})

export const PickerBinding = Application.bindChild(Picker, {
  field: 'picker',
  parentMessage: ParentMessage.GotPickerMessage,
  init: { args: () => [{ id: 'fruit' }] },
  outMessage: {
    fold: Picker.OutMessage.match({
      Selected: ({ value }) =>
        Application.step(model => ({
          model: Struct.modifyFields(model, {
            maybeSelected: () => Option.some(value),
          }),
        })),
      ClearedSelection: () =>
        Application.step(model => ({
          model: Struct.modifyFields(model, {
            maybeSelected: () => Option.none(),
          }),
        })),
    }),
  },
})

export const PopoverBinding = Application.bindChild(Popover.block, {
  field: 'popover',
  parentMessage: ParentMessage.GotPopoverMessage,
  init: { args: () => [{ id: 'help' }] },
  outMessage: {
    fold: Popover.OutMessage.match({
      Opened: () => Application.step(model => ({ model })),
      Closed: () => Application.step(model => ({ model })),
    }),
  },
})

export const createComposition = () =>
  Application.makeComposition({
    childBindings: [DialogBinding, PickerBinding, PopoverBinding],
  })
export type Composition = ReturnType<typeof createComposition>
export type Builder = Block.ViewBuilderFor<Composition>

export const pickerView = (model: typeof Model.Type, h: Builder) =>
  h.block(
    PickerBinding.embedView({
      slotId: 'fruit',
      model: model.picker,
      viewInputs: {
        items: ['Apple', 'Pear'],
        maybeSelectedValue: model.maybeSelected,
        restingInputValue: '',
        itemToValue: item => item,
        itemToDisplayText: item => item,
        itemToConfig: item => ({ content: h.span([], [item]) }),
        inputAttributes: childAttributes([
          h.OnClick(ParentMessage.ClickedClear()),
        ]),
        buttonContent: h.button(
          [h.OnClick(ParentMessage.ClickedClear())],
          ['Clear'],
        ),
      },
    }),
  )

export const helper = (model: typeof Model.Type, h: Builder) =>
  h.block(
    PopoverBinding.embedView({
      slotId: 'help',
      model: model.popover,
      viewInputs: {
        anchor: { placement: 'bottom-start', gap: 4 },
        toView: render =>
          h.div(
            [],
            [
              h.button(render.button, ['Help']),
              ...(render.isVisible
                ? [h.div(render.panel, [pickerView(model, h)])]
                : []),
            ],
          ),
      },
    }),
  )

export const author = (composition: Composition) => {
  const init = composition.makeInit(() => ({
    model: { maybeSelected: Option.none() },
  }))
  const update = composition.makeUpdate((model, _message) => ({ model }))
  const view = composition.makeView((model, h) => helper(model, h))

  return composition.makeElement({ init, update, view, container: null })
}

export const application = author(createComposition())

export type GenericAssertions = [
  Expect<Equal<Parameters<typeof DialogBinding.open>, []>>,
  Expect<
    Equal<
      Parameters<typeof PickerBinding.selectItem>,
      [item: 'Apple' | 'Pear', displayText: string]
    >
  >,
]

const ShapeModel = Schema.Struct({ value: Schema.String })
const ShapeMessage = Message.defineMessageUnion({ Changed: {} })
const ShapeOutMessage = Message.defineMessageUnion({ Changed: {} })
const DeclarationWithOutMessage = Block.define('DeclarationWithOutMessage', {
  Model: ShapeModel,
  Message: ShapeMessage,
  OutMessage: ShapeOutMessage,
})
const DeclarationWithoutOutMessage = Block.define(
  'DeclarationWithoutOutMessage',
  {
    Model: ShapeModel,
    Message: ShapeMessage,
  },
)
const DeclarationWithOutMessageComposition =
  DeclarationWithOutMessage.makeComposition()
const DeclarationWithoutOutMessageComposition =
  DeclarationWithoutOutMessage.makeComposition()
const init = () => ({ model: ShapeModel.make({ value: '' }) })
const update = (model: typeof ShapeModel.Type) => ({ model })
const view = DeclarationWithOutMessageComposition.makeView.withInputs<
  Readonly<{ label: string }>
>((_model, { label }, h) => h.div([], [label]))
const plainView = DeclarationWithoutOutMessageComposition.makeView.withInputs<
  Readonly<{ label: string }>
>((_model, { label }, h) => h.div([], [label]))

const withViewAndOutMessageImplementation = {
  init,
  update,
  view,
  EffectsLayer: Layer.empty,
}
export const WithViewAndOutMessage =
  DeclarationWithOutMessageComposition.makeBlock(
    withViewAndOutMessageImplementation,
  )
export const WithOutMessageOnly =
  DeclarationWithOutMessageComposition.makeBlock({
    init,
    update,
    EffectsLayer: Layer.empty,
  })
export const WithViewOnly = DeclarationWithoutOutMessageComposition.makeBlock({
  init,
  update,
  view: plainView,
  EffectsLayer: Layer.empty,
})
export const WithoutViewOrOutMessage =
  DeclarationWithoutOutMessageComposition.makeBlock({
    init,
    update,
    EffectsLayer: Layer.empty,
  })

type BroadOutMessageBlock = Block.Block<
  typeof DeclarationWithOutMessage.owner,
  typeof ShapeModel,
  typeof ShapeMessage,
  typeof ShapeOutMessage | undefined,
  (typeof DeclarationWithOutMessageComposition)[typeof Block.LocalMountsTypeId],
  typeof DeclarationWithOutMessageComposition.childBindings,
  typeof withViewAndOutMessageImplementation
>
type OutMessagePresence<BlockValue> = BlockValue extends unknown
  ? BlockValue extends Readonly<{ OutMessage: unknown }>
    ? 'WithOutMessage'
    : 'WithoutOutMessage'
  : never

export type ShapeAssertions = [
  Expect<
    Equal<
      OutMessagePresence<BroadOutMessageBlock>,
      'WithOutMessage' | 'WithoutOutMessage'
    >
  >,
]
