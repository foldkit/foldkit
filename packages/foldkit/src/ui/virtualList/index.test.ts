import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Story from '../../test/story.js'
import {
  ApplyScroll,
  CompletedApplyScroll,
  MeasuredContainer,
  type Model,
  ScrolledContainer,
  init,
  scrollToIndex,
  update,
  visibleWindow,
} from './index.js'

const defaultInit = (): Model => init({ id: 'test', rowHeightPx: 30 })

const measuredInit = (containerHeight: number): Model => {
  const [measured] = update(
    defaultInit(),
    MeasuredContainer({ containerHeight }),
  )
  return measured
}

describe('VirtualList', () => {
  describe('init', () => {
    it('starts in the Unmeasured state with scrollTop 0 and pendingScroll Idle', () => {
      const model = defaultInit()
      expect(model.id).toBe('test')
      expect(model.rowHeightPx).toBe(30)
      expect(model.scrollTop).toBe(0)
      expect(model.measurement._tag).toBe('Unmeasured')
      expect(model.pendingScroll._tag).toBe('Idle')
      expect(model.pendingScrollVersion).toBe(0)
    })

    it('honors initialScrollTop when provided', () => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        initialScrollTop: 600,
      })
      expect(model.scrollTop).toBe(600)
    })
  })

  describe('ScrolledContainer', () => {
    it('writes the new scrollTop into the model', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(ScrolledContainer({ scrollTop: 450 })),
        Story.model(model => {
          expect(model.scrollTop).toBe(450)
        }),
      )
    })
  })

  describe('MeasuredContainer', () => {
    it('transitions Unmeasured to Measured with the reported height', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(MeasuredContainer({ containerHeight: 600 })),
        Story.model(model => {
          expect(model.measurement._tag).toBe('Measured')
          if (model.measurement._tag === 'Measured') {
            expect(model.measurement.containerHeight).toBe(600)
          }
        }),
      )
    })

    it('updates the height when already Measured', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(MeasuredContainer({ containerHeight: 600 })),
        Story.message(MeasuredContainer({ containerHeight: 720 })),
        Story.model(model => {
          if (model.measurement._tag === 'Measured') {
            expect(model.measurement.containerHeight).toBe(720)
          }
        }),
      )
    })

    it('issues no Command on the initial Unmeasured to Measured transition when scrollTop is 0', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(MeasuredContainer({ containerHeight: 600 })),
        Story.expectNoCommands(),
      )
    })

    it('issues an apply-scroll Command on the initial transition when scrollTop is non-zero', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', rowHeightPx: 30, initialScrollTop: 600 }),
        ),
        Story.message(MeasuredContainer({ containerHeight: 300 })),
        Story.expectHasCommands(ApplyScroll),
        Story.model(model => {
          expect(model.pendingScroll._tag).toBe('ScrollingToIndex')
          if (model.pendingScroll._tag === 'ScrollingToIndex') {
            expect(model.pendingScroll.index).toBe(20)
          }
          expect(model.pendingScrollVersion).toBe(1)
        }),
        Story.resolve(ApplyScroll, CompletedApplyScroll({ version: 1 })),
      )
    })

    it('issues no Command on subsequent MeasuredContainer once already Measured (resize-only path)', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', rowHeightPx: 30, initialScrollTop: 600 }),
        ),
        Story.message(MeasuredContainer({ containerHeight: 300 })),
        Story.resolve(ApplyScroll, CompletedApplyScroll({ version: 1 })),
        Story.message(MeasuredContainer({ containerHeight: 320 })),
        Story.expectNoCommands(),
      )
    })
  })

  describe('CompletedApplyScroll', () => {
    it('clears pendingScroll when the version matches', () => {
      const baseModel = defaultInit()
      const [scrolledModel] = scrollToIndex(baseModel, 50)
      expect(scrolledModel.pendingScroll._tag).toBe('ScrollingToIndex')

      const [resolvedModel] = update(
        scrolledModel,
        CompletedApplyScroll({ version: scrolledModel.pendingScrollVersion }),
      )
      expect(resolvedModel.pendingScroll._tag).toBe('Idle')
    })

    it('ignores a stale completion when a newer scroll is in flight', () => {
      const [first] = scrollToIndex(defaultInit(), 10)
      const [second] = scrollToIndex(first, 20)
      expect(second.pendingScrollVersion).toBe(2)

      const [unchanged] = update(second, CompletedApplyScroll({ version: 1 }))
      expect(unchanged.pendingScroll._tag).toBe('ScrollingToIndex')
      if (unchanged.pendingScroll._tag === 'ScrollingToIndex') {
        expect(unchanged.pendingScroll.version).toBe(2)
      }
    })
  })

  describe('scrollToIndex', () => {
    it('bumps the version and stores the target index in pendingScroll', () => {
      const [model, commands] = scrollToIndex(defaultInit(), 42)
      expect(model.pendingScrollVersion).toBe(1)
      expect(model.pendingScroll._tag).toBe('ScrollingToIndex')
      if (model.pendingScroll._tag === 'ScrollingToIndex') {
        expect(model.pendingScroll.index).toBe(42)
        expect(model.pendingScroll.version).toBe(1)
      }
      expect(commands).toHaveLength(1)
    })

    it('increments the version monotonically across calls', () => {
      const [first] = scrollToIndex(defaultInit(), 10)
      const [second] = scrollToIndex(first, 20)
      const [third] = scrollToIndex(second, 30)
      expect(first.pendingScrollVersion).toBe(1)
      expect(second.pendingScrollVersion).toBe(2)
      expect(third.pendingScrollVersion).toBe(3)
    })
  })

  describe('visibleWindow', () => {
    it('returns None while the container has not been measured', () => {
      const result = visibleWindow(defaultInit(), 100, 0)
      expect(Option.isNone(result)).toBe(true)
    })

    it('computes the slice from scrollTop, containerHeight, and rowHeightPx', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 0 }
      const result = visibleWindow(model, 1000, 0)

      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(10)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(990 * 30)
      }
    })

    it('shifts the slice as scrollTop advances', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 600 }
      const result = visibleWindow(model, 1000, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(20)
        expect(result.value.endIndex).toBe(30)
        expect(result.value.topSpacerHeight).toBe(20 * 30)
        expect(result.value.bottomSpacerHeight).toBe(970 * 30)
      }
    })

    it('expands the slice by the overscan buffer on each side', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 600 }
      const result = visibleWindow(model, 1000, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(15)
        expect(result.value.endIndex).toBe(35)
      }
    })

    it('clamps startIndex to 0 when overscan crosses the top edge', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 30 }
      const result = visibleWindow(model, 1000, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.topSpacerHeight).toBe(0)
      }
    })

    it('clamps endIndex to itemCount when overscan crosses the bottom edge', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 0 }
      const result = visibleWindow(model, 8, 5)

      if (Option.isSome(result)) {
        expect(result.value.endIndex).toBe(8)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('produces an empty slice when itemCount is 0', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 0 }
      const result = visibleWindow(model, 0, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(0)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })
  })
})
