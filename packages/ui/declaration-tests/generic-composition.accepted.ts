import {
  Array,
  Duration,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import { Block, Command, Message, Program, Struct, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'

import * as Animation from '@foldkit/ui/animation'
import * as Calendar from '@foldkit/ui/calendar'
import * as Combobox from '@foldkit/ui/combobox'
import * as Dialog from '@foldkit/ui/dialog'
import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as Listbox from '@foldkit/ui/listbox'
import * as Menu from '@foldkit/ui/menu'
import * as Popover from '@foldkit/ui/popover'
import * as Slider from '@foldkit/ui/slider'
import * as Toast from '@foldkit/ui/toast'
import * as Tooltip from '@foldkit/ui/tooltip'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const Item = Schema.Literals(['Apple', 'Pear'])
export const Picker = Combobox.makeBlock(Item)
export const EncodedItem = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: globalThis.String,
      encode: globalThis.Number,
    }),
  ),
)
export const EncodedPicker = Combobox.makeBlock(EncodedItem)
export const MultiPicker = Combobox.Multi.makeBlock(Item)
export const ListPicker = Listbox.makeBlock<'Apple' | 'Pear'>()
export const MultiListPicker = Listbox.Multi.makeBlock<'Apple' | 'Pear'>()
export const MenuPicker = Menu.makeBlock<'Apple' | 'Pear'>()
const MenuFoldModel = Schema.Struct({ selected: Item })
export const MenuFoldFixtureDefinition = Block.makeDefinition(
  'MenuFoldFixture',
  {
    Model: MenuFoldModel,
    Message: Schema.Never,
  },
)
export const foldMenuChoice = MenuFoldFixtureDefinition.makeOutMessageFold(
  MenuPicker,
  {
    Selected:
      ({ value }) =>
      model => ({
        model: Struct.modifyFields(model, { selected: () => value }),
      }),
    Closed: () => MenuFoldFixtureDefinition.makeNoopStep(),
  },
)
export type FoldedMenuModel = Expect<
  Equal<
    ReturnType<ReturnType<typeof foldMenuChoice>>['model']['selected'],
    'Apple' | 'Pear'
  >
>
export const matchMenuOutMessage = MenuPicker.OutMessage.match<
  'Apple' | 'Pear' | 'Closed'
>({
  Selected: ({ value }) => value,
  Closed: () => 'Closed',
})
export const closedMenuOutMessage = MenuPicker.OutMessage.Closed()
export const menuTestDefinitions = [
  Menu.test.LockMenuScroll,
  Menu.test.UnlockMenuScroll,
  Menu.test.InertMenuOthers,
  Menu.test.RestoreMenuInert,
  Menu.test.FocusMenuItems,
  Menu.test.FocusMenuButton,
  Menu.test.ScrollMenuItemIntoView,
  Menu.test.ClickMenuItem,
  Menu.test.DelayClearMenuSearch,
  Menu.test.DetectMenuMovementOrAnimationEnd,
  Menu.test.AnchorMenu,
  Menu.test.PortalMenuBackdrop,
]
export const menuFactoryMounts: ReadonlyArray<
  typeof Menu.test.AnchorMenu | typeof Menu.test.PortalMenuBackdrop
