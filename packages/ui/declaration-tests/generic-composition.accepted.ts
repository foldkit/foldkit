import {
  Array,
  Duration,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import { Block, Message, Program, Struct, Update } from 'foldkit'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'

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

export const MenuFoldFixtureKey = Symbol('MenuFoldFixture')
export const ToastFixtureKey = Symbol('ToastFixture')
export const KeyedToastFixtureKey = Symbol('KeyedToastFixture')
export const DragAndDropFixtureKey = Symbol('DragAndDropFixture')
export const KeyedDragAndDropFixtureKey = Symbol('KeyedDragAndDropFixture')
export const KeyedAnimationFixtureKey = Symbol('KeyedAnimationFixture')
export const ApplicationKey = Symbol('Application')

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
    key: MenuFoldFixtureKey,
    Init: Schema.Tuple([]),
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
export const menuFactoryViewInputs = (
  h: HtmlBuilder<typeof ParentMessage.Type>,
): Block.FactsOf<typeof MenuPicker>['view']['inputs'] => ({
  items: ['Apple', 'Pear'],
  buttonContent: h.span([], ['Choose fruit']),
  itemToConfig: item => ({ content: h.span([], [item]) }),
  buttonAttributes: childAttributes([h.OnClick(ParentMessage.ClickedClear())]),
})
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
  key: ToastFixtureKey,
  Init: Schema.Tuple([]),
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
  key: KeyedToastFixtureKey,
  Init: Schema.Tuple([]),
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
    key: DragAndDropFixtureKey,
    Init: Schema.Tuple([]),
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
    key: KeyedDragAndDropFixtureKey,
    Init: Schema.Tuple([]),
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
    key: KeyedAnimationFixtureKey,
    Init: Schema.Tuple([]),
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
export const waitForKeyedAnimationLeave =
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
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
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

export const createComposition = () =>
  ApplicationDefinition.makeComposition({
    bindings: [
      AnimationBindingWithOutMessagePolicy,
      DialogBinding,
      PickerBinding,
      PopoverBinding,
    ],
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
  const update = composition.makeUpdate({
    ClickedClear: model => ({ model }),
  })
  const view = composition.makeView((model, h) => helper(model, h))

  return ApplicationDefinition.makeBlock(
    Effect.gen(function* () {
      const animation = yield* AnimationBindingWithOutMessagePolicy
      const dialog = yield* DialogBinding
      const picker = yield* PickerBinding
      const popover = yield* PopoverBinding

      return {
        children: [animation, dialog, picker, popover],
        init,
        update,
        view,
      }
    }),
  ).provide(
    Layer.mergeAll(
      Animation.layer,
      Dialog.layer,
      Combobox.layer,
      Popover.layer,
    ),
  )
}

export const ElementBlock = author(createComposition())
export const application = Program.makeElement({
  block: ElementBlock,
  container: null,
})

export type AnimationExecutable = Block.ExecutableOf<
  typeof Animation.AnimationBlock
>
export type CalendarExecutable = Block.ExecutableOf<
  typeof Calendar.CalendarBlock
>
export type SliderExecutable = Block.ExecutableOf<typeof Slider.SliderBlock>
export type RootSliderExecutable = Block.ExecutableOf<typeof RootSlider>
export type TooltipExecutable = Block.ExecutableOf<typeof Tooltip.TooltipBlock>
export type ToastExecutable = Block.ExecutableOf<typeof ToastBlock>

export const showAnimation = (
  animation: AnimationExecutable,
  model: typeof Animation.AnimationBlock.Model.Type,
) => animation.inMessageUpdate(model, Animation.InMessage.RequestedShow())

export const showAnimationCurried = (animation: AnimationExecutable) =>
  animation.inMessageUpdate(Animation.InMessage.RequestedShow())

export const dismissAllToasts = (
  toast: ToastExecutable,
  model: typeof ToastBlock.Model.Type,
) => toast.inMessageUpdate(model, Toast.InMessage.RequestedDismissAll())

export type DirectInputAssertions = [
  Expect<
    Equal<
      Exclude<ReturnType<typeof showAnimation>['outMessage'], undefined>,
      never
    >
  >,
  Expect<
    Equal<
      Update.RequirementsOf<typeof showAnimation>,
      | Block.FactsOf<typeof Animation.AnimationBlock>['runtimeServices']
      | Block.InternalExecution<(typeof Animation.AnimationBlock)['owner']>
    >
  >,
  Expect<
    Equal<
      ReturnType<ReturnType<typeof showAnimationCurried>>,
      ReturnType<typeof showAnimation>
    >
  >,
  Expect<
    Equal<
      Exclude<ReturnType<typeof dismissAllToasts>['outMessage'], undefined>,
      never
    >
  >,
]

export type GenericAssertions = [
  Expect<
    Equal<
      Block.FactsOf<typeof MenuPicker>['view']['inputs'],
      Menu.ViewInputs<'Apple' | 'Pear'>
    >
  >,
  Expect<
    Equal<
      Block.FactsOf<typeof Animation.AnimationBlock>['programRequirements'],
      never
    >
  >,
  Expect<
    Equal<
      Block.FactsOf<typeof Calendar.CalendarBlock>['programRequirements'],
      never
    >
  >,
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
        AnimationExecutable['operations']['requestWaitForLeaveSettlement']
      >,
      | Block.FactsOf<typeof Animation.AnimationBlock>['runtimeServices']
      | Block.InternalExecution<(typeof Animation.AnimationBlock)['owner']>
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
      Update.RequirementsOf<AnimationExecutable['operations']['requestResume']>,
      | Block.FactsOf<typeof Animation.AnimationBlock>['runtimeServices']
      | Block.InternalExecution<(typeof Animation.AnimationBlock)['owner']>
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
      Parameters<SliderExecutable['operations']['informRangeChange']>,
      [
        model: typeof Slider.SliderBlock.Model.Type,
        payload: Block.OperationPayload<
          typeof Slider.SliderBlock.InMessage.InformedOfRangeChange
        >,
      ]
    >
  >,
  Expect<
    Equal<
      Parameters<RootSliderExecutable['operations']['informRangeChange']>,
      Parameters<SliderExecutable['operations']['informRangeChange']>
    >
  >,
  Expect<
    Equal<
      Parameters<TooltipExecutable['operations']['informShowDelayChanged']>,
      [model: typeof Tooltip.TooltipBlock.Model.Type, showDelay: Duration.Input]
    >
  >,
  Expect<
    Equal<
      Parameters<ToastExecutable['operations']['requestShow']>,
      [
        model: typeof ToastBlock.Model.Type,
        input: Toast.ShowInput<typeof ToastPayload.Type>,
      ]
    >
  >,
]

export const sliderRangeChange = Slider.SliderBlock.get.pipe(
  Effect.map(slider =>
    slider.operations.informRangeChange(
      slider.init({ id: 'volume', min: 0, max: 100, step: 1 }).model,
      { min: 10, max: 90 },
    ),
  ),
  Effect.provide(Slider.layer),
)
export const rootSliderRangeChange = RootSlider.get.pipe(
  Effect.map(slider =>
    slider.operations.informRangeChange(
      slider.init({ id: 'root-volume', min: 0, max: 100, step: 1 }).model,
      { min: 20, max: 80 },
    ),
  ),
  Effect.provide(Slider.layer),
)
export const tooltipDelayFromString = Tooltip.TooltipBlock.get.pipe(
  Effect.map(tooltip =>
    tooltip.operations.informShowDelayChanged(
      tooltip.init({ id: 'help' }).model,
      '250 millis',
    ),
  ),
  Effect.provide(Tooltip.layer),
)
export const tooltipDelayFromNumber = Tooltip.TooltipBlock.get.pipe(
  Effect.map(tooltip =>
    tooltip.operations.informShowDelayChanged(
      tooltip.init({ id: 'details' }).model,
      300,
    ),
  ),
  Effect.provide(Tooltip.layer),
)
export const tooltipDelayFromDuration = Tooltip.TooltipBlock.get.pipe(
  Effect.map(tooltip =>
    tooltip.operations.informShowDelayChanged(
      tooltip.init({ id: 'settings' }).model,
      Duration.millis(350),
    ),
  ),
  Effect.provide(Tooltip.layer),
)
export const toastFromStringDuration = ToastBlock.get.pipe(
  Effect.map(toast =>
    toast.operations.requestShow(toast.init({ id: 'notifications' }).model, {
      payload: { kind: 'Saved' },
      duration: '1 second',
    }),
  ),
  Effect.provide(Toast.layer),
)
export const toastFromNumberDuration = ToastBlock.get.pipe(
  Effect.map(toast =>
    toast.operations.requestShow(toast.init({ id: 'notifications' }).model, {
      payload: { kind: 'Failed' },
      duration: 1_000,
    }),
  ),
  Effect.provide(Toast.layer),
)
export const toastFromDuration = ToastBlock.get.pipe(
  Effect.map(toast =>
    toast.operations.requestShow(toast.init({ id: 'notifications' }).model, {
      payload: { kind: 'Saved' },
      duration: Duration.seconds(2),
    }),
  ),
  Effect.provide(Toast.layer),
)

const ShapeModel = Schema.Struct({ value: Schema.String })
const ShapeMessage = Message.defineMessageUnion({ Changed: {} })
const ShapeOutMessage = Message.defineMessageUnion({ Changed: {} })
type ShapeViewInputs = Readonly<{ label: string }>

export const WithViewAndOutMessageKey = Symbol('WithViewAndOutMessage')
const WithViewAndOutMessageDefinition = Block.makeDefinition(
  'WithViewAndOutMessage',
  {
    key: WithViewAndOutMessageKey,
    Model: ShapeModel,
    Message: ShapeMessage,
    OutMessage: ShapeOutMessage,
    Init: Schema.Tuple([]),
    view: {
      kind: 'Element',
      Inputs: Block.makeInputContract<ShapeViewInputs>(),
    },
  },
)
const WithViewAndOutMessageComposition =
  WithViewAndOutMessageDefinition.makeComposition()
export const WithViewAndOutMessage = WithViewAndOutMessageDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: WithViewAndOutMessageComposition.makeInit(() => ({
      model: ShapeModel.make({ value: '' }),
    })),
    update: WithViewAndOutMessageComposition.makeUpdate({
      Changed: WithViewAndOutMessageDefinition.makeNoopStep(),
    }),
    view: WithViewAndOutMessageComposition.makeView.withInputs(
      (_model, { label }, h) => h.div([], [label]),
    ),
    EffectsLayer: Layer.empty,
  }),
)

