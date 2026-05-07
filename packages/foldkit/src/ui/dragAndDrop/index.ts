import {
  Array,
  Effect,
  Equal,
  Equivalence,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
  pipe,
} from 'effect'

import * as Command from '../../command/index.js'
import * as Dom from '../../dom/index.js'
import { type Attribute, html } from '../../html/index.js'
import { m } from '../../message/index.js'
import { makeSubscriptions } from '../../runtime/subscription.js'
import { ts } from '../../schema/index.js'
import { evo } from '../../struct/index.js'

// MODEL

const Orientation = S.Literals(['Horizontal', 'Vertical'])

const ScreenPoint = S.Struct({
  screenX: S.Number,
  screenY: S.Number,
})

const ClientPoint = S.Struct({
  clientX: S.Number,
  clientY: S.Number,
})

const DropTarget = S.Struct({
  containerId: S.String,
  index: S.Number,
})

const Idle = ts('Idle')

const Pending = ts('Pending', {
  itemId: S.String,
  containerId: S.String,
  index: S.Number,
  origin: ScreenPoint,
})

const Dragging = ts('Dragging', {
  itemId: S.String,
  sourceContainerId: S.String,
  sourceIndex: S.Number,
  origin: ScreenPoint,
  current: ClientPoint,
  maybeDropTarget: S.Option(DropTarget),
})

const KeyboardDragging = ts('KeyboardDragging', {
  itemId: S.String,
  sourceContainerId: S.String,
  sourceIndex: S.Number,
  targetContainerId: S.String,
  targetIndex: S.Number,
})

const DragState = S.Union([Idle, Pending, Dragging, KeyboardDragging])

/** Schema for the drag-and-drop component's state, tracking its unique ID, orientation, and current drag phase. */
export const Model = S.Struct({
  id: S.String,
  orientation: Orientation,
  activationThreshold: S.Number,
  dragState: DragState,
})

export type Model = typeof Model.Type

// MESSAGE

/** The user pressed a pointer on a draggable item. */
export const PressedDraggable = m('PressedDraggable', {
  itemId: S.String,
  containerId: S.String,
  index: S.Number,
  screenX: S.Number,
  screenY: S.Number,
})
/** The pointer moved during a drag, with collision detection results. */
export const MovedPointer = m('MovedPointer', {
  screenX: S.Number,
  screenY: S.Number,
  clientX: S.Number,
  clientY: S.Number,
  maybeDropTarget: S.Option(DropTarget),
})
/** The pointer was released. */
export const ReleasedPointer = m('ReleasedPointer')
/** Escape was pressed during a drag. */
export const CancelledDrag = m('CancelledDrag')
/** The user activated keyboard drag with Space or Enter on a focused draggable. */
export const ActivatedKeyboardDrag = m('ActivatedKeyboardDrag', {
  itemId: S.String,
  containerId: S.String,
  index: S.Number,
})
/** The ResolveKeyboardMove Command resolved the next keyboard drag position. */
export const ResolvedKeyboardMove = m('ResolvedKeyboardMove', {
  targetContainerId: S.String,
  targetIndex: S.Number,
})
/** The user confirmed a keyboard drop with Space or Enter. */
export const ConfirmedKeyboardDrop = m('ConfirmedKeyboardDrop')
/** The user pressed an arrow key during keyboard drag. */
export const PressedArrowKey = m('PressedArrowKey', {
  direction: S.Literals([
    'Up',
    'Down',
    'Left',
    'Right',
    'NextContainer',
    'PreviousContainer',
  ]),
})
/** An animation frame fired during auto-scroll. */
export const CompletedAutoScroll = m('CompletedAutoScroll')
/** The FocusItem Command completed. */
export const CompletedFocusItem = m('CompletedFocusItem')

/** Union of all messages the drag-and-drop component can produce. */
export const Message: S.Union<
  [
    typeof PressedDraggable,
    typeof MovedPointer,
    typeof ReleasedPointer,
    typeof CancelledDrag,
    typeof ActivatedKeyboardDrag,
    typeof ResolvedKeyboardMove,
    typeof ConfirmedKeyboardDrop,
    typeof PressedArrowKey,
    typeof CompletedAutoScroll,
    typeof CompletedFocusItem,
  ]
> = S.Union([
  PressedDraggable,
  MovedPointer,
  ReleasedPointer,
  CancelledDrag,
  ActivatedKeyboardDrag,
  ResolvedKeyboardMove,
  ConfirmedKeyboardDrop,
  PressedArrowKey,
  CompletedAutoScroll,
  CompletedFocusItem,
])

