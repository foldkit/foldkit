import {
  Effect,
  Equal,
  Function,
  Match as M,
  Option,
  Schema as S,
  Stream,
  String as String_,
  pipe,
} from 'effect'
import type { Command } from 'foldkit/command'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  html,
} from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import { type Reflect, defineView } from 'foldkit/submodel'
import * as Subscription from 'foldkit/subscription'

// MODEL

const Idle = ts('Idle')
const Dragging = ts('Dragging', { originValue: S.Number })

const DragState = S.Union([Idle, Dragging])

/** Schema for the slider component's private interaction state. The current
 *  value is owned by the parent and passed in via `ViewInputs.value`, so it is
 *  not stored here. `min`/`max`/`step` are configuration the drag subscription
 *  reads to map pointer positions into values. `dragState` tracks the active
 *  drag phase and captures the pre-drag value so Escape can restore it. */
export const Model = S.Struct({
  id: S.String,
  min: S.Number,
  max: S.Number,
  step: S.Number,
  dragState: DragState,
})

export type Model = typeof Model.Type

// MESSAGE

/** The user pressed the thumb. Starts a drag without changing the value. The
 *  view supplies `originValue`, the current value, so Escape can restore it. */
export const PressedThumb = m('PressedThumb', { originValue: S.Number })
/** The user pressed the track. Starts a drag and snaps the value to the
 *  cursor position. Ignored while already dragging, which absorbs the bubble
 *  from a thumb press so the value is not shifted. `originValue` is the current
 *  value the drag restores to on Escape. */
export const PressedPointer = m('PressedPointer', {
  value: S.Number,
  originValue: S.Number,
})
/** The pointer moved during a drag, producing a new snapped value from the
 *  cursor position within the track. */
export const MovedDragPointer = m('MovedDragPointer', { value: S.Number })
/** The pointer was released during a drag. Commits the current value. */
export const ReleasedDragPointer = m('ReleasedDragPointer')
/** Escape was pressed during a drag. Restores the value from the drag origin. */
export const CancelledDrag = m('CancelledDrag')
/** The user pressed a keyboard navigation key on the focused thumb. The view
 *  supplies `value`, the current value, to compute the next one from. */
export const PressedKeyboardNavigation = m('PressedKeyboardNavigation', {
  direction: S.Literals([
    'StepDecrement',
    'StepIncrement',
    'PageDecrement',
    'PageIncrement',
    'Min',
    'Max',
  ]),
  value: S.Number,
})

/** Union of all messages the slider component can produce. */
export const Message: S.Union<
  [
    typeof PressedThumb,
    typeof PressedPointer,
    typeof MovedDragPointer,
    typeof ReleasedDragPointer,
    typeof CancelledDrag,
    typeof PressedKeyboardNavigation,
  ]
> = S.Union([
  PressedThumb,
  PressedPointer,
  MovedDragPointer,
  ReleasedDragPointer,
  CancelledDrag,
  PressedKeyboardNavigation,
])

export type Message = typeof Message.Type

export type PressedThumb = typeof PressedThumb.Type
export type PressedPointer = typeof PressedPointer.Type
export type MovedDragPointer = typeof MovedDragPointer.Type
export type ReleasedDragPointer = typeof ReleasedDragPointer.Type
export type CancelledDrag = typeof CancelledDrag.Type
export type PressedKeyboardNavigation = typeof PressedKeyboardNavigation.Type

// OUT MESSAGE

/** Emitted when the slider value changes. The parent can handle this to
 *  update its own state or dispatch its own Commands, for example to run
 *  validation or trigger a downstream Command. */
export const ChangedValue = m('ChangedValue', { value: S.Number })

/** Union of all out-messages the slider component can emit to its parent. */
export const OutMessage = S.Union([ChangedValue])
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a slider model with `init`. */
export type InitConfig = Readonly<{
  id: string
  min: number
  max: number
  step: number
}>

