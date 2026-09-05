import { Duration, Option, Schema } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import {
  Message,
  SwipeState,
  WaitBeforeDismissal,
  make,
  test as toastTest,
} from './index.js'

// Test payload: minimal so fixtures are simple. The library is generic; these
// tests only need to verify that lifecycle semantics work regardless of
// payload shape.
const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type

const Toast = make(TestPayload)

type Model = typeof Toast.Model.Type
type Entry = typeof Toast.Entry.Type

const STALE_VERSION = -1

const makeSettledEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: Animation.init({ id: 'test-entry-0', isShowing: true }),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  payload: { body: 'Hello' },
  ...overrides,
})

// A fresh entry mirroring what `createEntry` produces internally: isShowing
// false, transition Idle. Use this for Added-path tests that need to exercise
// the full enter animation chain.
const makeFreshEntry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'test-entry-0',
  variant: 'Info',
  animation: Animation.init({ id: 'test-entry-0' }),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  payload: { body: 'Hello' },
  ...overrides,
})

const givenEmpty = Story.given(Toast.init({ id: 'test' }))

const firstEntryId = 'test-entry-0'

describe('Toast', () => {
  describe('init', () => {
    it('defaults to empty with a 4s default duration', () => {
      expect(Toast.init({ id: 'test' })).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
        swipeState: SwipeState.Idle(),
        swipeThreshold: 80,
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
        swipeState: SwipeState.Idle(),
        swipeThreshold: 80,
      })
    })

    it('accepts a custom swipeThreshold', () => {
      expect(
        Toast.init({
          id: 'test',
          swipeThreshold: 120,
        }),
      ).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
        swipeState: SwipeState.Idle(),
        swipeThreshold: 120,
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [makeSettledEntry()],
          nextEntryKey: 1,
        }
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
            expect(next.entries[0]?.animation.transitionState).toBe('Idle')
          }),
          Story.Command.expectNone(),
        )
      })

      it('starts the leave transition when the version matches', () => {
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [makeSettledEntry()],
          nextEntryKey: 1,
        }
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
            expect(next.entries[0]?.animation.transitionState).toBe(
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [makeSettledEntry()],
          nextEntryKey: 1,
        }
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [hoveredEntry],
          nextEntryKey: 1,
        }
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [stickyEntry],
          nextEntryKey: 1,
        }
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.LeftEntry({ entryId: firstEntryId })),
          Story.Command.expectNone(),
        )
      })

      it('a hover arriving before the timer fires cancels the pending dismiss via version bump', () => {
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [makeSettledEntry()],
          nextEntryKey: 1,
        }
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.HoveredEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            expect(next.entries[0]?.pendingDismissVersion).toBe(1)
          }),
          Story.message(
            Message.CompletedWaitBeforeDismissal({
              entryId: firstEntryId,
              version: 0,
            }),
          ),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe('Idle')
            expect(next.entries[0]?.isHovered).toBe(true)
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [makeSettledEntry()],
          nextEntryKey: 1,
        }
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.Dismissed({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe(
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [leavingEntry],
          nextEntryKey: 1,
        }
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [entry],
          nextEntryKey: 1,
        }
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
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [entryOne, entryTwo],
          nextEntryKey: 2,
        }
        Story.story(
          Toast.update,
          Story.given(model),
          Story.message(Message.DismissedAll()),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe(
              'LeaveStart',
            )
            expect(next.entries[1]?.animation.transitionState).toBe(
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
          expect(next.entries[0]?.animation.transitionState).toBe('Idle')
        }),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: 0,
          }),
        ),
        Story.model((next: Model) => {
          expect(next.entries[0]?.animation.transitionState).toBe('LeaveStart')
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
    it('PressedEntryPointer starts dragging and bumps dismiss version', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 100 }),
        ),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(
            SwipeState.Dragging({
              entryId: firstEntryId,
              startX: 100,
              currentX: 100,
            }),
          )
          expect(next.entries[0]?.pendingDismissVersion).toBe(1)
        }),
        Story.Command.expectNone(),
      )
    })

    it('MovedSwipePointer tracks currentX while dragging', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 100 }),
        ),
        Story.message(Message.MovedSwipePointer({ clientX: 150 })),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(
            SwipeState.Dragging({
              entryId: firstEntryId,
              startX: 100,
              currentX: 150,
            }),
          )
        }),
      )
    })

    it('ReleasedSwipePointer below threshold snaps back and reschedules dismiss', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 100 }),
        ),
        Story.message(Message.MovedSwipePointer({ clientX: 130 })),
        Story.message(Message.ReleasedSwipePointer({ clientX: 130 })),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(SwipeState.Idle())
          expect(next.entries[0]?.pendingDismissVersion).toBe(2)
          expect(next.entries[0]?.animation.transitionState).toBe('Idle')
        }),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: STALE_VERSION,
          }),
        ),
        Story.model((next: Model) => {
          expect(next.entries[0]?.animation.transitionState).toBe('Idle')
        }),
      )
    })

    it('ReleasedSwipePointer beyond threshold dismisses the entry', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 100 }),
        ),
        Story.message(Message.MovedSwipePointer({ clientX: 200 })),
        Story.message(Message.ReleasedSwipePointer({ clientX: 200 })),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(SwipeState.Idle())
          expect(next.entries[0]?.animation.transitionState).toBe('LeaveStart')
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

    it('CancelledSwipe snaps back without dismissing', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 100 }),
        ),
        Story.message(Message.MovedSwipePointer({ clientX: 180 })),
        Story.message(Message.CancelledSwipe()),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(SwipeState.Idle())
          expect(next.entries[0]?.animation.transitionState).toBe('Idle')
          expect(next.entries[0]?.pendingDismissVersion).toBe(2)
        }),
        Story.Command.resolve(
          WaitBeforeDismissal,
          Message.CompletedWaitBeforeDismissal({
            entryId: firstEntryId,
            version: STALE_VERSION,
          }),
        ),
        Story.model((next: Model) => {
          expect(next.entries[0]?.animation.transitionState).toBe('Idle')
        }),
      )
    })

    it('ignores PressedEntryPointer when already dragging another entry', () => {
      const entryOne = makeSettledEntry({ id: 'test-entry-0' })
      const entryTwo = makeSettledEntry({ id: 'test-entry-1' })
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [entryOne, entryTwo],
        nextEntryKey: 2,
        swipeState: SwipeState.Dragging({
          entryId: 'test-entry-0',
          startX: 100,
          currentX: 120,
        }),
        swipeThreshold: 80,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({
            entryId: 'test-entry-1',
            clientX: 200,
          }),
        ),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(
            SwipeState.Dragging({
              entryId: 'test-entry-0',
              startX: 100,
              currentX: 120,
            }),
          )
        }),
      )
    })

    it('ignores PressedEntryPointer for a leaving entry', () => {
      const leavingEntry = makeSettledEntry({
        animation: {
          id: firstEntryId,
          isShowing: false,
          transitionState: 'LeaveAnimating',
        },
      })
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [leavingEntry],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 100 }),
        ),
        Story.model((next: Model) => {
          expect(next.swipeState).toStrictEqual(SwipeState.Idle())
        }),
      )
    })

    it('swipe beyond threshold in opposite direction also dismisses', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      Story.story(
        Toast.update,
        Story.given(model),
        Story.message(
          Message.PressedEntryPointer({ entryId: firstEntryId, clientX: 200 }),
        ),
        Story.message(Message.MovedSwipePointer({ clientX: 50 })),
        Story.message(Message.ReleasedSwipePointer({ clientX: 50 })),
        Story.model((next: Model) => {
          expect(next.entries[0]?.animation.transitionState).toBe('LeaveStart')
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
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [makeSettledEntry()],
        nextEntryKey: 1,
      }
      const toastDismiss = Toast.dismiss(model, firstEntryId)
      expect(toastDismiss.model.entries[0]?.animation.transitionState).toBe(
        'LeaveStart',
      )
    })

    it('dismissAll(model) dispatches DismissedAll', () => {
      const model: Model = {
        ...Toast.init({ id: 'test' }),
        entries: [
          makeSettledEntry({ id: 'test-entry-0' }),
          makeSettledEntry({ id: 'test-entry-1' }),
        ],
        nextEntryKey: 2,
      }
      const toastDismissAll = Toast.dismissAll(model)
      toastDismissAll.model.entries.forEach((entry: Entry) => {
        expect(entry.animation.transitionState).toBe('LeaveStart')
      })
    })
  })
})
