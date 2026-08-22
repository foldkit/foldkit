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
import { type Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import { type Attribute, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import * as Subscription from 'foldkit/subscription'

import { attributeSelector } from '../internal/selectors.js'

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

/** Union of all messages the drag-and-drop component can produce. */
export const Message = defineMessageUnion({
  PressedDraggable: {
    itemId: S.String,
    containerId: S.String,
    index: S.Number,
    screenX: S.Number,
    screenY: S.Number,
  },
  MovedPointer: {
    screenX: S.Number,
    screenY: S.Number,
    clientX: S.Number,
    clientY: S.Number,
    maybeDropTarget: S.Option(DropTarget),
  },
  ReleasedPointer: {},
  CancelledDrag: {},
  ActivatedKeyboardDrag: {
    itemId: S.String,
    containerId: S.String,
    index: S.Number,
  },
  CompletedResolveKeyboardMove: {
    targetContainerId: S.String,
    targetIndex: S.Number,
  },
  ConfirmedKeyboardDrop: {},
  PressedArrowKey: {
    direction: S.Literals([
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
    itemId: S.String,
    fromContainerId: S.String,
    fromIndex: S.Number,
    toContainerId: S.String,
    toIndex: S.Number,
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

/** Creates an initial drag-and-drop model. Starts in the Idle state with Vertical orientation and 5px activation threshold by default. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  orientation: config.orientation ?? 'Vertical',
  activationThreshold:
    config.activationThreshold ?? DEFAULT_ACTIVATION_THRESHOLD_PIXELS,
  dragState: Idle(),
})

// COMMAND

type Direction = (typeof Message.PressedArrowKey.Type)['direction']

/** Focuses a draggable item by ID after a keyboard move, drop, or cancel. */
export const FocusItem = Command.define('FocusItem', {
  args: { itemId: S.String },
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
    M.value(config.direction).pipe(
      M.withReturnType<typeof Message.CompletedResolveKeyboardMove.Type>(),
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

/** Resolves the next keyboard drag position by querying the DOM for adjacent sortable items and containers. */
export const ResolveKeyboardMove = Command.define('ResolveKeyboardMove', {
  args: {
    itemId: S.String,
    currentContainerId: S.String,
    currentIndex: S.Number,
    direction: S.Literals([
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
const withUpdateReturn = M.withReturnType<UpdateReturn>()

/** Processes a drag-and-drop message and returns the next model, commands, and an optional out-message for the parent. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    PressedDraggable: ({ itemId, containerId, index, screenX, screenY }) => ({
      model: evo(model, {
        dragState: () =>
          Pending({
            itemId,
            containerId,
            index,
            origin: { screenX, screenY },
          }),
      }),
    }),

    MovedPointer: ({ screenX, screenY, clientX, clientY, maybeDropTarget }) =>
      M.value(model.dragState).pipe(
        withUpdateReturn,
        M.tag('Pending', pending => {
          const deltaX = screenX - pending.origin.screenX
          const deltaY = screenY - pending.origin.screenY
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

          if (distance < model.activationThreshold) {
            return { model }
          }

          return {
            model: evo(model, {
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
          }
        }),
        M.tag('Dragging', dragging => ({
          model: evo(model, {
            dragState: () =>
              Dragging({
                ...dragging,
                current: { clientX, clientY },
                maybeDropTarget,
              }),
          }),
        })),
        M.orElse(() => ({ model })),
      ),

    ReleasedPointer: () =>
      M.value(model.dragState).pipe(
        withUpdateReturn,
        M.tag('Pending', () => ({
          model: evo(model, { dragState: () => Idle() }),
        })),
        M.tag('Dragging', dragging =>
          Option.match(dragging.maybeDropTarget, {
            onNone: () => ({
              model: evo(model, { dragState: () => Idle() }),
              outMessage: OutMessage.Cancelled(),
            }),
            onSome: dropTarget => ({
              model: evo(model, { dragState: () => Idle() }),
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
        M.orElse(() => ({ model })),
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

      const commands = Option.toArray(maybeFocusCommand)
      const updateResult: UpdateReturn = Array.isArrayNonEmpty(commands)
        ? {
            model: evo(model, { dragState: () => Idle() }),
            commands,
          }
        : { model: evo(model, { dragState: () => Idle() }) }
      return Option.match(maybeOutMessage, {
        onNone: () => updateResult,
        onSome: outMessage => ({ ...updateResult, outMessage }),
      })
    },

    ActivatedKeyboardDrag: ({ itemId, containerId, index }) => ({
      model: evo(model, {
        dragState: () =>
          KeyboardDragging({
            itemId,
            sourceContainerId: containerId,
            sourceIndex: index,
            targetContainerId: containerId,
            targetIndex: index,
          }),
      }),
    }),

    CompletedResolveKeyboardMove: ({ targetContainerId, targetIndex }) =>
      M.value(model.dragState).pipe(
        withUpdateReturn,
        M.tag('KeyboardDragging', keyboardDragging => ({
          model: evo(model, {
            dragState: () =>
              KeyboardDragging({
                ...keyboardDragging,
                targetContainerId,
                targetIndex,
              }),
          }),
          commands: [FocusItem({ itemId: keyboardDragging.itemId })],
        })),
        M.orElse(() => ({ model })),
      ),

    ConfirmedKeyboardDrop: () =>
      M.value(model.dragState).pipe(
        withUpdateReturn,
        M.tag('KeyboardDragging', keyboardDragging => ({
          model: evo(model, { dragState: () => Idle() }),
          commands: [FocusItem({ itemId: keyboardDragging.itemId })],
          outMessage: OutMessage.Reordered({
            itemId: keyboardDragging.itemId,
            fromContainerId: keyboardDragging.sourceContainerId,
            fromIndex: keyboardDragging.sourceIndex,
            toContainerId: keyboardDragging.targetContainerId,
            toIndex: keyboardDragging.targetIndex,
          }),
        })),
        M.orElse(() => ({ model })),
      ),

    PressedArrowKey: ({ direction }) =>
      M.value(model.dragState).pipe(
        withUpdateReturn,
        M.tag('KeyboardDragging', keyboardDragging => ({
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
        M.orElse(() => ({ model })),
      ),

    AdvancedAutoScrollFrame: () => ({ model }),

    CompletedFocusItem: () => ({ model }),
  })

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
            Stream.mapEffect(
              (event): Effect.Effect<Option.Option<Message>> =>
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
                  return Option.map(
                    arrowKeyToDirection(event.key),
                    direction => {
                      event.preventDefault()
                      return Message.PressedArrowKey({ direction })
                    },
                  )
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
      isDragging: S.Boolean,
      clientY: S.Number,
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
  M.value(key).pipe(
    M.withReturnType<Direction>(),
    M.when('ArrowUp', () => 'Up'),
    M.when('ArrowDown', () => 'Down'),
    M.when('ArrowLeft', () => 'Left'),
    M.when('ArrowRight', () => 'Right'),
    M.option,
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