> = MenuPicker.mounts
export const RootSlider = Slider.forRoot(() => document)
export const ToastPayload = Schema.Struct({
  kind: Schema.Literals(['Saved', 'Failed']),
})
export const ToastBlock = Toast.makeBlock(ToastPayload)
export const OtherToastBlock = Toast.makeBlock(
  Schema.Struct({ count: Schema.Number }),
)
const ToastFixtureModel = Schema.Struct({
  toast: ToastBlock.Model,
  otherToast: OtherToastBlock.Model,
})
const ToastFixtureDefinition = Block.makeDefinition('ToastFixture', {
  Model: ToastFixtureModel,
  Message: Schema.Never,
})
export const ToastBinding = ToastFixtureDefinition.makeBinding(ToastBlock, {
  placement: 'Toast',
  read: model => Option.some(model.toast),
  write: (model, toast) => Struct.modifyFields(model, { toast: () => toast }),
}).withOutMessagePolicy({
  fold: ToastFixtureDefinition.makeOutMessageFold(ToastBlock, {
    DismissedToast: () => ToastFixtureDefinition.makeNoopStep(),
  }),
})
export const OtherToastBinding = ToastFixtureDefinition.makeBinding(
  OtherToastBlock,
  {
    placement: 'OtherToast',
    read: model => Option.some(model.otherToast),
    write: (model, otherToast) =>
      Struct.modifyFields(model, { otherToast: () => otherToast }),
  },
).withOutMessagePolicy({
  fold: ToastFixtureDefinition.makeOutMessageFold(OtherToastBlock, {
    DismissedToast: () => ToastFixtureDefinition.makeNoopStep(),
  }),
})
export const drainToastEntry = ToastBlock.test.drainEntry({
  binding: ToastBinding,
  entryId: 'toast-entry-0',
})
const ToastInstance = Schema.Struct({
  id: Schema.Literal('Primary'),
  model: ToastBlock.Model,
})
const KeyedToastFixtureDefinition = Block.makeDefinition('KeyedToastFixture', {
  Model: Schema.Struct({ toasts: Schema.Array(ToastInstance) }),
  Message: Schema.Never,
})
const foldKeyedToastOutMessage = KeyedToastFixtureDefinition.makeOutMessageFold(
  ToastBlock,
  {
    DismissedToast: () => KeyedToastFixtureDefinition.makeNoopStep(),
  },
)
export const KeyedToastBinding = KeyedToastFixtureDefinition.makeBinding(
  ToastBlock,
  {
    field: 'toasts',
    key: 'id',
    childField: 'model',
  },
).withOutMessagePolicy({
  fold: (_key, outMessage) => foldKeyedToastOutMessage(outMessage),
})
export const drainKeyedToastEntry = ToastBlock.test.drainEntry({
  binding: KeyedToastBinding,
  key: 'Primary',
  entryId: 'toast-entry-0',
})
const DragAndDropFixtureModel = Schema.Struct({
  dragAndDrop: DragAndDrop.DragAndDropBlock.Model,
})
const DragAndDropFixtureDefinition = Block.makeDefinition(
  'DragAndDropFixture',
  {
    Model: DragAndDropFixtureModel,
    Message: Schema.Never,
  },
)
const foldDragAndDropOutMessage =
  DragAndDropFixtureDefinition.makeOutMessageFold(
    DragAndDrop.DragAndDropBlock,
    {
      StartedKeyboardDrag: DragAndDropFixtureDefinition.makeNoopStep,
      ChangedKeyboardTarget: DragAndDropFixtureDefinition.makeNoopStep,
      Reordered: () => DragAndDropFixtureDefinition.makeNoopStep(),
      Cancelled: () => DragAndDropFixtureDefinition.makeNoopStep(),
    },
  )
export const DragAndDropBinding = DragAndDropFixtureDefinition.makeBinding(
  DragAndDrop.DragAndDropBlock,
  {
    placement: 'DragAndDrop',
    read: model => Option.some(model.dragAndDrop),
    write: (model, dragAndDrop) =>
      Struct.modifyFields(model, { dragAndDrop: () => dragAndDrop }),
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })
export const settleEmbeddedDragAndDropFocus = DragAndDrop.test.settleFocus({
  binding: DragAndDropBinding,
  itemId: 'card-1',
})
export const resolveEmbeddedKeyboardMove = DragAndDrop.test.resolveKeyboardMove(
  {
    binding: DragAndDropBinding,
    itemId: 'card-1',
    targetContainerId: 'done',
    targetIndex: 0,
  },
)
const DragAndDropInstance = Schema.Struct({
  id: Schema.Literal('Primary'),
  model: DragAndDrop.DragAndDropBlock.Model,
})
const KeyedDragAndDropFixtureDefinition = Block.makeDefinition(
  'KeyedDragAndDropFixture',
  {
    Model: Schema.Struct({
      dragAndDrops: Schema.Array(DragAndDropInstance),
    }),
    Message: Schema.Never,
  },
)
const foldKeyedDragAndDropOutMessage =
  KeyedDragAndDropFixtureDefinition.makeOutMessageFold(
    DragAndDrop.DragAndDropBlock,
    {
      StartedKeyboardDrag: KeyedDragAndDropFixtureDefinition.makeNoopStep,
      ChangedKeyboardTarget: KeyedDragAndDropFixtureDefinition.makeNoopStep,
      Reordered: () => KeyedDragAndDropFixtureDefinition.makeNoopStep(),
      Cancelled: () => KeyedDragAndDropFixtureDefinition.makeNoopStep(),
    },
  )
