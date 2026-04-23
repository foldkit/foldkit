import { describe, it } from '@effect/vitest'
import { Duration, Option, Schema as S } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story'
import * as Animation from '../animation'
import {
  DismissAfter,
  Dismissed,
  DismissedAll,
  ElapsedDuration,
  GotAnimationMessage,
  HoveredEntry,
  LeftEntry,
  make,
} from './index'

// Test payload: minimal so fixtures are simple. The library is generic; these
// tests only need to verify that lifecycle semantics work regardless of
// payload shape.
const TestPayload = S.Struct({ body: S.String })
type TestPayload = typeof TestPayload.Type

const Toast = make(TestPayload)

type Message = typeof Toast.Message.Type
type Model = typeof Toast.Model.Type
type Entry = typeof Toast.Entry.Type

const STALE_VERSION = -1

const animationToToastMessage =
  (entryId: string) =>
  (message: Animation.Message): Message =>
    GotAnimationMessage({ entryId, message })

// A post-enter entry: isShowing true, transition Idle. Use this for tests
// that exercise behavior after the enter animation has settled — Dismissed,
// ElapsedDuration, HoveredEntry / LeftEntry, etc.
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

const withEmpty = Story.with(Toast.init({ id: 'test' }))

const firstEntryId = 'test-entry-0'

