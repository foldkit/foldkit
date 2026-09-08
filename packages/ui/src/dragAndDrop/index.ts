import {
  Array,
  Effect,
  Equal,
  Equivalence,
  Match,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import { type Attribute, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import * as Subscription from 'foldkit/subscription'
import * as Update from 'foldkit/update'

import { attributeSelector } from '../internal/selectors.js'

// MODEL

const Orientation = Schema.Literals(['Horizontal', 'Vertical'])

const ScreenPoint = Schema.Struct({
  screenX: Schema.Number,
  screenY: Schema.Number,
})

const ClientPoint = Schema.Struct({
  clientX: Schema.Number,
  clientY: Schema.Number,
})

const DropTarget = Schema.Struct({
  containerId: Schema.String,
  index: Schema.Number,
})

const DragState = defineTaggedUnion({
  Idle: {},
  Pending: {
    itemId: Schema.String,
    containerId: Schema.String,
    index: Schema.Number,
    origin: ScreenPoint,
  },
  Dragging: {
    itemId: Schema.String,
    sourceContainerId: Schema.String,
    sourceIndex: Schema.Number,
    origin: ScreenPoint,
    current: ClientPoint,
    maybeDropTarget: Schema.Option(DropTarget),
  },
  KeyboardDragging: {
    itemId: Schema.String,
    sourceContainerId: Schema.String,
    sourceIndex: Schema.Number,
    targetContainerId: Schema.String,
    targetIndex: Schema.Number,
  },
})

/** Schema for the drag-and-drop component's state, tracking its unique ID, orientation, and current drag phase. */
export const Model = Schema.Struct({
  id: Schema.String,
  orientation: Orientation,
  activationThreshold: Schema.Number,
  dragState: DragState,
})

export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the drag-and-drop component can produce. */
export const Message = defineMessageUnion({
  PressedDraggable: {
    itemId: Schema.String,
    containerId: Schema.String,
    index: Schema.Number,
    screenX: Schema.Number,
    screenY: Schema.Number,
  },
  MovedPointer: {
    screenX: Schema.Number,
    screenY: Schema.Number,
    clientX: Schema.Number,
    clientY: Schema.Number,
    maybeDropTarget: Schema.Option(DropTarget),
  },
  ReleasedPointer: {},
  CancelledDrag: {},
  ActivatedKeyboardDrag: {
    itemId: Schema.String,
    containerId: Schema.String,
    index: Schema.Number,
  },
  CompletedResolveKeyboardMove: {
    targetContainerId: Schema.String,
    targetIndex: Schema.Number,
  },
  ConfirmedKeyboardDrop: {},
  PressedArrowKey: {
    direction: Schema.Literals([
      'Up',
      'Down',
      'Left',
      'Right',
      'NextContainer',
      'PreviousContainer',
    ]),
  },
  AdvancedAutoScrollFrame: {},
  CompletedFocusItem: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

/** Union of all out-messages the drag-and-drop component can emit to its parent. */
export const OutMessage = defineMessageUnion({
  Reordered: {
    itemId: Schema.String,
    fromContainerId: Schema.String,
    fromIndex: Schema.Number,
    toContainerId: Schema.String,
    toIndex: Schema.Number,
  },
  Cancelled: {},
})
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a drag-and-drop model with `init`. */
const DEFAULT_ACTIVATION_THRESHOLD_PIXELS = 5

export type InitConfig = Readonly<{
  id: string
  orientation?: 'Horizontal' | 'Vertical'
  activationThreshold?: number
}>

/** Creates an initial drag-and-drop model. Starts idle with Vertical orientation and a 5px activation threshold by default. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  orientation: config.orientation ?? 'Vertical',
  activationThreshold:
    config.activationThreshold ?? DEFAULT_ACTIVATION_THRESHOLD_PIXELS,
  dragState: DragState.Idle(),
})

// COMMAND

type Direction = (typeof Message.PressedArrowKey.Type)['direction']

/** Focuses a draggable item by ID after a keyboard move, drop, or cancel. */
export const FocusItem = Command.define('FocusItem', {
  args: { itemId: Schema.String },
  messages: [Message.CompletedFocusItem],
  execute: ({ itemId }) =>
    Dom.focus(attributeSelector('data-draggable-id', itemId)).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusItem()),
    ),
})

const resolveWithinContainer = (
  config: Readonly<{
    itemId: string
    containerId: string
    currentIndex: number
    isForward: boolean
  }>,
): typeof Message.CompletedResolveKeyboardMove.Type => {
  const container = document.querySelector(
    attributeSelector('data-droppable-id', config.containerId),
  )
  if (!container) {
    return Message.CompletedResolveKeyboardMove({
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

  return Message.CompletedResolveKeyboardMove({
    targetContainerId: config.containerId,
    targetIndex: nextIndex,
  })
}

const resolveBetweenContainers = (
  config: Readonly<{
    currentContainerId: string
    isForward: boolean
  }>,
): typeof Message.CompletedResolveKeyboardMove.Type => {
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

  return Message.CompletedResolveKeyboardMove({
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
): Effect.Effect<typeof Message.CompletedResolveKeyboardMove.Type> =>
  Effect.sync(() =>
    Match.value(config.direction).pipe(
      Match.withReturnType<typeof Message.CompletedResolveKeyboardMove.Type>(),
      Match.whenOr('Down', 'Right', () =>
        resolveWithinContainer({
          itemId: config.itemId,
          containerId: config.currentContainerId,
          currentIndex: config.currentIndex,
          isForward: true,
        }),
      ),
      Match.whenOr('Up', 'Left', () =>
        resolveWithinContainer({
          itemId: config.itemId,
          containerId: config.currentContainerId,
          currentIndex: config.currentIndex,
          isForward: false,
        }),
      ),
      Match.when('NextContainer', () =>
        resolveBetweenContainers({
          currentContainerId: config.currentContainerId,
          isForward: true,
        }),
      ),
      Match.when('PreviousContainer', () =>
        resolveBetweenContainers({
          currentContainerId: config.currentContainerId,
          isForward: false,
        }),
      ),
      Match.exhaustive,
    ),
  )

/** Resolves the next keyboard drag position by querying the DOM for adjacent sortable items and containers. */
export const ResolveKeyboardMove = Command.define('ResolveKeyboardMove', {
  args: {
    itemId: Schema.String,
    currentContainerId: Schema.String,
    currentIndex: Schema.Number,
    direction: Schema.Literals([
      'Up',
      'Down',
      'Left',
      'Right',
      'NextContainer',
      'PreviousContainer',
    ]),
  },
  messages: [Message.CompletedResolveKeyboardMove],
  execute: resolveKeyboardMoveTarget,
})

// UPDATE

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

/** Processes a drag-and-drop Message and returns the next Model, optional
 *  Commands, and an optional OutMessage for the parent. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedDraggable: ({ itemId, containerId, index, screenX, screenY }) => ({
      model: evo(model, {
        dragState: () =>
          DragState.Pending({
            itemId,
            containerId,
            index,
            origin: { screenX, screenY },
          }),
      }),
    }),

    MovedPointer: ({ screenX, screenY, clientX, clientY, maybeDropTarget }) =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Pending', pending => {
          const deltaX = screenX - pending.origin.screenX
          const deltaY = screenY - pending.origin.screenY
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

          if (distance < model.activationThreshold) {
            return { model }
          }

          return {
            model: evo(model, {
              dragState: () =>
                DragState.Dragging({
                  itemId: pending.itemId,
                  sourceContainerId: pending.containerId,
                  sourceIndex: pending.index,
                  origin: pending.origin,
                  current: { clientX, clientY },
                  maybeDropTarget,
                }),
            }),
          }
        }),
        Match.tag('Dragging', dragging => ({
          model: evo(model, {
            dragState: () =>
              DragState.Dragging({
                ...dragging,
                current: { clientX, clientY },
                maybeDropTarget,
              }),
          }),
        })),
        Match.orElse(() => ({ model })),
      ),

    ReleasedPointer: () =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('Pending', () => ({
          model: evo(model, { dragState: () => DragState.Idle() }),
        })),
        Match.tag('Dragging', dragging =>
          Option.match(dragging.maybeDropTarget, {
            onNone: () => ({
              model: evo(model, { dragState: () => DragState.Idle() }),
              outMessage: OutMessage.Cancelled(),
            }),
            onSome: dropTarget => ({
              model: evo(model, { dragState: () => DragState.Idle() }),
              outMessage: OutMessage.Reordered({
                itemId: dragging.itemId,
                fromContainerId: dragging.sourceContainerId,
                fromIndex: dragging.sourceIndex,
                toContainerId: dropTarget.containerId,
                toIndex: dropTarget.index,
              }),
            }),
          }),
        ),
        Match.orElse(() => ({ model })),
      ),

    CancelledDrag: () => {
      const maybeFocusCommand = Option.liftPredicate(
        model.dragState,
        dragState => dragState._tag === 'KeyboardDragging',
      ).pipe(Option.map(({ itemId }) => FocusItem({ itemId })))

      const maybeOutMessage = Option.liftPredicate(
        model.dragState._tag,
        _tag => _tag === 'Dragging' || _tag === 'KeyboardDragging',
      ).pipe(Option.map(() => OutMessage.Cancelled()))

      const dragCancellation: Update.Return<Model, Message> = {
        model: evo(model, { dragState: () => DragState.Idle() }),
        commands: Option.toArray(maybeFocusCommand),
      }
      return pipe(
        dragCancellation,
        Update.withOutMessage(Option.getOrUndefined(maybeOutMessage)),
      )
    },

    ActivatedKeyboardDrag: ({ itemId, containerId, index }) => ({
      model: evo(model, {
        dragState: () =>
          DragState.KeyboardDragging({
            itemId,
            sourceContainerId: containerId,
            sourceIndex: index,
            targetContainerId: containerId,
            targetIndex: index,
          }),
      }),
    }),

    CompletedResolveKeyboardMove: ({ targetContainerId, targetIndex }) =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('KeyboardDragging', keyboardDragging => ({
          model: evo(model, {
            dragState: () =>
              DragState.KeyboardDragging({
                ...keyboardDragging,
                targetContainerId,
                targetIndex,
              }),
          }),
          commands: [FocusItem({ itemId: keyboardDragging.itemId })],
        })),
        Match.orElse(() => ({ model })),
      ),

    ConfirmedKeyboardDrop: () =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('KeyboardDragging', keyboardDragging => ({
          model: evo(model, { dragState: () => DragState.Idle() }),
          commands: [FocusItem({ itemId: keyboardDragging.itemId })],
          outMessage: OutMessage.Reordered({
            itemId: keyboardDragging.itemId,
            fromContainerId: keyboardDragging.sourceContainerId,
            fromIndex: keyboardDragging.sourceIndex,
            toContainerId: keyboardDragging.targetContainerId,
            toIndex: keyboardDragging.targetIndex,
          }),
        })),
        Match.orElse(() => ({ model })),
      ),

    PressedArrowKey: ({ direction }) =>
      Match.value(model.dragState).pipe(
        withUpdateReturn,
        Match.tag('KeyboardDragging', keyboardDragging => ({
          model,
          commands: [
            ResolveKeyboardMove({
              itemId: keyboardDragging.itemId,
              currentContainerId: keyboardDragging.targetContainerId,
              currentIndex: keyboardDragging.targetIndex,
              direction,
            }),
          ],
        })),
        Match.orElse(() => ({ model })),
      ),

    AdvancedAutoScrollFrame: () => ({ model }),

    CompletedFocusItem: () => ({ model }),
  })

// SUBSCRIPTION

const DragActivity = Schema.Literals(['Idle', 'Active'])
const PointerDragActivity = Schema.Literals(['Idle', 'Active'])
const KeyboardDragActivity = Schema.Literals(['Idle', 'Active'])

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
        return Match.value(orientation).pipe(
          Match.when('Vertical', () => clientY < rect.top + rect.height / 2),
          Match.when('Horizontal', () => clientX < rect.left + rect.width / 2),
          Match.exhaustive,
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
  Match.value(model.dragState).pipe(
    Match.withReturnType<typeof PointerDragActivity.Type>(),
    Match.tag('Pending', 'Dragging', () => 'Active'),
    Match.orElse(() => 'Idle'),
  )

const dragActivityFromModel = (model: Model): typeof DragActivity.Type =>
  Match.value(model.dragState).pipe(
    Match.withReturnType<typeof DragActivity.Type>(),
    Match.tag('Idle', () => 'Idle'),
    Match.orElse(() => 'Active'),
  )

const keyboardDragActivityFromModel = (
  model: Model,
): typeof KeyboardDragActivity.Type =>
  Match.value(model.dragState).pipe(
    Match.withReturnType<typeof KeyboardDragActivity.Type>(),
    Match.tag('KeyboardDragging', () => 'Active'),
    Match.orElse(() => 'Idle'),
  )

/** Document-level subscriptions for pointer and keyboard events during drag operations. */
export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  documentPointer: entry(
    {
      dragActivity: PointerDragActivity,
      orientation: Orientation,
    },
    {
      modelToDependencies: model => ({
        dragActivity: pointerDragActivityFromModel(model),
        orientation: model.orientation,
      }),
      dependenciesToStream: ({ dragActivity, orientation }) => {
        const pointerEvents = Stream.merge(
          Stream.fromEventListener<PointerEvent>(document, 'pointermove').pipe(
            Stream.mapEffect(event =>
              Effect.sync(() =>
                Message.MovedPointer({
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
            Stream.map(() => Message.ReleasedPointer()),
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
  ),

  documentEscape: entry(
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

  documentKeyboard: entry(
    { dragActivity: KeyboardDragActivity },
    {
      modelToDependencies: model => ({
        dragActivity: keyboardDragActivityFromModel(model),
      }),
      dependenciesToStream: ({ dragActivity }) =>
        Stream.when(
          Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
            Stream.mapEffect((event): Effect.Effect<Option.Option<Message>> =>
              Effect.sync(() => {
                // NOTE: the draggable's OnKeyDownPreventDefault calls preventDefault on
                // the Space that activates keyboard drag. Skip it here so the same
                // keypress doesn't also confirm the drop in the same tick.
                if (event.defaultPrevented) {
                  return Option.none()
                }
                if (event.key === 'Tab') {
                  event.preventDefault()
                  return Option.some(
                    Message.PressedArrowKey({
                      direction: event.shiftKey
                        ? 'PreviousContainer'
                        : 'NextContainer',
                    }),
                  )
                }
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault()
                  return Option.some(Message.ConfirmedKeyboardDrop())
                }
                return Option.map(arrowKeyToDirection(event.key), direction => {
                  event.preventDefault()
                  return Message.PressedArrowKey({ direction })
                })
              }),
            ),
            Stream.filter(Option.isSome),
            Stream.map(option => option.value),
          ),
          Effect.sync(() => dragActivity === 'Active'),
        ),
    },
  ),

  autoScroll: entry(
    {
      isDragging: Schema.Boolean,
      clientY: Schema.Number,
    },
    {
      modelToDependencies: model => ({
        isDragging: model.dragState._tag === 'Dragging',
        clientY:
          model.dragState._tag === 'Dragging'
            ? model.dragState.current.clientY
            : 0,
      }),
      keepAliveEquivalence: Equivalence.Struct({
        isDragging: Equivalence.Boolean,
      }),
      dependenciesToStream: ({ isDragging }, readDependencies) =>
        Stream.when(
          Stream.callback<typeof Message.AdvancedAutoScrollFrame.Type>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const ref = { id: 0 }
                const step = () => {
                  autoScroll(readDependencies().clientY)
                  Queue.offerUnsafe(queue, Message.AdvancedAutoScrollFrame())
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
  ),
}))

// VIEW

const LEFT_MOUSE_BUTTON = 0

const arrowKeyToDirection = (key: string): Option.Option<Direction> =>
  Match.value(key).pipe(
    Match.withReturnType<Direction>(),
    Match.when('ArrowUp', () => 'Up'),
    Match.when('ArrowDown', () => 'Down'),
    Match.when('ArrowLeft', () => 'Left'),
    Match.when('ArrowRight', () => 'Right'),
    Match.option,
  )

// NOTE: DragAndDrop has no `view` function and is not embedded via
// `h.submodel`. It's a behavior+helpers component: the consumer renders
// their own elements (cards, columns) and attaches the attribute bundles
// returned by `draggable`, `droppable`, and `sortable` below. Only
// `draggable` carries Messages, so only it is parameterized over the
// consumer's `ParentMessage`, and threading `toParentMessage` is the
// consumer's responsibility. `droppable` and `sortable` are data attributes
// with no handlers, so they return `Attribute<never>`, which flows into any
// Message universe.

/** Messages the draggable view helper can dispatch. */
export type DraggableMessage =
  | typeof Message.PressedDraggable.Type
  | typeof Message.ActivatedKeyboardDrag.Type

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
  h: HtmlBuilder<ParentMessage>,
): ReadonlyArray<Attribute<ParentMessage>> => {
  const isKeyboardDragActivationKey = (key: string): boolean =>
    key === ' ' || key === 'Enter'

  const handleKeyDown = (key: string): Option.Option<ParentMessage> => {
    if (
      isKeyboardDragActivationKey(key) &&
      config.model.dragState._tag === 'Idle'
    ) {
      return Option.some(
        config.toParentMessage(
          Message.ActivatedKeyboardDrag({
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
    h.DataAttribute('draggable-id', config.itemId),
    h.DataAttribute('sortable-id', config.itemId),
    h.Role('option'),
    h.AriaRoleDescription('draggable'),
    h.Tabindex(0),
    h.OnPointerDown(
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
              Message.PressedDraggable({
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
    h.OnKeyDownPreventDefault(handleKeyDown),
    h.Style({
      'touch-action': 'none',
      'user-select': 'none',
      '-webkit-user-select': 'none',
    }),
  ]
}

/** Returns attributes the parent attaches to a droppable container element.
 *  Handler-free, so the bundle is built with `inertHtml` and spreads into
 *  any Message universe's attribute array. */
export const droppable = (
  containerId: string,
  label?: string,
): ReadonlyArray<Attribute<never>> => [
  ih.DataAttribute('droppable-id', containerId),
  ih.Role('listbox'),
  ...(label ? [ih.AriaLabel(label)] : []),
]

/** Returns attributes the parent attaches to a sortable item element.
 *  Typically combined with `draggable`. Handler-free, so the bundle is built
 *  with `inertHtml` and spreads into any Message universe's attribute
 *  array. */
export const sortable = (itemId: string): ReadonlyArray<Attribute<never>> => [
  ih.DataAttribute('sortable-id', itemId),
]

const ghostTransform = (clientX: number, clientY: number): string =>
  `translate3d(${String(clientX)}px, ${String(clientY)}px, 0)`

/** Returns positioning styles for the ghost element, or None when not dragging with a pointer. */
export const ghostStyle = (
  model: Model,
): Option.Option<Record<string, string>> =>
  Match.value(model.dragState).pipe(
    Match.tag('Dragging', dragging => ({
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
    Match.option,
  )

/** Returns true when the component is actively dragging (pointer or keyboard). */
export const isDragging = ({ dragState: { _tag } }: Model): boolean =>
  _tag === 'Dragging' || _tag === 'KeyboardDragging'

/** Returns the ID of the item currently being dragged or pending, if any. */
export const maybeDraggedItemId = (model: Model): Option.Option<string> =>
  Match.value(model.dragState).pipe(
    Match.tag('Pending', pending => pending.itemId),
    Match.tag('Dragging', dragging => dragging.itemId),
    Match.tag('KeyboardDragging', keyboardDragging => keyboardDragging.itemId),
    Match.option,
  )

/** Returns the current drop target, if any. Populated during pointer drag (from collision detection) and keyboard drag (from resolved position). */
export const maybeDropTarget = (
  model: Model,
): Option.Option<typeof DropTarget.Type> =>
  Match.value(model.dragState).pipe(
    Match.tag('Dragging', dragging => dragging.maybeDropTarget),
    Match.tag('KeyboardDragging', keyboardDragging =>
      Option.some({
        containerId: keyboardDragging.targetContainerId,
        index: keyboardDragging.targetIndex,
      }),
    ),
    Match.orElse(() => Option.none()),
  )
