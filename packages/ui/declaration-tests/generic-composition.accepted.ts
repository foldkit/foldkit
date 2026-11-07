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
import * as Story from 'foldkit/story'

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
export const ListPicker = Listbox.makeBlock(Item)
export const MultiListPicker = Listbox.Multi.makeBlock(Item)
export const MenuPicker = Menu.makeBlock<'Apple' | 'Pear'>()
const MenuFoldModel = Schema.Struct({ selected: Item })
export const MenuFoldFixtureBlock = Block.make('MenuFoldFixture', {
  key: MenuFoldFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: MenuFoldModel,
  Message: Schema.Never,
})
export const foldMenuChoice = MenuFoldFixtureBlock.makeOutMessageFold(
  MenuPicker,
  {
    Selected:
      ({ value }) =>
      model => ({
        model: Struct.modifyFields(model, { selected: () => value }),
      }),
    Closed: () => MenuFoldFixtureBlock.makeNoopStep(),
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
const ToastFixtureBlock = Block.make('ToastFixture', {
  key: ToastFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: ToastFixtureModel,
  Message: Schema.Never,
})
export const ToastBinding = ToastFixtureBlock.makeCustomBinding(ToastBlock, {
  placement: 'Toast',
  read: model => Option.some(model.toast),
  write: (model, toast) => Struct.modifyFields(model, { toast: () => toast }),
}).withOutMessagePolicy({
  fold: ToastFixtureBlock.makeOutMessageFold(ToastBlock, {
    DismissedToast: () => ToastFixtureBlock.makeNoopStep(),
  }),
})
export const OtherToastBinding = ToastFixtureBlock.makeCustomBinding(
  OtherToastBlock,
  {
    placement: 'OtherToast',
    read: model => Option.some(model.otherToast),
    write: (model, otherToast) =>
      Struct.modifyFields(model, { otherToast: () => otherToast }),
  },
).withOutMessagePolicy({
  fold: ToastFixtureBlock.makeOutMessageFold(OtherToastBlock, {
    DismissedToast: () => ToastFixtureBlock.makeNoopStep(),
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
const KeyedToastFixtureBlock = Block.make('KeyedToastFixture', {
  key: KeyedToastFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ toasts: Schema.Array(ToastInstance) }),
  Message: Schema.Never,
})
const foldKeyedToastOutMessage = KeyedToastFixtureBlock.makeOutMessageFold(
  ToastBlock,
  {
    DismissedToast: () => KeyedToastFixtureBlock.makeNoopStep(),
  },
)
export const KeyedToastBinding = KeyedToastFixtureBlock.makeKeyedArrayBinding(
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
const DragAndDropFixtureBlock = Block.make('DragAndDropFixture', {
  key: DragAndDropFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: DragAndDropFixtureModel,
  Message: Schema.Never,
})
const foldDragAndDropOutMessage = DragAndDropFixtureBlock.makeOutMessageFold(
  DragAndDrop.DragAndDropBlock,
  {
    StartedKeyboardDrag: DragAndDropFixtureBlock.makeNoopStep,
    ChangedKeyboardTarget: DragAndDropFixtureBlock.makeNoopStep,
    Reordered: () => DragAndDropFixtureBlock.makeNoopStep(),
    Cancelled: () => DragAndDropFixtureBlock.makeNoopStep(),
  },
)
export const DragAndDropBinding = DragAndDropFixtureBlock.makeCustomBinding(
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
const KeyedDragAndDropFixtureBlock = Block.make('KeyedDragAndDropFixture', {
  key: KeyedDragAndDropFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    dragAndDrops: Schema.Array(DragAndDropInstance),
  }),
  Message: Schema.Never,
})
const foldKeyedDragAndDropOutMessage =
  KeyedDragAndDropFixtureBlock.makeOutMessageFold(
    DragAndDrop.DragAndDropBlock,
    {
      StartedKeyboardDrag: KeyedDragAndDropFixtureBlock.makeNoopStep,
      ChangedKeyboardTarget: KeyedDragAndDropFixtureBlock.makeNoopStep,
      Reordered: () => KeyedDragAndDropFixtureBlock.makeNoopStep(),
      Cancelled: () => KeyedDragAndDropFixtureBlock.makeNoopStep(),
    },
  )
export const KeyedDragAndDropBinding =
  KeyedDragAndDropFixtureBlock.makeCustomKeyedBinding(
    DragAndDrop.DragAndDropBlock,
    {
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
    },
  ).withOutMessagePolicy({
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
const KeyedAnimationFixtureBlock = Block.make('KeyedAnimationFixture', {
  key: KeyedAnimationFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ animations: Schema.Array(AnimationInstance) }),
  Message: Schema.Never,
})
export const KeyedAnimationBinding =
  KeyedAnimationFixtureBlock.makeKeyedArrayBinding(Animation.AnimationBlock, {
    field: 'animations',
    key: 'id',
    childField: 'model',
  })
const makeKeyedAnimationOutMessageFold = (key: 'Primary') =>
  KeyedAnimationFixtureBlock.makeOutMessageFold(Animation.AnimationBlock, {
    StartedLeaveAnimating: () =>
      KeyedAnimationBinding.requestWaitForLeaveSettlement(key),
    TransitionedOut: KeyedAnimationFixtureBlock.makeNoopStep,
  })
export const KeyedAnimationFixtureComposition =
  KeyedAnimationFixtureBlock.makeComposition({
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
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message: ParentMessage,
})

export const AnimationBinding = ApplicationBlock.makeRequiredFieldBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: { contextToArgs: () => [{ id: 'details-animation' }] },
  },
)
const foldAnimationOutMessage = ApplicationBlock.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      AnimationBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: ApplicationBlock.makeNoopStep,
  },
)
export const AnimationBindingWithOutMessagePolicy =
  AnimationBinding.withOutMessagePolicy({ fold: foldAnimationOutMessage })