/** Creates an initial slider model from a config. The value lives in the
 *  parent Model; initialize it there and snap it with {@link snapAndClamp}. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  min: config.min,
  max: config.max,
  step: config.step,
  dragState: Idle(),
})

// HELPERS

const stepDecimals = (step: number): number => {
  const text = step.toString()
  return pipe(
    text,
    String_.indexOf('.'),
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
 *  so a parent can conform the value it owns to the slider's range, for example
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
  direction: (typeof PressedKeyboardNavigation.Type)['direction'],
): number =>
  M.value(direction).pipe(
    M.withReturnType<number>(),
    M.when('StepIncrement', () => snapAndClamp(value + step, min, max, step)),
    M.when('StepDecrement', () => snapAndClamp(value - step, min, max, step)),
    M.when('PageIncrement', () =>
      snapAndClamp(value + step * PAGE_STEP_MULTIPLIER, min, max, step),
    ),
    M.when('PageDecrement', () =>
      snapAndClamp(value - step * PAGE_STEP_MULTIPLIER, min, max, step),
    ),
    M.when('Min', () => min),
    M.when('Max', () => max),
    M.exhaustive,
  )

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const changedValueOption = (
  currentValue: number,
  nextValue: number,
): Option.Option<OutMessage> =>
  nextValue === currentValue
    ? Option.none()
    : Option.some(ChangedValue({ value: nextValue }))

/** Processes a slider message and returns the next model, commands, and an
 *  optional out-message for the parent. The value lives in the parent Model:
 *  the view supplies the current value on the messages that need it, and value
 *  changes surface as `ChangedValue` rather than mutating this Model. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      PressedThumb: ({ originValue }) =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Dragging', () => [model, [], Option.none()]),
          M.orElse(() => [
            evo(model, { dragState: () => Dragging({ originValue }) }),
            [],
            Option.none(),
          ]),
        ),

      // NOTE: the pointerdown event on the thumb bubbles to the track, so a
      // thumb press also dispatches PressedPointer. Short-circuit when already
      // Dragging so the bubbled track handler cannot shift the value away
      // from the thumb's current position. Fine-grained sliders (e.g. step
      // 0.05) see a visible jump without this guard, because the cursor sits
      // off-center on a non-zero-width thumb.
      PressedPointer: ({ value, originValue }) =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Dragging', () => [model, [], Option.none()]),
          M.orElse(() => {
            const snapped = snapAndClamp(
              value,
              model.min,
              model.max,
              model.step,
            )
            return [
              evo(model, { dragState: () => Dragging({ originValue }) }),
              [],
              changedValueOption(originValue, snapped),
            ]
          }),
        ),

      MovedDragPointer: ({ value }) =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Dragging', () => [
            model,
            [],
            Option.some(
              ChangedValue({
                value: snapAndClamp(value, model.min, model.max, model.step),
              }),
            ),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      ReleasedDragPointer: () =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Dragging', () => [
            evo(model, { dragState: () => Idle() }),
            [],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      CancelledDrag: () =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Dragging', ({ originValue }) => [
            evo(model, { dragState: () => Idle() }),
            [],
            Option.some(ChangedValue({ value: originValue })),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      PressedKeyboardNavigation: ({ direction, value }) => [
        model,
        [],
        changedValueOption(
          value,
          nextValueForDirection(
            value,
            model.min,
            model.max,
            model.step,
            direction,
          ),
        ),
      ],
    }),
  )

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
    evo(model, {
      min: () => range.min,
      max: () => range.max,
    }),
)

// SUBSCRIPTION

const DragActivity = S.Literals(['Idle', 'Active'])

const dragActivityFromModel = (model: Model): typeof DragActivity.Type =>
  M.value(model.dragState).pipe(
    M.withReturnType<typeof DragActivity.Type>(),
    M.tag('Dragging', () => 'Active'),
    M.orElse(() => 'Idle'),
  )

const trackElement = (
  id: string,
  root: Document | ShadowRoot,
): Option.Option<HTMLElement> =>
  Option.fromNullishOr(
    root.querySelector<HTMLElement>(`[data-slider-track-id="${id}"]`),
  )

const valueFromClientX = (
  clientX: number,
  trackElement_: HTMLElement,
  min: number,
  max: number,
): number => {
  const rect = trackElement_.getBoundingClientRect()
  if (rect.width === 0) {
    return min
  } else {
    const fraction = clamp((clientX - rect.left) / rect.width, 0, 1)
    return min + fraction * (max - min)
  }
}

/** Builds slider drag subscriptions, looking up the track
 *  element through the supplied root resolver. Use this when the slider is
 *  rendered inside a Shadow DOM. The root is read lazily so consumers can
 *  resolve it at subscription time. */
export const subscriptionsForRoot = (
  getTrackRoot: () => Document | ShadowRoot,
) =>
  Subscription.make<Model, Message>()(entry => ({
    dragPointer: entry(
      {
        dragActivity: DragActivity,
        id: S.String,
        min: S.Number,
        max: S.Number,
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
                  Option.map(trackElement(id, getTrackRoot()), element =>
                    MovedDragPointer({
                      value: valueFromClientX(event.clientX, element, min, max),
                    }),
                  ),
                ),
              ),
              Stream.filter(Option.isSome),
              Stream.map(option => option.value),
            ),
            Stream.fromEventListener<PointerEvent>(document, 'pointerup').pipe(
              Stream.map(() => ReleasedDragPointer()),
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
              Stream.map(() => CancelledDrag()),
            ),
            Effect.sync(() => dragActivity === 'Active'),
          ),
      },
    ),
  }))

/** Default drag subscriptions, with the track looked up via `document`. */
export const subscriptions = subscriptionsForRoot(() => document)

// VIEW

const LEFT_MOUSE_BUTTON = 0

const labelId = (id: string): string => `${id}-label`

