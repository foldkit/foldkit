import { Array, Duration, Option, Schema } from 'effect'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  Message,
  SwipeState,
  WaitBeforeDismissal,
  WaitForSwipeSettled,
  make,
  test as toastTest,
} from './index.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type

const Toast = make(TestPayload)

type Model = typeof Toast.Model.Type
type Entry = typeof Toast.Entry.Type
const STALE_VERSION = -1
const POINTER_ID = 1
const OTHER_POINTER_ID = 2
const SETTLING_SWIPE_VERSION = 2

const makeSettledEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: Animation.init({ id: 'test-entry-0', isShowing: true }),
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
  animation: Animation.init({ id: 'test-entry-0' }),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Idle(),
  swipeVersion: 0,
  payload: { body: 'Hello' },
  ...overrides,
})

const givenEmpty = Story.given(Toast.init({ id: 'test' }))

const swipeInit = Toast.init({ id: 'test', swipeToDismiss: {} })

const firstEntryId = 'test-entry-0'

const withEntries = (model: Model, entries: ReadonlyArray<Entry>): Model =>
  evo(model, {
    entries: () => entries,
    nextEntryKey: () => entries.length,
  })

const requireEntry = (model: Model, index: number): Entry =>
  Option.getOrThrow(Array.get(model.entries, index))