export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted when a drag completes with a valid drop target. The parent uses this to commit the reorder. */
export const Reordered = ts('Reordered', {
  itemId: S.String,
  fromContainerId: S.String,
  fromIndex: S.Number,
  toContainerId: S.String,
  toIndex: S.Number,
})
/** Emitted when a drag is cancelled via Escape or pointer release without a drop target. */
export const Cancelled = ts('Cancelled')

/** Union of all out-messages the drag-and-drop component can emit to its parent. */
export const OutMessage = S.Union([Reordered, Cancelled])
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a drag-and-drop model with `init`. */
const DEFAULT_ACTIVATION_THRESHOLD_PIXELS = 5

export type InitConfig = Readonly<{
  id: string
  orientation?: 'Horizontal' | 'Vertical'
  activationThreshold?: number
}>

/** Creates an initial drag-and-drop model. Starts in the Idle state with Vertical orientation and 5px activation threshold by default. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  orientation: config.orientation ?? 'Vertical',
  activationThreshold:
    config.activationThreshold ?? DEFAULT_ACTIVATION_THRESHOLD_PIXELS,
  dragState: Idle(),
})

// COMMAND

type Direction = (typeof PressedArrowKey.Type)['direction']

/** Resolves the next keyboard drag position by querying the DOM for adjacent sortable items and containers. */
export const ResolveKeyboardMove = Command.define(
  'ResolveKeyboardMove',
  ResolvedKeyboardMove,
)

/** Focuses a draggable item by ID after keyboard drop or cancel. */
export const FocusItem = Command.define('FocusItem', CompletedFocusItem)

const focusItem = (itemId: string) =>
  FocusItem(
    Dom.focus(`[data-draggable-id="${itemId}"]`).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusItem()),
    ),
  )

const resolveWithinContainer = (
  config: Readonly<{
    itemId: string
    containerId: string
    currentIndex: number
    isForward: boolean
  }>,
): typeof ResolvedKeyboardMove.Type => {
  const container = document.querySelector(
    `[data-droppable-id="${config.containerId}"]`,
  )
  if (!container) {
    return ResolvedKeyboardMove({
      targetContainerId: config.containerId,
      targetIndex: config.currentIndex,
    })
  }

  const itemCount = pipe(
    container.querySelectorAll<HTMLElement>('[data-sortable-id]'),
    Array.fromIterable,
    Array.filter(({ dataset }) => dataset['sortableId'] !== config.itemId),
    Array.length,
  )

  const nextIndex = config.isForward
    ? Math.min(config.currentIndex + 1, itemCount)
    : Math.max(config.currentIndex - 1, 0)

  return ResolvedKeyboardMove({
    targetContainerId: config.containerId,
    targetIndex: nextIndex,
  })
}

const resolveBetweenContainers = (
  config: Readonly<{
    currentContainerId: string
    isForward: boolean
  }>,
): typeof ResolvedKeyboardMove.Type => {
  const allContainers = Array.fromIterable(
    document.querySelectorAll<HTMLElement>('[data-droppable-id]'),
  )
  const currentContainerIndex = pipe(
    allContainers,
    Array.findFirstIndex(
      ({ dataset }) => dataset['droppableId'] === config.currentContainerId,
    ),
    Option.getOrElse(() => 0),
  )

  const nextContainerIndex = config.isForward
    ? Math.min(currentContainerIndex + 1, allContainers.length - 1)
    : Math.max(currentContainerIndex - 1, 0)

  const nextContainerId =
    allContainers[nextContainerIndex]?.dataset['droppableId'] ??
    config.currentContainerId

  return ResolvedKeyboardMove({
    targetContainerId: nextContainerId,
    targetIndex: 0,
  })
}