export const DialogBinding = ApplicationBlock.makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'details' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: () => ApplicationBlock.makeNoopStep(),
    Closed: () => ApplicationBlock.makeNoopStep(),
    CompletedClose: () => ApplicationBlock.makeNoopStep(),
  }),
})

export const PickerBinding = ApplicationBlock.makeRequiredFieldBinding(Picker, {
  field: 'picker',
  init: { contextToArgs: () => [{ id: 'fruit' }] },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(Picker, {
    Selected: ({ value }) =>
      ApplicationBlock.makeStep(model => ({
        model: Struct.modifyFields(model, {
          maybeSelected: () => Option.some(value),
        }),
      })),
    ClearedSelection: () =>
      ApplicationBlock.makeStep(model => ({
        model: Struct.modifyFields(model, {
          maybeSelected: () => Option.none(),
        }),
      })),
  }),
})

export const PopoverBinding = ApplicationBlock.makeRequiredFieldBinding(
  Popover.PopoverBlock,
  {
    field: 'popover',
    init: { contextToArgs: () => [{ id: 'help' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(Popover.PopoverBlock, {
    Opened: () => ApplicationBlock.makeNoopStep(),
    Closed: () => ApplicationBlock.makeNoopStep(),
  }),
})

export const createComposition = () =>
  ApplicationBlock.makeComposition({
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

  return ApplicationBlock.makeLayer(
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
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        Animation.layer,
        Dialog.layer,
        Combobox.layer,
        Popover.layer,
      ),
    ),
  )
}

export const ElementLayer = author(createComposition())
export const application = Program.makeElement({
  block: ApplicationBlock,
  layer: ElementLayer,
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
      Parameters<SliderExecutable['operations']['informOfRangeChange']>,
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
      Parameters<RootSliderExecutable['operations']['informOfRangeChange']>,
      Parameters<SliderExecutable['operations']['informOfRangeChange']>
    >
  >,
  Expect<
    Equal<
      Parameters<TooltipExecutable['operations']['informOfShowDelayChanged']>,
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

export const sliderRangeChange = Story.withBlock(Slider.SliderBlock, slider =>
  slider.operations.informOfRangeChange(
    slider.init({ id: 'volume', min: 0, max: 100, step: 1 }).model,
    { min: 10, max: 90 },
  ),
).pipe(Effect.provide(Slider.layer))
export const rootSliderRangeChange = Story.withBlock(RootSlider, slider =>
  slider.operations.informOfRangeChange(
    slider.init({ id: 'root-volume', min: 0, max: 100, step: 1 }).model,
    { min: 20, max: 80 },
  ),
).pipe(Effect.provide(Slider.layer))
export const tooltipDelayFromString = Story.withBlock(
  Tooltip.TooltipBlock,
  tooltip =>
    tooltip.operations.informOfShowDelayChanged(
      tooltip.init({ id: 'help' }).model,
      '250 millis',
    ),
).pipe(Effect.provide(Tooltip.layer))
export const tooltipDelayFromNumber = Story.withBlock(
  Tooltip.TooltipBlock,
  tooltip =>
    tooltip.operations.informOfShowDelayChanged(
      tooltip.init({ id: 'details' }).model,
      300,
    ),
).pipe(Effect.provide(Tooltip.layer))
export const tooltipDelayFromDuration = Story.withBlock(
  Tooltip.TooltipBlock,
  tooltip =>
    tooltip.operations.informOfShowDelayChanged(
      tooltip.init({ id: 'settings' }).model,
      Duration.millis(350),
    ),
).pipe(Effect.provide(Tooltip.layer))
export const toastFromStringDuration = Story.withBlock(ToastBlock, toast =>
  toast.operations.requestShow(toast.init({ id: 'notifications' }).model, {
    payload: { kind: 'Saved' },
    duration: '1 second',
  }),
).pipe(Effect.provide(Toast.layer))
export const toastFromNumberDuration = Story.withBlock(ToastBlock, toast =>
  toast.operations.requestShow(toast.init({ id: 'notifications' }).model, {
    payload: { kind: 'Failed' },
    duration: 1_000,
  }),
).pipe(Effect.provide(Toast.layer))
export const toastFromDuration = Story.withBlock(ToastBlock, toast =>
  toast.operations.requestShow(toast.init({ id: 'notifications' }).model, {
    payload: { kind: 'Saved' },
    duration: Duration.seconds(2),
  }),
).pipe(Effect.provide(Toast.layer))

const ShapeModel = Schema.Struct({ value: Schema.String })
const ShapeMessage = Message.defineMessageUnion({ Changed: {} })
const ShapeOutMessage = Message.defineMessageUnion({ Changed: {} })
type ShapeViewInputs = Readonly<{ label: string }>

export const WithViewAndOutMessageKey = Symbol('WithViewAndOutMessage')
const WithViewAndOutMessageBlock = Block.make('WithViewAndOutMessage', {
  key: WithViewAndOutMessageKey,
  Model: ShapeModel,
  Message: ShapeMessage,
  OutMessage: ShapeOutMessage,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ShapeViewInputs>(),
  },
})
const WithViewAndOutMessageComposition =
  WithViewAndOutMessageBlock.makeComposition()
export const WithViewAndOutMessage = WithViewAndOutMessageBlock
export const WithViewAndOutMessageLayer = WithViewAndOutMessageBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: WithViewAndOutMessageComposition.makeInit(() => ({
      model: ShapeModel.make({ value: '' }),
    })),
    update: WithViewAndOutMessageComposition.makeUpdate({
      Changed: WithViewAndOutMessageBlock.makeNoopStep(),
    }),
    view: WithViewAndOutMessageComposition.makeView.withInputs(
      (_model, { label }, h) => h.div([], [label]),
    ),
    EffectsLayer: Layer.empty,
  }),
)