describe('Toast', () => {
  describe('init', () => {
    it('defaults to empty with a 4s default duration and swipe disabled', () => {
      expect(Toast.init({ id: 'test' })).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
        maybeSwipeConfig: Option.none(),
      })
    })

    it('accepts a custom defaultDuration', () => {
      expect(
        Toast.init({
          id: 'test',
          defaultDuration: 1000,
        }),
      ).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.millis(1000),
        entries: [],
        nextEntryKey: 0,
        maybeSwipeConfig: Option.none(),
      })
    })

    it('opts into rightward swipe with the default threshold', () => {
      expect(Toast.init({ id: 'test', swipeToDismiss: {} })).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
        maybeSwipeConfig: Option.some({ threshold: 40, direction: 'Right' }),
      })
    })

    it('accepts a custom swipe threshold', () => {
      expect(
        Toast.init({
          id: 'test',
          swipeToDismiss: { threshold: 120 },
        }),
      ).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
        maybeSwipeConfig: Option.some({ threshold: 120, direction: 'Right' }),
      })
    })

    it('accepts a leftward swipe direction', () => {
      expect(
        Toast.init({ id: 'test', swipeToDismiss: { direction: 'Left' } }),
      ).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
        maybeSwipeConfig: Option.some({ threshold: 40, direction: 'Left' }),
      })
    })
  })

  describe('show', () => {
    it('appends an entry and schedules enter + dismiss commands', () => {
      const initial = Toast.init({ id: 'test' })
      const toastShow = Toast.show(initial, {
        payload: { body: 'Saved' },
      })

      expect(toastShow.model.entries).toHaveLength(1)
      const [entry] = toastShow.model.entries
      expect(entry?.id).toBe(firstEntryId)
      expect(entry?.payload).toStrictEqual({ body: 'Saved' })
      expect(entry?.variant).toBe('Info')
      expect(entry?.animation.transitionState).toBe('EnterStart')
      expect(toastShow.model.nextEntryKey).toBe(1)
      expect(toastShow.commands ?? []).toHaveLength(2)
    })

    it('does not schedule a dismiss command when sticky', () => {
      const toastShow = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'Sticky' },
        sticky: true,
      })
      const [entry] = toastShow.model.entries
      expect(entry?.maybeDuration).toStrictEqual(Option.none())
      expect(toastShow.commands ?? []).toHaveLength(1)
    })

    it('uses a caller-provided duration over the default', () => {
      const toastShow = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'Quick' },
        duration: 100,
      })
      const [entry] = toastShow.model.entries
      expect(entry?.maybeDuration).toStrictEqual(
        Option.some(Duration.millis(100)),
      )
    })

    it('generates sequential entry ids using nextEntryKey', () => {
      const firstShow = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'One' },
      })
      const secondShow = Toast.show(firstShow.model, {
        payload: { body: 'Two' },
      })
      const ids = secondShow.model.entries.map((entry: Entry) => entry.id)
      expect(ids).toStrictEqual(['test-entry-0', 'test-entry-1'])
      expect(secondShow.model.nextEntryKey).toBe(2)
    })

    it('sticky wins over an explicit duration', () => {
      const toastShow = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'Sticky beats duration' },
        sticky: true,
        duration: 100,
      })
      const [entry] = toastShow.model.entries
      expect(entry?.maybeDuration).toStrictEqual(Option.none())
    })
  })

  describe('update', () => {
    describe('CompletedWaitBeforeDismissal', () => {
      it('ignores a stale version', () => {
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: STALE_VERSION,
            }),
          ),
          Story.model((next: Model) => {
            expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })

      it('starts the leave transition when the version matches', () => {
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: 0,
            }),
          ),
          Story.model((next: Model) => {
            expect(requireEntry(next, 0).animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.Command.resolveAll(
            [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation(),
            ],
          ),
        )
      })

      it('does nothing for a missing entry', () => {
        Story.story(
          Toast.update,
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
      it('HoveredEntry flips isHovered true and bumps version to cancel the pending timer', () => {
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.HoveredEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            const [entry] = next.entries
            expect(entry?.isHovered).toBe(true)
            expect(entry?.pendingDismissVersion).toBe(1)
          }),
          Story.Command.expectNone(),
        )
      })

      it('LeftEntry reschedules the auto-dismiss with the new version', () => {
        const hoveredEntry = makeSettledEntry({
          isHovered: true,
          pendingDismissVersion: 1,
        })
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [hoveredEntry],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.LeftEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
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
      })

      it('LeftEntry does not reschedule when the entry is sticky', () => {
        const stickyEntry = makeSettledEntry({
          maybeDuration: Option.none(),
          isHovered: true,
        })
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [stickyEntry],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.LeftEntry({ entryId: firstEntryId })),
          Story.Command.expectNone(),
        )
      })

      it('a hover arriving before the timer fires cancels the pending dismiss via version bump', () => {
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.HoveredEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            expect(requireEntry(next, 0).pendingDismissVersion).toBe(1)
          }),
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: 0,
            }),
          ),
          Story.model((next: Model) => {
            const entry = requireEntry(next, 0)
            expect(entry.animation.transitionState).toBe('Idle')
            expect(entry.isHovered).toBe(true)
          }),
          Story.Command.expectNone(),
        )
      })
    })

    describe('handles a missing entry id as a no-op', () => {
      it('Dismissed', () => {
        Story.story(
          Toast.update,
          givenEmpty,
          Story.message(Message.Dismissed({ entryId: 'nope' })),
          Story.Command.expectNone(),
        )
      })

      it('HoveredEntry', () => {
        Story.story(
          Toast.update,
          givenEmpty,
          Story.message(Message.HoveredEntry({ entryId: 'nope' })),
          Story.Command.expectNone(),
        )
      })

      it('LeftEntry', () => {
        Story.story(
          Toast.update,
          givenEmpty,
          Story.message(Message.LeftEntry({ entryId: 'nope' })),
          Story.Command.expectNone(),
        )
      })
    })

    describe('Dismissed', () => {
      it('runs the full leave flow and removes the entry from the stack', () => {
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [makeSettledEntry()],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.Dismissed({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            expect(requireEntry(next, 0).animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.Command.resolveAll(
            [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
            [
              Animation.WaitForAnimationSettled,
              Animation.Message.EndedAnimation(),
            ],
          ),
          Story.model((next: Model) => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      })

      it('is a no-op when the entry is already leaving', () => {
        const leavingEntry = makeSettledEntry({
          animation: {
            id: firstEntryId,
            isShowing: false,
            transitionState: 'LeaveAnimating',
          },
        })
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [leavingEntry],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.Dismissed({ entryId: firstEntryId })),
          Story.Command.expectNone(),
          Story.model((next: Model) => {
            expect(next).toBe(model)
          }),
        )
      })

      it('removes the entry and emits DismissedToast when its leave transition completes', () => {
        const entry = makeSettledEntry({
          animation: {
            id: firstEntryId,
            isShowing: false,
            transitionState: 'LeaveAnimating',
          },
        })
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [entry],
          nextEntryKey: () => 1,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(
            Message.GotAnimationMessage({
              entryId: firstEntryId,
              message: Animation.Message.EndedAnimation(),
            }),
          ),
          Story.expectOutMessage(
            Toast.DismissedToast({ payload: entry.payload }),
          ),
          Story.model((next: Model) => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      })
    })

    describe('DismissedAll', () => {
      it('starts leave transition on every non-leaving entry', () => {
        const entryOne = makeSettledEntry({
          id: 'test-entry-0',
          animation: {
            ...Animation.init({ id: 'test-entry-0', isShowing: true }),
          },
        })
        const entryTwo = makeSettledEntry({
          id: 'test-entry-1',
          animation: {
            ...Animation.init({ id: 'test-entry-1', isShowing: true }),
          },
        })
        const model: Model = modifyFields(Toast.init({ id: 'test' }), {
          entries: () => [entryOne, entryTwo],
          nextEntryKey: () => 2,
        })
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.DismissedAll()),
          Story.model((next: Model) => {
            expect(requireEntry(next, 0).animation.transitionState).toBe(
              'LeaveStart',
            )
            expect(requireEntry(next, 1).animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.Command.resolveAll(
            [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
            [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
            [
              Animation.WaitForAnimationSettled({ id: 'test-entry-0' }),
              Animation.Message.EndedAnimation(),
            ],
            [
              Animation.WaitForAnimationSettled({ id: 'test-entry-1' }),
              Animation.Message.EndedAnimation(),
            ],
          ),
          Story.model((next: Model) => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      })
    })
  })

  describe('Added', () => {
    it('runs the full add flow: entry advances to Idle, then the auto-dismiss timer starts the leave transition', () => {
      const entry = makeFreshEntry({
        maybeDuration: Option.some(Duration.millis(100)),
      })
      Story.story(
        Toast.update,
        givenEmpty,
        Story.message(Toast.Added({ entry })),
        Story.Command.resolveAll(
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
        }),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: 0,
          }),
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).animation.transitionState).toBe(
            'LeaveStart',
          )
        }),
        Story.Command.resolveAll(
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Story.model((next: Model) => {
          expect(next.entries).toHaveLength(0)
        }),
      )
    })

    it('drains the whole lifecycle in one step via test.drainEntry', () => {
      const entry = makeFreshEntry({
        maybeDuration: Option.some(Duration.millis(100)),
      })
      Story.story(
        Toast.update,
        givenEmpty,
        Story.message(Toast.Added({ entry })),
        toastTest.drainEntry({ entryId: firstEntryId }),
        Story.model((next: Model) => {
          expect(next.entries).toHaveLength(0)
        }),
      )
    })
  })

  describe('swipe', () => {
    it('ignores pointer presses when swipe is disabled', () => {
      const model = withEntries(Toast.init({ id: 'test' }), [
        makeSettledEntry(),
      ])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.model((next: Model) => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(SwipeState.Idle())
          expect(entry.pendingDismissVersion).toBe(0)
        }),
        Story.Command.expectNone(),
      )
    })

    it('starts a drag and invalidates auto-dismiss on pointer press', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.model((next: Model) => {
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
    })

    it('updates the active drag position on pointer movement', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
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

    it('ignores move and release from an unrelated pointer', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
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

    it('settles back at the threshold and restarts auto-dismiss', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
        }),
      )
    })

    it('dismisses when released just past the threshold', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Dismissing({ offsetX: 41, direction: 'Right' }),
          )
          expect(entry.animation.transitionState).toBe('LeaveStart')
        }),
        Story.Command.resolveAll(
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Story.model((next: Model) => {
          expect(next.entries).toHaveLength(0)
        }),
      )
    })

    it('settles back when the pointer is cancelled', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).animation.transitionState).toBe('Idle')
        }),
      )
    })

    it('settles every active drag on Escape without changing idle entries', () => {
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
      const model = withEntries(swipeInit, [firstEntry, secondEntry, idleEntry])

      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(Message.PressedEscape()),
        Story.model((next: Model) => {
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
    })

    it('allows another entry to start dragging with a different pointer', () => {
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
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: 'test-entry-1',
            pointerId: OTHER_POINTER_ID,
            clientX: 200,
          }),
        ),
        Story.model((next: Model) => {
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
    })

    it('does not let one pointer drag two entries', () => {
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
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: 'test-entry-1',
            pointerId: POINTER_ID,
            clientX: 200,
          }),
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(dragging)
          expect(requireEntry(next, 1).swipeState).toStrictEqual(
            SwipeState.Idle(),
          )
        }),
        Story.Command.expectNone(),
      )
    })

    it('routes moves and releases to the correct entry while two drags are active', () => {
      const entryOne = makeSettledEntry({ id: 'test-entry-0' })
      const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
      const model = withEntries(swipeInit, [entryOne, entryTwo])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
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
    })

    it('dismisses one entry past threshold while the other keeps dragging', () => {
      const entryOne = makeSettledEntry({ id: 'test-entry-0' })
      const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
      const model = withEntries(swipeInit, [entryOne, entryTwo])
      Story.story(
        Toast.update,
        Story.given(model),
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
        Story.model((next: Model) => {
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
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Story.model((next: Model) => {
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
    })

    it('does not start a drag on a leaving entry', () => {
      const leavingEntry = makeSettledEntry({
        animation: {
          id: firstEntryId,
          isShowing: false,
          transitionState: 'LeaveAnimating',
        },
      })
      const model = withEntries(swipeInit, [leavingEntry])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(
            SwipeState.Idle(),
          )
        }),
      )
    })

    it('does not move or dismiss leftward with the default direction', () => {
      const initialModel = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(initialModel),
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
        Story.model((model: Model) => {
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
        Story.model((model: Model) => {
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
    })

    it('swipes left when configured with the leftward direction', () => {
      const initialModel = withEntries(
        Toast.init({ id: 'test', swipeToDismiss: { direction: 'Left' } }),
        [makeSettledEntry()],
      )
      Story.story(
        Toast.update,
        Story.given(initialModel),
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
        Story.model((model: Model) => {
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
        Story.model((model: Model) => {
          const entry = requireEntry(model, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Dismissing({ offsetX: -150, direction: 'Left' }),
          )
          expect(entry.animation.transitionState).toBe('LeaveStart')
        }),
        Story.Command.resolveAll(
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Story.model((model: Model) => {
          expect(model.entries).toHaveLength(0)
        }),
      )
    })

    it('does not end a drag when an older settle timer completes', () => {
      const dragging = SwipeState.Dragging({
        pointerId: POINTER_ID,
        startX: 100,
        currentX: 150,
      })
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: dragging }),
      ])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: 0,
          }),
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(dragging)
        }),
        Story.Command.expectNone(),
      )
    })

    it('ignores settle completion for an unknown entry', () => {
      const settling = SwipeState.Settling({ offsetX: 0 })
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: settling }),
      ])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: 'nope',
            version: 0,
          }),
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(settling)
        }),
        Story.Command.expectNone(),
      )
    })

    it('starts a new drag before the previous settle completes', () => {
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: SwipeState.Settling({ offsetX: 0 }) }),
      ])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 50,
          }),
        ),
        Story.model((next: Model) => {
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
        Story.model((next: Model) => {
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

    it('keeps settling when the completion version is stale', () => {
      const settling = SwipeState.Settling({ offsetX: 0 })
      const model = withEntries(swipeInit, [
        makeSettledEntry({ swipeState: settling, swipeVersion: 1 }),
      ])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: 0,
          }),
        ),
        Story.model((next: Model) => {
          expect(requireEntry(next, 0).swipeState).toStrictEqual(settling)
        }),
        Story.Command.expectNone(),
      )
    })

    it('does not clear a later dismissal when an old settle timer completes', () => {
      // NOTE: Story resolves Commands before the next Message, so this test
      // starts from a later dismissal state and sends the stale completion.
      const entry = makeSettledEntry({
        animation: {
          id: firstEntryId,
          isShowing: false,
          transitionState: 'LeaveAnimating',
        },
        swipeState: SwipeState.Dismissing({
          offsetX: 100,
          direction: 'Right',
        }),
        swipeVersion: 4,
      })
      const model = withEntries(swipeInit, [entry])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.CompletedWaitForSwipeSettled({
            entryId: firstEntryId,
            version: 2,
          }),
        ),
        Story.model((next: Model) => {
          const entry = requireEntry(next, 0)
          expect(entry.swipeState).toStrictEqual(
            SwipeState.Dismissing({ offsetX: 100, direction: 'Right' }),
          )
          expect(entry.animation.transitionState).toBe('LeaveAnimating')
        }),
        Story.Command.expectNone(),
      )
    })

    it('dismissing a dragged entry removes it after its leave completes', () => {
      const model = withEntries(swipeInit, [makeSettledEntry()])
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: firstEntryId,
            pointerId: POINTER_ID,
            clientX: 100,
          }),
        ),
        Story.message(Message.Dismissed({ entryId: firstEntryId })),
        Story.model((next: Model) => {
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
          [Animation.WaitForPaint, Animation.Message.CompletedWaitForPaint()],
          [
            Animation.WaitForAnimationSettled,
            Animation.Message.EndedAnimation(),
          ],
        ),
        Story.model((next: Model) => {
          expect(next.entries).toHaveLength(0)
        }),
      )
    })
  })

  describe('programmatic helpers', () => {
    it('dismiss(model, entryId) dispatches Dismissed', () => {
      const model: Model = modifyFields(Toast.init({ id: 'test' }), {
        entries: () => [makeSettledEntry()],
        nextEntryKey: () => 1,
      })
      const toastDismiss = Toast.dismiss(model, firstEntryId)
      expect(
        requireEntry(toastDismiss.model, 0).animation.transitionState,
      ).toBe('LeaveStart')
    })

    it('dismissAll(model) dispatches DismissedAll', () => {
      const model: Model = modifyFields(Toast.init({ id: 'test' }), {
        entries: () => [
          makeSettledEntry({ id: 'test-entry-0' }),
          makeSettledEntry({ id: 'test-entry-1' }),
        ],
        nextEntryKey: () => 2,
      })
      const toastDismissAll = Toast.dismissAll(model)
      toastDismissAll.model.entries.forEach((entry: Entry) => {
        expect(entry.animation.transitionState).toBe('LeaveStart')
      })
    })
  })
})