describe('Toast', () => {
  describe('init', () => {
    it('defaults to empty with a 4s default duration', () => {
      expect(Toast.init({ id: 'test' })).toStrictEqual({
        id: 'test',
        defaultDuration: Duration.seconds(4),
        entries: [],
        nextEntryKey: 0,
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
      })
    })
  })

  describe('show', () => {
    it('appends an entry and schedules enter + dismiss commands', () => {
      const initial = Toast.init({ id: 'test' })
      const [nextModel, commands] = Toast.show(initial, {
        payload: { body: 'Saved' },
      })

      expect(nextModel.entries).toHaveLength(1)
      const [entry] = nextModel.entries
      expect(entry?.id).toBe(firstEntryId)
      expect(entry?.payload).toStrictEqual({ body: 'Saved' })
      expect(entry?.variant).toBe('Info')
      expect(entry?.animation.transitionState).toBe('EnterStart')
      expect(nextModel.nextEntryKey).toBe(1)
      expect(commands).toHaveLength(2)
    })

    it('does not schedule a dismiss command when sticky', () => {
      const [nextModel, commands] = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'Sticky' },
        sticky: true,
      })
      const [entry] = nextModel.entries
      expect(entry?.maybeDuration).toStrictEqual(Option.none())
      expect(commands).toHaveLength(1)
    })

    it('uses a caller-provided duration over the default', () => {
      const [nextModel] = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'Quick' },
        duration: 100,
      })
      const [entry] = nextModel.entries
      expect(entry?.maybeDuration).toStrictEqual(
        Option.some(Duration.millis(100)),
      )
    })

    it('generates sequential entry ids using nextEntryKey', () => {
      const [after1] = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'One' },
      })
      const [after2] = Toast.show(after1, { payload: { body: 'Two' } })
      const ids = after2.entries.map((entry: Entry) => entry.id)
      expect(ids).toStrictEqual(['test-entry-0', 'test-entry-1'])
      expect(after2.nextEntryKey).toBe(2)
    })

    it('sticky wins over an explicit duration', () => {
      const [nextModel] = Toast.show(Toast.init({ id: 'test' }), {
        payload: { body: 'Sticky beats duration' },
        sticky: true,
        duration: 100,
      })
      const [entry] = nextModel.entries
      expect(entry?.maybeDuration).toStrictEqual(Option.none())
    })
  })

  describe('update', () => {
    describe('ElapsedDuration', () => {
      it('ignores a stale version', () => {
        const model: Model = {
          ...Toast.init({ id: 'test' }),
          entries: [makeSettledEntry()],
          nextEntryKey: 1,
        }
        Story.story(
          Toast.update,
          Story.with(model),
          Story.message(
            ElapsedDuration({
              entryId: firstEntryId,
              version: STALE_VERSION,
            }),
          ),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe('Idle')
          }),
          Story.expectNoCommands(),
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
          Story.with(model),
          Story.message(ElapsedDuration({ entryId: firstEntryId, version: 0 })),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.resolveAll(
            [
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToToastMessage(firstEntryId),
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.EndedAnimation(),
              animationToToastMessage(firstEntryId),
            ],
          ),
        )
      })

      it('does nothing for a missing entry', () => {
        Story.story(
          Toast.update,
          withEmpty,
          Story.message(ElapsedDuration({ entryId: 'nope', version: 0 })),
          Story.expectNoCommands(),
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
          Story.with(model),
          Story.message(HoveredEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            const [entry] = next.entries
            expect(entry?.isHovered).toBe(true)
            expect(entry?.pendingDismissVersion).toBe(1)
          }),
          Story.expectNoCommands(),
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
          Story.with(model),
          Story.message(LeftEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            const [entry] = next.entries
            expect(entry?.isHovered).toBe(false)
            expect(entry?.pendingDismissVersion).toBe(2)
          }),
          Story.expectHasCommands(DismissAfter),
          Story.resolve(
            DismissAfter,
            ElapsedDuration({ entryId: firstEntryId, version: STALE_VERSION }),
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
          Story.with(model),
          Story.message(LeftEntry({ entryId: firstEntryId })),
          Story.expectNoCommands(),
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
          Story.with(model),
          Story.message(HoveredEntry({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            expect(next.entries[0]?.pendingDismissVersion).toBe(1)
          }),
          Story.message(ElapsedDuration({ entryId: firstEntryId, version: 0 })),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe('Idle')
            expect(next.entries[0]?.isHovered).toBe(true)
          }),
          Story.expectNoCommands(),
        )
      })
    })

    describe('handles a missing entry id as a no-op', () => {
      it('Dismissed', () => {
        Story.story(
          Toast.update,
          withEmpty,
          Story.message(Dismissed({ entryId: 'nope' })),
          Story.expectNoCommands(),
        )
      })

      it('HoveredEntry', () => {
        Story.story(
          Toast.update,
          withEmpty,
          Story.message(HoveredEntry({ entryId: 'nope' })),
          Story.expectNoCommands(),
        )
      })

      it('LeftEntry', () => {
        Story.story(
          Toast.update,
          withEmpty,
          Story.message(LeftEntry({ entryId: 'nope' })),
          Story.expectNoCommands(),
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
          Story.with(model),
          Story.message(Dismissed({ entryId: firstEntryId })),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.resolveAll(
            [
              Animation.RequestFrame,
              Animation.AdvancedAnimationFrame(),
              animationToToastMessage(firstEntryId),
            ],
            [
              Animation.WaitForAnimationSettled,
              Animation.EndedAnimation(),
              animationToToastMessage(firstEntryId),
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
          Story.with(model),
          Story.message(Dismissed({ entryId: firstEntryId })),
          Story.expectNoCommands(),
          Story.model((next: Model) => {
            expect(next).toBe(model)
          }),
        )
      })

      it('removes the entry when its leave transition completes', () => {
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
          Story.with(model),
          Story.message(
            GotAnimationMessage({
              entryId: firstEntryId,
              message: Animation.EndedAnimation(),
            }),
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
          Story.with(model),
          Story.message(DismissedAll()),
          Story.model((next: Model) => {
            expect(next.entries[0]?.animation.transitionState).toBe(
              'LeaveStart',
            )
            expect(next.entries[1]?.animation.transitionState).toBe(
              'LeaveStart',
            )
          }),
          Story.resolve(
            Animation.RequestFrame,
            Animation.AdvancedAnimationFrame(),
            animationToToastMessage('test-entry-0'),
          ),
          Story.resolve(
            Animation.RequestFrame,
            Animation.AdvancedAnimationFrame(),
            animationToToastMessage('test-entry-1'),
          ),
          Story.resolve(
            Animation.WaitForAnimationSettled,
            Animation.EndedAnimation(),
            animationToToastMessage('test-entry-0'),
          ),
          Story.resolve(
            Animation.WaitForAnimationSettled,
            Animation.EndedAnimation(),
            animationToToastMessage('test-entry-1'),
          ),
          Story.model((next: Model) => {
            expect(next.entries).toHaveLength(0)
          }),
        )
      })
    })
  })

  describe('Added', () => {
    it('runs the full add flow — entry advances to Idle, then the auto-dismiss timer starts the leave transition', () => {
      const entry = makeFreshEntry({
        maybeDuration: Option.some(Duration.millis(100)),
      })
      Story.story(
        Toast.update,
        withEmpty,
        Story.message(Toast.Added({ entry })),
        Story.resolveAll(
          [
            Animation.RequestFrame,
            Animation.AdvancedAnimationFrame(),
            animationToToastMessage(firstEntryId),
          ],
          [
            Animation.WaitForAnimationSettled,
            Animation.EndedAnimation(),
            animationToToastMessage(firstEntryId),
          ],
        ),
        Story.model((next: Model) => {
          expect(next.entries[0]?.animation.transitionState).toBe('Idle')
        }),
        Story.resolve(
          DismissAfter,
          ElapsedDuration({ entryId: firstEntryId, version: 0 }),
        ),
        Story.model((next: Model) => {
          expect(next.entries[0]?.animation.transitionState).toBe('LeaveStart')
        }),
        Story.resolveAll(
          [
            Animation.RequestFrame,
            Animation.AdvancedAnimationFrame(),
            animationToToastMessage(firstEntryId),
          ],
          [
            Animation.WaitForAnimationSettled,
            Animation.EndedAnimation(),
            animationToToastMessage(firstEntryId),
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
      const [next] = Toast.dismiss(model, firstEntryId)
      expect(next.entries[0]?.animation.transitionState).toBe('LeaveStart')
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
      const [next] = Toast.dismissAll(model)
      next.entries.forEach((entry: Entry) => {
        expect(entry.animation.transitionState).toBe('LeaveStart')
      })
    })
  })
})
