import { Effect } from 'effect'
import * as Story from 'foldkit/story'

import * as Animation from '@foldkit/ui/animation'
import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as Popover from '@foldkit/ui/popover'
import * as Slider from '@foldkit/ui/slider'
import * as Toast from '@foldkit/ui/toast'
import * as Tooltip from '@foldkit/ui/tooltip'

import {
  AnimationBinding,
  ApplicationBlock,
  DialogBinding,
  DragAndDropBinding,
  KeyedAnimationBinding,
  KeyedDragAndDropBinding,
  KeyedToastBinding,
  MenuFoldFixtureBlock,
  MenuPicker,
  OtherToastBinding,
  Picker,
  PickerBinding,
  RootSlider,
  ToastBinding,
  ToastBlock,
  helper,
} from './generic-composition.accepted.js'

MenuFoldFixtureBlock.makeOutMessageFold(MenuPicker, {
  Selected: ({ value }) => {
    // @ts-expect-error Parent-owned folds preserve the generic Menu payload.
    const _wrong: 'Banana' = value
    return MenuFoldFixtureBlock.makeNoopStep()
  },
  Closed: () => MenuFoldFixtureBlock.makeNoopStep(),
})

// @ts-expect-error Parent-owned folds require every generic Menu OutMessage variant.
MenuFoldFixtureBlock.makeOutMessageFold(MenuPicker, {
  Selected: () => MenuFoldFixtureBlock.makeNoopStep(),
})

// @ts-expect-error Animation content must be rendered through the caller-scoped slot.
const invalidAnimationViewInputs: Animation.ViewInputs = { content: null }
void invalidAnimationViewInputs

// @ts-expect-error Parent show requests are not local Animation Messages.
Animation.AnimationBlock.Message.RequestedShow()

// @ts-expect-error Toast dismiss-all is a separate InMessage.
ToastBlock.Message.RequestedDismissAll()

// @ts-expect-error Parent open requests are not local Combobox Messages.
Picker.Message.RequestedOpen()

const rejectAnimationInput = (
  animation: Story.TestBlock<typeof Animation.AnimationBlock>,
  model: typeof Animation.AnimationBlock.Model.Type,
) => {
  const settlement = Animation.AnimationBlock.Message.EndedAnimation({
    generation: 1,
  })

  // @ts-expect-error A local settlement Message cannot enter inMessageUpdate.
  animation.inMessageUpdate(model, settlement)
  // @ts-expect-error A parent input cannot enter the local update path.
  animation.update(model, Animation.InMessage.RequestedShow())
}
void rejectAnimationInput

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

export const invalidToastInputs = Story.withBlock(ToastBlock, toast => {
  toast.operations.requestShow(toast.init({ id: 'invalid-toast' }).model, {
    payload: {
      // @ts-expect-error Toast show retains the payload Schema refinement.
      kind: 'Unknown',
    },
  })
  toast.operations.requestShow(toast.init({ id: 'invalid-duration' }).model, {
    payload: { kind: 'Saved' },
    // @ts-expect-error Toast show accepts Effect Duration inputs only.
    duration: false,
  })
}).pipe(Effect.provide(Toast.layer))
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
export const invalidOperationInputs = Story.withBlock(
  Slider.SliderBlock,
  slider =>
    Story.withBlock(RootSlider, rootSlider =>
      Story.withBlock(Tooltip.TooltipBlock, tooltip => {
        // @ts-expect-error InformedOf input methods retain the Of preposition.
        slider.operations.informRangeChange
        // @ts-expect-error Input method names preserve the declared tag suffix exactly.
        slider.operations.informOfRangeChanged

        const sliderModel = slider.init({
          id: 'input-range',
          min: 0,
          max: 100,
          step: 1,
        }).model
        const rangeChange = Slider.InMessage.InformedOfRangeChange({
          min: 10,
          max: 90,
        })

        // @ts-expect-error Parent inputs do not enter the local dispatch protocol.
        slider.update(sliderModel, rangeChange)

        slider.operations.informOfRangeChange(
          slider.init({ id: 'invalid-range', min: 0, max: 100, step: 1 }).model,
          // @ts-expect-error The Slider range requires both numeric bounds.
          { min: 10 },
        )
        rootSlider.operations.informOfRangeChange(
          slider.init({
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
        tooltip.operations.informOfShowDelayChanged(
          tooltip.init({ id: 'invalid-delay' }).model,
          // @ts-expect-error Tooltip delay accepts Effect Duration inputs only.
          false,
        )
        // @ts-expect-error Notification operation names retain the Of preposition.
        tooltip.operations.informShowDelayChanged
      }),
    ),
)

const Missing = ApplicationBlock.makeComposition()
Missing.makeView((model, h) => {
  // @ts-expect-error The helper requires both registered child Bindings.
  helper(model, h)

  h.OnMount(
    // @ts-expect-error The direct Popover Mount is unavailable.
    Popover.test.AnchorPopover({
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
