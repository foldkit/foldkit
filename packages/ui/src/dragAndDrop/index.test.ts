import { Array, Effect, Fiber, Option, Queue, Schema, Stream } from 'effect'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  EffectsLayer,
  FocusItem,
  Message,
  type Model,
  OutMessage,
  ResolveKeyboardMove,
  DragAndDropBlock as block,
  ghostStyle,
  isDragging,
  layer,
  maybeDraggedItemId,
  maybeDropTarget,
  subscriptions,
} from './block.js'
import * as DragAndDropTest from './test.js'

const waitForNextTurn = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

const pressedDraggable = Message.PressedDraggable({
  itemId: 'item-1',
  containerId: 'list-1',
  index: 0,
  screenX: 100,
  screenY: 200,
})

const movedPointer = (
  overrides: Readonly<
    Partial<{
      screenX: number
      screenY: number
      clientX: number
      clientY: number
      maybeDropTarget: Option.Option<{ containerId: string; index: number }>
    }>
  > = {},
) =>
  Message.MovedPointer({
    screenX: overrides.screenX ?? 110,
    screenY: overrides.screenY ?? 200,
    clientX: overrides.clientX ?? 110,
    clientY: overrides.clientY ?? 200,
    maybeDropTarget: overrides.maybeDropTarget ?? Option.none(),
  })

const movedPointerAboveThreshold = movedPointer()

const activatedKeyboardDrag = Message.ActivatedKeyboardDrag({
  itemId: 'item-1',
  containerId: 'list-1',
  index: 0,
})

const movedPointerBelowThreshold = movedPointer({
  screenX: 102,
  screenY: 201,
  clientX: 102,
  clientY: 201,
})

