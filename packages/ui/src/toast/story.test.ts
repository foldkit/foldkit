import { Array, Duration, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { type InitConfig, Message, SwipeState, makeBlock } from './toast.js'
import { WaitBeforeDismissal, WaitForSwipeSettled } from './update.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type

const Toast = makeBlock(TestPayload)
const ToastLive = Toast.Live
const toastConfig = { id: 'test' }

type Model = Resolved<typeof Toast.Model.Type>
type Entry = Model['entries'][number]
type AnimationModel = Resolved<Animation.Model>
const STALE_VERSION = -1
const POINTER_ID = 1
const OTHER_POINTER_ID = 2
const SETTLING_SWIPE_VERSION = 2
const ENTER_TRANSITION_GENERATION = 1
const LEAVE_TRANSITION_GENERATION = 2

const animationInit = ({
  id,
  isShowing = false,
}: Readonly<{ id: string; isShowing?: boolean }>): Readonly<{
  model: AnimationModel
}> => ({
  model: { id, isShowing, transitionState: 'Idle', transitionGeneration: 0 },
})

const toastInit = (config: InitConfig): Readonly<{ model: Model }> => ({
  model: {
    id: config.id,
    defaultDuration:
      config.defaultDuration === undefined
        ? Duration.seconds(4)
        : Duration.fromInputUnsafe(config.defaultDuration),
    entries: [],
    nextEntryKey: 0,
    maybeSwipeConfig: Option.map(
      Option.fromNullishOr(config.swipeToDismiss),
      ({ threshold, direction }) => ({
        threshold: threshold ?? 40,
        direction: direction ?? 'Right',
      }),
    ),
  },
})

const gotAnimationMessage = ({
  entryId,
  message,
}: Readonly<{
  entryId: string
  message: Animation.Message
}>) => Block.deliver(Animation.Animation, ['entries', entryId], message)

const makeSettledEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: modifyFields(
    animationInit({ id: 'test-entry-0', isShowing: true }).model,
    { transitionGeneration: () => ENTER_TRANSITION_GENERATION },
  ),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Idle(),
  swipeVersion: 0,
  payload: { body: 'Hello' },
  ...overrides,
})

const makeFreshEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: animationInit({ id: 'test-entry-0' }).model,
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Idle(),
  swipeVersion: 0,
  payload: { body: 'Hello' },
  ...overrides,
})

const toEntryInput = (entry: Entry) => ({
  id: entry.id,
  variant: entry.variant,
  maybeDuration: entry.maybeDuration,
  pendingDismissVersion: entry.pendingDismissVersion,
  isHovered: entry.isHovered,
  swipeState: entry.swipeState,
  swipeVersion: entry.swipeVersion,
  payload: entry.payload,
})

const discardSeedCommands = <SimulationModel, SimulationMessage, OutMessage>(
  simulation: Story.StorySimulation<
    SimulationModel,
    SimulationMessage,
    OutMessage
  >,
): Story.StorySimulation<SimulationModel, SimulationMessage, OutMessage> => ({
  ...simulation,
  commands: Array.empty(),
})

const givenModel = (model: Model) =>
  Story.steps(
    ...Array.map(model.entries, entry =>
      Story.message(Toast.Message.Added({ entry: toEntryInput(entry) })),
    ),
    discardSeedCommands,
    Story.given(model),
  )

const givenEmpty = givenModel(toastInit({ id: 'test' }).model)

const swipeInit = toastInit({ id: 'test', swipeToDismiss: {} }).model

const firstEntryId = 'test-entry-0'

const withEntries = (model: Model, entries: ReadonlyArray<Entry>): Model =>
  modifyFields(model, {
    entries: () => entries,
    nextEntryKey: () => entries.length,
  })

const requireEntry = (model: Model, index: number): Entry =>
  Option.getOrThrow(Array.get(model.entries, index))

const resolveEnter = (entryId: string) =>
  Story.Command.resolveAll(
    [
      Animation.WaitForPaint({ generation: ENTER_TRANSITION_GENERATION }),
      Animation.Message.CompletedWaitForPaint({
        generation: ENTER_TRANSITION_GENERATION,
      }),
    ],
    [
      Animation.WaitForAnimationSettled({
        id: entryId,
        generation: ENTER_TRANSITION_GENERATION,
      }),
      Animation.Message.EndedAnimation({
        generation: ENTER_TRANSITION_GENERATION,
      }),
    ],
  )

const resolveLeave = (entryId: string) =>
  Story.Command.resolveAll(
    [
      Animation.WaitForPaint({ generation: LEAVE_TRANSITION_GENERATION }),
      Animation.Message.CompletedWaitForPaint({
        generation: LEAVE_TRANSITION_GENERATION,
      }),
    ],
    [
      Animation.WaitForAnimationSettled({
        id: entryId,
        generation: LEAVE_TRANSITION_GENERATION,
      }),
      Animation.Message.EndedAnimation({
        generation: LEAVE_TRANSITION_GENERATION,
      }),
    ],
  )