export const WithOutMessageOnlyKey = Symbol('WithOutMessageOnly')
const WithOutMessageOnlyDefinition = Block.makeDefinition(
  'WithOutMessageOnly',
  {
    key: WithOutMessageOnlyKey,
    Model: ShapeModel,
    Message: ShapeMessage,
    OutMessage: ShapeOutMessage,
    Init: Schema.Tuple([]),
  },
)
const WithOutMessageOnlyComposition =
  WithOutMessageOnlyDefinition.makeComposition()
export const WithOutMessageOnly = WithOutMessageOnlyDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: WithOutMessageOnlyComposition.makeInit(() => ({
      model: ShapeModel.make({ value: '' }),
    })),
    update: WithOutMessageOnlyComposition.makeUpdate({
      Changed: WithOutMessageOnlyDefinition.makeNoopStep(),
    }),
    EffectsLayer: Layer.empty,
  }),
)

export const WithViewOnlyKey = Symbol('WithViewOnly')
const WithViewOnlyDefinition = Block.makeDefinition('WithViewOnly', {
  key: WithViewOnlyKey,
  Model: ShapeModel,
  Message: ShapeMessage,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ShapeViewInputs>() },
})
const WithViewOnlyComposition = WithViewOnlyDefinition.makeComposition()
export const WithViewOnly = WithViewOnlyDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: WithViewOnlyComposition.makeInit(() => ({
      model: ShapeModel.make({ value: '' }),
    })),
    update: WithViewOnlyComposition.makeUpdate({
      Changed: WithViewOnlyDefinition.makeNoopStep(),
    }),
    view: WithViewOnlyComposition.makeView.withInputs((_model, { label }, h) =>
      h.div([], [label]),
    ),
    EffectsLayer: Layer.empty,
  }),
)