it.layer(layer, { buildPerTest: true })(it => {
  describe('DragAndDrop', () => {
    describe('init', () => {
      it.effect('starts in the Idle state with Vertical orientation', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(model.id).toBe('test')
            expect(model.orientation).toBe('Vertical')
            expect(model.keyboardDragGeneration).toBe(0)
            expect(model.dragState._tag).toBe('Idle')
          }),
        ),
      )

      it.effect('accepts a custom orientation', () =>
        Story.story(
          block,
          Story.init({
            id: 'test',
            orientation: 'Horizontal',
          }),
          Story.model(model => {
            expect(model.orientation).toBe('Horizontal')
          }),
        ),
      )
    })

    describe('update', () => {
      it.effect('transitions from Idle to Pending on PressedDraggable', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Pending')
            if (model.dragState._tag === 'Pending') {
              expect(model.dragState.itemId).toBe('item-1')
              expect(model.dragState.containerId).toBe('list-1')
              expect(model.dragState.index).toBe(0)
              expect(model.dragState.origin).toStrictEqual({
                screenX: 100,
                screenY: 200,
              })
            }
          }),
        ),
      )

      it.effect(
        'stays Pending when pointer moves below activation threshold',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(movedPointerBelowThreshold),
            Story.model(model => {
              expect(model.dragState._tag).toBe('Pending')
            }),
          ),
      )

      it.effect(
        'transitions from Pending to Dragging when pointer exceeds threshold',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(movedPointerAboveThreshold),
            Story.model(model => {
              expect(model.dragState._tag).toBe('Dragging')
              if (model.dragState._tag === 'Dragging') {
                expect(model.dragState.itemId).toBe('item-1')
                expect(model.dragState.sourceContainerId).toBe('list-1')
                expect(model.dragState.sourceIndex).toBe(0)
                expect(model.dragState.origin).toStrictEqual({
                  screenX: 100,
                  screenY: 200,
                })
                expect(model.dragState.current).toStrictEqual({
                  clientX: 110,
                  clientY: 200,
                })
                expect(model.dragState.maybeDropTarget).toStrictEqual(
                  Option.none(),
                )
              }
            }),
          ),
      )

      it.effect(
        'transitions from Pending to Idle on ReleasedPointer (click)',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(Message.ReleasedPointer()),
            Story.model(model => {
              expect(model.dragState._tag).toBe('Idle')
            }),
          ),
      )

      it.effect(
        'updates current position and drop target while Dragging',
        () => {
          const dropTarget = Option.some({ containerId: 'list-1', index: 2 })
          return Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(movedPointerAboveThreshold),
            Story.message(
              movedPointer({
                screenX: 150,
                screenY: 250,
                clientX: 150,
                clientY: 250,
                maybeDropTarget: dropTarget,
              }),
            ),
            Story.model(model => {
              expect(model.dragState._tag).toBe('Dragging')
              if (model.dragState._tag === 'Dragging') {
                expect(model.dragState.current).toStrictEqual({
                  clientX: 150,
                  clientY: 250,
                })
                expect(model.dragState.maybeDropTarget).toStrictEqual(
                  dropTarget,
                )
              }
            }),
          )
        },
      )

      it.effect(
        'transitions from Dragging to Idle on ReleasedPointer (drop)',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(movedPointerAboveThreshold),
            Story.message(Message.ReleasedPointer()),
            Story.model(model => {
              expect(model.dragState._tag).toBe('Idle')
            }),
          ),
      )

      it.effect('transitions from Dragging to Idle on CancelledDrag', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.message(Message.CancelledDrag()),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Idle')
          }),
        ),
      )

      it.effect('returns model unchanged when Idle receives MovedPointer', () =>
        Story.withBlock(block, block => {
          const defaultInit = () => block.init({ id: 'test' }).model

          const originalModel = defaultInit()
          Story.story(
            block.update,
            Story.given(originalModel),
            Story.message(movedPointerAboveThreshold),
            Story.model(model => {
              expect(model).toBe(originalModel)
            }),
          )
        }),
      )

      it.effect(
        'returns model unchanged when Idle receives ReleasedPointer',
        () =>
          Story.withBlock(block, block => {
            const defaultInit = () => block.init({ id: 'test' }).model

            const originalModel = defaultInit()
            Story.story(
              block.update,
              Story.given(originalModel),
              Story.message(Message.ReleasedPointer()),
              Story.model(model => {
                expect(model).toBe(originalModel)
              }),
            )
          }),
      )

      it.effect(
        'returns to Idle when CancelledDrag received while Pending',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(Message.CancelledDrag()),
            Story.model(model => {
              expect(model.dragState._tag).toBe('Idle')
            }),
          ),
      )
    })

    describe('keyboard drag generations', () => {
      it.effect(
        'ignores a pending keyboard move completion after cancellation',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(activatedKeyboardDrag),
            Story.message(Message.PressedArrowKey({ direction: 'Down' })),
            Story.message(Message.CancelledDrag()),
            Story.expectOutMessage(OutMessage.Cancelled()),
            Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
            Story.Command.resolve(
              ResolveKeyboardMove,
              Message.CompletedResolveKeyboardMove({
                keyboardDragGeneration: 1,
                targetContainerId: 'list-1',
                targetIndex: 1,
              }),
            ),
            Story.model(model => expect(model.dragState._tag).toBe('Idle')),
            Story.Command.expectNone(),
          ),
      )

      it.effect.each(['item-1', 'item-2'])(
        'ignores a previous keyboard drag completion after restarting with %s',
        restartedItemId =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(activatedKeyboardDrag),
            Story.message(Message.PressedArrowKey({ direction: 'Down' })),
            Story.message(Message.CancelledDrag()),
            Story.expectOutMessage(OutMessage.Cancelled()),
            Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
            Story.message(
              Message.ActivatedKeyboardDrag({
                itemId: restartedItemId,
                containerId: 'list-1',
                index: 0,
              }),
            ),
            Story.Command.resolve(
              ResolveKeyboardMove,
              Message.CompletedResolveKeyboardMove({
                keyboardDragGeneration: 1,
                targetContainerId: 'list-2',
                targetIndex: 3,
              }),
            ),
            Story.model(model => {
              expect(model.keyboardDragGeneration).toBe(2)
              expect(model.dragState._tag).toBe('KeyboardDragging')
              if (model.dragState._tag === 'KeyboardDragging') {
                expect(model.dragState.itemId).toBe(restartedItemId)
                expect(model.dragState.targetContainerId).toBe('list-1')
                expect(model.dragState.targetIndex).toBe(0)
              }
            }),
            Story.expectNoOutMessage(),
            Story.Command.expectNone(),
          ),
      )
    })

    describe('OutMessage', () => {
      it.effect('emits Reordered when dropping on a valid drop target', () => {
        const dropTarget = Option.some({ containerId: 'list-1', index: 2 })
        return Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.message(movedPointer({ maybeDropTarget: dropTarget })),
          Story.message(Message.ReleasedPointer()),
          Story.expectOutMessage(
            OutMessage.Reordered({
              itemId: 'item-1',
              fromContainerId: 'list-1',
              fromIndex: 0,
              toContainerId: 'list-1',
              toIndex: 2,
            }),
          ),
        )
      })

      it.effect('emits Cancelled when dropping without a drop target', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.message(Message.ReleasedPointer()),
          Story.expectOutMessage(OutMessage.Cancelled()),
        ),
      )

      it.effect('emits Cancelled when CancelledDrag while Dragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.message(Message.CancelledDrag()),
          Story.expectOutMessage(OutMessage.Cancelled()),
        ),
      )

      it.effect('emits no OutMessage when CancelledDrag while Pending', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(Message.CancelledDrag()),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('emits no OutMessage on PressedDraggable', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.expectNoOutMessage(),
        ),
      )

      it.effect('emits no OutMessage on MovedPointer', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.expectNoOutMessage(),
        ),
      )
    })

    describe('ghostStyle', () => {
      it.effect('returns None when Idle', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(ghostStyle(model)).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('returns None when Pending', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.model(model => {
            expect(ghostStyle(model)).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect(
        'returns Some with client-coordinate positioning when Dragging',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(pressedDraggable),
            Story.message(movedPointerAboveThreshold),
            Story.model(model => {
              const result = ghostStyle(model)
              expect(Option.isSome(result)).toBe(true)
              if (Option.isSome(result)) {
                expect(result.value['position']).toBe('fixed')
                expect(result.value['transform']).toBe(
                  'translate3d(110px, 200px, 0)',
                )
                expect(result.value['pointer-events']).toBe('none')
              }
            }),
          ),
      )
    })

    describe('isDragging', () => {
      it.effect('returns false when Idle', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(isDragging(model)).toBe(false)
          }),
        ),
      )

      it.effect('returns false when Pending', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.model(model => {
            expect(isDragging(model)).toBe(false)
          }),
        ),
      )

      it.effect('returns true when Dragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.model(model => {
            expect(isDragging(model)).toBe(true)
          }),
        ),
      )
    })

    describe('maybeDraggedItemId', () => {
      it.effect('returns None when Idle', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(maybeDraggedItemId(model)).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('returns Some with itemId when Pending', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.model(model => {
            expect(maybeDraggedItemId(model)).toStrictEqual(
              Option.some('item-1'),
            )
          }),
        ),
      )

      it.effect('returns Some with itemId when Dragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.model(model => {
            expect(maybeDraggedItemId(model)).toStrictEqual(
              Option.some('item-1'),
            )
          }),
        ),
      )
    })

    describe('maybeDropTarget', () => {
      it.effect('returns None when Idle', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.model(model => {
            expect(maybeDropTarget(model)).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('returns None when Pending', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.model(model => {
            expect(maybeDropTarget(model)).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('returns None when Dragging without a drop target', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.model(model => {
            expect(maybeDropTarget(model)).toStrictEqual(Option.none())
          }),
        ),
      )

      it.effect('returns Some when Dragging over a drop target', () => {
        const target = Option.some({ containerId: 'list-1', index: 2 })
        return Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.message(movedPointer({ maybeDropTarget: target })),
          Story.model(model => {
            expect(maybeDropTarget(model)).toStrictEqual(target)
          }),
        )
      })

      it.effect('returns Some when KeyboardDragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.model(model => {
            expect(maybeDropTarget(model)).toStrictEqual(
              Option.some({ containerId: 'list-1', index: 0 }),
            )
          }),
        ),
      )
    })

    describe('production pointer resolution with mocked geometry', () => {
      const cases = [
        { name: 'before source', coordinate: 25, index: 0 },
        { name: 'upper source half', coordinate: 125, index: 1 },
        { name: 'lower source half', coordinate: 175, index: 1 },
        {
          name: 'disabled sortable counts and decoration does not',
          coordinate: 275,
          index: 2,
        },
        { name: 'exact end index', coordinate: 450, index: 3 },
        {
          name: 'horizontal midpoint',
          coordinate: 275,
          index: 2,
          orientation: 'Horizontal',
        },
        {
          name: 'empty destination',
          coordinate: 25,
          index: 0,
          items: [],
          sourceContainerId: 'source',
        },
        {
          name: 'cross-container',
          sourceContainerId: 'source',
          coordinate: 175,
          index: 2,
          items: ['x', 'y'],
        },
        {
          name: 'single source',
          coordinate: 75,
          index: 0,
          items: ['b'],
          sourceIndex: 0,
        },
      ]

      for (const scenario of cases) {
        it.effect(scenario.name, () =>
          Story.withBlock(block, block =>
            Effect.gen(function* () {
              const container = document.createElement('div')
              container.dataset['droppableId'] = 'list'
              container.appendChild(document.createElement('h2'))
              for (const [index, itemId] of (
                scenario.items ?? ['a', 'b', 'c', 'd']
              ).entries()) {
                const item = document.createElement('button')
                item.dataset['sortableId'] = itemId
                item.disabled = itemId === 'c'
                vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(
                  DOMRect.fromRect({
                    x: index * 100,
                    y: index * 100,
                    width: 100,
                    height: 100,
                  }),
                )
                container.appendChild(item)
              }
              document.body.appendChild(container)
              const elementsFromPointDescriptor =
                Object.getOwnPropertyDescriptor(document, 'elementsFromPoint')
              Object.defineProperty(document, 'elementsFromPoint', {
                configurable: true,
                value: () => [container],
              })
              const addListener = vi.spyOn(document, 'addEventListener')
              yield* Effect.addFinalizer(() =>
                Effect.sync(() => {
                  container.remove()
                  if (elementsFromPointDescriptor) {
                    Object.defineProperty(
                      document,
                      'elementsFromPoint',
                      elementsFromPointDescriptor,
                    )
                  } else {
                    Reflect.deleteProperty(document, 'elementsFromPoint')
                  }
                  vi.restoreAllMocks()
                }),
              )

              const initial = block.init({
                id: 'geometry',
                orientation:
                  scenario.orientation === 'Horizontal'
                    ? 'Horizontal'
                    : 'Vertical',
              })
              const pending = block.update(
                initial.model,
                Message.PressedDraggable({
                  itemId: 'b',
                  containerId: scenario.sourceContainerId ?? 'list',
                  index: scenario.sourceIndex ?? 1,
                  screenX: 0,
                  screenY: 0,
                }),
              )
              const received = yield* Queue.unbounded<Message>()
              const fiber = yield* Effect.forkChild(
                subscriptions.documentPointer
                  .dependenciesToStream(
                    subscriptions.documentPointer.modelToDependencies(
                      pending.model,
                    ),
                  )
                  .pipe(
                    Stream.runForEach(message =>
                      Queue.offer(received, message),
                    ),
                    Effect.provide(EffectsLayer),
                  ),
              )
              yield* Effect.promise(() =>
                vi.waitFor(() => {
                  expect(
                    addListener.mock.calls.some(
                      ([type]) => type === 'pointermove',
                    ),
                  ).toBe(true)
                  expect(
                    addListener.mock.calls.some(
                      ([type]) => type === 'pointerup',
                    ),
                  ).toBe(true)
                }),
              )
              document.dispatchEvent(
                new PointerEvent('pointermove', {
                  screenX: 100,
                  screenY: 100,
                  clientX:
                    scenario.orientation === 'Horizontal'
                      ? scenario.coordinate
                      : 5,
                  clientY:
                    scenario.orientation === 'Horizontal'
                      ? 5
                      : scenario.coordinate,
                }),
              )
              const message = yield* Queue.take(received)
              expect(message._tag).toBe('MovedPointer')
              const move = block.update(pending.model, message)
              expect(maybeDropTarget(move.model)).toEqual(
                Option.some({ containerId: 'list', index: scenario.index }),
              )
              document.dispatchEvent(new PointerEvent('pointerup'))
              const released = yield* Queue.take(received)
              const drop = block.update(move.model, released)
              expect(drop.outMessage).toEqual(
                OutMessage.Reordered({
                  itemId: 'b',
                  fromContainerId: scenario.sourceContainerId ?? 'list',
                  fromIndex: scenario.sourceIndex ?? 1,
                  toContainerId: 'list',
                  toIndex: scenario.index,
                }),
              )
              yield* Fiber.interrupt(fiber)
            }),
          ),
        )
      }

      it.effect('keyboard clamps at the same source-excluded end', () =>
        Effect.gen(function* () {
          const container = document.createElement('div')
          container.dataset['droppableId'] = 'list'
          for (const itemId of ['a', 'b', 'c', 'd']) {
            const item = document.createElement('div')
            item.dataset['sortableId'] = itemId
            container.appendChild(item)
          }
          document.body.appendChild(container)
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => container.remove()),
          )
          const message = yield* ResolveKeyboardMove({
            itemId: 'b',
            currentContainerId: 'list',
            currentIndex: 3,
            direction: 'Down',
            keyboardDragGeneration: 1,
          }).effect.pipe(Effect.provide(ResolveKeyboardMove.layer))
          expect(message).toEqual(
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list',
              targetIndex: 3,
            }),
          )
        }),
      )

      it.effect(
        'projects gesture identity and keeps document resources until Idle or interruption',
        () =>
          Story.withBlock(block, block =>
            Effect.gen(function* () {
              const initial = block.init({ id: 'lifecycle' })
              const pending = block.update(initial.model, pressedDraggable)
              const dragging = block.update(
                pending.model,
                movedPointerAboveThreshold,
              )
              const moved = block.update(
                dragging.model,
                movedPointer({ clientY: 350 }),
              )
              const other = block.update(
                initial.model,
                Message.PressedDraggable({
                  itemId: 'item-2',
                  containerId: 'list-1',
                  index: 1,
                  screenX: 100,
                  screenY: 200,
                }),
              )
              const keyboard = block.update(
                initial.model,
                activatedKeyboardDrag,
              )
              const entry = subscriptions.documentPointer
              const idle = entry.modelToDependencies(initial.model)
              const active = entry.modelToDependencies(pending.model)
              const equivalent = Schema.toEquivalence(entry.dependenciesSchema)
              expect(
                equivalent(active, entry.modelToDependencies(dragging.model)),
              ).toBe(true)
              expect(
                equivalent(active, entry.modelToDependencies(moved.model)),
              ).toBe(true)
              expect(
                equivalent(active, entry.modelToDependencies(other.model)),
              ).toBe(false)
              const horizontal = entry.modelToDependencies(
                modifyFields(pending.model, {
                  orientation: () => 'Horizontal',
                }),
              )
              expect(equivalent(active, horizontal)).toBe(false)
              expect(equivalent(active, idle)).toBe(false)
              expect(
                equivalent(idle, entry.modelToDependencies(keyboard.model)),
              ).toBe(true)
              const changes = yield* Stream.fromIterable([
                idle,
                active,
                entry.modelToDependencies(dragging.model),
                entry.modelToDependencies(moved.model),
                entry.modelToDependencies(other.model),
                horizontal,
                idle,
              ]).pipe(Stream.changesWith(equivalent), Stream.runCollect)
              expect(changes).toEqual([
                idle,
                active,
                entry.modelToDependencies(other.model),
                horizontal,
                idle,
              ])

              const addListener = vi.spyOn(document, 'addEventListener')
              const removeListener = vi.spyOn(document, 'removeEventListener')
              yield* Effect.addFinalizer(() =>
                Effect.sync(() => vi.restoreAllMocks()),
              )
              const dependencies = yield* Queue.unbounded<typeof active>()
              const received = yield* Queue.unbounded<Message>()
              const fiber = yield* Effect.forkChild(
                Stream.fromQueue(dependencies).pipe(
                  Stream.changesWith(equivalent),
                  Stream.switchMap(value => entry.dependenciesToStream(value)),
                  Stream.runForEach(message => Queue.offer(received, message)),
                  Effect.provide(EffectsLayer),
                ),
              )
              const styles = () =>
                Array.fromIterable(
                  document.head.querySelectorAll('style'),
                ).filter(style =>
                  style.textContent?.includes('cursor: grabbing !important'),
                )
              yield* Queue.offer(dependencies, active)
              yield* Effect.promise(() =>
                vi.waitFor(() => {
                  expect(styles()).toHaveLength(1)
                  expect(
                    addListener.mock.calls.filter(
                      ([type]) => type === 'pointerup',
                    ),
                  ).toHaveLength(1)
                }),
              )
              const style = styles().at(0)
              yield* Queue.offer(
                dependencies,
                entry.modelToDependencies(dragging.model),
              )
              document.dispatchEvent(new PointerEvent('pointerup'))
              expect(yield* Queue.take(received)).toEqual(
                Message.ReleasedPointer(),
              )
              expect(styles()).toEqual([style])
              expect(
                addListener.mock.calls.filter(([type]) => type === 'pointerup'),
              ).toHaveLength(1)
              yield* Queue.offer(dependencies, idle)
              yield* Effect.promise(() =>
                vi.waitFor(() => {
                  expect(styles()).toHaveLength(0)
                  expect(
                    removeListener.mock.calls.filter(
                      ([type]) => type === 'pointerup',
                    ),
                  ).toHaveLength(1)
                  expect(
                    removeListener.mock.calls.filter(
                      ([type]) => type === 'pointermove',
                    ),
                  ).toHaveLength(1)
                }),
              )
              yield* Queue.offer(dependencies, active)
              yield* Effect.promise(() =>
                vi.waitFor(() => expect(styles()).toHaveLength(1)),
              )
              yield* Fiber.interrupt(fiber)
              expect(styles()).toHaveLength(0)
              expect(
                removeListener.mock.calls.filter(
                  ([type]) => type === 'pointerup',
                ),
              ).toHaveLength(2)
              expect(
                removeListener.mock.calls.filter(
                  ([type]) => type === 'pointermove',
                ),
              ).toHaveLength(2)
            }),
          ),
      )
    })

    describe('keyboard drag', () => {
      it.effect(
        'prevents handled document keys before the native dispatch returns',
        () =>
          Story.withBlock(block, block =>
            Effect.gen(function* () {
              const defaultInit = () => block.init({ id: 'test' }).model

              const keyboardDrag = block.update(
                defaultInit(),
                activatedKeyboardDrag,
              )
              const dependencies =
                subscriptions.documentKeyboard.modelToDependencies(
                  keyboardDrag.model,
                )
              const received: Array<Message> = []
              const stream =
                subscriptions.documentKeyboard.dependenciesToStream(
                  dependencies,
                )
              const fiber = yield* Effect.forkChild(
                Stream.runForEach(stream, message =>
                  Effect.sync(() => {
                    received.push(message)
                  }),
                ).pipe(Effect.provide(EffectsLayer)),
              )

              yield* Effect.promise(waitForNextTurn)

              const event = new KeyboardEvent('keydown', {
                key: 'Tab',
                cancelable: true,
              })
              document.dispatchEvent(event)

              expect(event.defaultPrevented).toBe(true)

              yield* Effect.promise(waitForNextTurn)
              yield* Fiber.interrupt(fiber)

              expect(received).toEqual([
                Message.PressedArrowKey({ direction: 'NextContainer' }),
              ])
            }),
          ),
      )

      it.effect(
        'transitions from Idle to KeyboardDragging on ActivatedKeyboardDrag',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(activatedKeyboardDrag),
            Story.model(model => {
              expect(model.dragState._tag).toBe('KeyboardDragging')
              expect(model.keyboardDragGeneration).toBe(1)
              if (model.dragState._tag === 'KeyboardDragging') {
                expect(model.dragState.itemId).toBe('item-1')
                expect(model.dragState.sourceContainerId).toBe('list-1')
                expect(model.dragState.sourceIndex).toBe(0)
                expect(model.dragState.targetContainerId).toBe('list-1')
                expect(model.dragState.targetIndex).toBe(0)
              }
            }),
          ),
      )

      it.effect(
        'emits keyboard facts without announcing an unchanged or inactive target',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(activatedKeyboardDrag),
            Story.expectOutMessage(
              OutMessage.StartedKeyboardDrag({
                itemId: 'item-1',
                containerId: 'list-1',
                index: 0,
              }),
            ),
            Story.message(
              Message.CompletedResolveKeyboardMove({
                keyboardDragGeneration: 1,
                targetContainerId: 'list-2',
                targetIndex: 3,
              }),
            ),
            Story.expectOutMessage(
              OutMessage.ChangedKeyboardTarget({
                itemId: 'item-1',
                fromContainerId: 'list-1',
                fromIndex: 0,
                toContainerId: 'list-2',
                toIndex: 3,
              }),
            ),
            Story.Command.resolve(
              FocusItem({ itemId: 'item-1' }),
              Message.CompletedFocusItem(),
            ),
            Story.expectNoOutMessage(),
            Story.message(
              Message.CompletedResolveKeyboardMove({
                keyboardDragGeneration: 1,
                targetContainerId: 'list-2',
                targetIndex: 3,
              }),
            ),
            Story.expectNoOutMessage(),
            Story.Command.resolve(
              FocusItem({ itemId: 'item-1' }),
              Message.CompletedFocusItem(),
            ),
            Story.message(Message.CancelledDrag()),
            Story.expectOutMessage(OutMessage.Cancelled()),
            Story.Command.resolve(
              FocusItem({ itemId: 'item-1' }),
              Message.CompletedFocusItem(),
            ),
            Story.message(
              Message.CompletedResolveKeyboardMove({
                keyboardDragGeneration: 1,
                targetContainerId: 'list-1',
                targetIndex: 0,
              }),
            ),
            Story.expectNoOutMessage(),
            Story.model(model => expect(model.dragState._tag).toBe('Idle')),
          ),
      )

      it.effect(
        'creates ResolveKeyboardMove command on PressedArrowKey and resolves target',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(activatedKeyboardDrag),
            Story.message(Message.PressedArrowKey({ direction: 'Down' })),
            Story.Command.resolve(
              ResolveKeyboardMove,
              Message.CompletedResolveKeyboardMove({
                keyboardDragGeneration: 1,
                targetContainerId: 'list-1',
                targetIndex: 1,
              }),
            ),
            Story.Command.resolve(
              FocusItem({ itemId: 'item-1' }),
              Message.CompletedFocusItem(),
            ),
            Story.model(model => {
              expect(model.dragState._tag).toBe('KeyboardDragging')
              if (model.dragState._tag === 'KeyboardDragging') {
                expect(model.dragState.targetIndex).toBe(1)
              }
            }),
          ),
      )

      it.effect('updates target on CompletedResolveKeyboardMove', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.message(
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          Story.Command.resolve(
            FocusItem({ itemId: 'item-1' }),
            Message.CompletedFocusItem(),
          ),
          Story.model(model => {
            expect(model.dragState._tag).toBe('KeyboardDragging')
            if (model.dragState._tag === 'KeyboardDragging') {
              expect(model.dragState.targetContainerId).toBe('list-2')
              expect(model.dragState.targetIndex).toBe(3)
            }
          }),
        ),
      )

      it.effect('emits Reordered on ConfirmedKeyboardDrop', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.message(
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-2',
              targetIndex: 1,
            }),
          ),
          Story.Command.resolve(
            FocusItem({ itemId: 'item-1' }),
            Message.CompletedFocusItem(),
          ),
          Story.message(Message.ConfirmedKeyboardDrop()),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Idle')
          }),
          Story.expectOutMessage(
            OutMessage.Reordered({
              itemId: 'item-1',
              fromContainerId: 'list-1',
              fromIndex: 0,
              toContainerId: 'list-2',
              toIndex: 1,
            }),
          ),
          Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
        ),
      )

      it.effect('emits Cancelled on CancelledDrag while KeyboardDragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.message(Message.CancelledDrag()),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Idle')
          }),
          Story.expectOutMessage(OutMessage.Cancelled()),
          Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
        ),
      )

      it.effect('isDragging returns true when KeyboardDragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.model(model => {
            expect(isDragging(model)).toBe(true)
          }),
        ),
      )

      it.effect('maybeDraggedItemId returns Some when KeyboardDragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.model(model => {
            expect(maybeDraggedItemId(model)).toStrictEqual(
              Option.some('item-1'),
            )
          }),
        ),
      )

      it.effect('ghostStyle returns None when KeyboardDragging', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.model(model => {
            expect(ghostStyle(model)).toStrictEqual(Option.none())
          }),
        ),
      )
    })

    describe('test helpers', () => {
      it.effect('settleFocus resolves focus after a keyboard drop', () =>
        Story.story(
          block,
          Story.init({ id: 'test' }),
          Story.message(activatedKeyboardDrag),
          Story.message(Message.ConfirmedKeyboardDrop()),
          Story.expectOutMessage(
            OutMessage.Reordered({
              itemId: 'item-1',
              fromContainerId: 'list-1',
              fromIndex: 0,
              toContainerId: 'list-1',
              toIndex: 0,
            }),
          ),
          DragAndDropTest.settleFocus({ itemId: 'item-1' }),
          Story.model(model => {
            expect(isDragging(model)).toBe(false)
          }),
        ),
      )

      it.effect(
        'resolveKeyboardMove supplies the target and resolves focus',
        () =>
          Story.story(
            block,
            Story.init({ id: 'test' }),
            Story.message(activatedKeyboardDrag),
            Story.message(
              Message.PressedArrowKey({ direction: 'NextContainer' }),
            ),
            DragAndDropTest.resolveKeyboardMove({
              itemId: 'item-1',
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
            Story.model(model => {
              expect(maybeDropTarget(model)).toEqual(
                Option.some({ containerId: 'list-2', index: 3 }),
              )
            }),
          ),
      )

      it.effect('settleFocus rejects a missing focus Command', () =>
        Story.withBlock(block, block => {
          const defaultInit = () => block.init({ id: 'test' }).model

          expect(() =>
            Story.story(
              block.update,
              Story.given(defaultInit()),
              DragAndDropTest.settleFocus({ itemId: 'item-1' }),
            ),
          ).toThrow('no matching pending Command was found')
        }),
      )

      it.effect(
        'resolveKeyboardMove rejects a pending move for another item',
        () =>
          Story.withBlock(block, block => {
            const defaultInit = () => block.init({ id: 'test' }).model

            expect(() =>
              Story.story(
                block.update,
                Story.given(defaultInit()),
                Story.message(activatedKeyboardDrag),
                Story.message(
                  Message.PressedArrowKey({ direction: 'NextContainer' }),
                ),
                DragAndDropTest.resolveKeyboardMove({
                  itemId: 'item-2',
                  targetContainerId: 'list-2',
                  targetIndex: 3,
                }),
              ),
            ).toThrow(
              'could not find a pending keyboard move for item "item-2"',
            )
          }),
      )

      it.effect(
        'resolveKeyboardMove rejects duplicate pending moves for the item',
        () =>
          Story.withBlock(block, block => {
            const defaultInit = () => block.init({ id: 'test' }).model

            const updateWithDuplicateMoves = (
              model: Model,
              message: Message,
            ) => {
              const dragAndDropUpdate = block.update(model, message)
              const commands = dragAndDropUpdate.commands ?? []

              return {
                ...dragAndDropUpdate,
                commands: Array.appendAll(commands, commands),
              }
            }

            expect(() =>
              Story.story(
                updateWithDuplicateMoves,
                Story.given(defaultInit()),
                Story.message(activatedKeyboardDrag),
                Story.message(
                  Message.PressedArrowKey({ direction: 'NextContainer' }),
                ),
                DragAndDropTest.resolveKeyboardMove({
                  itemId: 'item-1',
                  targetContainerId: 'list-2',
                  targetIndex: 3,
                }),
              ),
            ).toThrow('Isolate one pending move in this Story')
          }),
      )

      it.effect('resolveKeyboardMove rejects a missing move Command', () =>
        Story.withBlock(block, block => {
          const defaultInit = () => block.init({ id: 'test' }).model

          expect(() =>
            Story.story(
              block.update,
              Story.given(defaultInit()),
              Story.message(activatedKeyboardDrag),
              DragAndDropTest.resolveKeyboardMove({
                itemId: 'item-1',
                targetContainerId: 'list-2',
                targetIndex: 3,
              }),
            ),
          ).toThrow('could not find a pending keyboard move')
        }),
      )

      it.effect(
        'resolveKeyboardMove rejects a move that omits its focus Command',
        () =>
          Story.withBlock(block, block => {
            const defaultInit = () => block.init({ id: 'test' }).model

            const updateWithoutFocus = (model: Model, message: Message) => {
              const dragAndDropUpdate = block.update(model, message)

              return {
                ...dragAndDropUpdate,
                commands: Array.filter(
                  dragAndDropUpdate.commands ?? [],
                  command => command.name !== FocusItem.name,
                ),
              }
            }

            expect(() =>
              Story.story(
                updateWithoutFocus,
                Story.given(defaultInit()),
                Story.message(activatedKeyboardDrag),
                Story.message(
                  Message.PressedArrowKey({ direction: 'NextContainer' }),
                ),
                DragAndDropTest.resolveKeyboardMove({
                  itemId: 'item-1',
                  targetContainerId: 'list-2',
                  targetIndex: 3,
                }),
              ),
            ).toThrow('no matching pending Command was found')
          }),
      )
    })
  })
})