const expectCommandCount =
  (count: number) =>
  <SimulationModel, SimulationMessage, OutMessage>(
    simulation: Story.StorySimulation<
      SimulationModel,
      SimulationMessage,
      OutMessage
    >,
  ) => {
    expect(simulation.commands).toHaveLength(count)
    return simulation
  }

const expectedInitialModel = (
  maybeSwipeConfig: Model['maybeSwipeConfig'],
  defaultDuration = Duration.seconds(4),
): Model => ({
  id: 'test',
  defaultDuration,
  entries: [],
  nextEntryKey: 0,
  maybeSwipeConfig,
})

describe('Toast', () => {
  describe('constructor', () => {
    it.effect(
      'defaults to empty with a 4s default duration and swipe disabled',
      () =>
        Story.story(
          ToastLive,
          { id: 'test' },
          Story.model(model => {
            expect(model).toStrictEqual(expectedInitialModel(Option.none()))
          }),
        ),
    )

    it.effect('accepts a custom defaultDuration', () =>
      Story.story(
        ToastLive,
        { id: 'test', defaultDuration: 1000 },
        Story.model(model => {
          expect(model).toStrictEqual(
            expectedInitialModel(Option.none(), Duration.millis(1000)),
          )
        }),
      ),
    )

    it.effect('opts into rightward swipe with the default threshold', () =>
      Story.story(
        ToastLive,
        { id: 'test', swipeToDismiss: {} },
        Story.model(model => {
          expect(model).toStrictEqual(
            expectedInitialModel(
              Option.some({ threshold: 40, direction: 'Right' }),
            ),
          )
        }),
      ),
    )

    it.effect('accepts a custom swipe threshold', () =>
      Story.story(
        ToastLive,
        { id: 'test', swipeToDismiss: { threshold: 120 } },
        Story.model(model => {
          expect(model).toStrictEqual(
            expectedInitialModel(
              Option.some({ threshold: 120, direction: 'Right' }),
            ),
          )
        }),
      ),
    )

    it.effect('accepts a leftward swipe direction', () =>
      Story.story(
        ToastLive,
        { id: 'test', swipeToDismiss: { direction: 'Left' } },
        Story.model(model => {
          expect(model).toStrictEqual(
            expectedInitialModel(
              Option.some({ threshold: 40, direction: 'Left' }),
            ),
          )
        }),
      ),
    )
  })

  describe('RequestedShow', () => {
    it.effect('appends an entry and schedules enter + dismiss commands', () =>
      Story.story(
        ToastLive,
        toastConfig,
        Story.message(Toast.requestShow({ payload: { body: 'Saved' } })),
        Story.model(model => {
          expect(model.entries).toHaveLength(1)
          const entry = requireEntry(model, 0)
          expect(entry.id).toBe(firstEntryId)
          expect(entry.payload).toStrictEqual({ body: 'Saved' })
          expect(entry.variant).toBe('Info')
          expect(entry.animation.transitionState).toBe('EnterStart')
          expect(model.nextEntryKey).toBe(1)
        }),
        expectCommandCount(2),
        Story.Command.expectHas(
          Animation.WaitForPaint({ generation: ENTER_TRANSITION_GENERATION }),
          WaitBeforeDismissal({
            entryId: firstEntryId,
            version: 0,
            duration: Duration.seconds(4),
          }),
        ),
        resolveEnter(firstEntryId),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: STALE_VERSION,
          }),
        ),
      ),
    )

    it.effect('does not schedule a dismiss command when sticky', () =>
      Story.story(
        ToastLive,
        toastConfig,
        Story.message(
          Toast.requestShow({ payload: { body: 'Sticky' }, sticky: true }),
        ),
        Story.model(model => {
          expect(requireEntry(model, 0).maybeDuration).toStrictEqual(
            Option.none(),
          )
        }),
        expectCommandCount(1),
        resolveEnter(firstEntryId),
      ),
    )

    it.effect('uses a caller-provided duration over the default', () =>
      Story.story(
        ToastLive,
        toastConfig,
        Story.message(
          Toast.requestShow({ payload: { body: 'Quick' }, duration: 100 }),
        ),
        Story.model(model => {
          expect(requireEntry(model, 0).maybeDuration).toStrictEqual(
            Option.some(Duration.millis(100)),
          )
        }),
        Story.Command.resolve(
          WaitBeforeDismissal({
            entryId: firstEntryId,
            version: 0,
            duration: Duration.millis(100),
          }),
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: STALE_VERSION,
          }),
        ),
        resolveEnter(firstEntryId),
      ),
    )

    it.effect('generates sequential entry ids using nextEntryKey', () =>
      Story.story(
        ToastLive,
        toastConfig,
        Story.message(
          Toast.requestShow({ payload: { body: 'One' }, sticky: true }),
        ),
        Story.message(
          Toast.requestShow({ payload: { body: 'Two' }, sticky: true }),
        ),
        Story.model(model => {
          expect(model.entries.map(entry => entry.id)).toStrictEqual([
            'test-entry-0',
            'test-entry-1',
          ])
          expect(model.nextEntryKey).toBe(2)
        }),
        resolveEnter('test-entry-0'),
        resolveEnter('test-entry-1'),
      ),
    )

    it.effect('sticky wins over an explicit duration', () =>
      Story.story(
        ToastLive,
        toastConfig,
        Story.message(
          Toast.requestShow({
            payload: { body: 'Sticky beats duration' },
            sticky: true,
            duration: 100,
          }),
        ),
        Story.model(model => {
          expect(requireEntry(model, 0).maybeDuration).toStrictEqual(
            Option.none(),
          )
        }),
        resolveEnter(firstEntryId),
      ),
    )
  })

  describe('update', () => {
    describe('CompletedWaitBeforeDismissal', () => {
      it.effect('ignores a stale version', () => {
        const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: STALE_VERSION,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })

      it.effect('starts the leave transition when the version matches', () => {
        const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: 0,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: firstEntryId,
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
          ),
        )
      })

      it.effect('does nothing for a missing entry', () => {
        return Story.story(
          ToastLive,
          toastConfig,
          givenEmpty,
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: 'nope',
              version: 0,
            }),
          ),
          Story.Command.expectNone(),
        )
      })
    })

    describe('HoveredEntry / LeftEntry', () => {
      it.effect(
        'HoveredEntry flips isHovered true and bumps version to cancel the pending timer',
        () => {
          const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [makeSettledEntry()],
            nextEntryKey: () => 1,
          })
          return Story.story(
            ToastLive,
            toastConfig,
            givenModel(model),
            Story.message(Message.HoveredEntry({ entryId: firstEntryId })),
            Story.model(next => {
              const [entry] = next.entries
              expect(entry?.isHovered).toBe(true)
              expect(entry?.pendingDismissVersion).toBe(1)
            }),
            Story.Command.expectNone(),
          )
        },
      )

      it.effect(
        'LeftEntry reschedules the auto-dismiss with the new version',
        () => {
          const hoveredEntry = makeSettledEntry({
            isHovered: true,
            pendingDismissVersion: 1,
          })
          const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [hoveredEntry],
            nextEntryKey: () => 1,
          })
          return Story.story(
            ToastLive,
            toastConfig,
            givenModel(model),
            Story.message(Message.LeftEntry({ entryId: firstEntryId })),
            Story.model(next => {
              const [entry] = next.entries
              expect(entry?.isHovered).toBe(false)
              expect(entry?.pendingDismissVersion).toBe(2)
            }),
            Story.Command.expectHas(WaitBeforeDismissal),
            Story.Command.resolve(
              WaitBeforeDismissal,
              Message.CompletedWaitBeforeDismissal({
                entryId: firstEntryId,
                version: STALE_VERSION,
              }),
            ),
          )
        },
      )

      it.effect(
        'LeftEntry does not reschedule when the entry is sticky',
        () => {
          const stickyEntry = makeSettledEntry({
            maybeDuration: Option.none(),
            isHovered: true,
          })
          const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [stickyEntry],
            nextEntryKey: () => 1,
          })
          return Story.story(
            ToastLive,
            toastConfig,
            givenModel(model),
            Story.message(Message.LeftEntry({ entryId: firstEntryId })),
            Story.Command.expectNone(),
          )
        },
      )

      it.effect(
        'a hover arriving before the timer fires cancels the pending dismiss via version bump',
        () => {
          const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [makeSettledEntry()],
            nextEntryKey: () => 1,
          })
          return Story.story(
            ToastLive,
            toastConfig,
            givenModel(model),
            Story.message(Message.HoveredEntry({ entryId: firstEntryId })),
            Story.model(next => {
              expect(requireEntry(next, 0).pendingDismissVersion).toBe(1)
            }),
            Story.message(
              Message.CompletedWaitBeforeDismissal({
                entryId: firstEntryId,
                version: 0,
              }),
            ),
            Story.model(next => {
              const entry = requireEntry(next, 0)
              expect(entry.animation.transitionState).toBe('Idle')
              expect(entry.isHovered).toBe(true)
            }),
            Story.Command.expectNone(),
          )
        },
      )
    })

    describe('handles a missing entry id as a no-op', () => {
      it.effect('Dismissed', () => {
        return Story.story(
          ToastLive,
          toastConfig,
          givenEmpty,
          Story.message(Message.Dismissed({ entryId: 'nope' })),
          Story.Command.expectNone(),
        )
      })

      it.effect('HoveredEntry', () => {
        return Story.story(
          ToastLive,
          toastConfig,
          givenEmpty,
          Story.message(Message.HoveredEntry({ entryId: 'nope' })),
          Story.Command.expectNone(),
        )
      })

      it.effect('LeftEntry', () => {
        return Story.story(
          ToastLive,
          toastConfig,
          givenEmpty,
          Story.message(Message.LeftEntry({ entryId: 'nope' })),
          Story.Command.expectNone(),
        )
      })
    })

    describe('Dismissed', () => {
      it.effect(
        'runs the full leave flow and removes the entry from the stack',
        () => {
          const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [makeSettledEntry()],
            nextEntryKey: () => 1,
          })
          return Story.story(
            ToastLive,
            toastConfig,
            givenModel(model),
            Story.message(Message.Dismissed({ entryId: firstEntryId })),
            Story.model(next => {
              expect(requireEntry(next, 0).animation.transitionState).toBe(
                'LeaveStart',
              )
            }),
            Story.Command.resolveAll(
              [
                Animation.WaitForPaint({
                  generation: LEAVE_TRANSITION_GENERATION,
                }),
                Animation.Message.CompletedWaitForPaint({
                  generation: LEAVE_TRANSITION_GENERATION,
                }),
              ],
              [
                Animation.WaitForAnimationSettled({
                  id: firstEntryId,
                  generation: LEAVE_TRANSITION_GENERATION,
                }),
                Animation.Message.EndedAnimation({
                  generation: LEAVE_TRANSITION_GENERATION,
                }),
              ],
            ),
            Story.model(next => {
              expect(next.entries).toHaveLength(0)
            }),
          )
        },
      )

      it.effect('is a no-op when the entry is already leaving', () => {
        const leavingEntry = makeSettledEntry({
          animation: {
            id: firstEntryId,
            isShowing: false,
            transitionState: 'LeaveAnimating',
            transitionGeneration: LEAVE_TRANSITION_GENERATION,
          },
        })
        const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
          entries: () => [leavingEntry],
          nextEntryKey: () => 1,
        })
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(Message.Dismissed({ entryId: firstEntryId })),
          Story.Command.expectNone(),
          Story.model(next => {
            expect(next).toStrictEqual(model)
          }),
        )
      })

      it.effect(
        'removes the entry and emits DismissedToast when its leave transition completes',
        () => {
          const entry = makeSettledEntry({
            animation: {
              id: firstEntryId,
              isShowing: false,
              transitionState: 'LeaveAnimating',
              transitionGeneration: LEAVE_TRANSITION_GENERATION,
            },
          })
          const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [entry],
            nextEntryKey: () => 1,
          })
          return Story.story(
            ToastLive,
            toastConfig,
            givenModel(model),
            Story.message(
              gotAnimationMessage({
                entryId: firstEntryId,
                message: Animation.Message.EndedAnimation({
                  generation: LEAVE_TRANSITION_GENERATION,
                }),
              }),
            ),
            Story.expectOutMessage(
              Toast.OutMessage.DismissedToast({ payload: entry.payload }),
            ),
            Story.model(next => {
              expect(next.entries).toHaveLength(0)
            }),
          )
        },
      )
    })

    describe('RequestedDismissAll', () => {
      it.effect('starts leave transition on every non-leaving entry', () => {
        const entryOne = makeSettledEntry({
          id: 'test-entry-0',
          animation: {
            ...animationInit({ id: 'test-entry-0', isShowing: true }).model,
            transitionGeneration: ENTER_TRANSITION_GENERATION,
          },
        })
        const entryTwo = makeSettledEntry({
          id: 'test-entry-1',
          animation: {
            ...animationInit({ id: 'test-entry-1', isShowing: true }).model,
            transitionGeneration: ENTER_TRANSITION_GENERATION,
          },
        })
        const model: Model = modifyFields(toastInit({ id: 'test' }).model, {
          entries: () => [entryOne, entryTwo],
          nextEntryKey: () => 2,
        })
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(Message.RequestedDismissAll()),
          Story.model(next => {
            expect(requireEntry(next, 0).animation.transitionState).toBe(
              'LeaveStart',
            )
            expect(requireEntry(next, 1).animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: 'test-entry-0',
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: 'test-entry-1',
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
          ),
          Story.model(next => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      })
    })
  })

  describe('Added', () => {
    it.effect(
      'runs the full add flow: entry advances to Idle, then the auto-dismiss timer starts the leave transition',
      () => {
        const entry = makeFreshEntry({
          maybeDuration: Option.some(Duration.millis(100)),
        })
        return Story.story(
          ToastLive,
          toastConfig,
          givenEmpty,
          Story.message(Toast.Message.Added({ entry: toEntryInput(entry) })),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint({
                generation: ENTER_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: ENTER_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: firstEntryId,
                generation: ENTER_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: ENTER_TRANSITION_GENERATION,
              }),
            ],
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
          }),
          Story.Command.resolve(
            WaitBeforeDismissal,
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: 0,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: firstEntryId,
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
          ),
          Story.model(next => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      },
    )
  })

  describe('swipe', () => {
    it.effect('ignores pointer presses when swipe is disabled', () => {
      const model = withEntries(toastInit({ id: 'test' }).model, [
        makeSettledEntry(),
      ])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.model(next => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(SwipeState.Idle())
          expect(entry.pendingDismissVersion).toBe(0)
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect(
      'starts a drag and invalidates auto-dismiss on pointer press',
      () => {
        const model = withEntries(swipeInit, [makeSettledEntry()])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.PressedEntryPointer({
              entryId: firstEntryId,
              pointerId: POINTER_ID,
              clientX: 100,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: POINTER_ID,
                startX: 100,
                currentX: 100,
              }),
            )
            expect(requireEntry(next, 0).pendingDismissVersion).toBe(1)
          }),
          Story.Command.expectNone(),
        )
      },
    )

    it.effect('updates the active drag position on pointer movement', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.message(
          Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 150,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Dragging({
              pointerId: POINTER_ID,
              startX: 100,
              currentX: 150,
            }),
          )
        }),
      )
    })

    it.effect('ignores move and release from an unrelated pointer', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.message(
          Message.MovedSwipePointer({
            pointerId: OTHER_POINTER_ID,
            clientX: 500,
          }),
        ),
        Story.message(
          Message.ReleasedSwipePointer({
            pointerId: OTHER_POINTER_ID,
            clientX: 500,
          }),
        ),
        Story.model(next => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Dragging({
              pointerId: POINTER_ID,
              startX: 100,
              currentX: 100,
            }),
          )
          expect(entry.animation.transitionState).not.toBe('LeaveStart')
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect('settles back at the threshold and restarts auto-dismiss', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.message(
          Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 140,
          }),
        ),
        Story.message(
          Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 140,
          }),
        ),
        Story.model(next => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Settling({ offsetX: 0 }),
          )
          expect(entry.pendingDismissVersion).toBe(2)
          expect(entry.animation.transitionState).toBe('Idle')
        }),
        Story.Command.expectHas(WaitForSwipeSettled),
        Story.Command.expectHas(WaitBeforeDismissal),
        Story.Command.resolve(
          WaitForSwipeSettled,
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: SETTLING_SWIPE_VERSION,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Idle(),
          )
        }),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: STALE_VERSION,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
        }),
      )
    })

    it.effect('dismisses when released just past the threshold', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.message(
          Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 141,
          }),
        ),
        Story.message(
          Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 141,
          }),
        ),
        Story.model(next => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Dismissing({ offsetX: 41, direction: 'Right' }),
          )
          expect(entry.animation.transitionState).toBe('LeaveStart')
        }),
        Story.Command.resolveAll(
          [
            Animation.WaitForPaint({ generation: LEAVE_TRANSITION_GENERATION }),
            Animation.Message.CompletedWaitForPaint({
              generation: LEAVE_TRANSITION_GENERATION,
            }),
          ],
          [
            Animation.WaitForAnimationSettled({
              id: firstEntryId,
              generation: LEAVE_TRANSITION_GENERATION,
            }),
            Animation.Message.EndedAnimation({
              generation: LEAVE_TRANSITION_GENERATION,
            }),
          ],
        ),
        Story.model(next => {
          expect(next.entries).toHaveLength(0)
        }),
      )
    })

    it.effect('settles back when the pointer is cancelled', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.message(
          Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 180,
          }),
        ),
        Story.message(Message.CancelledSwipe({ pointerId: POINTER_ID })),
        Story.model(next => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Settling({ offsetX: 0 }),
          )
          expect(entry.animation.transitionState).toBe('Idle')
          expect(entry.pendingDismissVersion).toBe(2)
        }),
        Story.Command.expectHas(WaitForSwipeSettled),
        Story.Command.resolve(
          WaitForSwipeSettled,
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: SETTLING_SWIPE_VERSION,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Idle(),
          )
        }),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: STALE_VERSION,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
        }),
      )
    })

    it.effect(
      'settles every active drag on Escape without changing idle entries',
      () => {
        const firstEntry = makeSettledEntry({
          maybeDuration: Option.none(),
          swipeState: SwipeState.Dragging({
            pointerId: POINTER_ID,
            startX: 100,
            currentX: 150,
          }),
        })
        const secondEntry = makeSettledEntry({
          id: 'test-entry-1',
          maybeDuration: Option.none(),
          swipeState: SwipeState.Dragging({
            pointerId: OTHER_POINTER_ID,
            startX: 200,
            currentX: 250,
          }),
        })
        const idleEntry = makeSettledEntry({ id: 'test-entry-2' })
        const model = withEntries(swipeInit, [
          firstEntry,
          secondEntry,
          idleEntry,
        ])

        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(Message.PressedEscape()),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(
              SwipeState.Settling({ offsetX: 0 }),
            )
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Settling({ offsetX: 0 }),
            )
            expect(requireEntry(next, 2)).toStrictEqual(idleEntry)
          }),
          Story.Command.expectExact(
            WaitForSwipeSettled({ entryId: firstEntry.id, version: 1 }),
            WaitForSwipeSettled({ entryId: secondEntry.id, version: 1 }),
          ),
          Story.Command.resolveAllExact(
            [
              WaitForSwipeSettled({ entryId: firstEntry.id, version: 1 }),
              Message.CompletedWaitForSwipeSettled({
                entryId: firstEntry.id,
                version: 1,
              }),
            ],
            [
              WaitForSwipeSettled({ entryId: secondEntry.id, version: 1 }),
              Message.CompletedWaitForSwipeSettled({
                entryId: secondEntry.id,
                version: 1,
              }),
            ],
          ),
        )
      },
    )

    it.effect(
      'allows another entry to start dragging with a different pointer',
      () => {
        const dragging = SwipeState.Dragging({
          pointerId: POINTER_ID,
          startX: 100,
          currentX: 120,
        })
        const entryOne = makeSettledEntry({
          id: 'test-entry-0',
          swipeState: dragging,
        })
        const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
        const model = withEntries(swipeInit, [entryOne, entryTwo])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.PressedEntryPointer({
              entryId: 'test-entry-1',
              pointerId: OTHER_POINTER_ID,
              clientX: 200,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(dragging)
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 200,
                currentX: 200,
              }),
            )
            expect(requireEntry(next, 1).pendingDismissVersion).toBe(1)
          }),
          Story.Command.expectNone(),
        )
      },
    )

    it.effect('does not let one pointer drag two entries', () => {
      const dragging = SwipeState.Dragging({
        pointerId: POINTER_ID,
        startX: 100,
        currentX: 120,
      })
      const entryOne = makeSettledEntry({
        id: 'test-entry-0',
        swipeState: dragging,
      })
      const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
      const model = withEntries(swipeInit, [entryOne, entryTwo])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: 'test-entry-1',
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(dragging)
          expect(requireEntry(next, 1).swipeState).toStrictEqual(
            SwipeState.Idle(),
          )
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect(
      'routes moves and releases to the correct entry while two drags are active',
      () => {
        const entryOne = makeSettledEntry({ id: 'test-entry-0' })
        const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
        const model = withEntries(swipeInit, [entryOne, entryTwo])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.PressedEntryPointer({
              entryId: 'test-entry-0',
              pointerId: POINTER_ID,
              clientX: 100,
            }),
          ),
          Story.message(
            Message.PressedEntryPointer({
              entryId: 'test-entry-1',
              pointerId: OTHER_POINTER_ID,
              clientX: 300,
            }),
          ),
          Story.message(
            Message.MovedSwipePointer({
              pointerId: POINTER_ID,
              clientX: 130,
            }),
          ),
          Story.message(
            Message.MovedSwipePointer({
              pointerId: OTHER_POINTER_ID,
              clientX: 340,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: POINTER_ID,
                startX: 100,
                currentX: 130,
              }),
            )
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 300,
                currentX: 340,
              }),
            )
          }),
          Story.message(
            Message.ReleasedSwipePointer({
              pointerId: POINTER_ID,
              clientX: 130,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(
              SwipeState.Settling({ offsetX: 0 }),
            )
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 300,
                currentX: 340,
              }),
            )
          }),
          Story.Command.resolve(
            WaitForSwipeSettled,
            Message.CompletedWaitForSwipeSettled({
              entryId: 'test-entry-0',
              version: SETTLING_SWIPE_VERSION,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(
              SwipeState.Idle(),
            )
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 300,
                currentX: 340,
              }),
            )
          }),
          Story.Command.resolve(
            WaitBeforeDismissal,
            Message.CompletedWaitBeforeDismissal({
              entryId: 'test-entry-0',
              version: STALE_VERSION,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 300,
                currentX: 340,
              }),
            )
          }),
        )
      },
    )

    it.effect(
      'dismisses one entry past threshold while the other keeps dragging',
      () => {
        const entryOne = makeSettledEntry({ id: 'test-entry-0' })
        const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
        const model = withEntries(swipeInit, [entryOne, entryTwo])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.PressedEntryPointer({
              entryId: 'test-entry-0',
              pointerId: POINTER_ID,
              clientX: 100,
            }),
          ),
          Story.message(
            Message.PressedEntryPointer({
              entryId: 'test-entry-1',
              pointerId: OTHER_POINTER_ID,
              clientX: 300,
            }),
          ),
          Story.message(
            Message.MovedSwipePointer({
              pointerId: POINTER_ID,
              clientX: 200,
            }),
          ),
          Story.message(
            Message.ReleasedSwipePointer({
              pointerId: POINTER_ID,
              clientX: 200,
            }),
          ),
          Story.model(next => {
            const dismissed = requireEntry(next, 0)
            expect(dismissed.swipeState).toStrictEqual(
              SwipeState.Dismissing({ offsetX: 100, direction: 'Right' }),
            )
            expect(dismissed.animation.transitionState).toBe('LeaveStart')
            expect(requireEntry(next, 1).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 300,
                currentX: 300,
              }),
            )
          }),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: firstEntryId,
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
          ),
          Story.model(next => {
            expect(next.entries).toHaveLength(1)
            expect(requireEntry(next, 0).id).toBe('test-entry-1')
            expect(requireEntry(next, 0).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: OTHER_POINTER_ID,
                startX: 300,
                currentX: 300,
              }),
            )
          }),
        )
      },
    )

    it.effect('does not start a drag on a leaving entry', () => {
      const leavingEntry = makeSettledEntry({
        animation: {
          id: firstEntryId,
          isShowing: false,
          transitionState: 'LeaveAnimating',
          transitionGeneration: LEAVE_TRANSITION_GENERATION,
        },
      })
      const model = withEntries(swipeInit, [leavingEntry])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Idle(),
          )
        }),
      )
    })

    it.effect(
      'does not move or dismiss leftward with the default direction',
      () => {
        const initialModel = withEntries(swipeInit, [makeSettledEntry()])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(initialModel),
          Story.message(
            Message.PressedEntryPointer({
              entryId: firstEntryId,
              pointerId: POINTER_ID,
              clientX: 200,
            }),
          ),
          Story.message(
            Message.MovedSwipePointer({
              pointerId: POINTER_ID,
              clientX: 50,
            }),
          ),
          Story.model(model => {
            expect(requireEntry(model, 0).swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: POINTER_ID,
                startX: 200,
                currentX: 200,
              }),
            )
          }),
          Story.message(
            Message.ReleasedSwipePointer({
              pointerId: POINTER_ID,
              clientX: 50,
            }),
          ),
          Story.model(model => {
            const entry = requireEntry(model, 0)
            expect(entry.swipeState).toStrictEqual(
              SwipeState.Settling({ offsetX: 0 }),
            )
            expect(entry.animation.transitionState).toBe('Idle')
          }),
          Story.Command.resolveAll(
            [
              WaitForSwipeSettled,
              Message.CompletedWaitForSwipeSettled({
                entryId: firstEntryId,
                version: SETTLING_SWIPE_VERSION,
              }),
            ],
            [
              WaitBeforeDismissal,
              Message.CompletedWaitBeforeDismissal({
                entryId: firstEntryId,
                version: STALE_VERSION,
              }),
            ],
          ),
        )
      },
    )

    it.effect('swipes left when configured with the leftward direction', () => {
      const initialModel = withEntries(
        toastInit({ id: 'test', swipeToDismiss: { direction: 'Left' } }).model,
        [makeSettledEntry()],
      )
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(initialModel),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Story.message(
          Message.MovedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 50,
          }),
        ),
        Story.model(model => {
          expect(requireEntry(model, 0).swipeState).toStrictEqual(
            SwipeState.Dragging({
              pointerId: POINTER_ID,
              startX: 200,
              currentX: 50,
            }),
          )
        }),
        Story.message(
          Message.ReleasedSwipePointer({
            pointerId: POINTER_ID,
            clientX: 50,
          }),
        ),
        Story.model(model => {
          const entry = requireEntry(model, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Dismissing({ offsetX: -150, direction: 'Left' }),
          )
          expect(entry.animation.transitionState).toBe('LeaveStart')
        }),
        Story.Command.resolveAll(
          [
            Animation.WaitForPaint({ generation: LEAVE_TRANSITION_GENERATION }),
            Animation.Message.CompletedWaitForPaint({
              generation: LEAVE_TRANSITION_GENERATION,
            }),
          ],
          [
            Animation.WaitForAnimationSettled({
              id: firstEntryId,
              generation: LEAVE_TRANSITION_GENERATION,
            }),
            Animation.Message.EndedAnimation({
              generation: LEAVE_TRANSITION_GENERATION,
            }),
          ],
        ),
        Story.model(model => {
          expect(model.entries).toHaveLength(0)
        }),
      )
    })

    it.effect(
      'does not end a drag when an older settle timer completes',
      () => {
        const dragging = SwipeState.Dragging({
          pointerId: POINTER_ID,
          startX: 100,
          currentX: 150,
        })
        const model = withEntries(swipeInit, [
          makeSettledEntry({ swipeState: dragging }),
        ])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.CompletedWaitForSwipeSettled({
              entryId: firstEntryId,
              version: 0,
            }),
          ),
          Story.model(next => {
            expect(requireEntry(next, 0).swipeState).toStrictEqual(dragging)
          }),
          Story.Command.expectNone(),
        )
      },
    )

    it.effect('ignores settle completion for an unknown entry', () => {
      const settling = SwipeState.Settling({ offsetX: 0 })
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: settling }),
      ])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: 'nope',
            version: 0,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(settling)
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect('starts a new drag before the previous settle completes', () => {
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: SwipeState.Settling({ offsetX: 0 }) }),
      ])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 50,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Dragging({
              pointerId: POINTER_ID,
              startX: 50,
              currentX: 50,
            }),
          )
          expect(requireEntry(next, 0).pendingDismissVersion).toBe(1)
        }),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: 0,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Dragging({
              pointerId: POINTER_ID,
              startX: 50,
              currentX: 50,
            }),
          )
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect('keeps settling when the completion version is stale', () => {
      const settling = SwipeState.Settling({ offsetX: 0 })
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: settling, swipeVersion: 1 }),
      ])
      return Story.story(
        ToastLive,
        toastConfig,
        givenModel(model),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: 0,
          }),
        ),
        Story.model(next => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(settling)
        }),
        Story.Command.expectNone(),
      )
    })

    it.effect(
      'does not clear a later dismissal when an old settle timer completes',
      () => {
        // NOTE: Story resolves Commands before the next Message, so this test
        // starts from a later dismissal state and sends the stale completion.
        const entry = makeSettledEntry({
          animation: {
            id: firstEntryId,
            isShowing: false,
            transitionState: 'LeaveAnimating',
            transitionGeneration: LEAVE_TRANSITION_GENERATION,
          },
          swipeState: SwipeState.Dismissing({
            offsetX: 100,
            direction: 'Right',
          }),
          swipeVersion: 4,
        })
        const model = withEntries(swipeInit, [entry])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.CompletedWaitForSwipeSettled({
              entryId: firstEntryId,
              version: 2,
            }),
          ),
          Story.model(next => {
            const entry = requireEntry(next, 0)
            expect(entry.swipeState).toStrictEqual(
              SwipeState.Dismissing({ offsetX: 100, direction: 'Right' }),
            )
            expect(entry.animation.transitionState).toBe('LeaveAnimating')
          }),
          Story.Command.expectNone(),
        )
      },
    )

    it.effect(
      'dismissing a dragged entry removes it after its leave completes',
      () => {
        const model = withEntries(swipeInit, [makeSettledEntry()])
        return Story.story(
          ToastLive,
          toastConfig,
          givenModel(model),
          Story.message(
            Message.PressedEntryPointer({
              entryId: firstEntryId,
              pointerId: POINTER_ID,
              clientX: 100,
            }),
          ),
          Story.message(Message.Dismissed({ entryId: firstEntryId })),
          Story.model(next => {
            const entry = requireEntry(next, 0)
            expect(entry.swipeState).toStrictEqual(
              SwipeState.Dragging({
                pointerId: POINTER_ID,
                startX: 100,
                currentX: 100,
              }),
            )
            expect(entry.animation.transitionState).toBe('LeaveStart')
          }),
          Story.Command.resolveAll(
            [
              Animation.WaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.CompletedWaitForPaint({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
            [
              Animation.WaitForAnimationSettled({
                id: firstEntryId,
                generation: LEAVE_TRANSITION_GENERATION,
              }),
              Animation.Message.EndedAnimation({
                generation: LEAVE_TRANSITION_GENERATION,
              }),
            ],
          ),
          Story.model(next => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      },
    )
  })

  describe('RequestedDismiss', () => {
    it.effect('starts the selected entry leave transition', () =>
      Story.story(
        ToastLive,
        toastConfig,
        givenModel(
          modifyFields(toastInit({ id: 'test' }).model, {
            entries: () => [makeSettledEntry()],
            nextEntryKey: () => 1,
          }),
        ),
        Story.message(
          Toast.Message.RequestedDismiss({ entryId: firstEntryId }),
        ),
        Story.model(model => {
          expect(requireEntry(model, 0).animation.transitionState).toBe(
            'LeaveStart',
          )
        }),
        resolveLeave(firstEntryId),
        Story.model(model => {
          expect(model.entries).toHaveLength(0)
        }),
      ),
    )
  })
})