export const WithoutViewOrOutMessageKey = Symbol('WithoutViewOrOutMessage')
const WithoutViewOrOutMessageDefinition = Block.makeDefinition(
  'WithoutViewOrOutMessage',
  {
    key: WithoutViewOrOutMessageKey,
    Model: ShapeModel,
    Message: ShapeMessage,
    Init: Schema.Tuple([]),
  },
)
const WithoutViewOrOutMessageComposition =
  WithoutViewOrOutMessageDefinition.makeComposition()
export const WithoutViewOrOutMessage =
  WithoutViewOrOutMessageDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: WithoutViewOrOutMessageComposition.makeInit(() => ({
        model: ShapeModel.make({ value: '' }),
      })),
      update: WithoutViewOrOutMessageComposition.makeUpdate({
        Changed: WithoutViewOrOutMessageDefinition.makeNoopStep(),
      }),
      EffectsLayer: Layer.empty,
    }),
  )

type OutMessagePresence<BlockValue> =
  BlockValue extends Readonly<{ OutMessage: undefined }>
    ? 'WithoutOutMessage'
    : 'WithOutMessage'

export type ShapeAssertions = [
  Expect<
    Equal<
      OutMessagePresence<
        typeof WithViewAndOutMessage | typeof WithoutViewOrOutMessage
      >,
      'WithOutMessage' | 'WithoutOutMessage'
    >
  >,
  Expect<
    Equal<OutMessagePresence<typeof WithOutMessageOnly>, 'WithOutMessage'>
  >,
  Expect<Equal<OutMessagePresence<typeof WithViewOnly>, 'WithoutOutMessage'>>,
  Expect<
    Equal<
      Block.FactsOf<typeof WithViewAndOutMessage>['view'],
      Block.ViewContract<ShapeViewInputs, 'Element'>
    >
  >,
  Expect<Equal<Block.FactsOf<typeof WithOutMessageOnly>['view'], undefined>>,
  Expect<
    Equal<
      Block.FactsOf<typeof WithViewOnly>['view'],
      Block.ViewContract<ShapeViewInputs, 'Element'>
    >
  >,
  Expect<
    Equal<Block.FactsOf<typeof WithoutViewOrOutMessage>['view'], undefined>
  >,
]

