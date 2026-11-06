import { Duration, Layer } from 'effect'
import type * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'

import * as Animation from '@foldkit/ui/animation'
import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as Slider from '@foldkit/ui/slider'
import * as Tooltip from '@foldkit/ui/tooltip'

import {
  DialogBinding,
  DragAndDropBinding,
  KeyedDragAndDropBinding,
  KeyedToastBinding,
  Picker,
  PickerBinding,
  RootSlider,
  type RootSliderExecutable,
  type SliderExecutable,
  ToastBlock,
  WithOutMessageOnlyLayer,
  WithViewAndOutMessageLayer,
  WithViewOnlyLayer,
  WithoutViewOrOutMessageLayer,
  createComposition,
  dismissAllToasts,
  showAnimation,
  showAnimationCurried,
} from './generic-composition.accepted.js'

export const exerciseReceivedInputs = (
  animation: Block.ExecutableOf<typeof Animation.AnimationBlock>,
  toast: Block.ExecutableOf<typeof ToastBlock>,
) => {
  const animationInit = animation.init({ id: 'relocated-animation' })
  const toastInit = toast.init({ id: 'relocated-toast' })
  const shown = showAnimation(animation, animationInit.model)
  const shownByStep = showAnimationCurried(animation)(animationInit.model)
  const dismissed = dismissAllToasts(toast, toastInit.model)

  // @ts-expect-error A relocated consumer cannot construct retired local requests.
  Animation.AnimationBlock.Message.RequestedShow()

  return { shown, shownByStep, dismissed }
}

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type RelocatedAssertions = [
  Expect<Equal<Parameters<typeof KeyedDragAndDropBinding.fold>[1], 'Primary'>>,
  Expect<Equal<Parameters<typeof KeyedToastBinding.fold>[1], 'Primary'>>,
  Expect<Equal<Parameters<typeof DialogBinding.requestOpen>, []>>,
  Expect<
    Equal<
      Parameters<typeof PickerBinding.requestSelectItem>,
      [item: 'Apple' | 'Pear', displayText: string]
    >
  >,
  Expect<
    Equal<
      Block.ViewBuilderFor<ReturnType<typeof createComposition>> extends never
        ? true
        : false,
      false
    >
  >,
  Expect<
    Equal<
      Exclude<
        ReturnType<
          SliderExecutable['operations']['informOfRangeChange']
        >['outMessage'],
        undefined
      >,
      never
    >
  >,
  Expect<
    Equal<
      Exclude<
        ReturnType<
          RootSliderExecutable['operations']['informOfRangeChange']
        >['outMessage'],
        undefined
      >,
      never
    >
  >,
]

DialogBinding.requestOpen()

DragAndDrop.test.settleFocus({
  binding: DragAndDropBinding,
  itemId: 'card-1',
})
DragAndDrop.test.resolveKeyboardMove({
  binding: KeyedDragAndDropBinding,
  key: 'Primary',
  itemId: 'card-1',
  targetContainerId: 'done',
  targetIndex: 0,
})
DragAndDrop.test.resolveKeyboardMove({
  binding: KeyedDragAndDropBinding,
  // @ts-expect-error The relocated keyed helper retains its literal key.
  key: 'Secondary',
  itemId: 'card-1',
  targetContainerId: 'done',
  targetIndex: 0,
})

// @ts-expect-error The relocated Dialog operation takes no arguments.
DialogBinding.requestOpen('unexpected')

PickerBinding.requestSelectItem('Apple', 'Apple')

export const relocatedOperations = Story.withBlock(Slider.SliderBlock, slider =>
  Story.withBlock(RootSlider, rootSlider =>
    Story.withBlock(Tooltip.TooltipBlock, tooltip =>
      Story.withBlock(ToastBlock, toast => {
        slider.operations.informOfRangeChange(
          slider.init({ id: 'relocated-range', min: 0, max: 100, step: 1 })
            .model,
          { min: 10, max: 90 },
        )
        rootSlider.operations.informOfRangeChange(
          slider.init({
            id: 'relocated-root-range',
            min: 0,
            max: 100,
            step: 1,
          }).model,
          { min: 20, max: 80 },
        )
        tooltip.operations.informOfShowDelayChanged(
          tooltip.init({ id: 'relocated-tooltip' }).model,
          Duration.millis(250),
        )
        toast.operations.requestShow(
          toast.init({ id: 'relocated-toast' }).model,
          {
            payload: { kind: 'Saved' },
            duration: '1 second',
          },
        )
      }),
    ),
  ),
)

// @ts-expect-error The emitted generic operation rejects an unrelated item.
PickerBinding.requestSelectItem('Banana', 'Banana')

Picker.Message.SelectedItem({
  // @ts-expect-error The emitted Message constructor keeps the refined payload.
  item: 'Banana',
  displayText: 'Banana',
  wasSelected: false,
})

WithViewAndOutMessageLayer.pipe(Layer.provide(Layer.empty))
WithOutMessageOnlyLayer.pipe(Layer.provide(Layer.empty))
WithViewOnlyLayer.pipe(Layer.provide(Layer.empty))
WithoutViewOrOutMessageLayer.pipe(Layer.provide(Layer.empty))

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