export const KeyedDragAndDropBinding =
  KeyedDragAndDropFixtureDefinition.makeBinding(DragAndDrop.DragAndDropBlock, {
    placement: 'DragAndDrops',
    keySchema: Schema.Literal('Primary'),
    readAll: model => model.dragAndDrops,
    key: instance => instance.id,
    read: instance => instance.model,
    writeAt: (model, key, nextDragAndDrop) =>
      Struct.modifyFields(model, {
        dragAndDrops: Array.map(instance =>
          instance.id === key
            ? DragAndDropInstance.make({ id: key, model: nextDragAndDrop })
            : instance,
        ),
      }),
  }).withOutMessagePolicy({
    fold: (_key, outMessage) => foldKeyedDragAndDropOutMessage(outMessage),
  })
export const settleKeyedDragAndDropFocus = DragAndDrop.test.settleFocus({
  binding: KeyedDragAndDropBinding,
  key: 'Primary',
  itemId: 'card-1',
})
export const resolveKeyedKeyboardMove = DragAndDrop.test.resolveKeyboardMove({
  binding: KeyedDragAndDropBinding,
  key: 'Primary',
  itemId: 'card-1',
  targetContainerId: 'done',
  targetIndex: 0,
})
export const animationViewInputs: Animation.ViewInputs = {
  toView: () => null,
}
const AnimationInstance = Schema.Struct({
  id: Schema.Literal('Primary'),
  model: Animation.AnimationBlock.Model,
})
const KeyedAnimationFixtureDefinition = Block.makeDefinition(
  'KeyedAnimationFixture',
  {
    Model: Schema.Struct({ animations: Schema.Array(AnimationInstance) }),
    Message: Schema.Never,
  },
)
export const KeyedAnimationBinding =
  KeyedAnimationFixtureDefinition.makeBinding(Animation.AnimationBlock, {
    field: 'animations',
    key: 'id',
    childField: 'model',
  })
const makeKeyedAnimationOutMessageFold = (key: 'Primary') =>
  KeyedAnimationFixtureDefinition.makeOutMessageFold(Animation.AnimationBlock, {
    StartedLeaveAnimating: () =>
      KeyedAnimationBinding.requestWaitForLeaveSettlement(key),
    TransitionedOut: KeyedAnimationFixtureDefinition.makeNoopStep,
  })
export const KeyedAnimationFixtureComposition =
  KeyedAnimationFixtureDefinition.makeComposition({
    bindings: [
      KeyedAnimationBinding.withOutMessagePolicy({
        fold: (key, outMessage) =>
          makeKeyedAnimationOutMessageFold(key)(outMessage),
      }),
    ],
  })
export const keyedAnimationLeaveWaitStep =
  KeyedAnimationBinding.requestWaitForLeaveSettlement('Primary')
export const Model = Schema.Struct({
  animation: Animation.AnimationBlock.Model,
  dialog: Dialog.DialogBlock.Model,
  picker: Picker.Model,
  popover: Popover.PopoverBlock.Model,
  maybeSelected: Schema.Option(Item),
})
export const ParentMessage = Message.defineMessageUnion({
  ClickedClear: {},
})
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: ParentMessage,
})

export const AnimationBinding = ApplicationDefinition.makeBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: { contextToArgs: () => [{ id: 'details-animation' }] },
  },
)
const foldAnimationOutMessage = ApplicationDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      AnimationBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: ApplicationDefinition.makeNoopStep,
  },
)
export const AnimationBindingWithOutMessagePolicy =
  AnimationBinding.withOutMessagePolicy({ fold: foldAnimationOutMessage })

