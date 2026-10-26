import * as Animation from '@foldkit/ui/animation'
import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as Popover from '@foldkit/ui/popover'
import * as Slider from '@foldkit/ui/slider'
import * as Toast from '@foldkit/ui/toast'
import * as Tooltip from '@foldkit/ui/tooltip'

import {
  AnimationBinding,
  ApplicationDefinition,
  DialogBinding,
  DragAndDropBinding,
  KeyedAnimationBinding,
  KeyedDragAndDropBinding,
  KeyedToastBinding,
  MenuFoldFixtureDefinition,
  MenuPicker,
  OtherToastBinding,
  Picker,
  PickerBinding,
  RootSlider,
  ToastBinding,
  ToastBlock,
  helper,
} from './generic-composition.accepted.js'

MenuFoldFixtureDefinition.makeOutMessageFold(MenuPicker, {
  Selected: ({ value }) => {
    // @ts-expect-error Parent-owned folds preserve the generic Menu payload.
    const _wrong: 'Banana' = value
    return MenuFoldFixtureDefinition.makeNoopStep()
  },
  Closed: () => MenuFoldFixtureDefinition.makeNoopStep(),
})

// @ts-expect-error Parent-owned folds require every generic Menu OutMessage variant.
MenuFoldFixtureDefinition.makeOutMessageFold(MenuPicker, {
  Selected: () => MenuFoldFixtureDefinition.makeNoopStep(),
})

// @ts-expect-error Animation content must be rendered through the caller-scoped slot.
const invalidAnimationViewInputs: Animation.ViewInputs = { content: null }
void invalidAnimationViewInputs

// @ts-expect-error The connected Dialog operation takes no arguments.
DialogBinding.requestOpen('unexpected')

// @ts-expect-error The connected Animation operation takes no arguments.
AnimationBinding.requestWaitForLeaveSettlement('unexpected')

// @ts-expect-error A keyed Animation operation requires its occurrence key.
KeyedAnimationBinding.requestWaitForLeaveSettlement()

// @ts-expect-error The keyed Animation operation retains its literal key Schema.
KeyedAnimationBinding.requestWaitForLeaveSettlement('Secondary')

Picker.Message.SelectedItem({
  // @ts-expect-error The refined Message rejects an item outside its Schema.
  item: 'Banana',
  displayText: 'Banana',
  wasSelected: false,
})

MenuPicker.OutMessage.match({
  Selected: ({ value }) => {
    // @ts-expect-error The Menu OutMessage matcher preserves its item refinement.
    const banana: 'Banana' = value
    return banana
  },
  Closed: () => 'Closed',
})

MenuPicker.OutMessage.match<string>(
  // @ts-expect-error The Menu OutMessage matcher requires the Closed variant.
  { Selected: () => '' },
)

// @ts-expect-error The connected operation preserves the item Schema.
PickerBinding.requestSelectItem('Banana', 'Banana')

ToastBlock.operations.requestShow(
  ToastBlock.init({ id: 'invalid-toast' }).model,
  {
    payload: {
      // @ts-expect-error Toast show retains the payload Schema refinement.
      kind: 'Unknown',
    },
  },
)
ToastBlock.operations.requestShow(
  ToastBlock.init({ id: 'invalid-duration' }).model,
  {
    payload: { kind: 'Saved' },
    // @ts-expect-error Toast show accepts Effect Duration inputs only.
    duration: false,
  },
)
ToastBlock.test.drainEntry({
  // @ts-expect-error The helper requires a Binding of this completed Toast factory.
  binding: OtherToastBinding,
  entryId: 'toast-entry-0',
})
// @ts-expect-error A keyed fixture must select its occurrence.
ToastBlock.test.drainEntry({
  binding: KeyedToastBinding,
  entryId: 'toast-entry-0',
})
ToastBlock.test.drainEntry({
  binding: KeyedToastBinding,
  // @ts-expect-error The occurrence key retains the literal parent Schema type.
  key: 'Secondary',
  entryId: 'toast-entry-0',
})
ToastBlock.test.drainEntry({
  binding: ToastBinding,
  // @ts-expect-error An unkeyed fixture cannot receive an occurrence key.
  key: 'Primary',
  entryId: 'toast-entry-0',
})
// @ts-expect-error Toast test helpers are bound to each completed factory.
Toast.test.drainEntry({
  binding: OtherToastBinding,
  entryId: 'toast-entry-0',
})
// @ts-expect-error A keyed DragAndDrop fixture must select its occurrence.
DragAndDrop.test.settleFocus({
  binding: KeyedDragAndDropBinding,
  itemId: 'card-1',
})
DragAndDrop.test.resolveKeyboardMove({
  binding: KeyedDragAndDropBinding,
  // @ts-expect-error The occurrence key retains the literal parent Schema type.
  key: 'Secondary',
  itemId: 'card-1',
  targetContainerId: 'done',
  targetIndex: 0,
})
DragAndDrop.test.settleFocus({
  binding: DragAndDropBinding,
  // @ts-expect-error An unkeyed fixture cannot receive an occurrence key.
  key: 'Primary',
  itemId: 'card-1',
})
DragAndDrop.test.resolveKeyboardMove({
  // @ts-expect-error The helper requires a Binding of DragAndDropBlock.
  binding: ToastBinding,
  itemId: 'card-1',
  targetContainerId: 'done',
  targetIndex: 0,
})
DragAndDrop.test.settleFocus({
  // @ts-expect-error A root Block helper call cannot receive an occurrence key.
  key: 'Primary',
  itemId: 'card-1',
})
Slider.SliderBlock.operations.informRangeChanged(
  Slider.SliderBlock.init({ id: 'invalid-range', min: 0, max: 100, step: 1 })
    .model,
  // @ts-expect-error The Slider range requires both numeric bounds.
  { min: 10 },
)
RootSlider.operations.informRangeChanged(
  Slider.SliderBlock.init({
    id: 'invalid-root-range',
    min: 0,
    max: 100,
    step: 1,
  }).model,
  {
    // @ts-expect-error A custom-root Slider retains numeric range arguments.
    min: 'zero',
    max: 100,
  },
)
Tooltip.TooltipBlock.operations.informShowDelayChanged(
  Tooltip.TooltipBlock.init({ id: 'invalid-delay' }).model,
  // @ts-expect-error Tooltip delay accepts Effect Duration inputs only.
  false,
)

const Missing = ApplicationDefinition.makeComposition()
Missing.makeView((model, h) => {
  // @ts-expect-error The helper requires both registered child Bindings.
  helper(model, h)

  h.OnMount(
    // @ts-expect-error The direct Popover Mount is unavailable.
    Popover.PopoverBlock.mounts.AnchorPopover({
      buttonId: 'missing',
      anchor: { placement: 'bottom' },
    }),
  )

  return h.div([])
})

// @ts-expect-error A keyboard pickup includes its starting position.
DragAndDrop.DragAndDropBlock.OutMessage.StartedKeyboardDrag({
  itemId: 'card-1',
  containerId: 'todo',
})
DragAndDrop.DragAndDropBlock.OutMessage.ChangedKeyboardTarget({
  itemId: 'card-1',
  fromContainerId: 'todo',
  fromIndex: 0,
  toContainerId: 'done',
  // @ts-expect-error A keyboard target uses a numeric index.
  toIndex: 'first',
})