export const WithOutMessageOnlyKey = Symbol('WithOutMessageOnly')
const WithOutMessageOnlyBlock = Block.make('WithOutMessageOnly', {
  key: WithOutMessageOnlyKey,
  Model: ShapeModel,
  Message: ShapeMessage,
  OutMessage: ShapeOutMessage,
  InitArgs: Schema.Tuple([]),
})
const WithOutMessageOnlyComposition = WithOutMessageOnlyBlock.makeComposition()
export const WithOutMessageOnly = WithOutMessageOnlyBlock
export const WithOutMessageOnlyLayer = WithOutMessageOnlyBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: WithOutMessageOnlyComposition.makeInit(() => ({
      model: ShapeModel.make({ value: '' }),
    })),
    update: WithOutMessageOnlyComposition.makeUpdate({
      Changed: WithOutMessageOnlyBlock.makeNoopStep(),
    }),
    EffectsLayer: Layer.empty,
  }),
)

export const WithViewOnlyKey = Symbol('WithViewOnly')
const WithViewOnlyBlock = Block.make('WithViewOnly', {
  key: WithViewOnlyKey,
  Model: ShapeModel,
  Message: ShapeMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ShapeViewInputs>() },
})
const WithViewOnlyComposition = WithViewOnlyBlock.makeComposition()
export const WithViewOnly = WithViewOnlyBlock
export const WithViewOnlyLayer = WithViewOnlyBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: WithViewOnlyComposition.makeInit(() => ({
      model: ShapeModel.make({ value: '' }),
    })),
    update: WithViewOnlyComposition.makeUpdate({
      Changed: WithViewOnlyBlock.makeNoopStep(),
    }),
    view: WithViewOnlyComposition.makeView.withInputs((_model, { label }, h) =>
      h.div([], [label]),
    ),
    EffectsLayer: Layer.empty,
  }),
)

export const WithoutViewOrOutMessageKey = Symbol('WithoutViewOrOutMessage')
const WithoutViewOrOutMessageBlock = Block.make('WithoutViewOrOutMessage', {
  key: WithoutViewOrOutMessageKey,
  Model: ShapeModel,
  Message: ShapeMessage,
  InitArgs: Schema.Tuple([]),
})
const WithoutViewOrOutMessageComposition =
  WithoutViewOrOutMessageBlock.makeComposition()
export const WithoutViewOrOutMessage = WithoutViewOrOutMessageBlock
export const WithoutViewOrOutMessageLayer =
  WithoutViewOrOutMessageBlock.makeLayer(
    Effect.succeed({
      children: [],
      init: WithoutViewOrOutMessageComposition.makeInit(() => ({
        model: ShapeModel.make({ value: '' }),
      })),
      update: WithoutViewOrOutMessageComposition.makeUpdate({
        Changed: WithoutViewOrOutMessageBlock.makeNoopStep(),
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
        SliderExecutable['operations']['informOfRangeChange']
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
        RootSliderExecutable['operations']['informOfRangeChange']
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