const resolveKeyboardMoveTarget = (
  config: Readonly<{
    itemId: string
    currentContainerId: string
    currentIndex: number
    direction: Direction
  }>,
): Effect.Effect<typeof ResolvedKeyboardMove.Type> =>
  Effect.sync(() =>
    M.value(config.direction).pipe(
      M.withReturnType<typeof ResolvedKeyboardMove.Type>(),
      M.whenOr('Down', 'Right', () =>
        resolveWithinContainer({
          itemId: config.itemId,
          containerId: config.currentContainerId,
          currentIndex: config.currentIndex,
          isForward: true,
        }),
      ),
      M.whenOr('Up', 'Left', () =>
        resolveWithinContainer({
          itemId: config.itemId,
          containerId: config.currentContainerId,
          currentIndex: config.currentIndex,
          isForward: false,
        }),
      ),
      M.when('NextContainer', () =>
        resolveBetweenContainers({
          currentContainerId: config.currentContainerId,
          isForward: true,
        }),
      ),
      M.when('PreviousContainer', () =>
        resolveBetweenContainers({
          currentContainerId: config.currentContainerId,
          isForward: false,
        }),
      ),
      M.exhaustive,
    ),
  )

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Processes a drag-and-drop message and returns the next model, commands, and an optional out-message for the parent. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      PressedDraggable: ({ itemId, containerId, index, screenX, screenY }) => [
        evo(model, {
          dragState: () =>
            Pending({
              itemId,
              containerId,
              index,
              origin: { screenX, screenY },
            }),
        }),
        [],
        Option.none(),
      ],

      MovedPointer: ({ screenX, screenY, clientX, clientY, maybeDropTarget }) =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Pending', pending => {
            const deltaX = screenX - pending.origin.screenX
            const deltaY = screenY - pending.origin.screenY
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

            if (distance < model.activationThreshold) {
              return [model, [], Option.none()]
            }

            return [
              evo(model, {
                dragState: () =>
                  Dragging({
                    itemId: pending.itemId,
                    sourceContainerId: pending.containerId,
                    sourceIndex: pending.index,
                    origin: pending.origin,
                    current: { clientX, clientY },
                    maybeDropTarget,
                  }),
              }),
              [],
              Option.none(),
            ]
          }),
          M.tag('Dragging', dragging => [
            evo(model, {
              dragState: () =>
                Dragging({
                  ...dragging,
                  current: { clientX, clientY },
                  maybeDropTarget,
                }),
            }),
            [],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      ReleasedPointer: () =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('Pending', () => [
            evo(model, { dragState: () => Idle() }),
            [],
            Option.none(),
          ]),
          M.tag('Dragging', dragging =>
            Option.match(dragging.maybeDropTarget, {
              onNone: () => [
                evo(model, { dragState: () => Idle() }),
                [],
                Option.some(Cancelled()),
              ],
              onSome: dropTarget => [
                evo(model, { dragState: () => Idle() }),
                [],
                Option.some(
                  Reordered({
                    itemId: dragging.itemId,
                    fromContainerId: dragging.sourceContainerId,
                    fromIndex: dragging.sourceIndex,
                    toContainerId: dropTarget.containerId,
                    toIndex: dropTarget.index,
                  }),
                ),
              ],
            }),
          ),
          M.orElse(() => [model, [], Option.none()]),
        ),

      CancelledDrag: () => {
        const maybeFocusCommand = Option.liftPredicate(
          model.dragState,
          dragState => dragState._tag === 'KeyboardDragging',
        ).pipe(Option.map(({ itemId }) => focusItem(itemId)))

        const maybeOutMessage = Option.liftPredicate(
          model.dragState._tag,
          _tag => _tag === 'Dragging' || _tag === 'KeyboardDragging',
        ).pipe(Option.map(() => Cancelled()))

        return [
          evo(model, { dragState: () => Idle() }),
          Option.toArray(maybeFocusCommand),
          maybeOutMessage,
        ]
      },

      ActivatedKeyboardDrag: ({ itemId, containerId, index }) => [
        evo(model, {
          dragState: () =>
            KeyboardDragging({
              itemId,
              sourceContainerId: containerId,
              sourceIndex: index,
              targetContainerId: containerId,
              targetIndex: index,
            }),
        }),
        [],
        Option.none(),
      ],

      ResolvedKeyboardMove: ({ targetContainerId, targetIndex }) =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('KeyboardDragging', keyboardDragging => [
            evo(model, {
              dragState: () =>
                KeyboardDragging({
                  ...keyboardDragging,
                  targetContainerId,
                  targetIndex,
                }),
            }),
            [],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      ConfirmedKeyboardDrop: () =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('KeyboardDragging', keyboardDragging => [
            evo(model, { dragState: () => Idle() }),
            [focusItem(keyboardDragging.itemId)],
            Option.some(
              Reordered({
                itemId: keyboardDragging.itemId,
                fromContainerId: keyboardDragging.sourceContainerId,
                fromIndex: keyboardDragging.sourceIndex,
                toContainerId: keyboardDragging.targetContainerId,
                toIndex: keyboardDragging.targetIndex,
              }),
            ),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      PressedArrowKey: ({ direction }) =>
        M.value(model.dragState).pipe(
          withUpdateReturn,
          M.tag('KeyboardDragging', keyboardDragging => [
            model,
            [
              ResolveKeyboardMove(
                resolveKeyboardMoveTarget({
                  itemId: keyboardDragging.itemId,
                  currentContainerId: keyboardDragging.targetContainerId,
                  currentIndex: keyboardDragging.targetIndex,
                  direction,
                }),
              ),
            ],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      CompletedAutoScroll: () => [model, [], Option.none()],

      CompletedFocusItem: () => [model, [], Option.none()],
    }),
  )

// SUBSCRIPTION

const DragActivity = S.Literals(['Idle', 'Active'])
const PointerDragActivity = S.Literals(['Idle', 'Active'])
const KeyboardDragActivity = S.Literals(['Idle', 'Active'])

const resolveDropTarget = (
  clientX: number,
  clientY: number,
  orientation: typeof Orientation.Type,
): Option.Option<typeof DropTarget.Type> => {
  const maybeContainer = pipe(
    document.elementsFromPoint(clientX, clientY),
    Array.fromIterable,
    Array.findFirst(element => element.hasAttribute('data-droppable-id')),
  )

  return Option.flatMap(maybeContainer, container => {
    const containerId = container.getAttribute('data-droppable-id')
    if (!containerId) {
      return Option.none()
    }

    const sortableItems = Array.fromIterable(
      container.querySelectorAll<HTMLElement>('[data-sortable-id]'),
    )

    const insertionIndex = pipe(
      sortableItems,
      Array.findFirstIndex(item => {
        const rect = item.getBoundingClientRect()
        return M.value(orientation).pipe(
          M.when('Vertical', () => clientY < rect.top + rect.height / 2),
          M.when('Horizontal', () => clientX < rect.left + rect.width / 2),
          M.exhaustive,
        )
      }),
      Option.getOrElse(() => sortableItems.length),
    )

    return Option.some({ containerId, index: insertionIndex })
  })
}

const DEFAULT_AUTO_SCROLL_EDGE_PIXELS = 40
const DEFAULT_AUTO_SCROLL_MAX_SPEED = 15

const autoScroll = (clientY: number): void => {
  const viewportHeight = window.innerHeight
  const distanceFromTop = clientY
  const distanceFromBottom = viewportHeight - clientY

  if (distanceFromTop < DEFAULT_AUTO_SCROLL_EDGE_PIXELS) {
    const speed =
      DEFAULT_AUTO_SCROLL_MAX_SPEED *
      (1 - distanceFromTop / DEFAULT_AUTO_SCROLL_EDGE_PIXELS)
    window.scrollBy(0, -speed)
  } else if (distanceFromBottom < DEFAULT_AUTO_SCROLL_EDGE_PIXELS) {
    const speed =
      DEFAULT_AUTO_SCROLL_MAX_SPEED *
      (1 - distanceFromBottom / DEFAULT_AUTO_SCROLL_EDGE_PIXELS)
    window.scrollBy(0, speed)
  }
}

const pointerDragActivityFromModel = (
  model: Model,
): typeof PointerDragActivity.Type =>
  M.value(model.dragState).pipe(
    M.withReturnType<typeof PointerDragActivity.Type>(),
    M.tag('Pending', 'Dragging', () => 'Active'),
    M.orElse(() => 'Idle'),
  )

const dragActivityFromModel = (model: Model): typeof DragActivity.Type =>
  M.value(model.dragState).pipe(
    M.withReturnType<typeof DragActivity.Type>(),
    M.tag('Idle', () => 'Idle'),
    M.orElse(() => 'Active'),
  )

const keyboardDragActivityFromModel = (
  model: Model,
): typeof KeyboardDragActivity.Type =>
  M.value(model.dragState).pipe(
    M.withReturnType<typeof KeyboardDragActivity.Type>(),
    M.tag('KeyboardDragging', () => 'Active'),
    M.orElse(() => 'Idle'),
  )

/** Schema describing the subscription dependencies for document-level drag tracking. */
export const SubscriptionDeps = S.Struct({
  documentPointer: S.Struct({
    dragActivity: PointerDragActivity,
    orientation: Orientation,
  }),
  documentEscape: S.Struct({ dragActivity: DragActivity }),
  documentKeyboard: S.Struct({ dragActivity: KeyboardDragActivity }),
  autoScroll: S.Struct({
    isDragging: S.Boolean,
    clientY: S.Number,
  }),
})

/** Document-level subscriptions for pointer and keyboard events during drag operations. */
export const subscriptions = makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  documentPointer: {
    modelToDependencies: model => ({
      dragActivity: pointerDragActivityFromModel(model),
      orientation: model.orientation,
    }),
    dependenciesToStream: ({ dragActivity, orientation }) => {
      const pointerEvents = Stream.merge(
        Stream.fromEventListener<PointerEvent>(document, 'pointermove').pipe(
          Stream.mapEffect(event =>
            Effect.sync(() =>
              MovedPointer({
                screenX: event.screenX,
                screenY: event.screenY,
                clientX: event.clientX,
                clientY: event.clientY,
                maybeDropTarget: resolveDropTarget(
                  event.clientX,
                  event.clientY,
                  orientation,
                ),
              }),
            ),
          ),
        ),
        Stream.fromEventListener<PointerEvent>(document, 'pointerup').pipe(
          Stream.map(() => ReleasedPointer()),
        ),
      )

      // NOTE: prevents text selection and locks cursor to grabbing during
      // pointer drag. Uses a <style> element for cursor because inline styles
      // on <html> don't override descendant elements' cursor values.
      const documentDragStyles = Stream.callback<never>(() =>
        Effect.acquireRelease(
          Effect.sync(() => {
            document.documentElement.style.setProperty('user-select', 'none')
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

  documentEscape: {
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

  documentKeyboard: {
    modelToDependencies: model => ({
      dragActivity: keyboardDragActivityFromModel(model),
    }),
    dependenciesToStream: ({ dragActivity }) =>
      Stream.when(
        Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
          Stream.mapEffect(
            (event): Effect.Effect<Option.Option<Message>> =>
              Effect.sync(() => {
                // NOTE: the draggable's OnKeyDownPreventDefault calls preventDefault on
                // the Space that activates keyboard drag — skip it here so the same
                // keypress doesn't also confirm the drop in the same tick.
                if (event.defaultPrevented) {
                  return Option.none()
                }
                if (event.key === 'Tab') {
                  event.preventDefault()
                  return Option.some(
                    PressedArrowKey({
                      direction: event.shiftKey
                        ? 'PreviousContainer'
                        : 'NextContainer',
                    }),
                  )
                }
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault()
                  return Option.some(ConfirmedKeyboardDrop())
                }
                return Option.map(arrowKeyToDirection(event.key), direction => {
                  event.preventDefault()
                  return PressedArrowKey({ direction })
                })
              }),
          ),
          Stream.filter(Option.isSome),
          Stream.map(option => option.value),
        ),
        Effect.sync(() => dragActivity === 'Active'),
      ),
  },

  autoScroll: {
    modelToDependencies: model => ({
      isDragging: model.dragState._tag === 'Dragging',
      clientY:
        model.dragState._tag === 'Dragging'
          ? model.dragState.current.clientY
          : 0,
    }),
    equivalence: Equivalence.Struct({ isDragging: Equivalence.Boolean }),
    dependenciesToStream: ({ isDragging }, readDependencies) =>
      Stream.when(
        Stream.callback<typeof CompletedAutoScroll.Type>(queue =>
          Effect.acquireRelease(
            Effect.sync(() => {
              const ref = { id: 0 }
              const step = () => {
                autoScroll(readDependencies().clientY)
                Queue.offerUnsafe(queue, CompletedAutoScroll())
                ref.id = requestAnimationFrame(step)
              }
              ref.id = requestAnimationFrame(step)
              return ref
            }),
            ref => Effect.sync(() => cancelAnimationFrame(ref.id)),
          ).pipe(Effect.flatMap(() => Effect.never)),
        ),
        Effect.sync(() => isDragging),
      ),
  },
})

// VIEW

const LEFT_MOUSE_BUTTON = 0

const arrowKeyToDirection = (key: string): Option.Option<Direction> =>
  M.value(key).pipe(
    M.withReturnType<Direction>(),
    M.when('ArrowUp', () => 'Up'),
    M.when('ArrowDown', () => 'Down'),
    M.when('ArrowLeft', () => 'Left'),
    M.when('ArrowRight', () => 'Right'),
    M.option,
  )

/** Messages the draggable view helper can dispatch. */
export type DraggableMessage =
  | typeof PressedDraggable.Type
  | typeof ActivatedKeyboardDrag.Type

/** Configuration for creating draggable attributes with `draggable`. */
export type DraggableConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (message: DraggableMessage) => ParentMessage
  itemId: string
  containerId: string
  index: number
}>

/** Returns attributes the parent attaches to a draggable element. Handles pointer-down, keyboard activation, and ARIA. */
export const draggable = <ParentMessage>(
  config: DraggableConfig<ParentMessage>,
): ReadonlyArray<Attribute<ParentMessage>> => {
  const {
    AriaRoleDescription,
    DataAttribute,
    OnKeyDownPreventDefault,
    OnPointerDown,
    Role,
    Style,
    Tabindex,
  } = html<ParentMessage>()

  const isKeyboardDragActivationKey = (key: string): boolean =>
    key === ' ' || key === 'Enter'

  const handleKeyDown = (key: string): Option.Option<ParentMessage> => {
    if (
      isKeyboardDragActivationKey(key) &&
      config.model.dragState._tag === 'Idle'
    ) {
      return Option.some(
        config.toParentMessage(
          ActivatedKeyboardDrag({
            itemId: config.itemId,
            containerId: config.containerId,
            index: config.index,
          }),
        ),
      )
    }

    return Option.none()
  }

  return [
    DataAttribute('draggable-id', config.itemId),
    DataAttribute('sortable-id', config.itemId),
    Role('option'),
    AriaRoleDescription('draggable'),
    Tabindex(0),
    OnPointerDown(
      (
        _pointerType: string,
        button: number,
        screenX: number,
        screenY: number,
      ) =>
        pipe(
          button,
          Option.liftPredicate(Equal.equals(LEFT_MOUSE_BUTTON)),
          Option.map(() =>
            config.toParentMessage(
              PressedDraggable({
                itemId: config.itemId,
                containerId: config.containerId,
                index: config.index,
                screenX,
                screenY,
              }),
            ),
          ),
        ),
    ),
    OnKeyDownPreventDefault(handleKeyDown),
    Style({
      'touch-action': 'none',
      'user-select': 'none',
      '-webkit-user-select': 'none',
    }),
  ]
}

/** Returns attributes the parent attaches to a droppable container element. */
export const droppable = <ParentMessage>(
  containerId: string,
  label?: string,
): ReadonlyArray<Attribute<ParentMessage>> => {
  const { AriaLabel, DataAttribute, Role } = html<ParentMessage>()
  return [
    DataAttribute('droppable-id', containerId),
    Role('listbox'),
    ...(label ? [AriaLabel(label)] : []),
  ]
}

/** Returns attributes the parent attaches to a sortable item element. Typically combined with `draggable`. */
export const sortable = <ParentMessage>(
  itemId: string,
): ReadonlyArray<Attribute<ParentMessage>> => {
  const { DataAttribute } = html<ParentMessage>()
  return [DataAttribute('sortable-id', itemId)]
}

const ghostTransform = (clientX: number, clientY: number): string =>
  `translate3d(${String(clientX)}px, ${String(clientY)}px, 0)`

/** Returns positioning styles for the ghost element, or None when not dragging with a pointer. */
export const ghostStyle = (
  model: Model,
): Option.Option<Record<string, string>> =>
  M.value(model.dragState).pipe(
    M.tag('Dragging', dragging => ({
      position: 'fixed',
      top: '0',
      left: '0',
      transform: ghostTransform(
        dragging.current.clientX,
        dragging.current.clientY,
      ),
      'pointer-events': 'none',
      'z-index': '9999',
    })),
    M.option,
  )

/** Returns true when the component is actively dragging (pointer or keyboard). */
export const isDragging = ({ dragState: { _tag } }: Model): boolean =>
  _tag === 'Dragging' || _tag === 'KeyboardDragging'

/** Returns the ID of the item currently being dragged or pending, if any. */
export const maybeDraggedItemId = (model: Model): Option.Option<string> =>
  M.value(model.dragState).pipe(
    M.tag('Pending', pending => pending.itemId),
    M.tag('Dragging', dragging => dragging.itemId),
    M.tag('KeyboardDragging', keyboardDragging => keyboardDragging.itemId),
    M.option,
  )

/** Returns the current drop target, if any. Populated during pointer drag (from collision detection) and keyboard drag (from resolved position). */
export const maybeDropTarget = (
  model: Model,
): Option.Option<typeof DropTarget.Type> =>
  M.value(model.dragState).pipe(
    M.tag('Dragging', dragging => dragging.maybeDropTarget),
    M.tag('KeyboardDragging', keyboardDragging =>
      Option.some({
        containerId: keyboardDragging.targetContainerId,
        index: keyboardDragging.targetIndex,
      }),
    ),
    M.orElse(() => Option.none()),
  )
