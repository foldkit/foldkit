import {
  Effect,
  Equal,
  Function,
  Match,
  Option,
  Schema,
  Stream,
  String,
  pipe,
} from 'effect'
import { type Update } from 'foldkit'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import { type Reflect, defineView } from 'foldkit/submodel'
import * as Subscription from 'foldkit/subscription'

import { attributeSelector, idSelector } from '../internal/selectors.js'

// MODEL

const DragState = defineTaggedUnion({
  Idle: {},
  Dragging: { originValue: Schema.Number },
})

/** Schema for the Slider's private interaction state. The current
 *  value is owned by the parent and passed in via `ViewInputs.value`, so it is
 *  not stored here. `min`, `max`, and `step` configure how the drag Subscription
 *  maps pointer positions into values. `dragState` tracks the active drag phase
 *  and captures the pre-drag value so Escape can restore it. */
export const Model = Schema.Struct({
  id: Schema.String,
  min: Schema.Number,
  max: Schema.Number,
  step: Schema.Number,
  dragState: DragState,
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all Messages the Slider can produce. */
export const Message = defineMessageUnion({
  PressedThumb: { originValue: Schema.Number },
  PressedPointer: {
    value: Schema.Number,
    originValue: Schema.Number,
  },
  MovedDragPointer: { value: Schema.Number },
  ReleasedDragPointer: {},
  CancelledDrag: {},
  PressedKeyboardNavigation: {
    direction: Schema.Literals([
      'StepDecrement',
      'StepIncrement',
      'PageDecrement',
      'PageIncrement',
      'Min',
      'Max',
    ]),
    value: Schema.Number,
  },
})

export type Message = typeof Message.Type

export type PressedThumb = typeof Message.PressedThumb.Type
export type PressedPointer = typeof Message.PressedPointer.Type
export type MovedDragPointer = typeof Message.MovedDragPointer.Type
export type ReleasedDragPointer = typeof Message.ReleasedDragPointer.Type
export type CancelledDrag = typeof Message.CancelledDrag.Type
export type PressedKeyboardNavigation =
  typeof Message.PressedKeyboardNavigation.Type

// OUT MESSAGE

/** Union of all OutMessages the Slider can emit to its parent. */
export const OutMessage = defineMessageUnion({
  ChangedValue: { value: Schema.Number },
})
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a Slider Model with `init`. */
export type InitConfig = Readonly<{
  id: string
  min: number
  max: number
  step: number
}>

/** Creates an initial Slider Model from a config. The value lives in the
 *  parent Model; initialize it there and snap it with {@link snapAndClamp}. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  min: config.min,
  max: config.max,
  step: config.step,
  dragState: DragState.Idle(),
})

// HELPERS

const stepDecimals = (step: number): number => {
  const text = step.toString()
  return pipe(
    text,
    String.indexOf('.'),
    Option.match({
      onNone: () => 0,
      onSome: dotIndex => text.length - dotIndex - 1,
    }),
  )
}

const roundToStepPrecision = (value: number, step: number): number => {
  const decimals = stepDecimals(step)
  return Number(value.toFixed(decimals))
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Snaps a value to the nearest step and clamps it into `[min, max]`. Exported
 *  so a parent can conform the value it owns to the Slider's range, for example
 *  when seeding the initial value or reacting to an external update. */
export const snapAndClamp = (
  value: number,
  min: number,
  max: number,
  step: number,
): number => {
  const snapped = min + Math.round((value - min) / step) * step
  return roundToStepPrecision(clamp(snapped, min, max), step)
}

/** Computes the fraction (0–1) of a value between min and max. Returns 0 when
 *  the range has zero width. */
export const fractionOfValue = (
  value: number,
  min: number,
  max: number,
): number => {
  const range = max - min
  if (range <= 0) {
    return 0
  } else {
    return clamp((value - min) / range, 0, 1)
  }
}

const PAGE_STEP_MULTIPLIER = 10

const nextValueForDirection = (
  value: number,
  min: number,
  max: number,
  step: number,
  direction: (typeof Message.PressedKeyboardNavigation.Type)['direction'],
): number =>
  Match.value(direction).pipe(
    Match.withReturnType<number>(),
    Match.when('StepIncrement', () =>
      snapAndClamp(value + step, min, max, step),
    ),
    Match.when('StepDecrement', () =>
      snapAndClamp(value - step, min, max, step),
    ),
    Match.when('PageIncrement', () =>
      snapAndClamp(value + step * PAGE_STEP_MULTIPLIER, min, max, step),
    ),
    Match.when('PageDecrement', () =>
      snapAndClamp(value - step * PAGE_STEP_MULTIPLIER, min, max, step),
    ),
    Match.when('Min', () => min),
    Match.when('Max', () => max),
    Match.exhaustive,
  )

// UPDATE

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

const withChangedValue = (
  model: Model,
  currentValue: number,
  nextValue: number,
): UpdateReturn => {
  if (nextValue === currentValue) {
    return { model }
  } else {
    return {
      model,
      outMessage: OutMessage.ChangedValue({ value: nextValue }),
    }
  }
}

/** Processes a Slider Message and returns the next Model, optional Commands,
 *  and an optional OutMessage for the parent. The value lives in the parent
 *  Model: the view supplies the current value on the Messages that need it,
 *  and value changes surface as `ChangedValue` rather than mutating this
 *  Model. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedThumb: ({ originValue }) =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Dragging', () => ({ model })),
        Match.orElse(() => ({
          model: modifyFields(model, {
            dragState: () => DragState.Dragging({ originValue }),
          }),
        })),
      ),

    // NOTE: the pointerdown event on the thumb bubbles to the track, so a
    // thumb press also dispatches PressedPointer. Short-circuit when already
    // Dragging so the bubbled track handler cannot shift the value away
    // from the thumb's current position. Fine-grained sliders (e.g. step
    // 0.05) see a visible jump without this guard, because the cursor sits
    // off-center on a non-zero-width thumb.
    PressedPointer: ({ value, originValue }) =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Dragging', () => ({ model })),
        Match.orElse(() => {
          const snapped = snapAndClamp(value, model.min, model.max, model.step)
          return withChangedValue(
            modifyFields(model, {
              dragState: () => DragState.Dragging({ originValue }),
            }),
            originValue,
            snapped,
          )
        }),
      ),

    MovedDragPointer: ({ value }) =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Dragging', () => ({
          model,
          outMessage: OutMessage.ChangedValue({
            value: snapAndClamp(value, model.min, model.max, model.step),
          }),
        })),
        Match.orElse(() => ({ model })),
      ),

    ReleasedDragPointer: () =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Dragging', () => ({
          model: modifyFields(model, { dragState: () => DragState.Idle() }),
        })),
        Match.orElse(() => ({ model })),
      ),

    CancelledDrag: () =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Dragging', ({ originValue }) => ({
          model: modifyFields(model, { dragState: () => DragState.Idle() }),
          outMessage: OutMessage.ChangedValue({ value: originValue }),
        })),
        Match.orElse(() => ({ model })),
      ),

    PressedKeyboardNavigation: ({ direction, value }) =>
      withChangedValue(
        model,
        value,
        nextValueForDirection(
          value,
          model.min,
          model.max,
          model.step,
          direction,
        ),
      ),
  })

/** Reflects an externally-driven range onto the slider. Use this when min/max
 *  derive from external state (e.g. a bounded buffer whose first/last index
 *  shifts over time). The parent owns the value, so conform it to the new range
 *  in the same update with {@link snapAndClamp}. */
export const reflectRange: Reflect<
  Model,
  Readonly<{ min: number; max: number }>
> = Function.dual(
  2,
  (model: Model, range: Readonly<{ min: number; max: number }>): Model =>
    modifyFields(model, {
      min: () => range.min,
      max: () => range.max,
    }),
)

// SUBSCRIPTION

const DragActivity = Schema.Literals(['Idle', 'Active'])

const dragActivityFromModel = (model: Model): typeof DragActivity.Type =>
  Match.value(model.dragState).pipe(
    Match.withReturnType<typeof DragActivity.Type>(),
    Match.tag('Dragging', () => 'Active'),
    Match.orElse(() => 'Idle'),
  )

const findTrackElement = (
  sliderId: string,
  trackRoot: Document | ShadowRoot,
): Option.Option<Element> =>
  Option.fromNullishOr(
    trackRoot.querySelector<Element>(
      attributeSelector('data-slider-track-id', sliderId),
    ),
  )

const isVerticalTrack = (track: Element): boolean =>
  track.getAttribute('data-orientation') === 'vertical' ||
  track.hasAttribute('data-vertical')

const isEdgeAlignedTrack = (track: Element): boolean =>
  track.getAttribute('data-thumb-alignment') === 'edge'

const findThumbElementForTrack = (track: Element): Option.Option<Element> =>
  pipe(
    track.getAttribute('data-slider-track-id'),
    Option.fromNullishOr,
    Option.flatMap(sliderId => {
      const thumbSelector = idSelector(`${sliderId}-thumb`)
      const maybeSliderRoot = Option.fromNullishOr(
        track.closest(attributeSelector('data-slider-id', sliderId)),
      )

      return Option.match(maybeSliderRoot, {
        onNone: () =>
          Option.fromNullishOr(
            track.ownerDocument.getElementById(`${sliderId}-thumb`),
          ),
        onSome: sliderRoot =>
          Option.fromNullishOr(
            sliderRoot.querySelector<Element>(thumbSelector),
          ),
      })
    }),
  )

const edgeInsetForTrack = (track: Element): number => {
  if (!isEdgeAlignedTrack(track)) {
    return 0
  }

  const maybeThumb = findThumbElementForTrack(track)
  if (Option.isNone(maybeThumb)) {
    return 0
  }

  const thumbRect = maybeThumb.value.getBoundingClientRect()
  const thumbSize = isVerticalTrack(track) ? thumbRect.height : thumbRect.width

  return thumbSize / 2
}

const fractionOfPointerPosition = (
  pointerPosition: number,
  trackSize: number,
  edgeInset: number,
): number => {
  const travelSize = trackSize - edgeInset * 2
  if (travelSize <= 0) {
    return clamp(pointerPosition / trackSize, 0, 1)
  } else {
    return clamp((pointerPosition - edgeInset) / travelSize, 0, 1)
  }
}

/** Maps a pointer position to a Slider value. Vertical tracks place `min` at
 *  the bottom and `max` at the top. Edge-aligned tracks measure the rendered
 *  thumb and map the pointer across the same inset range it travels through. */
export const valueFromPointer = (
  clientX: number,
  clientY: number,
  track: Element,
  min: number,
  max: number,
): number => {
  const trackRect = track.getBoundingClientRect()
  if (isVerticalTrack(track)) {
    if (trackRect.height === 0) {
      return min
    } else {
      const fraction = fractionOfPointerPosition(
        trackRect.bottom - clientY,
        trackRect.height,
        edgeInsetForTrack(track),
      )

      return min + fraction * (max - min)
    }
  }

  if (trackRect.width === 0) {
    return min
  } else {
    const fraction = fractionOfPointerPosition(
      clientX - trackRect.left,
      trackRect.width,
      edgeInsetForTrack(track),
    )

    return min + fraction * (max - min)
  }
}

/** Builds Slider drag Subscriptions that find the track through the supplied
 *  root resolver. Use this when the Slider is rendered inside a Shadow DOM.
 *  The resolver runs at subscription time. */
export const subscriptionsForRoot = (
  getTrackRoot: () => Document | ShadowRoot,
) =>
  Subscription.make<Model, Message>()(entry => ({
    dragPointer: entry(
      {
        dragActivity: DragActivity,
        id: Schema.String,
        min: Schema.Number,
        max: Schema.Number,
      },
      {
        modelToDependencies: model => ({
          dragActivity: dragActivityFromModel(model),
          id: model.id,
          min: model.min,
          max: model.max,
        }),
        dependenciesToStream: ({ dragActivity, id, min, max }) => {
          const pointerEvents = Stream.merge(
            Stream.fromEventListener<PointerEvent>(
              document,
              'pointermove',
            ).pipe(
              Stream.mapEffect(event =>
                Effect.sync(() =>
                  Option.map(findTrackElement(id, getTrackRoot()), track =>
                    Message.MovedDragPointer({
                      value: valueFromPointer(
                        event.clientX,
                        event.clientY,
                        track,
                        min,
                        max,
                      ),
                    }),
                  ),
                ),
              ),
              Stream.filter(Option.isSome),
              Stream.map(option => option.value),
            ),
            Stream.fromEventListener<PointerEvent>(document, 'pointerup').pipe(
              Stream.map(() => Message.ReleasedDragPointer()),
            ),
          )

          // NOTE: prevents text selection and locks cursor to grabbing while the
          // user drags the thumb. Matches the approach used in drag-and-drop.
          const documentDragStyles = Stream.callback<never>(() =>
            Effect.acquireRelease(
              Effect.sync(() => {
                document.documentElement.style.setProperty(
                  'user-select',
                  'none',
                )
                document.documentElement.style.setProperty(
                  '-webkit-user-select',
                  'none',
                )
                const cursorStyle = document.createElement('style')
                cursorStyle.textContent = '* { cursor: grabbing !important; }'
                document.head.appendChild(cursorStyle)
                return cursorStyle
              }),
              cursorStyle =>
                Effect.sync(() => {
                  document.documentElement.style.removeProperty('user-select')
                  document.documentElement.style.removeProperty(
                    '-webkit-user-select',
                  )
                  cursorStyle.remove()
                }),
            ).pipe(Effect.flatMap(() => Effect.never)),
          )

          return Stream.when(
            Stream.merge(pointerEvents, documentDragStyles),
            Effect.sync(() => dragActivity === 'Active'),
          )
        },
      },
    ),

    dragEscape: entry(
      { dragActivity: DragActivity },
      {
        modelToDependencies: model => ({
          dragActivity: dragActivityFromModel(model),
        }),
        dependenciesToStream: ({ dragActivity }) =>
          Stream.when(
            Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
              Stream.filter(({ key }) => key === 'Escape'),
              Stream.map(() => Message.CancelledDrag()),
            ),
            Effect.sync(() => dragActivity === 'Active'),
          ),
      },
    ),
  }))

/** Default drag Subscriptions, with the track looked up via `document`. */
export const subscriptions = subscriptionsForRoot(() => document)

// VIEW

const LEFT_MOUSE_BUTTON = 0

const labelId = (id: string): string => `${id}-label`

const keyToDirection = (
  key: string,
): Option.Option<
  (typeof Message.PressedKeyboardNavigation.Type)['direction']
> =>
  Match.value(key).pipe(
    Match.withReturnType<
      (typeof Message.PressedKeyboardNavigation.Type)['direction']
    >(),
    Match.whenOr('ArrowRight', 'ArrowUp', () => 'StepIncrement'),
    Match.whenOr('ArrowLeft', 'ArrowDown', () => 'StepDecrement'),
    Match.when('PageUp', () => 'PageIncrement'),
    Match.when('PageDown', () => 'PageDecrement'),
    Match.when('Home', () => 'Min'),
    Match.when('End', () => 'Max'),
    Match.option,
  )

const percentString = (fraction: number): string =>
  `${Math.round(fraction * 10000) / 100}%`

/** Attribute groups the Slider provides to the consumer's `toView`
 *  callback. Each group carries the boundary's captured dispatch, so the
 *  consumer can spread it directly into element attributes without manual
 *  Message wrapping. */
export type SliderAttributes = Readonly<{
  root: ReadonlyArray<ChildAttribute>
  track: ReadonlyArray<ChildAttribute>
  filledTrack: ReadonlyArray<ChildAttribute>
  thumb: ReadonlyArray<ChildAttribute>
  label: ReadonlyArray<ChildAttribute>
  hiddenInput: ReadonlyArray<ChildAttribute>
}>

/** Direction in which the Slider lays out its track and maps pointer input. */
export const Orientation = Schema.Literals(['Horizontal', 'Vertical'])
export type Orientation = typeof Orientation.Type

/** Whether the thumb's center or outer edge aligns with the track endpoints. */
export const ThumbAlignment = Schema.Literals(['Center', 'Edge'])
export type ThumbAlignment = typeof ThumbAlignment.Type

const filledTrackStyle = (
  orientation: Orientation,
  thumbAlignment: ThumbAlignment,
  thumbSize: string,
  fraction: number,
): Readonly<Record<string, string>> =>
  Match.value({ orientation, thumbAlignment }).pipe(
    Match.withReturnType<Readonly<Record<string, string>>>(),
    Match.when({ orientation: 'Vertical', thumbAlignment: 'Center' }, () => ({
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      height: percentString(fraction),
      width: '100%',
      'pointer-events': 'none',
    })),
    Match.when({ orientation: 'Vertical', thumbAlignment: 'Edge' }, () => ({
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      height: `calc((100% - ${thumbSize}) * ${fraction} + ${thumbSize} / 2)`,
      width: '100%',
      'pointer-events': 'none',
    })),
    Match.when({ orientation: 'Horizontal', thumbAlignment: 'Center' }, () => ({
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: percentString(fraction),
      'pointer-events': 'none',
    })),
    Match.when({ orientation: 'Horizontal', thumbAlignment: 'Edge' }, () => ({
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: `calc((100% - ${thumbSize}) * ${fraction} + ${thumbSize} / 2)`,
      'pointer-events': 'none',
    })),
    Match.exhaustive,
  )

const thumbStyle = (
  orientation: Orientation,
  thumbAlignment: ThumbAlignment,
  thumbSize: string,
  fraction: number,
): Readonly<Record<string, string>> =>
  Match.value({ orientation, thumbAlignment }).pipe(
    Match.withReturnType<Readonly<Record<string, string>>>(),
    Match.when({ orientation: 'Vertical', thumbAlignment: 'Center' }, () => ({
      position: 'absolute',
      bottom: percentString(fraction),
      left: '50%',
      transform: 'translateX(-50%) translateY(50%)',
      'touch-action': 'none',
    })),
    Match.when({ orientation: 'Vertical', thumbAlignment: 'Edge' }, () => ({
      position: 'absolute',
      bottom: `calc((100% - ${thumbSize}) * ${fraction})`,
      left: '50%',
      transform: 'translateX(-50%)',
      'touch-action': 'none',
    })),
    Match.when({ orientation: 'Horizontal', thumbAlignment: 'Center' }, () => ({
      position: 'absolute',
      left: percentString(fraction),
      transform: 'translateX(-50%)',
      'touch-action': 'none',
    })),
    Match.when({ orientation: 'Horizontal', thumbAlignment: 'Edge' }, () => ({
      position: 'absolute',
      left: `calc((100% - ${thumbSize}) * ${fraction})`,
      'touch-action': 'none',
    })),
    Match.exhaustive,
  )

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  /** The current value, read straight from the parent Model. The thumb
   *  position, `aria-valuenow`, and the filled track all derive from it. */
  value: number
  toView: (attributes: SliderAttributes) => Html
  /** Layout axis for the track, filled track, and thumb. Vertical Sliders
   *  place `min` at the bottom and `max` at the top. */
  orientation?: Orientation
  /** How the thumb aligns within the track. `Center` keeps the thumb's
   *  center on the value point and lets it overflow by half its size at the
   *  extremes, matching the Slider's previous behavior. `Edge` insets the
   *  thumb's travel by `thumbSize` so it stays fully inside the track.
   *  Defaults to `Center` so existing Sliders keep their geometry. */
  thumbAlignment?: ThumbAlignment
  /** CSS length of the thumb along the track axis, used only when
   *  `thumbAlignment` is `Edge` to inset the thumb's travel and align the
   *  fill with the thumb's center. Set this to the size your `toView`
   *  callback styles the thumb with. Defaults to `0.75rem`. */
  thumbSize?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  formatValue?: (value: number) => string
  /** Marks the Slider unavailable with `aria-disabled="true"` and
   *  `data-disabled`. The thumb remains focusable, following Foldkit's
   *  convention that unavailable controls stay discoverable by keyboard and
   *  assistive technology. */
  isDisabled?: boolean
  /** Prevents value changes while exposing read-only semantics with
   *  `aria-readonly="true"` and `data-readonly`. The thumb remains focusable.
   *  Independent of `isDisabled`: setting both emits both attribute sets, and
   *  either one removes the pointer and keyboard handlers.
   *
   *  A drag already in flight is not interrupted. The handlers this flag
   *  removes are what start a drag, and the pointermove Subscription runs off
   *  `dragState` in the Model until pointerup. `isDisabled` behaves the same
   *  way. */
  isReadOnly?: boolean
  name?: string
  /** Resolves the DOM root containing the Slider track. Defaults to `document`.
   *  Provide a ShadowRoot when rendering the Slider inside a shadow tree so pointer
   *  events on the track can map the pointer position into a value. */
  getTrackRoot?: () => Document | ShadowRoot
}>

