import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import {
  type DragZoneState,
  checkScheduledLeave,
  clearDragZoneAfterDrop,
  getDragZoneState,
  processDragEnter,
  processDragLeave,
} from './dragZoneTracking.js'

const makeZoneWithChildren = (
  childCount: number,
): { zone: Element; children: ReadonlyArray<Element> } => {
  const zone = document.createElement('div')
  const children = Array.from({ length: childCount }, () => {
    const child = document.createElement('span')
    zone.appendChild(child)
    return child
  })
  return { zone, children }
}

const freshState = (): DragZoneState => ({
  targets: new Set(),
  pendingEmptyCheck: false,
})

describe('dragZoneTracking', () => {
  describe('processDragEnter', () => {
    it('returns true on first entry from an empty state', () => {
      const { zone } = makeZoneWithChildren(0)
      const state = freshState()

      expect(processDragEnter(state, zone, zone)).toBe(true)
    })

    it('returns false for a subsequent enter while already active', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      processDragEnter(state, zone, zone)
      expect(processDragEnter(state, zone, children[0])).toBe(false)
      expect(processDragEnter(state, zone, children[1])).toBe(false)
    })

    it('returns false when a leave-check microtask is still pending', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      processDragEnter(state, zone, children[0])
      const leaveOutcome = processDragLeave(state, zone, children[0])
      expect(leaveOutcome).toBe('schedule')

      // Before the microtask fires, the pointer lands on the sibling child.
      // Without the pendingEmptyCheck guard this would dispatch a spurious
      // second "entered" Message.
      expect(processDragEnter(state, zone, children[1])).toBe(false)
    })
  })

  describe('processDragLeave', () => {
    it("returns 'done' when other targets are still pending", () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      processDragEnter(state, zone, children[0])
      processDragEnter(state, zone, children[1])
      expect(processDragLeave(state, zone, children[0])).toBe('done')
    })

    it("returns 'schedule' when the target set becomes empty", () => {
      const { zone } = makeZoneWithChildren(0)
      const state = freshState()

      processDragEnter(state, zone, zone)
      expect(processDragLeave(state, zone, zone)).toBe('schedule')
    })

    it("returns 'done' on a repeat leave while a check is already pending", () => {
      const { zone } = makeZoneWithChildren(0)
      const state = freshState()

      processDragEnter(state, zone, zone)
      expect(processDragLeave(state, zone, zone)).toBe('schedule')
      expect(processDragLeave(state, zone, zone)).toBe('done')
    })

    it('prunes targets that have detached from the zone, so the set empties even if dragleave never fires for them', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      processDragEnter(state, zone, children[0])
      processDragEnter(state, zone, children[1])

      zone.removeChild(children[0])
      zone.removeChild(children[1])

      // A subsequent dragleave on the zone itself prunes the orphaned
      // children and finds the set empty, even though neither child got a
      // dragleave fired directly.
      expect(processDragLeave(state, zone, zone)).toBe('schedule')
    })
  })

  describe('checkScheduledLeave', () => {
    it('returns true when the set is empty at microtask time', () => {
      const { zone } = makeZoneWithChildren(0)
      const state = freshState()

      processDragEnter(state, zone, zone)
      processDragLeave(state, zone, zone)
      expect(checkScheduledLeave(state)).toBe(true)
      expect(state.pendingEmptyCheck).toBe(false)
    })

    it('returns false when a dragenter re-populated the set before the microtask fired', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      // Simulates the pointer crossing from child[0] onto child[1] inside
      // the zone: dragleave fires first and schedules a check, then
      // dragenter fires synchronously for the new target, then the
      // microtask runs.
      processDragEnter(state, zone, children[0])
      processDragLeave(state, zone, children[0])
      processDragEnter(state, zone, children[1])
      expect(checkScheduledLeave(state)).toBe(false)
    })
  })

  describe('clearDragZoneAfterDrop', () => {
    it('empties the target set and clears any pending empty-check', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = getDragZoneState(zone)

      processDragEnter(state, zone, children[0])
      processDragLeave(state, zone, children[0])
      expect(state.pendingEmptyCheck).toBe(true)

      clearDragZoneAfterDrop(zone)

      expect(state.targets.size).toBe(0)
      expect(state.pendingEmptyCheck).toBe(false)
    })

    it('is a no-op for a zone that was never tracked', () => {
      const { zone } = makeZoneWithChildren(0)
      expect(() => clearDragZoneAfterDrop(zone)).not.toThrow()
    })
  })

  describe('full sequences', () => {
    it('synchronous leave-then-enter does not fire a spurious leave', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      let entered = 0
      let left = 0
      const pendingChecks: Array<() => void> = []

      const simulateEnter = (target: EventTarget) => {
        if (processDragEnter(state, zone, target)) entered++
      }

      const simulateLeave = (target: EventTarget) => {
        if (processDragLeave(state, zone, target) === 'schedule') {
          pendingChecks.push(() => {
            if (checkScheduledLeave(state)) left++
          })
        }
      }

      const drainMicrotasks = () => {
        while (pendingChecks.length > 0) pendingChecks.shift()!()
      }

      simulateEnter(children[0])
      simulateLeave(children[0])
      simulateEnter(children[1])
      drainMicrotasks()

      expect(entered).toBe(1)
      expect(left).toBe(0)
      expect(state.targets.size).toBe(1)
    })

    it('leaving the zone entirely after traversing children fires exactly one leave', () => {
      const { zone, children } = makeZoneWithChildren(2)
      const state = freshState()

      let entered = 0
      let left = 0
      const pendingChecks: Array<() => void> = []

      const simulateEnter = (target: EventTarget) => {
        if (processDragEnter(state, zone, target)) entered++
      }

      const simulateLeave = (target: EventTarget) => {
        if (processDragLeave(state, zone, target) === 'schedule') {
          pendingChecks.push(() => {
            if (checkScheduledLeave(state)) left++
          })
        }
      }

      const drainMicrotasks = () => {
        while (pendingChecks.length > 0) pendingChecks.shift()!()
      }

      simulateEnter(children[0])
      simulateLeave(children[0])
      simulateEnter(children[1])
      simulateLeave(children[1])
      drainMicrotasks()

      expect(entered).toBe(1)
      expect(left).toBe(1)
      expect(state.targets.size).toBe(0)
    })
  })
})