export const DialogBinding = ApplicationDefinition.makeBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'details' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: () => ApplicationDefinition.makeNoopStep(),
    Closed: () => ApplicationDefinition.makeNoopStep(),
    CompletedClose: () => ApplicationDefinition.makeNoopStep(),
  }),
})

export const PickerBinding = ApplicationDefinition.makeBinding(Picker, {
  field: 'picker',
  init: { contextToArgs: () => [{ id: 'fruit' }] },
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Picker, {
    Selected: ({ value }) =>
      ApplicationDefinition.makeStep(model => ({
        model: Struct.modifyFields(model, {
          maybeSelected: () => Option.some(value),
        }),
      })),
    ClearedSelection: () =>
      ApplicationDefinition.makeStep(model => ({
        model: Struct.modifyFields(model, {
          maybeSelected: () => Option.none(),
        }),
      })),
  }),
})

export const PopoverBinding = ApplicationDefinition.makeBinding(
  Popover.PopoverBlock,
  {
    field: 'popover',
    init: { contextToArgs: () => [{ id: 'help' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Popover.PopoverBlock, {
    Opened: () => ApplicationDefinition.makeNoopStep(),
    Closed: () => ApplicationDefinition.makeNoopStep(),
  }),
})

export type Composition = Block.Composition<
  typeof ApplicationDefinition.owner,
  typeof Model,
  typeof ParentMessage,
  undefined,
  readonly [],
  readonly [
    typeof AnimationBindingWithOutMessagePolicy,
    typeof DialogBinding,
    typeof PickerBinding,
    typeof PopoverBinding,
  ]
>

export const createComposition = (): Composition =>
  ApplicationDefinition.makeComposition({
    bindings: [
      AnimationBindingWithOutMessagePolicy,
      DialogBinding,
      PickerBinding,
      PopoverBinding,
    ],
    mounts: [],
  })
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
  const update = composition.makeUpdate({
    ClickedClear: model => ({ model }),
  })
  const view = composition.makeView((model, h) => helper(model, h))

  const prepare = () => composition.prepareBlock({ init, update, view })
  const completedBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

export const ElementBlock = author(createComposition())
export const application = Program.makeElement({
  block: ElementBlock,
  container: null,
})

export type GenericAssertions = [
  Expect<
    Equal<ReturnType<typeof matchMenuOutMessage>, 'Apple' | 'Pear' | 'Closed'>
  >,
  Expect<Equal<Parameters<typeof DialogBinding.requestOpen>, []>>,
  Expect<
    Equal<Parameters<typeof AnimationBinding.requestWaitForLeaveSettlement>, []>
  >,
  Expect<
    Equal<
      Update.RequirementsOf<
        typeof Animation.AnimationBlock.operations.requestWaitForLeaveSettlement
      >,
      Command.HandlerOf<typeof Animation.test.WaitForAnimationSettled>
    >
  >,
  Expect<
    Equal<
      Parameters<typeof KeyedAnimationBinding.requestWaitForLeaveSettlement>,
      [key: 'Primary']
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<
        typeof Animation.AnimationBlock.operations.requestResume
      >,
      | Command.HandlerOf<typeof Animation.test.WaitForAnimationSettled>
      | Command.HandlerOf<typeof Animation.test.WaitForPaint>
    >
  >,
  Expect<
    Equal<
      Parameters<typeof PickerBinding.requestSelectItem>,
      [item: 'Apple' | 'Pear', displayText: string]
    >
  >,
  Expect<
    Equal<
      Parameters<typeof Slider.SliderBlock.operations.informRangeChanged>,
      [
        model: typeof Slider.SliderBlock.Model.Type,
        payload: Block.OperationPayload<
          typeof Slider.SliderBlock.Message.InformedOfRangeChange
        >,
      ]
    >
  >,
  Expect<
    Equal<
      Parameters<typeof RootSlider.operations.informRangeChanged>,
      Parameters<typeof Slider.SliderBlock.operations.informRangeChanged>
    >
  >,
  Expect<
    Equal<
      Parameters<typeof Tooltip.TooltipBlock.operations.informShowDelayChanged>,
      [model: typeof Tooltip.TooltipBlock.Model.Type, showDelay: Duration.Input]
    >
  >,
  Expect<
    Equal<
      Parameters<typeof ToastBlock.operations.requestShow>,
      [
        model: typeof ToastBlock.Model.Type,
        input: Toast.ShowInput<typeof ToastPayload.Type>,
      ]
    >
  >,
]

export const sliderRangeChange =
  Slider.SliderBlock.operations.informRangeChanged(
    Slider.SliderBlock.init({ id: 'volume', min: 0, max: 100, step: 1 }).model,
    { min: 10, max: 90 },
  )
export const rootSliderRangeChange = RootSlider.operations.informRangeChanged(
  Slider.SliderBlock.init({ id: 'root-volume', min: 0, max: 100, step: 1 })
    .model,
  { min: 20, max: 80 },
)
export const tooltipDelayFromString =
  Tooltip.TooltipBlock.operations.informShowDelayChanged(
    Tooltip.TooltipBlock.init({ id: 'help' }).model,
    '250 millis',
  )
export const tooltipDelayFromNumber =
  Tooltip.TooltipBlock.operations.informShowDelayChanged(
    Tooltip.TooltipBlock.init({ id: 'details' }).model,
    300,
  )
export const tooltipDelayFromDuration =
  Tooltip.TooltipBlock.operations.informShowDelayChanged(
    Tooltip.TooltipBlock.init({ id: 'settings' }).model,
    Duration.millis(350),
  )
const toastModel = ToastBlock.init({ id: 'notifications' }).model
export const toastFromStringDuration = ToastBlock.operations.requestShow(
  toastModel,
  {
    payload: { kind: 'Saved' },
    duration: '1 second',
  },
)
export const toastFromNumberDuration = ToastBlock.operations.requestShow(
  toastModel,
  {
    payload: { kind: 'Failed' },
    duration: 1_000,
  },
)
export const toastFromDuration = ToastBlock.operations.requestShow(toastModel, {
  payload: { kind: 'Saved' },
  duration: Duration.seconds(2),
})

const ShapeModel = Schema.Struct({ value: Schema.String })
const ShapeMessage = Message.defineMessageUnion({ Changed: {} })
const ShapeOutMessage = Message.defineMessageUnion({ Changed: {} })
const DeclarationWithOutMessageDefinition = Block.makeDefinition(
  'DeclarationWithOutMessage',
  {
    Model: ShapeModel,
    Message: ShapeMessage,
    OutMessage: ShapeOutMessage,
  },
)
const DeclarationWithOutMessageComposition =
  DeclarationWithOutMessageDefinition.makeComposition()
const DeclarationWithoutOutMessageComposition = Block.makeDefinition(
  'DeclarationWithoutOutMessage',
  {
    Model: ShapeModel,
    Message: ShapeMessage,
  },
).makeComposition()
const withOutMessageInit = DeclarationWithOutMessageComposition.makeInit(
  () => ({ model: ShapeModel.make({ value: '' }) }),
)
const withoutOutMessageInit = DeclarationWithoutOutMessageComposition.makeInit(
  () => ({
    model: ShapeModel.make({ value: '' }),
  }),
)
const update = (model: typeof ShapeModel.Type) => ({ model })
const view = DeclarationWithOutMessageComposition.makeView.withInputs<
  Readonly<{ label: string }>
>((_model, { label }, h) => h.div([], [label]))
const plainView = DeclarationWithoutOutMessageComposition.makeView.withInputs<
  Readonly<{ label: string }>
>((_model, { label }, h) => h.div([], [label]))

const withViewAndOutMessageImplementation = {
  init: withOutMessageInit,
  update,
  view,
  EffectsLayer: Layer.empty,
}
const prepareWithViewAndOutMessage = () =>
  DeclarationWithOutMessageComposition.prepareBlock(
    withViewAndOutMessageImplementation,
  )
export const WithViewAndOutMessage: Block.FromAssemblyWithViewAndOutMessage<
  typeof ShapeModel,
  typeof prepareWithViewAndOutMessage
> = Block.assemble(prepareWithViewAndOutMessage)
const prepareWithOutMessageOnly = () =>
  DeclarationWithOutMessageComposition.prepareBlock({
    init: withOutMessageInit,
    update,
    EffectsLayer: Layer.empty,
  })
export const WithOutMessageOnly: Block.FromAssemblyWithOutMessage<
  typeof ShapeModel,
  typeof prepareWithOutMessageOnly
> = Block.assemble(prepareWithOutMessageOnly)
const prepareWithViewOnly = () =>
  DeclarationWithoutOutMessageComposition.prepareBlock({
    init: withoutOutMessageInit,
    update,
    view: plainView,
    EffectsLayer: Layer.empty,
  })
export const WithViewOnly: Block.FromAssemblyWithView<
  typeof ShapeModel,
  typeof prepareWithViewOnly
> = Block.assemble(prepareWithViewOnly)
const prepareWithoutViewOrOutMessage = () =>
  DeclarationWithoutOutMessageComposition.prepareBlock({
    init: withoutOutMessageInit,
    update,
    EffectsLayer: Layer.empty,
  })
export const WithoutViewOrOutMessage: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ShapeModel,
  typeof prepareWithoutViewOrOutMessage
> = Block.assemble(prepareWithoutViewOrOutMessage)

type BroadOutMessageBlock = Block.Block<
  typeof DeclarationWithOutMessageDefinition.owner,
  typeof ShapeModel,
  typeof ShapeMessage,
  typeof ShapeOutMessage | undefined,
  (typeof DeclarationWithOutMessageComposition)[typeof Block.LocalMountsTypeId],
  typeof DeclarationWithOutMessageComposition.bindings,
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

export type ExactAnimationUpdateOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof Animation.AnimationBlock.update>['outMessage'],
      undefined
    >,
    typeof Animation.AnimationBlock.OutMessage.Type
  >
>
export type ExactAnimationFinishOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        typeof Animation.AnimationBlock.operations.requestFinish
      >['outMessage'],
      undefined
    >,
    Extract<
      typeof Animation.AnimationBlock.OutMessage.Type,
      { _tag: 'TransitionedOut' }
    >
  >
>
export type ExactAnimationShowOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        typeof Animation.AnimationBlock.operations.requestShow
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactAnimationHideOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        typeof Animation.AnimationBlock.operations.requestHide
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactAnimationShowRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      typeof Animation.AnimationBlock.operations.requestShow
    >,
    Command.HandlerOf<typeof Animation.test.WaitForPaint>
  >
>
export type ExactAnimationHideRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      typeof Animation.AnimationBlock.operations.requestHide
    >,
    Command.HandlerOf<typeof Animation.test.WaitForPaint>
  >
>
export type ExactAnimationFinishRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      typeof Animation.AnimationBlock.operations.requestFinish
    >,
    never
  >
>
export type ExactCalendarDropOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        typeof Calendar.CalendarBlock.operations.requestDropToDays
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactCalendarDropRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      typeof Calendar.CalendarBlock.operations.requestDropToDays
    >,
    never
  >
>
export type ExactCalendarSelectOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        typeof Calendar.CalendarBlock.operations.requestSelectDate
      >['outMessage'],
      undefined
    >,
    Extract<
      typeof Calendar.CalendarBlock.OutMessage.Type,
      { _tag: 'SelectedDate' }
    >
  >
>
export type ExactSliderRangeOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        typeof Slider.SliderBlock.operations.informRangeChanged
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactRootSliderRangeOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<typeof RootSlider.operations.informRangeChanged>['outMessage'],
      undefined
    >,
    never
  >
>

export const keyboardDragStarted =
  DragAndDrop.DragAndDropBlock.OutMessage.StartedKeyboardDrag({
    itemId: 'card-1',
    containerId: 'todo',
    index: 0,
  })
export const keyboardTargetChanged =
  DragAndDrop.DragAndDropBlock.OutMessage.ChangedKeyboardTarget({
    itemId: 'card-1',
    fromContainerId: 'todo',
    fromIndex: 0,
    toContainerId: 'done',
    toIndex: 1,
  })