export type ExactAnimationUpdateOutMessage = Expect<
  Equal<
    Exclude<ReturnType<AnimationExecutable['update']>['outMessage'], undefined>,
    typeof Animation.AnimationBlock.OutMessage.Type
  >
>
export type ExactAnimationFinishOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        AnimationExecutable['operations']['requestFinish']
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
        AnimationExecutable['operations']['requestShow']
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
        AnimationExecutable['operations']['requestHide']
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactAnimationShowRequirements = Expect<
  Equal<
    Update.RequirementsOf<AnimationExecutable['operations']['requestShow']>,
    | Block.FactsOf<typeof Animation.AnimationBlock>['runtimeServices']
    | Block.InternalExecution<(typeof Animation.AnimationBlock)['owner']>
  >
>
export type ExactAnimationHideRequirements = Expect<
  Equal<
    Update.RequirementsOf<AnimationExecutable['operations']['requestHide']>,
    | Block.FactsOf<typeof Animation.AnimationBlock>['runtimeServices']
    | Block.InternalExecution<(typeof Animation.AnimationBlock)['owner']>
  >
>
export type ExactAnimationFinishRequirements = Expect<
  Equal<
    Update.RequirementsOf<AnimationExecutable['operations']['requestFinish']>,
    | Block.FactsOf<typeof Animation.AnimationBlock>['runtimeServices']
    | Block.InternalExecution<(typeof Animation.AnimationBlock)['owner']>
  >
>
export type ExactCalendarDropOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        CalendarExecutable['operations']['requestDropToDays']
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactCalendarDropRequirements = Expect<
  Equal<
    Update.RequirementsOf<
      CalendarExecutable['operations']['requestDropToDays']
    >,
    | Block.FactsOf<typeof Calendar.CalendarBlock>['runtimeServices']
    | Block.InternalExecution<(typeof Calendar.CalendarBlock)['owner']>
  >
>
export type ExactCalendarSelectOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        CalendarExecutable['operations']['requestSelectDate']
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
        SliderExecutable['operations']['informRangeChange']
      >['outMessage'],
      undefined
    >,
    never
  >
>
export type ExactRootSliderRangeOutMessage = Expect<
  Equal<
    Exclude<
      ReturnType<
        RootSliderExecutable['operations']['informRangeChange']
      >['outMessage'],
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