const keyToDirection = (
  key: string,
): Option.Option<(typeof PressedKeyboardNavigation.Type)['direction']> =>
  M.value(key).pipe(
    M.withReturnType<(typeof PressedKeyboardNavigation.Type)['direction']>(),
    M.whenOr('ArrowRight', 'ArrowUp', () => 'StepIncrement'),
    M.whenOr('ArrowLeft', 'ArrowDown', () => 'StepDecrement'),
    M.when('PageUp', () => 'PageIncrement'),
    M.when('PageDown', () => 'PageDecrement'),
    M.when('Home', () => 'Min'),
    M.when('End', () => 'Max'),
    M.option,
  )

const percentString = (fraction: number): string =>
  `${Math.round(fraction * 10000) / 100}%`

/** Attribute groups the slider component provides to the consumer's `toView`
 *  callback. Each bundle carries the boundary's captured dispatch, so the
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

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  /** The current value, read straight from the parent Model. The thumb
   *  position, `aria-valuenow`, and the filled track all derive from it. */
  value: number
  toView: (attributes: SliderAttributes) => Html
  ariaLabel?: string
  ariaLabelledBy?: string
  formatValue?: (value: number) => string
  isDisabled?: boolean
  name?: string
  /** Resolves the root that holds the slider track when looking it up by its
   *  `data-slider-track-id` attribute. Defaults to `document`. Provide a
   *  ShadowRoot when rendering the slider inside a shadow tree so pointer
   *  events on the track can map clientX into a value. */
  getTrackRoot?: () => Document | ShadowRoot
}>

/** Renders an accessible slider by building ARIA attribute groups and
 *  delegating layout to the consumer's `toView` callback. Follows the
 *  WAI-ARIA slider pattern: role="slider" on the thumb, aria-valuemin /
 *  aria-valuemax / aria-valuenow, keyboard navigation by step / page / home /
 *  end. Pointer drag is handled by the component's drag subscriptions. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const {
      value,
      formatValue,
      isDisabled = false,
      name,
      getTrackRoot = () => document,
    } = viewInputs
    const { id, min, max } = model
    const isDragging = model.dragState._tag === 'Dragging'
    const fraction = fractionOfValue(value, min, max)

    const handleKeyDown = (key: string): Option.Option<Message> =>
      Option.map(keyToDirection(key), direction =>
        PressedKeyboardNavigation({ direction, value }),
      )

    const pointerAtClientX = (clientX: number): Option.Option<Message> =>
      Option.map(trackElement(id, getTrackRoot()), element =>
        PressedPointer({
          value: valueFromClientX(clientX, element, min, max),
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
    ): Option.Option<Message> =>
      pipe(
        button,
        Option.liftPredicate(Equal.equals(LEFT_MOUSE_BUTTON)),
        Option.flatMap(() => pointerAtClientX(clientX)),
      )

    const thumbPointerHandler = (
      _pointerType: string,
      button: number,
    ): Option.Option<Message> =>
      pipe(
        button,
        Option.liftPredicate(Equal.equals(LEFT_MOUSE_BUTTON)),
        Option.map(() => PressedThumb({ originValue: value })),
      )

    const stateAttributes = [
      ...(isDragging ? [h.DataAttribute('dragging', '')] : []),
      ...(isDisabled ? [h.DataAttribute('disabled', '')] : []),
    ]

    const rootAttributes = [
      h.DataAttribute('slider-id', id),
      h.DataAttribute('orientation', 'horizontal'),
      ...stateAttributes,
    ]

    const trackInteractionAttributes = isDisabled
      ? []
      : [h.OnPointerDown(trackPointerHandler)]

    const trackAttributes = [
      h.DataAttribute('slider-track-id', id),
      h.Style({ position: 'relative', 'touch-action': 'none' }),
      ...stateAttributes,
      ...trackInteractionAttributes,
    ]

    const filledTrackAttributes = [
      h.Style({
        position: 'absolute',
        left: '0',
        top: '0',
        bottom: '0',
        width: percentString(fraction),
        'pointer-events': 'none',
      }),
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

    const thumbInteractionAttributes = isDisabled
      ? []
      : [
          h.OnPointerDown(thumbPointerHandler),
          h.OnKeyDownPreventDefault(handleKeyDown),
        ]

    const thumbAttributes = [
      h.Id(`${id}-thumb`),
      h.Role('slider'),
      h.Tabindex(0),
      h.AriaOrientation('horizontal'),
      h.AriaValuemin(min),
      h.AriaValuemax(max),
      h.AriaValuenow(value),
      ...maybeAriaValuetext,
      ...thumbLabelAttributes,
      ...(isDisabled ? [h.AriaDisabled(true)] : []),
      h.Style({
        position: 'absolute',
        left: percentString(fraction),
        transform: 'translateX(-50%)',
        'touch-action': 'none',
      }),
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