/** Renders an accessible slider by building ARIA attribute groups and
 *  delegating layout to the consumer's `toView` callback. Follows the
 *  WAI-ARIA slider pattern: role="slider" on the thumb, aria-valuemin /
 *  aria-valuemax / aria-valuenow, keyboard navigation by step / page / home /
 *  end. Pointer drag is handled by the Slider's drag Subscriptions. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
    const {
      value,
      formatValue,
      isDisabled = false,
      isReadOnly = false,
      name,
      orientation = 'Horizontal',
      thumbAlignment = 'Center',
      thumbSize = '0.75rem',
      getTrackRoot = () => document,
    } = viewInputs
    const { id, min, max } = model
    const isDragging = model.dragState._tag === 'Dragging'
    const fraction = fractionOfValue(value, min, max)

    const handleKeyDown = (key: string): Option.Option<Message> =>
      Option.map(keyToDirection(key), direction =>
        Message.PressedKeyboardNavigation({ direction, value }),
      )

    const pressedPointerMessageAt = (
      clientX: number,
      clientY: number,
    ): Option.Option<Message> =>
      Option.map(findTrackElement(id, getTrackRoot()), track =>
        Message.PressedPointer({
          value: valueFromPointer(clientX, clientY, track, min, max),
          originValue: value,
        }),
      )

    const trackPointerHandler = (
      _pointerType: string,
      button: number,
      _screenX: number,
      _screenY: number,
      _timeStamp: number,
      clientX: number,
      clientY: number,
    ): Option.Option<Message> =>
      pipe(
        button,
        Option.liftPredicate(Equal.equals(LEFT_MOUSE_BUTTON)),
        Option.flatMap(() => pressedPointerMessageAt(clientX, clientY)),
      )

    const thumbPointerHandler = (
      _pointerType: string,
      button: number,
    ): Option.Option<Message> =>
      pipe(
        button,
        Option.liftPredicate(Equal.equals(LEFT_MOUSE_BUTTON)),
        Option.map(() => Message.PressedThumb({ originValue: value })),
      )

    const stateAttributes = [
      ...(isDragging ? [h.DataAttribute('dragging', '')] : []),
      ...(isDisabled ? [h.DataAttribute('disabled', '')] : []),
      ...(isReadOnly ? [h.DataAttribute('readonly', '')] : []),
    ]

    const orientationAttributeValue = String.toLowerCase(orientation)

    const rootAttributes = [
      h.DataAttribute('slider-id', id),
      h.DataAttribute('orientation', orientationAttributeValue),
      h.DataAttribute(orientationAttributeValue, ''),
      ...stateAttributes,
    ]

    const isInteractive = !isDisabled && !isReadOnly

    const trackInteractionAttributes = isInteractive
      ? [h.OnPointerDown(trackPointerHandler)]
      : []

    const trackAttributes = [
      h.DataAttribute('slider-track-id', id),
      h.DataAttribute('orientation', orientationAttributeValue),
      h.DataAttribute(orientationAttributeValue, ''),
      h.DataAttribute('thumb-alignment', String.toLowerCase(thumbAlignment)),
      h.Style({ position: 'relative', 'touch-action': 'none' }),
      ...stateAttributes,
      ...trackInteractionAttributes,
    ]

    const filledTrackAttributes = [
      h.Style(
        filledTrackStyle(orientation, thumbAlignment, thumbSize, fraction),
      ),
      ...stateAttributes,
    ]

    const resolveThumbLabel = () => {
      if (viewInputs.ariaLabel !== undefined) {
        return [h.AriaLabel(viewInputs.ariaLabel)]
      } else if (viewInputs.ariaLabelledBy !== undefined) {
        return [h.AriaLabelledBy(viewInputs.ariaLabelledBy)]
      } else {
        return [h.AriaLabelledBy(labelId(id))]
      }
    }

    const thumbLabelAttributes = resolveThumbLabel()
    const maybeAriaValuetext =
      formatValue !== undefined ? [h.AriaValuetext(formatValue(value))] : []

    const thumbInteractionAttributes = isInteractive
      ? [
          h.OnPointerDown(thumbPointerHandler),
          h.OnKeyDownPreventDefault(handleKeyDown),
        ]
      : []

    const thumbAttributes = [
      h.Id(`${id}-thumb`),
      h.Role('slider'),
      h.Tabindex(0),
      h.AriaOrientation(orientationAttributeValue),
      h.AriaValuemin(min),
      h.AriaValuemax(max),
      h.AriaValuenow(value),
      ...maybeAriaValuetext,
      ...thumbLabelAttributes,
      ...(isDisabled ? [h.AriaDisabled(true)] : []),
      ...(isReadOnly ? [h.AriaReadonly(true)] : []),
      h.Style(thumbStyle(orientation, thumbAlignment, thumbSize, fraction)),
      ...stateAttributes,
      ...thumbInteractionAttributes,
    ]

    const labelAttributes = [h.Id(labelId(id))]

    const hiddenInputAttributes =
      name !== undefined
        ? [h.Type('hidden'), h.Name(name), h.Value(value.toString())]
        : []

    return viewInputs.toView({
      root: childAttributes(rootAttributes),
      track: childAttributes(trackAttributes),
      filledTrack: childAttributes(filledTrackAttributes),
      thumb: childAttributes(thumbAttributes),
      label: childAttributes(labelAttributes),
      hiddenInput: childAttributes(hiddenInputAttributes),
    })
  },
)
