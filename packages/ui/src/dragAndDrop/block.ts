import {
  Array,
  Effect,
  Equal,
  Equivalence,
  Layer,
  Match,
  Option,
  Queue,
  Schema,
  Stream,
  pipe,
} from 'effect'
import * as Block from 'foldkit/block'
import * as Dom from 'foldkit/dom'
import {
  type Attribute,
  type ChildAttribute,
  type Html,
  type HtmlBuilder,
  childAttributes,
  inertHtml as ih,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { documentDragStyles } from '../internal/documentDragStyles.js'
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

/** Schema for the current pointer or keyboard drag phase. */
export const DragState = defineTaggedUnion({
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
/** Current pointer or keyboard drag phase. */
export type DragState = typeof DragState.Type

/** Schema for the drag-and-drop component's state, tracking its unique ID, orientation, and current drag phase. */
export const Model = Schema.Struct({
  id: Schema.String,
  orientation: Orientation,
  activationThreshold: Schema.Number,
  keyboardDragGeneration: Schema.Number,
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
    keyboardDragGeneration: Schema.Number,
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

/** Parent-facing drag facts. `StartedKeyboardDrag` announces keyboard pickup;
 *  `ChangedKeyboardTarget` carries the previous and next proposed positions and
 *  emits only for a changed target. The parent owns announcements and commits
 *  item data after `Reordered`; Binding writers only store the child Model. */
export const OutMessage = defineMessageUnion({
  StartedKeyboardDrag: {
    itemId: Schema.String,
    containerId: Schema.String,
    index: Schema.Number,
  },
  ChangedKeyboardTarget: {
    itemId: Schema.String,
    fromContainerId: Schema.String,
    fromIndex: Schema.Number,
    toContainerId: Schema.String,
    toIndex: Schema.Number,
  },
  Reordered: {
    itemId: Schema.String,
    fromContainerId: Schema.String,
    fromIndex: Schema.Number,
    toContainerId: Schema.String,
    toIndex: Schema.Number,
  },
  Cancelled: {},
})

const DragAndDropDefinition = Block.makeDefinition('DragAndDrop', {
  Model,
  Message,
  OutMessage,
})

const DragAndDropComposition = DragAndDropDefinition.makeComposition()

// INIT

/** Configuration for creating a drag-and-drop model with `init`. */
const DEFAULT_ACTIVATION_THRESHOLD_PIXELS = 5

export type InitConfig = Readonly<{
  id: string
  orientation?: 'Horizontal' | 'Vertical'
  activationThreshold?: number
}>

/** Creates the initial DragAndDrop Model and Commands. Starts idle with Vertical orientation and a 5px activation threshold by default. */
export const init = DragAndDropComposition.makeInit((config: InitConfig) => ({
  model: {
    id: config.id,
    orientation: config.orientation ?? 'Vertical',
    activationThreshold:
      config.activationThreshold ?? DEFAULT_ACTIVATION_THRESHOLD_PIXELS,
    keyboardDragGeneration: 0,
    dragState: DragState.Idle(),
  },
}))

// COMMAND

type Direction = (typeof Message.PressedArrowKey.Type)['direction']

/** Focuses a draggable item by ID after a keyboard move, drop, or cancel. */
export const FocusItem = DragAndDropDefinition.makeCommand('FocusItem', {
  args: { itemId: Schema.String },
  messages: [Message.CompletedFocusItem],
  handler: function* () {
    return ({ itemId }) =>
      Dom.focus(attributeSelector('data-draggable-id', itemId)).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusItem()),
      )
  },
})
const resolveWithinContainer = (
  config: Readonly<{
    itemId: string
    containerId: string
    currentIndex: number
    isForward: boolean
    keyboardDragGeneration: number
  }>,
): typeof Message.CompletedResolveKeyboardMove.Type => {
  const container = document.querySelector(
    attributeSelector('data-droppable-id', config.containerId),
  )
  if (!container) {
    return Message.CompletedResolveKeyboardMove({
      keyboardDragGeneration: config.keyboardDragGeneration,
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
    keyboardDragGeneration: config.keyboardDragGeneration,
    targetContainerId: config.containerId,
    targetIndex: nextIndex,
  })
}

const resolveBetweenContainers = (
  config: Readonly<{
    currentContainerId: string
    isForward: boolean
    keyboardDragGeneration: number
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
    keyboardDragGeneration: config.keyboardDragGeneration,
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
    keyboardDragGeneration: number
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
          keyboardDragGeneration: config.keyboardDragGeneration,
        }),
      ),
      Match.whenOr('Up', 'Left', () =>
        resolveWithinContainer({
          itemId: config.itemId,
          containerId: config.currentContainerId,
          currentIndex: config.currentIndex,
          isForward: false,
          keyboardDragGeneration: config.keyboardDragGeneration,
        }),
      ),
      Match.when('NextContainer', () =>
        resolveBetweenContainers({
          currentContainerId: config.currentContainerId,
          isForward: true,
          keyboardDragGeneration: config.keyboardDragGeneration,
        }),
      ),
      Match.when('PreviousContainer', () =>
        resolveBetweenContainers({
          currentContainerId: config.currentContainerId,
          isForward: false,
          keyboardDragGeneration: config.keyboardDragGeneration,
        }),
      ),
      Match.exhaustive,
    ),
  )

/** @internal Complete invocation arguments for ResolveKeyboardMove. */
export const ResolveKeyboardMoveArgs = Schema.Struct({
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
  keyboardDragGeneration: Schema.Number,
})

/** Resolves the next keyboard drag position by querying the DOM for adjacent sortable items and containers. */
export const ResolveKeyboardMove = DragAndDropDefinition.makeCommand(
  'ResolveKeyboardMove',
  {
    args: ResolveKeyboardMoveArgs.fields,
    messages: [Message.CompletedResolveKeyboardMove],
    handler: function* () {
      return resolveKeyboardMoveTarget
    },
  },
)
// UPDATE

/** Processes a drag-and-drop Message and returns the next Model, optional
 *  Commands, and an optional OutMessage for the parent. */
export const update = DragAndDropComposition.makeUpdate({
  PressedDraggable: DragAndDropDefinition.makeFieldsStep.fromMessage(
    ({ itemId, containerId, index, screenX, screenY }) => ({
      dragState: () =>
        DragState.Pending({
          itemId,
          containerId,
          index,
          origin: { screenX, screenY },
        }),
    }),
  ),
  MovedPointer: (
    model,
    { screenX, screenY, clientX, clientY, maybeDropTarget },
  ) =>
    Match.value(model.dragState).pipe(
      Match.tag('Pending', pending => {
        const deltaX = screenX - pending.origin.screenX
        const deltaY = screenY - pending.origin.screenY
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        if (distance < model.activationThreshold) {
          return { model }
        }
        return {
          model: modifyFields(model, {
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
        model: modifyFields(model, {
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
  ReleasedPointer: model =>
    Match.value(model.dragState).pipe(
      Match.tag('Pending', () => ({
        model: modifyFields(model, { dragState: () => DragState.Idle() }),
      })),
      Match.tag('Dragging', dragging =>
        Option.match(dragging.maybeDropTarget, {
          onNone: () => ({
            model: modifyFields(model, {
              dragState: () => DragState.Idle(),
            }),
            outMessage: OutMessage.Cancelled(),
          }),
          onSome: dropTarget => ({
            model: modifyFields(model, {
              dragState: () => DragState.Idle(),
            }),
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
  CancelledDrag: model => {
    const commands = pipe(
      [model.dragState],
      Array.filter(DragState.guards.KeyboardDragging),
      Array.map(({ itemId }) => FocusItem({ itemId })),
    )
    const maybeOutMessage = Option.liftPredicate(
      model.dragState._tag,
      _tag => _tag === 'Dragging' || _tag === 'KeyboardDragging',
    ).pipe(Option.map(() => OutMessage.Cancelled()))
    const dragCancellation = {
      model: modifyFields(model, { dragState: () => DragState.Idle() }),
      commands,
    }

    return pipe(
      dragCancellation,
      Update.withOutMessage(Option.getOrUndefined(maybeOutMessage)),
    )
  },
  ActivatedKeyboardDrag: (model, { itemId, containerId, index }) => ({
    model: modifyFields(model, {
      keyboardDragGeneration: generation => generation + 1,
      dragState: () =>
        DragState.KeyboardDragging({
          itemId,
          sourceContainerId: containerId,
          sourceIndex: index,
          targetContainerId: containerId,
          targetIndex: index,
        }),
    }),
    outMessage: OutMessage.StartedKeyboardDrag({
      itemId,
      containerId,
      index,
    }),
  }),
  CompletedResolveKeyboardMove: (
    model,
    { keyboardDragGeneration, targetContainerId, targetIndex },
  ) => {
    if (keyboardDragGeneration !== model.keyboardDragGeneration) {
      return { model }
    }

    return Match.value(model.dragState).pipe(
      Match.tag('KeyboardDragging', keyboardDragging => {
        const keyboardMove = {
          model: modifyFields(model, {
            dragState: () =>
              DragState.KeyboardDragging({
                ...keyboardDragging,
                targetContainerId,
                targetIndex,
              }),
          }),
          commands: [FocusItem({ itemId: keyboardDragging.itemId })],
        }
        if (
          keyboardDragging.targetContainerId === targetContainerId &&
          keyboardDragging.targetIndex === targetIndex
        ) {
          return keyboardMove
        }
        return Update.withOutMessage(
          keyboardMove,
          OutMessage.ChangedKeyboardTarget({
            itemId: keyboardDragging.itemId,
            fromContainerId: keyboardDragging.targetContainerId,
            fromIndex: keyboardDragging.targetIndex,
            toContainerId: targetContainerId,
            toIndex: targetIndex,
          }),
        )
      }),
      Match.orElse(() => ({ model })),
    )
  },
  ConfirmedKeyboardDrop: model =>
    Match.value(model.dragState).pipe(
      Match.tag('KeyboardDragging', keyboardDragging => ({
        model: modifyFields(model, { dragState: () => DragState.Idle() }),
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
  PressedArrowKey: (model, { direction }) =>
    Match.value(model.dragState).pipe(
      Match.tag('KeyboardDragging', keyboardDragging => ({
        model,
        commands: [
          ResolveKeyboardMove({
            itemId: keyboardDragging.itemId,
            currentContainerId: keyboardDragging.targetContainerId,
            currentIndex: keyboardDragging.targetIndex,
            direction,
            keyboardDragGeneration: model.keyboardDragGeneration,
          }),
        ],
      })),
      Match.orElse(() => ({ model })),
    ),
  AdvancedAutoScrollFrame: DragAndDropDefinition.makeNoopStep(),
  CompletedFocusItem: DragAndDropDefinition.makeNoopStep(),
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
const streamKeyboardDragEvents = () =>
  Dom.streamFromEventFilterMapPreventDefault({
    target: document,
    type: 'keydown',
    filterMapEvent: event => {
      // NOTE: the draggable's OnKeyDownPreventDefault calls preventDefault on
      // the Space that activates keyboard drag. Skip it here so the same
      // keypress doesn't also confirm the drop in the same tick.
      if (event.defaultPrevented) {
        return Option.none()
      }
      return Match.value(event.key).pipe(
        Match.withReturnType<Option.Option<Message>>(),
        Match.when('Tab', () =>
          Option.some(
            Message.PressedArrowKey({
              direction: event.shiftKey ? 'PreviousContainer' : 'NextContainer',
            }),
          ),
        ),
        Match.whenOr(' ', 'Enter', () =>
          Option.some(Message.ConfirmedKeyboardDrop()),
        ),
        Match.orElse(key =>
          Option.map(arrowKeyToDirection(key), direction =>
            Message.PressedArrowKey({ direction }),
          ),
        ),
      )
    },
  })

export const subscriptions = DragAndDropDefinition.makeSubscriptions(entry => ({
  documentPointer: entry(
    'DragAndDropDocumentPointer',
    {
      dragActivity: PointerDragActivity,
      orientation: Orientation,
    },
    {
      messages: [Message.MovedPointer, Message.ReleasedPointer],
      modelToDependencies: model => ({
        dragActivity: pointerDragActivityFromModel(model),
        orientation: model.orientation,
      }),
      handler: function* () {
        return ({ dragActivity, orientation }) => {
          const pointerEvents = Stream.merge(
            Stream.fromEventListener<PointerEvent>(
              document,
              'pointermove',
            ).pipe(
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

          return Stream.when(
            Stream.merge(pointerEvents, documentDragStyles),
            Effect.sync(() => dragActivity === 'Active'),
          )
        }
      },
    },
  ),

  documentEscape: entry(
    'DragAndDropDocumentEscape',
    { dragActivity: DragActivity },
    {
      messages: [Message.CancelledDrag],
      modelToDependencies: model => ({
        dragActivity: dragActivityFromModel(model),
      }),
      handler: function* () {
        return ({ dragActivity }) =>
          Stream.when(
            Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
              Stream.filter(({ key }) => key === 'Escape'),
              Stream.map(() => Message.CancelledDrag()),
            ),
            Effect.sync(() => dragActivity === 'Active'),
          )
      },
    },
  ),

  documentKeyboard: entry(
    'DragAndDropDocumentKeyboard',
    { dragActivity: KeyboardDragActivity },
    {
      messages: [Message.PressedArrowKey, Message.ConfirmedKeyboardDrop],
      modelToDependencies: model => ({
        dragActivity: keyboardDragActivityFromModel(model),
      }),
      handler: function* () {
        return ({ dragActivity }) =>
          Stream.when(
            streamKeyboardDragEvents(),
            Effect.sync(() => dragActivity === 'Active'),
          )
      },
    },
  ),

  autoScroll: entry(
    'DragAndDropAutoScroll',
    {
      isDragging: Schema.Boolean,
      clientY: Schema.Number,
    },
    {
      messages: [Message.AdvancedAutoScrollFrame],
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
      handler: function* () {
        return ({ isDragging }, readDependencies) =>
          Stream.when(
            Stream.callback<typeof Message.AdvancedAutoScrollFrame.Type>(
              queue =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const ref = { id: 0 }
                    const step = () => {
                      autoScroll(readDependencies().clientY)
                      Queue.offerUnsafe(
                        queue,
                        Message.AdvancedAutoScrollFrame(),
                      )
                      ref.id = requestAnimationFrame(step)
                    }
                    ref.id = requestAnimationFrame(step)
                    return ref
                  }),
                  ref => Effect.sync(() => cancelAnimationFrame(ref.id)),
                ).pipe(Effect.flatMap(() => Effect.never)),
            ),
            Effect.sync(() => isDragging),
          )
      },
    },
  ),
}))

/** Provides DragAndDrop's Command and Subscription handlers. */
export const EffectsLayer = Layer.mergeAll(
  FocusItem.layer,
  ResolveKeyboardMove.layer,
  subscriptions.layer,
)

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

/** Identifies the draggable item and its current location. */
export type DraggableAttributesInput = Readonly<{
  itemId: string
  containerId: string
  index: number
}>

const draggable = (
  model: Model,
  input: DraggableAttributesInput,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Attribute<Message>> => {
  const isKeyboardDragActivationKey = (key: string): boolean =>
    key === ' ' || key === 'Enter'

  const handleKeyDown = (key: string): Option.Option<Message> => {
    if (isKeyboardDragActivationKey(key) && model.dragState._tag === 'Idle') {
      return Option.some(
        Message.ActivatedKeyboardDrag({
          itemId: input.itemId,
          containerId: input.containerId,
          index: input.index,
        }),
      )
    }

    return Option.none()
  }

  return [
    h.DataAttribute('draggable-id', input.itemId),
    h.DataAttribute('sortable-id', input.itemId),
    h.Role('option'),
    h.AriaRoleDescription('draggable'),
    h.Tabindex(0),
    h.OnPointerDown((_pointerType, button, screenX, screenY) =>
      pipe(
        button,
        Option.liftPredicate(Equal.equals(LEFT_MOUSE_BUTTON)),
        Option.map(() =>
          Message.PressedDraggable({
            itemId: input.itemId,
            containerId: input.containerId,
            index: input.index,
            screenX,
            screenY,
          }),
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

/** Attribute builders supplied to the consumer's `toView` callback. */
export type RenderInfo = Readonly<{
  draggable: (input: DraggableAttributesInput) => ReadonlyArray<ChildAttribute>
  droppable: (
    containerId: string,
    label?: string,
  ) => ReadonlyArray<ChildAttribute>
  sortable: (itemId: string) => ReadonlyArray<ChildAttribute>
}>

/** Per-render inputs passed to the DragAndDrop connection's `embedView` method. */
export type ViewInputs = Readonly<{
  toView: (render: RenderInfo) => Html
}>

/** Publishes drag-and-drop attribute groups while the consumer retains full
 * control over the rendered elements and content. */
export const view = DragAndDropComposition.makeView.withInputs<ViewInputs>(
  (model, { toView }, h) =>
    toView({
      draggable: input => childAttributes(draggable(model, input, h)),
      droppable: (containerId, label) =>
        childAttributes(droppable(containerId, label)),
      sortable: itemId => childAttributes(sortable(itemId)),
    }),
)

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

const prepare = () =>
  DragAndDropComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  })
/** Completed DragAndDrop Block contract. */
export interface DragAndDropBlock extends Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> {}
/** Complete DragAndDrop Block definition for connecting to a parent. */
export const DragAndDropBlock: DragAndDropBlock = Block.assemble(prepare)
